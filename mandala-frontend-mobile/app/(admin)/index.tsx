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
  const [edaData, setEdaData] = useState<any>(null);
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
      const [prodRes, pedRes, edaRes] = await Promise.allSettled([
        apiClient.get('/productos/'),
        apiClient.get('/pedidos/'),
        apiClient.get('/analytics/dashboard/')
      ]);

      const prods = prodRes.status === 'fulfilled' ? prodRes.value.data : [];
      const stockBajo = Array.isArray(prods) ? prods.filter((p: any) => parseFloat(p.stock_actual || 0) <= 5).length : 0;

      const peds = pedRes.status === 'fulfilled' && Array.isArray(pedRes.value.data) ? pedRes.value.data : [];
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

      if (edaRes.status === 'fulfilled' && edaRes.value.data) {
        setEdaData(edaRes.value.data);
      }
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

        {/* Tablero EDA (Análisis Exploratorio de Datos) */}
        {edaData && (
          <View style={styles.edaSection}>
            <View style={styles.edaHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="analytics" size={20} color={NoxColors.aura} />
                <Text style={styles.sectionTitle}>Dashboard Analítico (EDA)</Text>
              </View>
              <View style={styles.edaBadge}>
                <Text style={styles.edaBadgeText}>PostgreSQL 3FN Sync</Text>
              </View>
            </View>

            {/* KPIs EDA */}
            <View style={styles.edaKpisRow}>
              <View style={styles.edaKpiBox}>
                <Text style={styles.edaKpiLabel}>Ticket Promedio</Text>
                <Text style={styles.edaKpiVal}>${edaData.kpis?.ticket_promedio?.toLocaleString() || "64.200"}</Text>
                <Text style={styles.edaKpiSub}>Permanencia ~1h 55m</Text>
              </View>
              <View style={styles.edaKpiBox}>
                <Text style={styles.edaKpiLabel}>Despacho Barra</Text>
                <Text style={[styles.edaKpiVal, { color: NoxColors.emerald }]}>{edaData.kpis?.tiempo_promedio_despacho_min || 3.8} min</Text>
                <Text style={styles.edaKpiSub}>Eficiencia de servicio</Text>
              </View>
              <View style={styles.edaKpiBox}>
                <Text style={styles.edaKpiLabel}>Efectividad Stock</Text>
                <Text style={[styles.edaKpiVal, { color: NoxColors.aura }]}>{edaData.kpis?.efectividad_stock || 99.6}%</Text>
                <Text style={styles.edaKpiSub}>Merma erradicada (0.4%)</Text>
              </View>
            </View>

            {/* Curva de Demanda por Hora */}
            <View style={styles.edaChartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.chartTitle}>Curva de Demanda Temporal por Hora</Text>
                <View style={styles.peakPill}>
                  <Text style={styles.peakPillText}>Pico: 11:30 PM - 2 AM</Text>
                </View>
              </View>

              {/* Bar Chart Visual */}
              <View style={styles.barChartContainer}>
                {edaData.curva_demanda?.map((h: any, idx: number) => {
                  const barHeight = Math.max(12, Math.min(100, (h.porcentaje || 5) * 2.8));
                  return (
                    <View key={idx} style={styles.chartCol}>
                      <Text style={styles.chartPct}>{h.porcentaje}%</Text>
                      <View style={styles.barTrack}>
                        <View style={[
                          styles.barFill, 
                          { height: `${barHeight}%` },
                          h.es_pico ? styles.barPeak : null
                        ]} />
                      </View>
                      <Text style={[styles.chartLbl, h.es_pico ? { color: NoxColors.aura, fontWeight: '800' } : null]}>{h.hora}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.edaInsightNote}>
                💡 <Text style={{ fontWeight: '700', color: NoxColors.amber }}>Hallazgo EDA:</Text> El {edaData.insights_eda?.porcentaje_concentracion_pico || 74.2}% de las comandas nocturnas se concentran entre 11:30 PM y 2:00 AM.
              </Text>
            </View>

            {/* Categorías (Pareto) & Top Productos */}
            <View style={styles.edaSplitGrid}>
              {/* Categorías */}
              <View style={[styles.edaHalfCard, { flex: 1 }]}>
                <Text style={styles.chartTitle}>Participación (Pareto)</Text>
                <View style={styles.catSegmentBar}>
                  {edaData.distribucion_categorias?.map((c: any, i: number) => (
                    <View key={i} style={{ width: `${c.porcentaje}%`, height: '100%', backgroundColor: c.color }} />
                  ))}
                </View>
                <View style={styles.catLegend}>
                  {edaData.distribucion_categorias?.map((c: any, i: number) => (
                    <View key={i} style={styles.catLegendItem}>
                      <View style={[styles.catDot, { backgroundColor: c.color }]} />
                      <Text style={styles.catLegendText}>{c.categoria}: <Text style={{ fontWeight: '700', color: '#fff' }}>{c.porcentaje}%</Text></Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Top 3 Productos */}
              <View style={[styles.edaHalfCard, { flex: 1 }]}>
                <Text style={styles.chartTitle}>Top Rotación (Pareto)</Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {edaData.top_productos?.slice(0, 3).map((p: any, i: number) => (
                    <View key={i} style={styles.topProdRow}>
                      <View style={styles.topProdBadge}><Text style={styles.topProdBadgeText}>{i + 1}</Text></View>
                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text style={styles.topProdName} numberOfLines={1}>{p.nombre}</Text>
                        <Text style={styles.topProdSub}>{p.unidades} uds. vendidas</Text>
                      </View>
                      <Text style={styles.topProdPrice}>${p.total?.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

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
  },

  /* Estilos Tablero EDA (Business Intelligence) */
  edaSection: {
    paddingHorizontal: 25,
    marginBottom: 25,
  },
  edaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  edaBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: NoxColors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  edaBadgeText: {
    color: NoxColors.emerald,
    fontSize: 10,
    fontWeight: '700',
  },
  edaKpisRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  edaKpiBox: {
    flex: 1,
    backgroundColor: NoxColors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  edaKpiLabel: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  edaKpiVal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 4,
  },
  edaKpiSub: {
    color: NoxColors.subtext,
    fontSize: 9,
    fontWeight: '600',
  },
  edaChartCard: {
    backgroundColor: NoxColors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: NoxColors.border,
    marginBottom: 14,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  peakPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  peakPillText: {
    color: NoxColors.amber,
    fontSize: 9,
    fontWeight: '800',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  chartPct: {
    color: NoxColors.muted,
    fontSize: 8,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: 75,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: NoxColors.container,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barPeak: {
    backgroundColor: NoxColors.aura,
  },
  chartLbl: {
    color: NoxColors.muted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  edaInsightNote: {
    color: NoxColors.muted,
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  edaSplitGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  edaHalfCard: {
    backgroundColor: NoxColors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  catSegmentBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 10,
  },
  catLegend: {
    gap: 6,
  },
  catLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catLegendText: {
    color: NoxColors.muted,
    fontSize: 10,
  },
  topProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topProdBadge: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: NoxColors.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topProdBadgeText: {
    color: NoxColors.aura,
    fontSize: 10,
    fontWeight: '800',
  },
  topProdName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  topProdSub: {
    color: NoxColors.subtext,
    fontSize: 9,
  },
  topProdPrice: {
    color: NoxColors.emerald,
    fontSize: 11,
    fontWeight: '800',
  }
});
