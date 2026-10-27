import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


import NoxSidebarTabBar from '../../components/NoxSidebarTabBar';

export default function BartenderLayout() {
  const { isDesktop } = useResponsive();

  return (
    <Tabs
      tabBar={(props) => <NoxSidebarTabBar {...props} roleTitle="BARTENDER" roleSubtitle="Barra & Cocina" hideSettingsOnDesktop={true} />}
      screenOptions={{
        tabBarPosition: isDesktop ? 'right' : 'bottom',
        headerShown: false,
      }}
    >
      {/* TAB 1: Monitor de pedidos pendientes */}
      <Tabs.Screen
        name="prep"
        options={{
          title: "Pendientes",
          tabBarIcon: ({ color }) => <Ionicons name="beer-outline" size={24} color={color} />,
        }}
      />

      {/* TAB 2: Nuevo pedido (bartender también puede tomar pedidos) */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <Ionicons name="fast-food-outline" size={24} color={color} />,
        }}
      />

      {/* TAB 3: Mis pedidos / historial */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Mis Pedidos",
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />

      {/* TAB 4: Perfil y Cierre de sesión */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={24} color={color} />,
        }}
      />

      {/* Ocultar index genérico */}
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}
