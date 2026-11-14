import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generador pseudo-aleatorio determinista para distribución uniforme y natural
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface StarData {
  id: number;
  left: number;  // 0-100%
  top: number;   // 0-100%
  size: number;  // 1 a 2.5 px
  phase: number; // 0, 1, 2 (fase de titilación)
  color: string;
}

// Inyección de keyframes CSS en Web para ejecución directa en GPU/compositor
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'noxos-rollsroyce-stars-css';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes noxTwinkle0 {
        0%, 100% { opacity: 0.2; transform: scale(0.9); }
        50% { opacity: 0.95; transform: scale(1.15); }
      }
      @keyframes noxTwinkle1 {
        0%, 100% { opacity: 0.85; transform: scale(1.1); }
        50% { opacity: 0.15; transform: scale(0.85); }
      }
      @keyframes noxTwinkle2 {
        0%, 100% { opacity: 0.3; transform: scale(0.95); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes noxShooting {
        0% { transform: translate3d(-100px, 30px, 0) rotate(22deg); opacity: 0; }
        4% { opacity: 1; }
        16% { transform: translate3d(105vw, 40vh, 0) rotate(22deg); opacity: 0; }
        100% { transform: translate3d(105vw, 40vh, 0) rotate(22deg); opacity: 0; }
      }
      .nox-star-p0 { animation: noxTwinkle0 3.2s infinite ease-in-out; }
      .nox-star-p1 { animation: noxTwinkle1 4.5s infinite ease-in-out; }
      .nox-star-p2 { animation: noxTwinkle2 2.8s infinite ease-in-out; }
      .nox-star-static { opacity: 0.35; }
      .nox-shooting-star { animation: noxShooting 10s infinite cubic-bezier(0.25, 0.1, 0.25, 1); }
    `;
    document.head.appendChild(style);
  }
}

function RollsRoyceStarsComponent() {
  const isWeb = Platform.OS === 'web';
  const starCount = isWeb ? 55 : 32; // Equilibrado para máximo rendimiento

  // Generar lista fija de estrellas determinista
  const stars: StarData[] = useMemo(() => {
    const list: StarData[] = [];
    const colors = ['#FFFFFF', '#FFFFFF', '#F0F9FF', '#FEF9C3', '#E2E8F0'];

    for (let i = 0; i < starCount; i++) {
      const left = pseudoRandom(i * 7 + 1) * 100;
      const top = pseudoRandom(i * 13 + 3) * 100;
      const sizeSeed = pseudoRandom(i * 19 + 5);

      let size = 1.2;
      if (sizeSeed > 0.82) {
        size = 2.4;
      } else if (sizeSeed > 0.5) {
        size = 1.8;
      }

      const phase = i % 4; // 0, 1, 2 son animadas; 3 es fija tenue
      const color = colors[i % colors.length];

      list.push({ id: i, left, top, size, phase, color });
    }
    return list;
  }, [starCount]);

  // Animaciones para plataformas Nativas (Expo Go iOS/Android) con useNativeDriver: true
  const animPhase0 = useRef(new Animated.Value(0.25)).current;
  const animPhase1 = useRef(new Animated.Value(0.8)).current;
  const shootingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWeb) return; // En Web usamos CSS puro, 0% CPU JS

    const loop0 = Animated.loop(
      Animated.sequence([
        Animated.timing(animPhase0, { toValue: 0.95, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(animPhase0, { toValue: 0.2, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(animPhase1, { toValue: 0.2, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(animPhase1, { toValue: 0.9, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    loop0.start();
    loop1.start();

    let isMounted = true;
    const triggerShootingStar = () => {
      if (!isMounted) return;
      shootingAnim.setValue(0);
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(shootingAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(6000),
      ]).start(() => {
        if (isMounted) triggerShootingStar();
      });
    };

    triggerShootingStar();

    return () => {
      isMounted = false;
      loop0.stop();
      loop1.stop();
      shootingAnim.stopAnimation();
    };
  }, [isWeb, animPhase0, animPhase1, shootingAnim]);

  // En Web: renderizado puro con clases CSS aceleradas por GPU
  if (isWeb) {
    return (
      <View style={styles.container} pointerEvents="none">
        {stars.map((star) => {
          let className = 'nox-star-static';
          if (star.phase === 0) className = 'nox-star-p0';
          else if (star.phase === 1) className = 'nox-star-p1';
          else if (star.phase === 2) className = 'nox-star-p2';

          return (
            <View
              key={star.id}
              // @ts-ignore className en web
              className={className}
              style={[
                styles.star,
                {
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size / 2,
                  backgroundColor: star.color,
                },
              ]}
            />
          );
        })}

        {/* Estrella Fugaz Web */}
        <View
          // @ts-ignore className en web
          className="nox-shooting-star"
          style={styles.shootingStarContainer}
        >
          <View style={styles.shootingStarHead} />
          <View style={styles.shootingStarTail} />
        </View>
      </View>
    );
  }

  // En Native (iOS/Android - Expo Go): 2 fases optimizadas con useNativeDriver
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
      {stars.map((star) => {
        const opacity = star.phase === 0 ? animPhase0 : star.phase === 1 ? animPhase1 : 0.35;
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
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Estrella Fugaz Nativa */}
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

export default React.memo(RollsRoyceStarsComponent);

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
  },
  shootingStarTail: {
    width: 70,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 1,
  },
});
