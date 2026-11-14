import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Inyección de estilos de scrollbar oscura y discreta para Web (elimina scrollbars blancas de raíz)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'noxos-custom-scrollbar';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: #27272A #000000;
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: #000000 !important;
      }
      ::-webkit-scrollbar-thumb {
        background: #27272A !important;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #3F3F46 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

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
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }} />
      <StatusBar style="light" />

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
    </View>
  );
}
