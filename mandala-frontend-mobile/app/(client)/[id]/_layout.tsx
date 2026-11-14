import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text } from 'react-native';
import { NoxColors } from '../../../constants/theme';


export default function ClientLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#000000' },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: NoxColors.aura,
        tabBarInactiveTintColor: NoxColors.subtext,
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'PEDIR',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} color={color as string} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'MI CUENTA',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} color={color as string} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: NoxColors.card,
    borderTopWidth: 1,
    borderTopColor: NoxColors.border,
    height: 70,
    paddingBottom: 12,
    paddingTop: 8,
    position: 'absolute',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 10,
    shadowColor: NoxColors.deep,
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  }
});
