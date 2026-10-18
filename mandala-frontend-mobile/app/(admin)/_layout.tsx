import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


export default function AdminLayout() {
  const { isDesktop } = useResponsive();

  return (
    <Tabs 
      screenOptions={{ 
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarActiveTintColor: NoxColors.aura,
        tabBarInactiveTintColor: '#8A7BAF',
        tabBarStyle: isDesktop ? {
          backgroundColor: NoxColors.card,
          borderRightColor: NoxColors.border,
          borderRightWidth: 1,
          borderTopWidth: 0,
          width: 220,
          paddingTop: 30,
        } : {
          backgroundColor: NoxColors.deep,
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 10,
        },
        tabBarItemStyle: isDesktop ? {
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          height: 48,
          borderRadius: 14,
          marginHorizontal: 12,
          marginVertical: 4,
        } : {},
        tabBarLabelStyle: isDesktop ? {
          fontSize: 13,
          fontWeight: '700',
          marginLeft: 12,
        } : {
          fontSize: 10,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: NoxColors.deep,
        },
        headerTintColor: NoxColors.text,
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
      {/* Ocultar pantallas secundarias de la barra inferior */}
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="mesas" options={{ href: null }} />
      <Tabs.Screen name="bartender" options={{ href: null }} />
      <Tabs.Screen name="accounting" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}
