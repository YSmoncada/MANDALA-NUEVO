import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthStore, getDashboardRoute } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';
import NoxAlert from '../components/NoxAlert';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { token, user } = useAuthStore();
  const navigationState = useRootNavigationState();
  
  // Estado de la alerta global
  const alert = useAlertStore();

  useEffect(() => {
    if (!navigationState?.key) return;

    // Usar un tiempo de espera corto para asegurar que el componente Layout se haya montado por completo
    const timer = setTimeout(() => {
      const inAuthGroup = (segments as readonly string[])[0] === '(auth)';
      const inClientGroup = (segments as readonly string[])[0] === '(client)' || (segments as readonly string[]).includes('(client)') || (segments as readonly string[])[0] === '[id]';

      // 1. Si NO hay token y NO estamos en login o cliente, mandar a login
      if (!token && !inAuthGroup && !inClientGroup) {
        router.replace('/(auth)/login');
        return;
      }

      // 2. Si HAY token y estamos en la pantalla de login, mandar a su dashboard
      if (token && inAuthGroup) {
        const route = getDashboardRoute(user?.role);
        router.replace(route as any);
      }

      // 3. Protección de roles cruzados (opcional pero recomendado)
      if (token && user) {
          const role = user.role?.toLowerCase();
          const currentGroup = segments[0];

          if (currentGroup === '(admin)' && role !== 'admin') {
              router.replace('/(auth)/login');
          }
          if (currentGroup === '(bartender)' && role !== 'bartender' && role !== 'admin') {
              router.replace('/(auth)/login');
          }
      }
    }, 1);

    return () => clearTimeout(timer);
  }, [token, segments, user, navigationState?.key]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />

      {/* Sistema de Alerta Global */}
      <NoxAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        onConfirm={() => {
          if (alert.onConfirm) alert.onConfirm();
          alert.hideAlert();
        }}
      />
    </>
  );
}
