/**
 * Clean iOS light theme – off-white background, pastel green accent.
 * One-page feel, settings top right, subtle colours.
 */
export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  full: 9999,
};

/** Neutrals + pastel green accent */
const palette = {
  /** Off-white / light cream background */
  background: '#f7f6f4',
  /** Slightly warmer surface for cards */
  surface: '#f0eeeb',
  /** White for elevated (sheets, tab bar) */
  surfaceElevated: '#ffffff',
  /** Pastel green for pills and accent areas */
  accentGreen: '#d4edda',
  /** Green for links, primary actions, active tab */
  tintGreen: '#6bb88a',
  /** Lighter green for secondary emphasis */
  tintGreenLight: '#8fcca4',
};

export const colors = {
  light: {
    background: palette.background,
    surface: palette.surface,
    surfaceElevated: palette.surfaceElevated,
    border: 'rgba(0,0,0,0.06)',
    text: '#2c2c2e',
    textSecondary: '#6d6d72',
    textTertiary: '#9a9a9e',
    tint: palette.tintGreen,
    tintMuted: palette.tintGreenLight,
    accentPill: palette.accentGreen,
    success: '#34c759',
    warning: '#c9a86c',
    danger: '#c75c5c',
    chipStable: '#e8f5ec',
    chipWatch: '#f5f0eb',
    chipAction: '#f5ebeb',
    pillBg: 'rgba(0,0,0,0.06)',
  },
  dark: {
    background: '#000000',
    surface: '#1c1c1e',
    surfaceElevated: '#2c2c2e',
    border: 'rgba(255,255,255,0.08)',
    text: '#f5f5f7',
    textSecondary: '#8e8e93',
    textTertiary: '#636366',
    tint: palette.tintGreenLight,
    tintMuted: '#8fcca4',
    accentPill: 'rgba(212, 237, 218, 0.2)',
    success: '#30d158',
    warning: '#c9a86c',
    danger: '#ff453a',
    chipStable: '#1e2e1e',
    chipWatch: '#2e2a1e',
    chipAction: '#2e1e1e',
    pillBg: 'rgba(255,255,255,0.1)',
  },
};

export type ColorScheme = 'light' | 'dark';
