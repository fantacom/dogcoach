import { useColorScheme } from 'react-native';

/** Farben für native Props (Header, Tabbar, Icons), passend zu tailwind.config.js. */
export function useThemeColors() {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    primary: dark ? '#7CC4A8' : '#2F6B57',
    bg: dark ? '#141412' : '#FAF7F2',
    surface: dark ? '#1F1E1B' : '#FFFFFF',
    ink: dark ? '#F2EFEA' : '#1F1D1A',
    muted: dark ? '#B5B0A7' : '#5E5A53',
    border: dark ? '#3A3833' : '#DDD7CD',
  };
}
