import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

const ADMIN_OPERATIONS = [
  { name: 'mesas', label: 'Mesas', icon: 'restaurant-outline', desc: 'Control de salón' },
  { name: 'bartender', label: 'Barra', icon: 'beer-outline', desc: 'Monitor de pedidos' },
  { name: 'accounting', label: 'Caja & Turnos', icon: 'wallet-outline', desc: 'Cuadre y cierres' },
  { name: 'history', label: 'Historial', icon: 'time-outline', desc: 'Registro de ventas' },
  { name: 'users', label: 'Personal', icon: 'people-outline', desc: 'Meseros y accesos' },
  { name: 'settings', label: 'Ajustes', icon: 'settings-outline', desc: 'Configuración global' },
];

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
  const { clearAuth } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOperationsHub, setShowOperationsHub] = useState(false);
  const safeInsets = useSafeAreaInsets();

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

  // Navegación rápida desde el Hub de Operaciones para Admin
  const handleSelectOperation = (opName: string) => {
    setShowOperationsHub(false);
    try {
      if (navigation?.navigate) {
        navigation.navigate(opName);
      } else {
        router.push(`/(admin)/${opName}` as any);
      }
    } catch (e) {
      router.push(`/(admin)/${opName}` as any);
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
    // Ocultar pestaña de Perfil/Ajustes en Desktop si fue solicitado
    if (isDesktop && hideSettingsOnDesktop && route.name === 'settings') return false;
    return true;
  });

  const handleLogout = () => {
    clearAuth();
    setShowLogoutConfirm(false);
    setShowOperationsHub(false);
    router.replace('/(auth)/login');
  };

  // Modal común de confirmación de Cerrar Sesión
  const renderLogoutModal = () => (
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
  );

  // ==========================================
  // 1. MÓVIL (< 768px): Barra Inferior Clásica Elegante
  // ==========================================
  if (!isDesktop) {
    const bottomInset = Math.max(safeInsets.bottom, 8);
    return (
      <>
        <View style={[styles.mobileTabBar, { paddingBottom: bottomInset, minHeight: 56 + bottomInset, height: undefined }]}>
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
                  color: isFocused ? '#FFFFFF' : NoxColors.subtext,
                  size: 22,
                })}
                <Text
                  style={[
                    styles.mobileTabLabel,
                    { color: isFocused ? '#FFFFFF' : NoxColors.subtext },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {renderLogoutModal()}
      </>
    );
  }

  // ==========================================
  // 2. DESKTOP / PC (>= 768px): DUAL CAPSULE HUB FLOTANTE
  // ==========================================
  const currentRouteName = state.routes[state.index]?.name;

  // 2.A ROL ADMINISTRADOR: Dual Capsule (Core Tabs + Operaciones Hub Popover + Cerrar Sesión)
  if (roleTitle === 'ADMINISTRADOR') {
    // Rutas Core para la Cápsula 1 (Dashboard, Inventario, Órdenes)
    const coreRoutes = visibleRoutes.filter((r: any) => ['index', 'inventory', 'orders'].includes(r.name));

    // Determinar si alguna operación secundaria está activa
    const activeOperation = ADMIN_OPERATIONS.find(op => op.name === currentRouteName);
    const isOperationActive = Boolean(activeOperation);

    return (
      <>
        {/* Backdrop para cerrar el popover al hacer clic afuera */}
        {showOperationsHub && (
          <TouchableOpacity
            style={styles.popoverBackdrop}
            activeOpacity={1}
            onPress={() => setShowOperationsHub(false)}
          />
        )}

        <View style={styles.dockOuterContainer} pointerEvents="box-none">
          {/* POPUP DE OPERACIONES FLOTANTE HACIA ARRIBA */}
          {showOperationsHub && (
            <View style={styles.hubFlyupCard}>
              <View style={styles.hubHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="apps" size={14} color="#00E5FF" />
                  <Text style={styles.hubHeaderTitle}>MÓDULOS DE GESTIÓN NOX</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowOperationsHub(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={NoxColors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.hubGrid}>
                {ADMIN_OPERATIONS.map((op) => {
                  const isOpCurrent = currentRouteName === op.name;
                  return (
                    <TouchableOpacity
                      key={op.name}
                      style={[
                        styles.hubTile,
                        isOpCurrent && styles.hubTileActive,
                      ]}
                      onPress={() => handleSelectOperation(op.name)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.hubTileIconBox,
                        isOpCurrent && styles.hubTileIconBoxActive,
                      ]}>
                        <Ionicons
                          name={op.icon as any}
                          size={18}
                          color={isOpCurrent ? '#00E5FF' : NoxColors.subtext}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.hubTileTitle,
                            isOpCurrent && styles.hubTileTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {op.label}
                        </Text>
                        <Text style={styles.hubTileDesc} numberOfLines={1}>
                          {op.desc}
                        </Text>
                      </View>
                      {isOpCurrent && <View style={styles.hubTileDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* FILA DE LAS DOS CÁPSULAS FLOTANTES */}
          <View style={styles.dualCapsuleRow}>
            {/* CÁPSULA 1: NAVEGACIÓN CORE (Dashboard, Inventario, Órdenes) */}
            <View style={styles.coreCapsule}>
              {coreRoutes.map((route: any) => {
                const isFocused = currentRouteName === route.name;
                const { options } = descriptors[route.key];
                const rawLabel =
                  options.tabBarLabel !== undefined
                    ? options.tabBarLabel
                    : options.title !== undefined
                    ? options.title
                    : route.name;
                const label = typeof rawLabel === 'string' ? rawLabel : route.name;

                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={() => handleTabPress(route, isFocused)}
                    style={[
                      styles.capsuleTabItem,
                      isFocused ? styles.capsuleTabActive : styles.capsuleTabInactive,
                    ]}
                    activeOpacity={0.7}
                  >
                    {options.tabBarIcon?.({
                      focused: isFocused,
                      color: isFocused ? '#0A0A0C' : '#A1A1AA',
                      size: 18,
                    })}
                    <Text
                      style={[
                        styles.capsuleTabLabel,
                        isFocused ? styles.capsuleTabLabelActive : styles.capsuleTabLabelInactive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* CÁPSULA 2: HUB DE OPERACIONES + CERRAR SESIÓN */}
            <View style={styles.hubCapsule}>
              {/* Botón Desplegable de Operaciones */}
              <TouchableOpacity
                style={[
                  styles.hubTriggerBtn,
                  (isOperationActive || showOperationsHub) && styles.hubTriggerBtnActive,
                ]}
                onPress={() => setShowOperationsHub(!showOperationsHub)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isOperationActive || showOperationsHub ? "apps" : "apps-outline"}
                  size={18}
                  color={isOperationActive || showOperationsHub ? "#00E5FF" : "#A1A1AA"}
                />
                <Text
                  style={[
                    styles.hubTriggerLabel,
                    (isOperationActive || showOperationsHub) && styles.hubTriggerLabelActive,
                  ]}
                >
                  {isOperationActive && activeOperation ? activeOperation.label : "Operaciones"}
                </Text>
                <Ionicons
                  name={showOperationsHub ? "chevron-down" : "chevron-up"}
                  size={14}
                  color={isOperationActive || showOperationsHub ? "#00E5FF" : "#71717A"}
                />
              </TouchableOpacity>

              {/* Separador sutil */}
              <View style={styles.capsuleDivider} />

              {/* Botón Cerrar Sesión */}
              <TouchableOpacity
                style={styles.dockLogoutBtn}
                onPress={() => setShowLogoutConfirm(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="power-outline" size={16} color={NoxColors.rose} />
                <Text style={styles.dockLogoutText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {renderLogoutModal()}
      </>
    );
  }

  // 2.B OTROS ROLES EN DESKTOP (Mesera, Bartender): Cápsula Única Flotante Limpia
  return (
    <>
      <View style={styles.dockOuterContainer} pointerEvents="box-none">
        <View style={styles.singleCapsule}>
          {/* Pestañas de navegación */}
          {visibleRoutes.map((route: any) => {
            const isFocused = currentRouteName === route.name;
            const { options } = descriptors[route.key];
            const rawLabel =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;
            const label = typeof rawLabel === 'string' ? rawLabel : route.name;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => handleTabPress(route, isFocused)}
                style={[
                  styles.capsuleTabItem,
                  isFocused ? styles.capsuleTabActive : styles.capsuleTabInactive,
                ]}
                activeOpacity={0.7}
              >
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: isFocused ? '#0A0A0C' : '#A1A1AA',
                  size: 18,
                })}
                <Text
                  style={[
                    styles.capsuleTabLabel,
                    isFocused ? styles.capsuleTabLabelActive : styles.capsuleTabLabelInactive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Separador sutil */}
          <View style={styles.capsuleDivider} />

          {/* Botón Cerrar Sesión */}
          <TouchableOpacity
            style={styles.dockLogoutBtn}
            onPress={() => setShowLogoutConfirm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="power-outline" size={16} color={NoxColors.rose} />
            <Text style={styles.dockLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderLogoutModal()}
    </>
  );
}

const styles = StyleSheet.create({
  // ==========================================
  // ESTILOS MÓVIL
  // ==========================================
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

  // ==========================================
  // ESTILOS DESKTOP (DUAL CAPSULE DOCK)
  // ==========================================
  dockOuterContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  dualCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coreCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 18, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 30,
    paddingVertical: 5,
    paddingHorizontal: 6,
    gap: 4,
    boxShadow: '0 14px 40px rgba(0, 0, 0, 0.75)',
    elevation: 12,
  },
  hubCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 18, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 30,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
    boxShadow: '0 14px 40px rgba(0, 0, 0, 0.75)',
    elevation: 12,
  },
  capsuleTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 8,
  },
  capsuleTabActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(255, 255, 255, 0.25)',
  },
  capsuleTabInactive: {
    backgroundColor: 'transparent',
  },
  capsuleTabLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  capsuleTabLabelActive: {
    color: '#0A0A0C',
    fontWeight: '800',
  },
  capsuleTabLabelInactive: {
    color: '#A1A1AA',
    fontWeight: '600',
  },

  // TRIGGER DEL HUB
  hubTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hubTriggerBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  hubTriggerLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  hubTriggerLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ELEMENTOS COMUNES EN CÁPSULAS
  capsuleDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginHorizontal: 2,
  },
  dockLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.22)',
  },
  dockLogoutText: {
    color: NoxColors.rose,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // POPOVER FLOTANTE (HUB DE OPERACIONES)
  popoverBackdrop: {
    position: 'fixed' as any,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hubFlyupCard: {
    position: 'absolute',
    bottom: 64,
    width: 440,
    maxWidth: '92%',
    backgroundColor: 'rgba(15, 15, 18, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    padding: 16,
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    elevation: 20,
    zIndex: 10000,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  hubHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: NoxColors.subtext,
    letterSpacing: 1.5,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubTile: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  hubTileActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  hubTileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  hubTileIconBoxActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  hubTileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 2,
  },
  hubTileTitleActive: {
    color: '#00E5FF',
    fontWeight: '800',
  },
  hubTileDesc: {
    fontSize: 10,
    color: NoxColors.subtext,
  },
  hubTileDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
    marginLeft: 4,
  },

  // CÁPSULA ÚNICA (MESERA / BARTENDER EN DESKTOP)
  singleCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 18, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 30,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
    boxShadow: '0 14px 40px rgba(0, 0, 0, 0.75)',
    elevation: 12,
  },
  singleCapsuleRolePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 2,
  },
  singleCapsuleRoleText: {
    color: NoxColors.subtext,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ==========================================
  // MODAL LOGOUT
  // ==========================================
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
    elevation: 20,
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
