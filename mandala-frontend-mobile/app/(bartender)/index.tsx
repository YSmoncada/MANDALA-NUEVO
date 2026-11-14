import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LogoutModal from '../../components/LogoutModal';
import { NoxColors } from '../../constants/theme';


const { width } = Dimensions.get('window');

export default function BartenderMenu() {
  const router = useRouter();

  const clearAuth = useAuthStore(state => state.clearAuth);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(true);
  };

  const confirmLogout = () => {
    setShowLogout(false);
    clearAuth();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <RollsRoyceStars />
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>PANEL DE BARTENDER</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={NoxColors.rose} />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push("/(bartender)/prep" as any)}>
            <View style={styles.iconContainer}>
                <Ionicons name="beer-outline" size={42} color={NoxColors.text} />
            </View>
            <Text style={styles.menuLabel}>PREPARACIÓN</Text>
            <Text style={styles.menuDesc}>Ver pedidos por preparar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuCard, {marginTop: 20}]} onPress={() => router.push("/(bartender)/orders" as any)}>
            <View style={styles.iconContainer}>
                <Ionicons name="receipt-outline" size={42} color={NoxColors.text} />
            </View>
            <Text style={styles.menuLabel}>NUEVO PEDIDO</Text>
            <Text style={styles.menuDesc}>Registrar venta directa</Text>
        </TouchableOpacity>
      </View>

      <LogoutModal 
        visible={showLogout} 
        onCancel={() => setShowLogout(false)} 
        onConfirm={confirmLogout} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000'},
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 60,
    paddingBottom: 40
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  logoutBtn: { backgroundColor: NoxColors.container, padding: 12, borderRadius: 15 },

  menuContainer: { padding: 25 },
  menuCard: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 35, 
    padding: 30, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border,
    elevation: 5
  },
  iconContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 30, 
    backgroundColor: '#181822', 
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20
  },
  menuLabel: { color: NoxColors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  menuDesc: { color: NoxColors.muted, fontSize: 12, fontWeight: 'bold', marginTop: 5, opacity: 0.6 }
});
