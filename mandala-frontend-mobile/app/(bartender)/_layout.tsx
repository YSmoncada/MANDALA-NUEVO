import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


export default function BartenderLayout() {
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
          backgroundColor: NoxColors.card,
          borderTopColor: 'rgba(169,68,255,0.15)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
          fontWeight: '700',
          letterSpacing: 1,
        },
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
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
