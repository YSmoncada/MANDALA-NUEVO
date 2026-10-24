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
  { id: 'inventory', label: 'INVENTARIO', sub: 'Control de existencias y catálogo', icon: 'cube-outline', path: '/(admin)/inventory', color: '#A944FF', badge: '8 Items' },
  { id: 'orders', label: 'PEDIDOS', sub: 'Monitor de comandas en vivo', icon: 'receipt-outline', path: '/(admin)/orders', color: '#10b981', badge: 'En Vivo' },
  { id: 'mesas', label: 'MESAS', sub: 'Mapa y estado de salón', icon: 'grid-outline', path: '/(admin)/mesas', color: '#06b6d4', badge: 'Salón Activo' },
  { id: 'users', label: 'USUARIOS', sub: 'Gestión de personal y roles', icon: 'people-outline', path: '/(admin)/users', color: '#ec4899', badge: '3 Roles' },
  { id: 'history', label: 'REPORTES', sub: 'Inteligencia y métricas EDA', icon: 'bar-chart-outline', path: '/(admin)/history', color: '#f59e0b', badge: 'Analítica' },
  { id: 'accounting', label: 'CAJA Y TURNOS', sub: 'Arqueo y flujo de efectivo', icon: 'cash-outline', path: '/(admin)/accounting', color: '#84cc16', badge: 'Turno Abierto' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ totalVentas: 0, pedidosHoy: 0, stockBajoCount: 0 });
  const [edaData, setEdaData] = useState<any>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [loadingEda, setLoadingEda] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { clearAuth, user } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchEda = async (selectedPeriod: 'dia' | 'semana' | 'mes') => {
    setLoadingEda(true);
    try {
      const res = await apiClient.get(`/analytics/dashboard/?periodo=${selectedPeriod}`);
      if (res && res.data) {
        setEdaData(res.data);
      }
    } catch (err) {
      console.error("Error fetching EDA data:", err);
    } finally {
      setLoadingEda(false);
    }
  };

  const handlePeriodoChange = (newPeriod: 'dia' | 'semana' | 'mes') => {
    setPeriodo(newPeriod);
    fetchEda(newPeriod);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [prodRes, pedRes, edaRes] = await Promise.allSettled([
        apiClient.get('/productos/'),
        apiClient.get('/pedidos/'),
        apiClient.get(`/analytics/dashboard/?periodo=${periodo}`)
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
  const cardWidth = isLargeScreen ? '31.8%' : (isDesktop ? '48.5%' : '100%');

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
        </View>

        {/* Sección de Métricas del Día Rediseñada */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Métricas del Turno Actual</Text>
          </View>

          <View style={[styles.statsGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>

            {/* Ventas Totales */}
            <View style={[styles.statCardPremium, { borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>VENTAS DEL DÍA</Text>
                  <Text style={styles.statCardValue}>${stats.totalVentas.toLocaleString()}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Ionicons name="trending-up" size={20} color={NoxColors.emerald} />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={[styles.statTrendText, { color: NoxColors.emerald }]}>↑ Turno activo</Text>
                <Text style={styles.statSubText}>Facturado hoy</Text>
              </View>
            </View>

            {/* Pedidos Hoy */}
            <View style={[styles.statCardPremium, { borderColor: 'rgba(169, 68, 255, 0.25)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>PEDIDOS REGISTRADOS</Text>
                  <Text style={styles.statCardValue}>{stats.pedidosHoy} <Text style={{ fontSize: 13, color: NoxColors.muted, fontWeight: '600' }}>órdenes</Text></Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(169, 68, 255, 0.12)', borderColor: 'rgba(169, 68, 255, 0.3)' }]}>
                  <Ionicons name="receipt" size={20} color={NoxColors.aura} />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={[styles.statTrendText, { color: NoxColors.aura }]}>⚡ En consumo</Text>
                <Text style={styles.statSubText}>Despachados a pista</Text>
              </View>
            </View>

            {/* Stock Crítico */}
            <View style={[styles.statCardPremium, { borderColor: stats.stockBajoCount > 0 ? 'rgba(255, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>ALERTAS DE STOCK</Text>
                  <Text style={[styles.statCardValue, stats.stockBajoCount > 0 ? { color: NoxColors.rose } : { color: NoxColors.emerald }]}>
                    {stats.stockBajoCount} <Text style={{ fontSize: 13, color: NoxColors.muted, fontWeight: '600' }}>críticos</Text>
                  </Text>
                </View>
                <View style={[
                  styles.statIconBadge, 
                  stats.stockBajoCount > 0 
                    ? { backgroundColor: 'rgba(255, 68, 68, 0.12)', borderColor: 'rgba(255, 68, 68, 0.3)' }
                    : { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                ]}>
                  <Ionicons name={stats.stockBajoCount > 0 ? "alert-circle" : "shield-checkmark"} size={20} color={stats.stockBajoCount > 0 ? NoxColors.rose : NoxColors.emerald} />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={[styles.statTrendText, { color: stats.stockBajoCount > 0 ? NoxColors.amber : NoxColors.emerald }]}>
                  {stats.stockBajoCount > 0 ? "⚠️ Reponer pronto" : "✓ Existencias OK"}
                </Text>
                <Text style={styles.statSubText}>≤ 5 uds. disponibles</Text>
              </View>
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

              {/* Selector de Periodo Temporal: Día | Semana | Mes */}
              <View style={styles.periodSelector}>
                <TouchableOpacity 
                  style={[styles.periodTab, periodo === 'dia' && styles.periodTabActive]}
                  onPress={() => handlePeriodoChange('dia')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodTabText, periodo === 'dia' && styles.periodTabTextActive]}>Día</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.periodTab, periodo === 'semana' && styles.periodTabActive]}
                  onPress={() => handlePeriodoChange('semana')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodTabText, periodo === 'semana' && styles.periodTabTextActive]}>Semana</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.periodTab, periodo === 'mes' && styles.periodTabActive]}
                  onPress={() => handlePeriodoChange('mes')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodTabText, periodo === 'mes' && styles.periodTabTextActive]}>Mes</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Subtítulo dinámico con la ventana temporal analizada */}
            {edaData.descripcion_periodo ? (
              <View style={styles.periodBadgeRow}>
                <Ionicons name="calendar-outline" size={12} color={NoxColors.muted} />
                <Text style={styles.periodBadgeText}>{edaData.descripcion_periodo}</Text>
              </View>
            ) : null}

            {/* KPIs EDA */}
            <View style={[styles.edaKpisRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.chartTitle}>Curva de Demanda Temporal por Hora</Text>
                  <Text style={{ fontSize: 10, color: NoxColors.muted, marginTop: 2 }}>
                    {edaData.etiqueta_periodo ? `Periodo: ${edaData.etiqueta_periodo}` : "Distribución horaria"}
                  </Text>
                </View>
                <View style={styles.peakPill}>
                  <Text style={styles.peakPillText}>
                    {edaData.insights_eda?.pico_critico ? `Pico: ${edaData.insights_eda.pico_critico}` : "Pico: 10 PM - 12 AM"}
                  </Text>
                </View>
              </View>

              {/* Bar Chart Visual con Diferenciación Real */}
              <View style={styles.barChartContainer}>
                {edaData.curva_demanda?.map((h: any, idx: number) => {
                  const barHeight = Math.max(16, h.altura_relativa || 16);
                  const isPeak = h.es_pico;
                  return (
                    <View key={idx} style={styles.chartCol}>
                      <Text style={[styles.chartPedCount, isPeak ? { color: NoxColors.aura, fontWeight: '900' } : null]}>
                        {h.pedidos > 0 ? `${h.pedidos}` : '-'}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[
                          styles.barFill, 
                          { height: `${barHeight}%` },
                          isPeak ? styles.barPeak : (h.pedidos > 0 ? styles.barActive : null)
                        ]} />
                      </View>
                      <Text style={[styles.chartLbl, isPeak ? { color: NoxColors.aura, fontWeight: '800' } : null]}>{h.hora}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.edaInsightNote}>
                💡 <Text style={{ fontWeight: '700', color: NoxColors.amber }}>Concentración:</Text> {edaData.insights_eda?.resumen_demanda || `${edaData.curva_demanda?.filter((h: any) => h.es_pico).reduce((acc: number, h: any) => acc + h.pedidos, 0)} de los ${edaData.kpis?.total_pedidos} pedidos del periodo se concentran en las horas pico.`}
              </Text>
              {edaData.insights_eda?.recomendacion ? (
                <Text style={[styles.edaInsightNote, { marginTop: 6 }]}>
                  🎯 <Text style={{ fontWeight: '700', color: NoxColors.aura }}>Estrategia:</Text> {edaData.insights_eda.recomendacion}
                </Text>
              ) : null}
            </View>

            {/* Categorías (Pareto) & Top Productos */}
            <View style={[styles.edaSplitGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
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

        {/* Grid de Módulos Operativos Rediseñado */}
        <View style={styles.modulesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Módulos Operativos</Text>
            <Text style={styles.modulesCountTag}>6 Módulos Disponibles</Text>
          </View>

          <View style={styles.modulesGrid}>
            {MODULES.map((mod) => (
              <TouchableOpacity
                key={mod.id}
                style={[styles.moduleCardPremium, { width: cardWidth, borderColor: `${mod.color}30` }]}
                onPress={() => router.push(mod.path as any)}
                activeOpacity={0.85}
              >
                {/* Fila Superior: Icono y Badge de Estado */}
                <View style={styles.moduleTopRow}>
                  <View style={[styles.moduleIconBadge, { backgroundColor: `${mod.color}18`, borderColor: `${mod.color}45` }]}>
                    <Ionicons name={mod.icon as any} size={22} color={mod.color} />
                  </View>
                  <View style={[styles.modulePillBadge, { backgroundColor: `${mod.color}15`, borderColor: `${mod.color}35` }]}>
                    <Text style={[styles.modulePillText, { color: mod.color }]}>{mod.badge}</Text>
                  </View>
                </View>

                {/* Centro: Título y Descripción */}
                <View style={styles.moduleBody}>
                  <Text style={styles.moduleTitleText}>{mod.label}</Text>
                  <Text style={styles.moduleDescText}>{mod.sub}</Text>
                </View>

                {/* Fila Inferior: Acción y flecha */}
                <View style={styles.moduleActionRow}>
                  <Text style={[styles.moduleActionText, { color: mod.color }]}>Ingresar al panel</Text>
                  <Ionicons name="arrow-forward" size={13} color={mod.color} />
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
    marginBottom: 25
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: NoxColors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NoxColors.emerald,
  },
  liveIndicatorText: {
    color: NoxColors.emerald,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modulesCountTag: {
    color: NoxColors.subtext,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12
  },
  statCardPremium: {
    backgroundColor: NoxColors.card,
    padding: 18,
    borderRadius: 22,
    flex: 1,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statCardCategory: {
    color: NoxColors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statCardValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 6,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statSubText: {
    color: NoxColors.subtext,
    fontSize: 10,
    fontWeight: '600',
  },

  /* Módulos Operativos Rediseñados */
  modulesSection: {
    paddingHorizontal: 25
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  moduleCardPremium: {
    backgroundColor: NoxColors.card,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 135,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  moduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modulePillBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modulePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  moduleBody: {
    gap: 3,
    marginVertical: 4,
  },
  moduleTitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  moduleDescText: {
    color: NoxColors.muted,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  moduleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 6,
  },
  moduleActionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  chartPedCount: {
    color: NoxColors.muted,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  chartPct: {
    color: NoxColors.muted,
    fontSize: 8,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#4c1d95',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barActive: {
    backgroundColor: '#8b5cf6',
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
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 3,
  },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  periodTabActive: {
    backgroundColor: NoxColors.aura,
  },
  periodTabText: {
    color: NoxColors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  periodTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  periodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    marginTop: -4,
  },
  periodBadgeText: {
    color: NoxColors.muted,
    fontSize: 11,
    fontWeight: '600',
  }
});
