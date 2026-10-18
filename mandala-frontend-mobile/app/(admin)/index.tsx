import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import LogoutModal from '../../components/LogoutModal';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';

const MODULES = [
  { id: 'inventory', label: 'INVENTARIO', sub: 'Control de Stock', icon: 'cube-outline', path: '/(admin)/inventory', color: '#A944FF' },
  { id: 'orders', label: 'PEDIDOS', sub: 'Historial y Monitor', icon: 'receipt-outline', path: '/(admin)/orders', color: '#10b981' },
  { id: 'mesas', label: 'MESAS', sub: 'Diseño Salón', icon: 'grid-outline', path: '/(admin)/mesas', color: '#06b6d4' },
  { id: 'users', label: 'USUARIOS', sub: 'Gestión de Staff', icon: 'people-outline', path: '/(admin)/users', color: '#ec4899' },
  { id: 'history', label: 'REPORTES', sub: 'Estadísticas Nox', icon: 'bar-chart-outline', path: '/(admin)/history', color: '#f59e0b' },
  { id: 'accounting', label: 'CAJA', sub: 'Flujo de Efectivo', icon: 'cash-outline', path: '/(admin)/accounting', color: '#84cc16' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ totalVentas: 0, pedidosHoy: 0, stockBajoCount: 0 });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { clearAuth, user } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [prodRes, pedRes] = await Promise.all([
        apiClient.get('/productos/'),
        apiClient.get('/pedidos/') // Traemos todos para filtrar en frontend por fecha y estado
      ]);

      const prods = prodRes.data;
      const stockBajo = Array.isArray(prods) ? prods.filter((p: any) => parseFloat(p.stock_actual || 0) <= 5).length : 0;

      const peds = Array.isArray(pedRes.data) ? pedRes.data : [];
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Filtramos solo los de HOY que estén Pagados o Despachados
      const pedsHoy = peds.filter((p: any) => {
        const pDate = (p.fecha_hora || "").split('T')[0];
        const isToday = pDate === today || pDate === localToday;
        const isFinished = p.estado_nombre === 'Pagado' || p.estado_nombre === 'Despachado';
        return isToday && isFinished;
      });

      const totalVentas = pedsHoy.reduce((acc: number, p: any) => acc + parseFloat(p.total || 0), 0);

      setStats({
        totalVentas: totalVentas,
        pedidosHoy: pedsHoy.length,
        stockBajoCount: stockBajo
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogout(true);
  };

  const confirmLogout = () => {
    setShowLogout(false);
    clearAuth();
    router.replace("/(auth)/login");
  };

  const { isDesktop, isLargeScreen } = useResponsive();
  const cardWidth = isLargeScreen ? '31.8%' : (isDesktop ? '48.5%' : '48%');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={NoxColors.aura} />}
      >
        {/* Header Superior Premium */}
        <View style={styles.header}>
          <View>

            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="power" size={22} color={NoxColors.rose} />
          </TouchableOpacity>
        </View>



        {/* Sección de Métricas del Día */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Métricas del Día</Text>
          <View style={styles.statsGrid}>

            {/* Ventas Totales */}
            <View style={[styles.statItem, { borderLeftColor: NoxColors.emerald }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="trending-up" size={18} color={NoxColors.emerald} />
              </View>
              <Text style={styles.statValue}>${stats.totalVentas.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Ventas Hoy</Text>
            </View>

            {/* Pedidos Hoy */}
            <View style={[styles.statItem, { borderLeftColor: NoxColors.aura }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(169, 68, 255, 0.1)' }]}>
                <Ionicons name="receipt" size={18} color={NoxColors.aura} />
              </View>
              <Text style={styles.statValue}>{stats.pedidosHoy}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>

            {/* Stock Crítico */}
            <View style={[styles.statItem, { borderLeftColor: NoxColors.rose }]}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}>
                <Ionicons name="alert-circle" size={18} color={NoxColors.rose} />
              </View>
              <Text style={styles.statValue}>{stats.stockBajoCount}</Text>
              <Text style={styles.statLabel}>Stock Crítico</Text>
            </View>

          </View>
        </View>

        {/* Grid de Módulos Rediseñado de 2 Columnas */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>Módulos Operativos</Text>
          <View style={styles.modulesGrid}>
            {MODULES.map((mod) => (
              <TouchableOpacity
                key={mod.id}
                style={[styles.moduleCard, { width: cardWidth }]}
                onPress={() => router.push(mod.path as any)}
                activeOpacity={0.8}
              >
                {/* Contenedor del Icono con Halo de Color */}
                <View style={[styles.moduleIconContainer, { backgroundColor: `${mod.color}15` }]}>
                  <Ionicons name={mod.icon as any} size={26} color={mod.color} />
                </View>

                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleLabel}>{mod.label}</Text>
                  <Text style={styles.moduleSub}>{mod.sub}</Text>
                </View>

                {/* Flecha de Navegación sutil */}
                <View style={styles.moduleArrowContainer}>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255, 255, 255, 0.3)" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Cierre de Sesión */}
      <LogoutModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NoxColors.background
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 25
  },
  welcomeText: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  brandingNox: {
    fontSize: 38,
    fontWeight: '900',
    color: NoxColors.text,
    letterSpacing: -1,
    marginTop: -2
  },
  brandingOS: {
    color: NoxColors.aura
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 68, 68, 0.03)',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.1)'
  },

  userCard: {
    marginHorizontal: 25,
    backgroundColor: NoxColors.card,
    borderRadius: 32,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.1)',
    shadowColor: NoxColors.aura,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    shadowColor: NoxColors.aura,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  avatarText: {
    color: NoxColors.text,
    fontWeight: '900',
    fontSize: 20
  },
  userInfo: {
    flex: 1
  },
  welcomeUser: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2
  },
  userName: {
    color: NoxColors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NoxColors.emerald
  },
  onlineText: {
    color: NoxColors.emerald,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1
  },

  statsSection: {
    paddingHorizontal: 25,
    marginBottom: 35
  },
  sectionTitle: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase'
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12
  },
  statItem: {
    backgroundColor: NoxColors.card,
    padding: 16,
    borderRadius: 26,
    flex: 1,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: NoxColors.border,
    justifyContent: 'space-between',
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statValue: {
    color: NoxColors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  statLabel: {
    color: NoxColors.muted,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2
  },

  modulesSection: {
    paddingHorizontal: 25
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  moduleCard: {
    backgroundColor: NoxColors.card,
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: NoxColors.border,
    justifyContent: 'space-between',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  moduleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  moduleInfo: {
    gap: 3
  },
  moduleLabel: {
    color: NoxColors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  moduleSub: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '600'
  },
  moduleArrowContainer: {
    position: 'absolute',
    top: 18,
    right: 18,
    opacity: 0.5
  }
});
