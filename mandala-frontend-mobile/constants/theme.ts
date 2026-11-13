/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const NoxColors = {
  aura: '#FFFFFF',          // Blanco Puro Luxury (Acento principal estilo Login)
  auraSilver: '#E4E4E7',    // Platino plateado para acentos secundarios
  background: 'transparent', // Fondo transparente para lucir las estrellas Rolls-Royce
  card: '#0E0E12',          // Obsidiana mate premium (Tarjeta idéntica al Login)
  cardSecondary: '#141419', // Superficie secundaria / tarjetas anidadas
  container: '#16161D',     // Superficie oscura para botones e inputs
  inputBg: '#09090C',       // Fondo de inputs oscurecido estilo Login
  muted: '#A1A1AA',         // Gris Zinc Claro (Labels, textos de apoyo)
  subtext: '#71717A',       // Gris Zinc Medio (Descripciones secundarias, estilo Login)
  border: 'rgba(255, 255, 255, 0.08)', // Bordes sutiles ultra refinados
  borderStrong: 'rgba(255, 255, 255, 0.16)', // Bordes acentuados
  emerald: '#10B981',       // Verde Éxito / Online / Ingresos
  amber: '#F59E0B',         // Naranja Alerta
  rose: '#EF4444',          // Rojo Peligro / Salir / Crítico
  text: '#FFFFFF',          // Blanco Puro (Títulos principales)
  deep: '#000000',          // Negro Absoluto
  gray: '#52525B',          // Gris zinc medio / placeholders
  silver: '#E4E4E7',        // Detalle platino
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: NoxColors.aura,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: NoxColors.aura,
  },
  dark: {
    text: NoxColors.text,
    background: NoxColors.deep,
    tint: NoxColors.aura,
    icon: NoxColors.subtext,
    tabIconDefault: NoxColors.subtext,
    tabIconSelected: NoxColors.aura,
    card: NoxColors.card,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
