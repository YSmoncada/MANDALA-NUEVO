import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generador pseudo-aleatorio determinista para distribución uniforme y natural
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface StarData {
  id: number;
  left: number; // porcentaje 0-100
  top: number;  // porcentaje 0-100
  size: number; // 1 a 3.5 px
  phase: number; // 0, 1, 2, 3 o 4 (estática)
  color: string;
  hasGlow: boolean;
}

export default function RollsRoyceStars() {
  // 4 fases de animación para centelleo asíncrono y orgánico (Starlight Headliner)
  const animPhase0 = useRef(new Animated.Value(0.2)).current;
  const animPhase1 = useRef(new Animated.Value(0.3)).current;
  const animPhase2 = useRef(new Animated.Value(0.15)).current;
  const animPhase3 = useRef(new Animated.Value(0.25)).current;

  // Estrella fugaz (Rolls-Royce Shooting Star feature)
  const shootingAnim = useRef(new Animated.Value(0)).current;

  // Generar 110 estrellas distribuidas como el techo Starlight
  const stars: StarData[] = useMemo(() => {
    const list: StarData[] = [];
    const colors = [
      '#FFFFFF',
      '#FFFFFF',
      '#F0F9FF', // sutil tono frío diamante
      '#FEF9C3', // sutil tono cálido estelar
      '#F8FAFC',
    ];

    for (let i = 0; i < 110; i++) {
      const left = pseudoRandom(i * 7 + 1) * 100;
      const top = pseudoRandom(i * 13 + 3) * 100;
      const sizeSeed = pseudoRandom(i * 19 + 5);

      // Mayoría diminutas (fibras ópticas reales de 0.5 a 1.5mm), pocas medianas
      let size = 1.2;
      let hasGlow = false;
      if (sizeSeed > 0.88) {
        size = 2.8;
        hasGlow = true;
      } else if (sizeSeed > 0.65) {
        size = 2.0;
        hasGlow = true;
      } else if (sizeSeed > 0.35) {
        size = 1.5;
      }

      const phase = i % 5; // 0, 1, 2, 3 centellean; 4 es fija tenue de fondo
      const color = colors[i % colors.length];

      list.push({ id: i, left, top, size, phase, color, hasGlow });
    }
    return list;
  }, []);

  useEffect(() => {
    // Configuración de ciclos de respiración / titilación suave
    const createTwinkleLoop = (anim: Animated.Value, duration: number, min: number, max: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop0 = createTwinkleLoop(animPhase0, 2400, 0.2, 1.0);
    const loop1 = createTwinkleLoop(animPhase1, 3600, 0.15, 0.95);
    const loop2 = createTwinkleLoop(animPhase2, 4200, 0.1, 0.85);
    const loop3 = createTwinkleLoop(animPhase3, 2900, 0.25, 0.9);

    loop0.start();
    loop1.start();
    loop2.start();
    loop3.start();

    // Ciclo de estrella fugaz cada 8 segundos
    const triggerShootingStar = () => {
      shootingAnim.setValue(0);
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(shootingAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(5000),
      ]).start(() => triggerShootingStar());
    };

    triggerShootingStar();

    return () => {
      loop0.stop();
      loop1.stop();
      loop2.stop();
      loop3.stop();
      shootingAnim.stopAnimation();
    };
  }, [animPhase0, animPhase1, animPhase2, animPhase3, shootingAnim]);

  // Interpolación de estrella fugaz (diagonal rápida cruzando el cielo)
  const shootTranslateX = shootingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, SCREEN_WIDTH * 0.9],
  });
  const shootTranslateY = shootingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.08, SCREEN_HEIGHT * 0.35],
  });
  const shootOpacity = shootingAnim.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 1, 0.8, 0],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Manto de Estrellas Tipo Rolls-Royce Starlight */}
      {stars.map((star) => {
        let opacityAnim: Animated.Value | number = 0.35;
        if (star.phase === 0) opacityAnim = animPhase0;
        else if (star.phase === 1) opacityAnim = animPhase1;
        else if (star.phase === 2) opacityAnim = animPhase2;
        else if (star.phase === 3) opacityAnim = animPhase3;
        else opacityAnim = 0.3; // estrella tenue estática

        return (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.color,
                opacity: opacityAnim,
              },
              star.hasGlow && {
                shadowColor: '#FFFFFF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: star.size * 1.5,
                elevation: 3,
              },
            ]}
          />
        );
      })}

      {/* Estrella Fugaz Rolls-Royce */}
      <Animated.View
        style={[
          styles.shootingStarContainer,
          {
            opacity: shootOpacity,
            transform: [
              { translateX: shootTranslateX },
              { translateY: shootTranslateY },
              { rotate: '25deg' },
            ],
          },
        ]}
      >
        <View style={styles.shootingStarHead} />
        <View style={styles.shootingStarTail} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 0,
  },
  star: {
    position: 'absolute',
  },
  shootingStarContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    height: 4,
  },
  shootingStarHead: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  shootingStarTail: {
    width: 80,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
});
