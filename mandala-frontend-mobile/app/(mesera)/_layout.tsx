import React, { useEffect, useRef } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import NoxSidebarTabBar from '../../components/NoxSidebarTabBar';

export default function MeseraLayout() {
  const { isDesktop } = useResponsive();
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const knownPedidoIds = useRef<Set<number>>(new Set());
  const knownPidiendoMesas = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);

  // Monitor en segundo plano para notificar a la mesera cuando se le asigne un pedido o cuenta
  useEffect(() => {
    if (!user) return;

    const checkAssignedActivity = async () => {
      try {
        const id = user.id ? parseInt(String(user.id), 10) : undefined;
        const url = id && !isNaN(id) ? `/pedidos/?usuario=${id}` : '/pedidos/';

        const [pedRes, mesasRes] = await Promise.allSettled([
          apiClient.get(url),
          apiClient.get('/mesas/')
        ]);

        // 1. Detectar pedidos nuevos asignados
        if (pedRes.status === 'fulfilled' && Array.isArray(pedRes.value.data)) {
          const pedidos: any[] = pedRes.value.data;
          if (!initialLoadDone.current) {
            pedidos.forEach(p => knownPedidoIds.current.add(p.id));
            initialLoadDone.current = true;
          } else {
            for (const p of pedidos) {
              if (!knownPedidoIds.current.has(p.id)) {
                knownPedidoIds.current.add(p.id);
                // Si el pedido fue tomado por personal/mesera, NO alertar asignación
                if (!p.origen_cliente) {
                  continue;
                }
                const mesaNum = p.mesa_numero || p.mesa;
                const itemsCount = (p.productos_detalle || p.detalles || []).length;
                useAlertStore.getState().showAlert(
                  '🛎️ ¡NUEVO PEDIDO DE CLIENTE (QR)!',
                  `Un cliente en la Mesa #${mesaNum} realizó un pedido (${itemsCount} producto${itemsCount > 1 ? 's' : ''}).`,
                  'info',
                  () => router.push('/(mesera)/history'),
                  'VER COMANDA'
                );
                break;
              }
            }
          }
        }

        // 2. Detectar solicitud de cuenta en mesas asignadas
        if (mesasRes.status === 'fulfilled' && Array.isArray(mesasRes.value.data)) {
          const mesas: any[] = mesasRes.value.data;
          const myId = user.id ? parseInt(String(user.id), 10) : undefined;

          for (const m of mesas) {
            const isMyTable = myId ? m.mesero_id === myId : true;
            if (isMyTable && m.pidiendo_cuenta) {
              if (!knownPidiendoMesas.current.has(m.id)) {
                knownPidiendoMesas.current.add(m.id);
                // Limpiar de inmediato en backend para que no se repita en cada ciclo
                try {
                  await apiClient.post(`/mesas/${m.id}/limpiar-cuenta/`);
                } catch (e) {}

                useAlertStore.getState().showAlert(
                  '💳 ¡CUENTA SOLICITADA!',
                  `La Mesa #${m.numero} ha solicitado la cuenta.`,
                  'warning',
                  () => router.push('/(mesera)/history'),
                  'IR A LA MESA'
                );
              }
            } else {
              knownPidiendoMesas.current.delete(m.id);
            }
          }
        }
      } catch (e) {
        // Silencioso en caso de error transitorio
      }
    };

    checkAssignedActivity();
    const interval = setInterval(checkAssignedActivity, 6000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <Tabs
      tabBar={(props) => <NoxSidebarTabBar {...props} roleTitle="SERVICIO" roleSubtitle="Meseros & Atención" hideSettingsOnDesktop={true} />}
      screenOptions={{
        tabBarPosition: isDesktop ? 'right' : 'bottom',
        headerShown: false,
      }}
    >
      {/* TAB 1: Realizar pedidos — aparece primero */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <Ionicons name="fast-food-outline" size={24} color={color} />,
        }}
      />

      {/* TAB 2: Historial de mis pedidos */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Mis Pedidos",
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />

      {/* TAB 3: Perfil y Ajustes de mesero */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={24} color={color} />,
        }}
      />

      {/* Ocultar index (pantalla de Mesas) de la navegación del mesero */}
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
    </Tabs>
  );
}
