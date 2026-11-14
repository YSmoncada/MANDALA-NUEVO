import RollsRoyceStars from '../../components/RollsRoyceStars';
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

  { id: 'inventory', label: 'INVENTARIO', sub: 'Control de existencias y catálogo', icon: 'cube-outline', path: '/(admin)/inventory', color: '#FFFFFF', badge: 'Catálogo' },

  { id: 'orders', label: 'PEDIDOS', sub: 'Monitor de comandas y mesas', icon: 'receipt-outline', path: '/(admin)/orders', color: '#FFFFFF', badge: 'Comandas' },

  { id: 'mesas', label: 'MESAS', sub: 'Mapa y estado de salón', icon: 'grid-outline', path: '/(admin)/mesas', color: '#38BDF8', badge: 'Salón' },

  { id: 'users', label: 'USUARIOS', sub: 'Gestión de personal y roles', icon: 'people-outline', path: '/(admin)/users', color: '#E4E4E7', badge: 'Personal' },

  { id: 'history', label: 'REPORTES', sub: 'Inteligencia y métricas EDA', icon: 'bar-chart-outline', path: '/(admin)/history', color: '#F59E0B', badge: 'Analítica' },

  { id: 'accounting', label: 'CAJA Y TURNOS', sub: 'Arqueo y flujo de efectivo', icon: 'cash-outline', path: '/(admin)/accounting', color: '#10B981', badge: 'Caja' },

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
      <RollsRoyceStars />

      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent', zIndex: 1 }}
        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContent}

        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={NoxColors.aura} />}

      >

        {/* Header Superior Premium */}

        <View style={styles.header}>

          <View>

            <Text style={styles.brandingNox}>NOX<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitleNox}>SISTEMA DE GESTIÓN PREMIUM</Text>
          </View>
        </View>

        {/* Sección de Métricas del Día Rediseñada */}

        <View style={styles.statsSection}>

          <View style={styles.sectionHeaderRow}>

            <Text style={styles.sectionTitle}>Métricas del Turno Actual</Text>

          </View>

          <View style={[styles.statsGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            {/* Ventas Totales */}
            <View style={[styles.statCardPremium, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>VENTAS DEL DÍA</Text>
                  <Text style={styles.statCardValue}>${stats.totalVentas.toLocaleString()}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                  <Ionicons name="trending-up" size={18} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={styles.statSubText}>Facturado en turno actual</Text>
              </View>
            </View>

            {/* Pedidos Hoy */}
            <View style={[styles.statCardPremium, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>PEDIDOS REGISTRADOS</Text>
                  <Text style={styles.statCardValue}>{stats.pedidosHoy} <Text style={{ fontSize: 13, color: NoxColors.muted, fontWeight: '600' }}>órdenes</Text></Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={styles.statSubText}>Comandas procesadas hoy</Text>
              </View>
            </View>

            {/* Stock Crítico */}
            <View style={[styles.statCardPremium, { borderColor: stats.stockBajoCount > 0 ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.statCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardCategory}>ALERTAS DE STOCK</Text>
                  <Text style={[styles.statCardValue, stats.stockBajoCount > 0 ? { color: NoxColors.rose } : { color: '#FFFFFF' }]}>
                    {stats.stockBajoCount} <Text style={{ fontSize: 13, color: NoxColors.muted, fontWeight: '600' }}>críticos</Text>
                  </Text>
                </View>
                <View style={[
                  styles.statIconBadge, 
                  stats.stockBajoCount > 0 
                    ? { backgroundColor: 'rgba(255, 68, 68, 0.12)', borderColor: 'rgba(255, 68, 68, 0.3)' }
                    : { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)' }
                ]}>
                  <Ionicons name={stats.stockBajoCount > 0 ? "alert-circle" : "cube-outline"} size={18} color={stats.stockBajoCount > 0 ? NoxColors.rose : "#FFFFFF"} />
                </View>
              </View>
              <View style={styles.statCardFooter}>
                <Text style={styles.statSubText}>
                  {stats.stockBajoCount > 0 ? "⚠️ Reponer existencias críticas" : "Existencias en nivel óptimo"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tablero EDA (Análisis Exploratorio de Datos) */}

        {edaData && (

          <View style={styles.edaSection}>

            {/* Header del Dashboard Analítico con Filtros Dedicados */}

            <View style={styles.edaHeaderStacked}>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                  <Ionicons name="analytics" size={22} color={NoxColors.aura} />

                  <Text style={styles.sectionTitle}>Dashboard Analítico (EDA)</Text>

                </View>

                {loadingEda && <ActivityIndicator size="small" color={NoxColors.aura} />}

              </View>

              {/* Selector de Periodo Temporal Grande y Visible: Día | Semana | Mes */}

              <View style={styles.periodSelectorFull}>

                <TouchableOpacity 

                  style={[styles.periodTabFull, periodo === 'dia' && styles.periodTabActiveFull]}

                  onPress={() => handlePeriodoChange('dia')}

                  activeOpacity={0.7}

                >

                  <Ionicons name="today-outline" size={15} color={periodo === 'dia' ? '#FFFFFF' : '#71717A'} />

                  <Text style={[styles.periodTabTextFull, periodo === 'dia' && styles.periodTabTextActiveFull]}>Día</Text>

                </TouchableOpacity>

                <TouchableOpacity 

                  style={[styles.periodTabFull, periodo === 'semana' && styles.periodTabActiveFull]}

                  onPress={() => handlePeriodoChange('semana')}

                  activeOpacity={0.7}

                >

                  <Ionicons name="calendar-outline" size={15} color={periodo === 'semana' ? '#FFFFFF' : '#71717A'} />

                  <Text style={[styles.periodTabTextFull, periodo === 'semana' && styles.periodTabTextActiveFull]}>Semana</Text>

                </TouchableOpacity>

                <TouchableOpacity 

                  style={[styles.periodTabFull, periodo === 'mes' && styles.periodTabActiveFull]}

                  onPress={() => handlePeriodoChange('mes')}

                  activeOpacity={0.7}

                >

                  <Ionicons name="stats-chart-outline" size={15} color={periodo === 'mes' ? '#FFFFFF' : '#71717A'} />

                  <Text style={[styles.periodTabTextFull, periodo === 'mes' && styles.periodTabTextActiveFull]}>Mes</Text>

                </TouchableOpacity>

              </View>

              {/* Rango de Fechas Analizado */}

              <View style={styles.periodBadgeRow}>

                <Ionicons name="time-outline" size={13} color={NoxColors.emerald} />

                <Text style={styles.periodBadgeText}>

                  Filtrado por: <Text style={{ color: '#fff', fontWeight: '800' }}>{edaData.etiqueta_periodo || "Turno Diario"}</Text>

                  {edaData.descripcion_periodo ? ` • ${edaData.descripcion_periodo}` : ''}

                </Text>

              </View>

            </View>

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
                style={[styles.moduleCardPremium, { width: cardWidth }]}
                onPress={() => router.push(mod.path as any)}
                activeOpacity={0.8}
              >
                {/* Fila Superior: Icono y flecha de acceso rápido */}
                <View style={styles.moduleTopRow}>
                  <View style={styles.moduleIconBadge}>
                    <Ionicons name={mod.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.moduleArrowBox}>
                    <Ionicons name="arrow-forward" size={13} color="#71717A" />
                  </View>
                </View>

                {/* Centro: Título y Descripción */}
                <View style={styles.moduleBody}>
                  <Text style={styles.moduleTitleText}>{mod.label}</Text>
                  <Text style={styles.moduleDescText}>{mod.sub}</Text>
                </View>

                {/* Fila Inferior: Micro-etiqueta de sistema */}
                <View style={styles.moduleActionRow}>
                  <Text style={styles.moduleSectionLabel}>MÓDULO DE GESTIÓN</Text>
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
    backgroundColor: '#000000',
    position: 'relative',
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

    color: NoxColors.subtext

  },

  subtitleNox: {

    fontSize: 9,

    fontWeight: '800',

    color: '#71717A',

    letterSpacing: 2.5,

    marginTop: 3,

    textTransform: 'uppercase',

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

    borderColor: 'rgba(255, 255, 255, 0.08)',

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
    backgroundColor: 'rgba(15, 15, 19, 0.94)',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-between',
    minHeight: 145,
    marginBottom: 14,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    elevation: 4,
  },
  moduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleArrowBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBody: {
    gap: 4,
    marginVertical: 4,
  },
  moduleTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  moduleDescText: {
    color: NoxColors.subtext,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  moduleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 6,
  },
  moduleSectionLabel: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
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

    backgroundColor: '#27272A',

    borderTopLeftRadius: 5,

    borderTopRightRadius: 5,

  },

  barActive: {

    backgroundColor: '#52525B',

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

  edaHeaderStacked: {

    marginBottom: 14,

    gap: 10,

  },

  periodSelectorFull: {

    flexDirection: 'row',

    backgroundColor: '#0E0E12',

    borderRadius: 14,

    padding: 4,

    borderWidth: 1,

    borderColor: 'rgba(255, 255, 255, 0.08)',

    gap: 6,

  },

  periodTabFull: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 9,

    borderRadius: 10,

    gap: 6,

    backgroundColor: 'rgba(255, 255, 255, 0.03)',

  },

  periodTabActiveFull: {

    backgroundColor: 'rgba(255, 255, 255, 0.12)',

    borderWidth: 1,

    borderColor: 'rgba(255, 255, 255, 0.28)',

  },

  periodTabTextFull: {

    color: NoxColors.muted,

    fontSize: 13,

    fontWeight: '700',

  },

  periodTabTextActiveFull: {

    color: '#FFFFFF',

    fontWeight: '800',

  },

  periodBadgeRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    paddingHorizontal: 2,

    marginTop: 2,

  },

  periodBadgeText: {

    color: NoxColors.muted,

    fontSize: 11,

    fontWeight: '500',

  }

});

