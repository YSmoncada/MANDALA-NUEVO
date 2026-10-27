import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


import NoxSidebarTabBar from '../../components/NoxSidebarTabBar';

export default function AdminLayout() {
  const { isDesktop } = useResponsive();

  return (
    <Tabs 
      tabBar={(props) => <NoxSidebarTabBar {...props} roleTitle="ADMINISTRADOR" roleSubtitle="Control General" />}
      screenOptions={{ 
        tabBarPosition: isDesktop ? 'right' : 'bottom',
        headerShown: false,
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Inicio",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{ 
          title: "Inventario",
          tabBarIcon: ({ color }) => <Ionicons name="cube" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: "Órdenes",
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Ajustes",
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />
        }} 
      />
      {/* Pantallas secundarias de gestión accesibles sin botón en la barra */}
      <Tabs.Screen name="users" options={{ title: "Usuarios", tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="mesas" options={{ title: "Mesas", tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="bartender" options={{ title: "Barra", tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="accounting" options={{ title: "Contabilidad", tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="history" options={{ title: "Historial", tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}
