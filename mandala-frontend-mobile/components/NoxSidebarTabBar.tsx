import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NoxColors } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { useAuthStore } from '../store/authStore';

interface NoxSidebarTabBarProps {
  state: any;
  descriptors: any;
  navigation?: any;
  emitter?: any;
  navigateToTab?: (routeKey: string) => void;
  insets?: any;
  roleTitle?: string;
  roleSubtitle?: string;
  hideSettingsOnDesktop?: boolean;
}

export default function NoxSidebarTabBar({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
  roleTitle = 'SISTEMA',
  roleSubtitle = 'Mandala NoxOS',
  hideSettingsOnDesktop = false,
}: NoxSidebarTabBarProps) {
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Manejador seguro de cambio de pestaña compatible con Expo SDK 58 (Expo Router / React Navigation)
  const handleTabPress = (route: any, isActuallyFocused: boolean) => {
    let event: any = undefined;
    if (emitter?.emit) {
      event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
    } else if (navigation?.emit) {
      event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
    }

    if (!isActuallyFocused && !event?.defaultPrevented) {
      if (typeof navigateToTab === 'function') {
        try {
          navigateToTab(route.key);
        } catch (e) {
          router.push(route.name as any);
        }
      } else if (navigation?.navigate) {
        navigation.navigate(route.name);
      } else {
        router.push(route.name as any);
      }
    }
  };

  // Filtrar estrictamente solo las rutas principales con ícono y sin href: null / display: none
  const visibleRoutes = (state.routes || []).filter((route: any) => {
    const { options } = descriptors[route.key];
    if (!options) return false;
    if ((options as any).href === null) return false;
    if ((options.tabBarItemStyle as any)?.display === 'none') return false;
    if (typeof options.tabBarButton === 'function') {
      try {
        const btn = options.tabBarButton({} as any);
        if (btn === null) return false;
      } catch (e) {}
    }
    // Debe tener ícono definido explícitamente en el layout
    if (typeof options.tabBarIcon !== 'function') return false;
    // Ocultar pestaña de Perfil/Ajustes en Desktop si fue solicitado (ej. mesera y bartender)
    if (isDesktop && hideSettingsOnDesktop && route.name === 'settings') return false;
    return true;
  });

  const handleLogout = () => {
    clearAuth();
    setShowLogoutConfirm(false);
    router.replace('/(auth)/login');
  };

  // ==========================================
  // 1. MÓVIL (< 768px): Barra Inferior Elegante
  // ==========================================
  if (!isDesktop) {
    return (
      <View style={styles.mobileTabBar}>
        {visibleRoutes.map((route: any) => {
          const currentRouteName = state.routes[state.index]?.name;
          const isSettingsSubroute = roleTitle === 'ADMINISTRADOR' && ['users', 'mesas', 'bartender', 'accounting', 'history'].includes(currentRouteName);
          const isActuallyFocused = state.routes[state.index]?.key === route.key;
          const isFocused = isActuallyFocused || (route.name === 'settings' && isSettingsSubroute);
          const { options } = descriptors[route.key];
          const rawLabel =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;

          const onPress = () => handleTabPress(route, isActuallyFocused);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.mobileTabItem}
              activeOpacity={0.7}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? NoxColors.aura : NoxColors.muted,
                size: 22,
              })}
              <Text
                style={[
                  styles.mobileTabLabel,
                  { color: isFocused ? NoxColors.aura : NoxColors.muted },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ==========================================
  // 2. DESKTOP / PC (>= 768px): Barra Lateral a la DERECHA
  // ==========================================
  return (
    <View style={styles.desktopSidebar}>
      {/* 2.1 Encabezado NoxOS */}
      <View style={styles.desktopHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>Nox<Text style={{ color: NoxColors.aura }}>OS</Text></Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ONLINE</Text>
          </View>
        </View>

        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleTitle}</Text>
        </View>
      </View>

      {/* 2.2 Lista de Navegación Vertical */}
      <View style={styles.navSection}>
        <Text style={styles.sectionHeader}>NAVEGACIÓN</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {visibleRoutes.map((route: any) => {
            const currentRouteName = state.routes[state.index]?.name;
            const isSettingsSubroute = roleTitle === 'ADMINISTRADOR' && ['users', 'mesas', 'bartender', 'accounting', 'history'].includes(currentRouteName);
            const isActuallyFocused = state.routes[state.index]?.key === route.key;
            const isFocused = isActuallyFocused || (route.name === 'settings' && isSettingsSubroute);
            const { options } = descriptors[route.key];
            const rawLabel =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;
            const label = typeof rawLabel === 'string' ? rawLabel : route.name;

            const onPress = () => handleTabPress(route, isActuallyFocused);

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[
                  styles.desktopTabItem,
                  isFocused && styles.desktopTabItemActive,
                ]}
                activeOpacity={0.7}
              >
                {/* Contenedor del ícono */}
                <View
                  style={[
                    styles.iconBox,
                    isFocused ? styles.iconBoxActive : styles.iconBoxInactive,
                  ]}
                >
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused ? '#FFFFFF' : NoxColors.muted,
                    size: 20,
                  })}
                </View>

                {/* Texto del ítem — ¡Garantizado en BLANCO puro si está activo! */}
                <Text
                  style={[
                    styles.desktopTabLabel,
                    isFocused ? styles.desktopTabLabelActive : styles.desktopTabLabelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>

                {/* Indicador neón derecho */}
                {isFocused && <View style={styles.activePill} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2.3 Pie de Barra Lateral: Info Usuario & Cerrar Sesión */}
      <View style={styles.desktopFooter}>
        <View style={styles.userInfoRow}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={16} color={NoxColors.aura} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.nombre || user?.username || 'Usuario'}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {user?.rol ? user.rol.toUpperCase() : roleSubtitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutConfirm(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="power-outline" size={18} color={NoxColors.rose} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Confirmación Cerrar Sesión */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={32} color={NoxColors.rose} />
            </View>
            <Text style={styles.modalTitle}>¿Cerrar Sesión?</Text>
            <Text style={styles.modalDesc}>Saldrás de tu cuenta actual y volverás a la pantalla de login.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleLogout}
              >
                <Text style={styles.modalLogoutText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // MÓVIL
  mobileTabBar: {
    flexDirection: 'row',
    height: 62,
    backgroundColor: NoxColors.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
    paddingTop: 6,
    alignItems: 'center',
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // DESKTOP (Sidebar a la DERECHA)
  desktopSidebar: {
    width: 250,
    backgroundColor: NoxColors.card,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  desktopHeader: {
    marginBottom: 26,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NoxColors.emerald,
    marginRight: 5,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: NoxColors.emerald,
    letterSpacing: 1,
  },
  rolePill: {
    backgroundColor: 'rgba(169, 68, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.35)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  rolePillText: {
    color: NoxColors.aura,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // SECCIÓN NAVEGACIÓN
  navSection: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: NoxColors.muted,
    letterSpacing: 2,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  desktopTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  desktopTabItemActive: {
    backgroundColor: 'rgba(169, 68, 255, 0.18)',
    borderColor: NoxColors.aura,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: NoxColors.aura,
  },
  iconBoxInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  desktopTabLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    flex: 1,
  },
  desktopTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  desktopTabLabelInactive: {
    color: NoxColors.muted,
    fontWeight: '600',
  },
  activePill: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: NoxColors.aura,
    marginLeft: 6,
  },

  // FOOTER
  desktopFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(169, 68, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  userRole: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
  },
  logoutText: {
    color: NoxColors.rose,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // MODAL LOGOUT
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: NoxColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: NoxColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: NoxColors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  modalLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: NoxColors.rose,
    alignItems: 'center',
  },
  modalLogoutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
