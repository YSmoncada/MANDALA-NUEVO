import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


import NoxSidebarTabBar from '../../components/NoxSidebarTabBar';

export default function MeseraLayout() {
  const { isDesktop } = useResponsive();

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
