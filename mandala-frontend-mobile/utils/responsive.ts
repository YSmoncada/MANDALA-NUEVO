import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Consideramos pantalla grande/PC o tablet en horizontal a partir de 768px
  const isDesktop = width >= 768;
  const isLargeScreen = width >= 1024;
  const isWide = width >= 1280;

  return {
    width,
    height,
    isMobile: !isDesktop,
    isDesktop,
    isLargeScreen,
    isWide,
    // Dimensiones máximas estándar para PC
    maxContentWidth: 1200,
    maxModalWidth: 540,
    maxFormWidth: 460,
  };
}
