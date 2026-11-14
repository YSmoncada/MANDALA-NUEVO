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
        tabBarPosition: 'bottom',
        headerShown: false,
        sceneStyle: { backgroundColor: '#000000' },
        tabBarStyle: isDesktop ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        } : undefined,
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Inicio",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color as string} />
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{ 
          title: "Inventario",
          tabBarIcon: ({ color }) => <Ionicons name="cube" size={24} color={color as string} />
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: "Órdenes",
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color as string} />
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Ajustes",
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color as string} />
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
