#!/usr/bin/env bash
# Build AdPulse and publish it to a VPS served by Nginx (Ubuntu / Debian).
#
# First time (installs Node, Nginx, Certbot and configures the site + HTTPS):
#   ./deploy/deploy.sh --setup --domain ads.example.com --email you@example.com
#
# Every update afterwards (pull, build, switch to the new version):
#   ./deploy/deploy.sh
#
# Undo the last deploy:
#   ./deploy/deploy.sh --rollback
#
# Run it from anywhere inside the cloned repository as a normal user with sudo
# rights (or as root). The site is served from $WEB_ROOT/current, a symlink to
# one of $WEB_ROOT/releases/<timestamp>; switching it is atomic, so visitors
# never see a half-copied build.
set -euo pipefail

WEB_ROOT="/var/www/adpulse"
SITE_NAME="adpulse"
KEEP_RELEASES=5
MIN_NODE="20.19.0"

DOMAIN=""
EMAIL=""
SETUP=false
PULL=true
ROLLBACK=false

usage() {
  sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'
Options:
  --setup            Install dependencies and configure Nginx (first run)
  --domain NAME      Domain for the Nginx site (required with --setup)
  --email ADDRESS    Enable HTTPS with Let's Encrypt using this contact email
  --web-root DIR     Where releases are published (default /var/www/adpulse)
  --no-pull          Build the code as it is, without `git pull`
  --rollback         Switch back to the previous release
  -h, --help         Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --setup) SETUP=true ;;
    --domain) DOMAIN="${2:?--domain needs a value}"; shift ;;
    --email) EMAIL="${2:?--email needs a value}"; shift ;;
    --web-root) WEB_ROOT="${2:?--web-root needs a value}"; shift ;;
    --no-pull) PULL=false ;;
    --rollback) ROLLBACK=true ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1 (see --help)" >&2; exit 1 ;;
  esac
  shift
done

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

if [[ $EUID -eq 0 ]]; then SUDO=""; else SUDO="sudo"; fi
command -v "${SUDO:-true}" >/dev/null || die "sudo is required when not running as root."

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASES="$WEB_ROOT/releases"

reload_nginx() {
  if command -v nginx >/dev/null; then
    $SUDO nginx -t
    # reload-or-restart also starts Nginx if it isn't running yet.
    if ! $SUDO systemctl reload-or-restart nginx 2>/dev/null; then
      $SUDO nginx -s reload 2>/dev/null || $SUDO nginx
    fi
  fi
}

# ---------------------------------------------------------------- rollback --
if $ROLLBACK; then
  current="$(readlink -f "$WEB_ROOT/current" 2>/dev/null || true)"
  [[ -n "$current" ]] || die "Nothing is deployed yet."
  previous="$(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d | sort | grep -B1 -Fx "$current" | head -n1)"
  [[ -n "$previous" && "$previous" != "$current" ]] || die "No older release to roll back to."
  $SUDO ln -sfn "$previous" "$WEB_ROOT/current.tmp"
  $SUDO mv -T "$WEB_ROOT/current.tmp" "$WEB_ROOT/current"
  reload_nginx
  log "Rolled back to $(basename "$previous")."
  exit 0
fi

# ------------------------------------------------------------------- setup --
version_ge() { [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" == "$2" ]]; }

node_ok() {
  command -v node >/dev/null && version_ge "$(node -v | sed 's/^v//')" "$MIN_NODE"
}

if $SETUP; then
  [[ -n "$DOMAIN" ]] || die "--setup needs --domain (e.g. --domain ads.example.com)."
  [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "'$DOMAIN' doesn't look like a domain name."
  command -v apt-get >/dev/null || die "--setup supports Ubuntu/Debian (apt). Install Node $MIN_NODE+ and Nginx manually."

  log "Installing Nginx and tools"
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq nginx git curl ca-certificates

  if ! node_ok; then
    log "Installing Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
    $SUDO apt-get install -y -qq nodejs
  fi

  log "Configuring Nginx for $DOMAIN"
  site_sed=(-e "s|__DOMAIN__|$DOMAIN|g" -e "s|__WEB_ROOT__|$WEB_ROOT|g")
  # Nginx refuses to start with an IPv6 listener on hosts where IPv6 is disabled.
  [[ -s /proc/net/if_inet6 ]] || site_sed+=(-e '/listen \[::\]:80;/d')
  sed "${site_sed[@]}" "$REPO_DIR/deploy/nginx.conf" |
    $SUDO tee "/etc/nginx/sites-available/$SITE_NAME" >/dev/null
  $SUDO ln -sfn "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
  # The stock "Welcome to nginx" site would otherwise answer for the IP address.
  $SUDO rm -f /etc/nginx/sites-enabled/default
fi

node_ok || die "Node.js $MIN_NODE or newer is required (found: $(node -v 2>/dev/null || echo none)). Run with --setup, or install it."

# ------------------------------------------------------------------- build --
cd "$REPO_DIR"
if $PULL && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    die "The repository has local changes. Commit or stash them, or use --no-pull."
  fi
  log "Pulling latest code"
  git pull --ff-only
fi

[[ -f .env ]] || log "No .env file – Facebook Login will ask for the App ID (see .env.example)."

log "Installing dependencies"
npm ci --no-audit --no-fund

log "Building"
npm run build
[[ -f dist/index.html ]] || die "Build did not produce dist/index.html."

# ----------------------------------------------------------------- publish --
release="$RELEASES/$(date -u +%Y%m%d%H%M%S)"
log "Publishing $(basename "$release")"
$SUDO mkdir -p "$release"
$SUDO cp -a dist/. "$release/"
$SUDO chmod -R a+rX "$release"

# Atomic switch: rename a new symlink over the old one.
$SUDO ln -sfn "$release" "$WEB_ROOT/current.tmp"
$SUDO mv -T "$WEB_ROOT/current.tmp" "$WEB_ROOT/current"

# Keep only the newest releases.
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n "+$((KEEP_RELEASES + 1))" |
  while read -r old; do $SUDO rm -rf -- "$old"; done

reload_nginx

if $SETUP && [[ -n "$EMAIL" ]]; then
  log "Enabling HTTPS for $DOMAIN"
  $SUDO apt-get install -y -qq certbot python3-certbot-nginx
  $SUDO certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
elif $SETUP; then
  log "Skipping HTTPS (no --email). Enable it later with: sudo certbot --nginx -d $DOMAIN"
fi

if [[ -n "$DOMAIN" ]]; then
  log "Done. Open $([[ -n "$EMAIL" ]] && echo https || echo http)://$DOMAIN"
else
  log "Done. Live release: $(basename "$release")"
fi
