/**
 * Chart colours. Categorical order is CVD-validated – assign slots in order,
 * by entity, never by rank. Light and dark steps are chosen per surface.
 */
export const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

/** Ordinal blue ramp for ordered stages (funnel), lightest step still clears 2:1. */
export const ORDINAL = {
  light: ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95'],
  dark: ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef'],
}

export const CHROME = {
  light: {
    surface: '#ffffff',
    text: '#0b0b0b',
    text2: '#52514e',
    muted: '#898781',
    grid: '#ecebe6',
    axis: '#c3c2b7',
    previous: '#b4b2a9',
    other: '#b4b2a9',
  },
  dark: {
    surface: '#1a1a19',
    text: '#ffffff',
    text2: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    previous: '#5f5e59',
    other: '#5f5e59',
  },
}

export type ChartTheme = (typeof CHROME)['light'] & { series: string[]; ordinal: string[] }

export function chartTheme(mode: 'light' | 'dark'): ChartTheme {
  return { ...CHROME[mode], series: SERIES[mode], ordinal: ORDINAL[mode] }
}
