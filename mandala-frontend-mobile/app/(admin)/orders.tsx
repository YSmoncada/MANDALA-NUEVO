import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';
import TicketModal from '../../components/TicketModal';


const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pendiente:  { label: 'PENDIENTE',   color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)',  icon: 'time-outline' },
  Despachado: { label: 'DESPACHADO',  color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)',  icon: 'checkmark-circle-outline' },
  Cancelado:  { label: 'CANCELADO',   color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)',   icon: 'close-circle-outline' },
};

const FILTROS = ['todos', 'Pendiente', 'Despachado', 'Cancelado'];

export default function MonitorOrdenesScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)');
    }
  };
  const { isDesktop, isLargeScreen } = useResponsive();
  const numColumns = isLargeScreen ? 3 : (isDesktop ? 2 : 1);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [ticketData, setTicketData] = useState<{
    visible: boolean;
    mesaNumero: number | string;
    pedidoId?: number | string;
    meseraNombre?: string;
    productos: any[];
    total: number;
  }>({
    visible: false,
    mesaNumero: '',
    productos: [],
    total: 0
  });

  const handleOpenTicket = (item: any) => {
    setTicketData({
      visible: true,
      mesaNumero: item.mesa_numero ?? (typeof item.mesa === 'object' ? item.mesa?.numero : item.mesa) ?? 'Barra',
      pedidoId: item.id,
      meseraNombre: item.usuario_nombre || item.mesera_nombre || 'Mesera',
      productos: (item.detalles || item.productos_detalle || []).map((p: any) => ({
        nombre: p.producto_nombre || p.nombre || (p.producto ? p.producto.nombre : 'Producto'),
        cantidad: p.cantidad || 1,
        precio: p.producto_precio || p.precio_unitario || (p.producto ? p.producto.precio : 0)
      })),
      total: parseFloat(item.total || 0)
    });
  };
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPedidos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/pedidos/');
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      data.sort((a: any, b: any) => {
        const order = ['Pendiente', 'Despachado', 'Cancelado'];
        const ia = order.indexOf(a.estado_nombre) ?? 99;
        const ib = order.indexOf(b.estado_nombre) ?? 99;
        if (ia !== ib) return ia - ib;
        return new Date(b.fecha_hora ?? 0).getTime() - new Date(a.fecha_hora ?? 0).getTime();
      });
      setPedidos(data);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    intervalRef.current = setInterval(() => fetchPedidos(true), 5000); 
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPedidos();
  };

  const filtered = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado_nombre === filtro);

  const counts = FILTROS.reduce((acc, f) => {
    acc[f] = f === 'todos' ? pedidos.length : pedidos.filter(p => p.estado_nombre === f).length;
    return acc;
  }, {} as Record<string, number>);

  const renderPedido = ({ item }: { item: any }) => {
    const cfg = STATUS_CONFIG[item.estado_nombre] ?? { label: item.estado_nombre ?? '?', color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)', icon: 'help-circle-outline' };
    const productos = item.productos_detalle ?? item.detalles ?? [];
    const horaStr = item.hora ?? (item.fecha_hora ? new Date(item.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

    return (
      <View style={[styles.card, { maxWidth: isLargeScreen ? '32%' : (isDesktop ? '48.8%' : '100%') }]}>
        <View style={[styles.cardAccent, {backgroundColor: cfg.color}]} />
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.orderId}>ORDEN #{item.id}</Text>
            <Text style={styles.mesaText}>MESA #{item.mesa_numero ?? item.mesa} • {item.usuario_nombre || 'S/N'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.content}>
            {productos.slice(0, 5).map((p: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemCant}>{p.cantidad ?? 1}x</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{p.producto_nombre || p.nombre}</Text>
                </View>
            ))}
            {productos.length > 5 && (
                <Text style={styles.moreText}>Y {productos.length - 5} PRODUCTOS MÁS...</Text>
            )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={12} color={NoxColors.muted} />
            <Text style={styles.hora}>{horaStr}</Text>
          </View>
          <Text style={styles.total}>${parseFloat(item.total || 0).toLocaleString()}</Text>
        </View>

        <TouchableOpacity 
          style={styles.orderTicketBtn}
          onPress={() => handleOpenTicket(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={14} color={NoxColors.aura} />
          <Text style={styles.orderTicketBtnText}>IMPRIMIR TICKET POS</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>MONITOR DE ÓRDENES</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
            {FILTROS.map(f => (
              <TouchableOpacity key={f} style={[styles.statBox, filtro === f && styles.statActive]} onPress={() => setFiltro(f)}>
                  <Text style={[styles.statNum, filtro === f && {color: NoxColors.text}, f !== 'todos' && {color: STATUS_CONFIG[f]?.color}]}>{counts[f]}</Text>
                  <Text style={styles.statLbl}>{f === 'todos' ? 'TODAS' : f.toUpperCase().substring(0,6)}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {renderHeader()}
          <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 60 }} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPedido}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NoxColors.aura} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="rgba(138,123,175,0.05)" />
              <Text style={styles.emptyText}>SIN ÓRDENES ACTIVAS</Text>
            </View>
          }
        />
      )}
      <TicketModal
        visible={ticketData.visible}
        onClose={() => setTicketData(prev => ({ ...prev, visible: false }))}
        mesaNumero={ticketData.mesaNumero}
        pedidoId={ticketData.pedidoId}
        meseraNombre={ticketData.meseraNombre}
        productos={ticketData.productos}
        total={ticketData.total}
        tituloTicket="TICKET DE CONSUMO"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.background },
  headerWrapper: {
    width: '100%',
    marginBottom: 5,
  },
  header: { 
    paddingHorizontal: 0, 
    paddingTop: Platform.OS === 'ios' ? 70 : 40, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    backgroundColor: NoxColors.card, 
    borderWidth: 1, 
    borderColor: NoxColors.border, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: NoxColors.emerald, marginRight: 6 },
  liveText: { color: NoxColors.emerald, fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  statsRow: { marginBottom: 15, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  statsContainer: { paddingHorizontal: 2, gap: 10 },
  statBox: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 20, 
    padding: 15, 
    minWidth: 80, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: NoxColors.border 
  },
  statActive: { borderColor: NoxColors.aura, backgroundColor: 'rgba(169, 68, 255, 0.05)' },
  statNum: { fontSize: 18, fontWeight: '900', color: NoxColors.text },
  statLbl: { fontSize: 8, color: NoxColors.muted, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },

  listContent: { padding: 20, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  card: { 
    flex: 1,
    backgroundColor: NoxColors.card, 
    borderRadius: 28, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: NoxColors.border 
  },
  cardAccent: { position: 'absolute', left: 0, top: 25, bottom: 25, width: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  cardInfo: { gap: 2 },
  orderId: { color: NoxColors.text, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  mesaText: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  content: { gap: 6, marginBottom: 15 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemCant: { color: NoxColors.aura, fontWeight: '900', fontSize: 12 },
  itemName: { color: '#ccc', fontSize: 13, flex: 1 },
  moreText: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', marginTop: 4 },
  divider: { height: 1, backgroundColor: NoxColors.border, marginBottom: 15 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hora: { color: NoxColors.muted, fontSize: 11, fontWeight: 'bold' },
  total: { color: NoxColors.emerald, fontSize: 18, fontWeight: '900' },
  orderTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(169, 68, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.25)',
  },
  orderTicketBtnText: {
    color: NoxColors.aura,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, gap: 15, opacity: 0.5 },
  emptyText: { color: NoxColors.muted, fontWeight: '900', fontSize: 11, letterSpacing: 3 },
});
