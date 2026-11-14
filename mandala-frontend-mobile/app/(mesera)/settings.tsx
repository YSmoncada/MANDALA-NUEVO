import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import LogoutModal from '../../components/LogoutModal';
import { NoxColors } from '../../constants/theme';


export default function MeseraSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
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
      
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>CONFIGURACIÓN DE PERFIL</Text>
        </View>

        <View style={styles.content}>
            <View style={styles.infoCard}>
                <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={40} color={NoxColors.aura} />
                </View>
                <Text style={styles.userLabel}>SESIÓN ACTIVA</Text>
                <Text style={styles.userName}>{user?.username || 'PERFIL MESERO'}</Text>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color={NoxColors.text} style={{marginRight: 15}} />
                <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>

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
  safe: { flex: 1 },
  header: { paddingHorizontal: 30, paddingTop: 60, marginBottom: 40 },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: 3 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, marginTop: 5 },
  
  content: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  infoCard: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 30, 
    padding: 40, 
    alignItems: 'center', 
    marginBottom: 30,
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  avatarCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: 'rgba(169, 68, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  userLabel: { color: NoxColors.gray, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 5 },
  userName: { color: NoxColors.text, fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase' },

  logoutBtn: { 
    flexDirection: 'row',
    backgroundColor: NoxColors.rose, 
    padding: 22, 
    borderRadius: 25, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: NoxColors.rose,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5
  },
  logoutText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  
  footer: { marginTop: 50, alignItems: 'center' },
  footerText: { color: NoxColors.gray, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 }
});
