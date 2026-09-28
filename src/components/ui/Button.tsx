import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110 active:brightness-95 shadow-card',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-surface-2 shadow-card',
  ghost: 'text-fg-2 hover:bg-surface-3 hover:text-fg',
  danger: 'bg-bad text-white hover:brightness-110',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-3.5 text-sm gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl justify-center',
  'icon-sm': 'h-8 w-8 rounded-lg justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex shrink-0 cursor-pointer select-none items-center font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
})
