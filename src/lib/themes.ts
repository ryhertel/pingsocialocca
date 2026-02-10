import type { ThemePreset } from './types';

export const themePresets: Record<ThemePreset, {
  name: string;
  glowPrimary: string;
  glowSecondary: string;
  accent: string;
}> = {
  mint: {
    name: 'Mint',
    glowPrimary: '160, 100%, 50%',
    glowSecondary: '150, 80%, 60%',
    accent: '155, 90%, 45%',
  },
  sky: {
    name: 'Sky',
    glowPrimary: '195, 100%, 50%',
    glowSecondary: '205, 80%, 60%',
    accent: '200, 90%, 45%',
  },
  berry: {
    name: 'Berry',
    glowPrimary: '320, 100%, 55%',
    glowSecondary: '330, 80%, 65%',
    accent: '325, 90%, 50%',
  },
  honey: {
    name: 'Honey',
    glowPrimary: '40, 100%, 50%',
    glowSecondary: '35, 80%, 60%',
    accent: '38, 90%, 45%',
  },
};
