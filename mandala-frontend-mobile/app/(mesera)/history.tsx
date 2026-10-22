import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import LogoutModal from '../../components/LogoutModal';
import NoxAlert from '../../components/NoxAlert';
import { NoxColors } from '../../constants/theme';


const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',   color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  despachado:  { label: 'Despachado',  color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)' },
  finalizada:  { label: 'Finalizado',  color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)' },
  finalizado:  { label: 'Finalizado',  color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)' },
  pagado:      { label: 'Pagado',      color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)' },
  cancelado:   { label: 'Cancelado',   color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)' },
};

export default function MisPedidosScreen() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore(state => state.user);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [mesaAlerta, setMesaAlerta] = useState<any>(null);
  const [tab, setTab] = useState<'activas' | 'historial'>('activas');
  const router = useRouter();

  // Estado de alerta personalizada
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    onConfirm?: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const fetchPedidos = async (uid?: string) => {
    const id = uid || user?.id;
    // Permitir consulta general si id no está listo aún
    try {
      const url = id ? `/pedidos/?usuario=${id}` : '/pedidos/';
      const res = await apiClient.get(url);
      setPedidos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error fetching orders", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkBillRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiClient.get('/mesas/');
      const mesas = Array.isArray(res.data) ? res.data : [];
      const pidiendo = mesas.find((m: any) => m.mesero_id === parseInt(user.id) && m.pidiendo_cuenta);
      if (pidiendo) {
        setMesaAlerta(pidiendo);
      }
    } catch (e) {
      console.error("Error checking bills", e);
    }
  }, [user?.id]);

  const handleLimpiarAlerta = async () => {
    if (!mesaAlerta) return;
    try {
      await apiClient.post(`/mesas/${mesaAlerta.id}/limpiar-cuenta/`);
      setMesaAlerta(null);
    } catch (e) {
      showAlert("Error", "No se pudo limpiar la alerta", "error");
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPedidos();
      const interval = setInterval(() => {
        fetchPedidos();
        checkBillRequests();
      }, 8000); // Refresco cada 8 segundos para ver cambios del bartender
      return () => clearInterval(interval);
    }, [user?.id, checkBillRequests])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPedidos();
  }, [user?.id]);

  const handleLogout = () => {
    setShowLogout(true);
  };

  const confirmLogout = () => {
    setShowLogout(false);
    clearAuth();
    router.replace("/(auth)/login");
  };

  // AGRUPAR PEDIDOS POR MESA
  const activeGroups = React.useMemo(() => {
    const groups: Record<number, any> = {};
    
    // Primero identificamos qué mesas tienen ALGO pendiente o piden la cuenta
    const mesasActivasIds = new Set<number>();
    pedidos.forEach(p => {
      const statusLower = (p.estado_nombre || '').toLowerCase();
      
      // Verificación estricta: ¿Hay algún producto que no se haya llevado (despachado) totalmente?
      const tieneItemsPendientes = (p.productos_detalle || []).some(
        (prod: any) => (prod.cantidad_despachada || 0) < prod.cantidad
      );

      if (['pendiente', 'preparando', 'aceptado'].includes(statusLower) || tieneItemsPendientes || p.pidiendo_cuenta) {
        mesasActivasIds.add(p.mesa);
      }
    });

    pedidos.forEach(p => {
      const statusLower = (p.estado_nombre || '').toLowerCase();
      // Si la mesa está en el set de activas, agrupamos TODOS sus pedidos (incluso despachados)
      if (mesasActivasIds.has(p.mesa) && ['pendiente', 'preparando', 'aceptado', 'despachado'].includes(statusLower)) {
        if (!groups[p.mesa]) {
          groups[p.mesa] = {
            mesa_id: p.mesa,
            mesa_numero: p.mesa_numero,
            total: 0,
            productos: [],
            pidiendo_cuenta: p.pidiendo_cuenta
          };
        }
        groups[p.mesa].total += parseFloat(p.total);
        if (p.pidiendo_cuenta) groups[p.mesa].pidiendo_cuenta = true;

        (p.productos_detalle || []).forEach((prod: any) => {
          const existing = groups[p.mesa].productos.find((x: any) => x.producto_id === prod.producto_id);
          if (existing) {
            existing.cantidad += prod.cantidad;
            existing.cantidad_despachada += prod.cantidad_despachada;
          } else {
            groups[p.mesa].productos.push({ ...prod });
          }
        });
      }
    });
    return Object.values(groups).sort((a, b) => a.mesa_numero - b.mesa_numero);
  }, [pedidos]);

  const historicalPedidos = React.useMemo(() => {
    // Identificamos las mesas que NO están activas para mostrar sus pedidos despachados aquí
    const activeMesaIds = new Set(activeGroups.map(g => g.mesa_id));
    
    return pedidos.filter(p => {
      const statusLower = (p.estado_nombre || '').toLowerCase();
      // Pasa a historial si:
      // 1. Está despachado pero su mesa no tiene nada pendiente (no está en activeMesaIds)
      // 2. O si ya está Finalizado/Pagado/Cancelado
      const isDespachadoMesaTerminada = statusLower === 'despachado' && !activeMesaIds.has(p.mesa);
      const isFinalizado = !['pendiente', 'preparando', 'aceptado', 'despachado'].includes(statusLower);
      
      return isDespachadoMesaTerminada || isFinalizado;
    });
  }, [pedidos, activeGroups]);

  const renderMesaGroup = ({ item }: { item: any }) => (
    <View style={[styles.card, styles.cardActive]}>
      <View style={styles.cardHead}>
        <View style={styles.cardLeft}>
          <View style={[styles.estadoBadge, { backgroundColor: 'rgba(169,68,255,0.1)' }]}>
            <Text style={[styles.estadoText, { color: NoxColors.aura }]}>CUENTA ACTIVA</Text>
          </View>
          <Text style={styles.pedidoId}>Mesa #{item.mesa_numero}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.mesaText}>Consumo Total</Text>
          <Text style={styles.totalText}>${item.total.toLocaleString()}</Text>
        </View>
      </View>

      {item.pidiendo_cuenta && (
        <View style={styles.billAlertInline}>
          <Ionicons name="notifications-outline" size={16} color={NoxColors.aura} />
          <Text style={styles.billAlertText}>SOLICITÓ LA CUENTA</Text>
        </View>
      )}

      <View style={styles.detail}>
        <Text style={styles.detailLabel}>DETALLE DE PRODUCTOS</Text>
        {item.productos.map((prod: any, idx: number) => {
          const cantD = parseInt(prod.cantidad_despachada || 0);
          const cantT = parseInt(prod.cantidad || 0);
          const isLlevado = cantD >= cantT;
          return (
            <View key={idx} style={styles.prodRow}>
              <View style={[styles.statusDot, { backgroundColor: isLlevado ? NoxColors.emerald : NoxColors.amber }]} />
              <Text style={[styles.prodName, isLlevado && { opacity: 0.6 }]} numberOfLines={1}>{prod.producto_nombre}</Text>
              <Text style={styles.prodQty}>x{prod.cantidad}</Text>
              <Text style={[styles.statusTextSmall, { color: isLlevado ? NoxColors.emerald : NoxColors.amber }]}>
                {isLlevado ? 'LLEVADO' : (cantD > 0 ? `${cantD}/${cantT}` : 'PENDIENTE')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderPedidoIndividual = ({ item }: { item: any }) => {
    const estado = ESTADO_CONFIG[(item.estado_nombre || '').toLowerCase()] || ESTADO_CONFIG.pendiente;
    const isExpanded = expandedId === item.id;
    const fecha = item.fecha_hora ? item.fecha_hora.split('T')[0] : '';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHead}>
          <View style={styles.cardLeft}>
            <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
              <Text style={[styles.estadoText, { color: estado.color }]}>{estado.label}</Text>
            </View>
            <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.mesaText}>Mesa {item.mesa_numero}</Text>
            <Text style={styles.totalText}>${parseFloat(item.total).toLocaleString()}</Text>
          </View>
        </View>
        <Text style={styles.metaText}>{fecha}</Text>

        {isExpanded && (
          <View style={styles.detail}>
            {(item.productos_detalle || []).map((prod: any, idx: number) => (
              <View key={idx} style={styles.prodRow}>
                <Text style={styles.prodName}>{prod.producto_nombre}</Text>
                <Text style={styles.prodQty}>x{prod.cantidad}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>MIS PEDIDOS</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'activas' && styles.tabActive]} onPress={() => setTab('activas')}>
          <Text style={[styles.tabText, tab === 'activas' && styles.tabTextActive]}>CUENTAS ACTIVAS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'historial' && styles.tabActive]} onPress={() => setTab('historial')}>
          <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>HISTORIAL</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={tab === 'activas' ? activeGroups : historicalPedidos}
          keyExtractor={item => String(item.id || item.mesa_id)}
          renderItem={tab === 'activas' ? renderMesaGroup : renderPedidoIndividual}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NoxColors.aura} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={NoxColors.container} />
              <Text style={styles.emptyTitle}>Sin pedidos</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!mesaAlerta} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}><Ionicons name="receipt" size={40} color={NoxColors.text} /></View>
            <Text style={styles.alertTitle}>¡SOLICITUD DE CUENTA!</Text>
            <Text style={styles.alertMsg}>La <Text style={{color: NoxColors.aura, fontWeight: '900'}}>MESA #{mesaAlerta?.numero}</Text> está solicitando su cuenta.</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={handleLimpiarAlerta}>
              <Text style={styles.alertBtnText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LogoutModal 
        visible={showLogout} 
        onCancel={() => setShowLogout(false)} 
        onConfirm={confirmLogout} 
      />

      <NoxAlert 
        {...alertConfig} 
        onConfirm={() => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            if (alertConfig.onConfirm) alertConfig.onConfirm();
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 20 },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
  logoutBtn: { backgroundColor: NoxColors.container, padding: 12, borderRadius: 15 },

  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 15, backgroundColor: NoxColors.card },
  tabActive: { backgroundColor: NoxColors.container, borderWidth: 1, borderColor: NoxColors.aura },
  tabText: { color: NoxColors.subtext, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: NoxColors.text },

  card: { backgroundColor: NoxColors.card, borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: NoxColors.border },
  cardActive: { borderColor: 'rgba(169,68,255,0.3)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { gap: 6 },
  cardRight: { alignItems: 'flex-end', gap: 4 },

  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  estadoText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  pedidoId: { color: NoxColors.text, fontWeight: 'bold', fontSize: 16 },
  mesaText: { color: NoxColors.muted, fontSize: 12, fontWeight: '600' },
  totalText: { color: NoxColors.emerald, fontWeight: '900', fontSize: 18 },

  metaText: { color: NoxColors.muted, fontSize: 11, marginTop: 5 },

  detail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: NoxColors.border },
  detailLabel: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, letterSpacing: 2, marginBottom: 12 },
  prodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prodName: { flex: 1, color: NoxColors.text, fontSize: 13 },
  prodQty: { color: NoxColors.muted, fontSize: 12, marginHorizontal: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusTextSmall: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginLeft: 10, width: 85, textAlign: 'right' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: NoxColors.text, fontSize: 18, fontWeight: 'bold' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertCard: { backgroundColor: NoxColors.card, borderRadius: 35, padding: 35, alignItems: 'center', borderWidth: 2, borderColor: NoxColors.aura, width: '100%' },
  alertIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: NoxColors.aura, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  alertMsg: { color: NoxColors.muted, textAlign: 'center', fontSize: 15, marginBottom: 30 },
  alertBtn: { backgroundColor: NoxColors.aura, paddingVertical: 18, width: '100%', borderRadius: 20, alignItems: 'center' },
  alertBtnText: { color: NoxColors.text, fontWeight: '900', fontSize: 12 },

  billAlertInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(169,68,255,0.1)', padding: 10, borderRadius: 12, marginTop: 10, marginBottom: 5, gap: 8 },
  billAlertText: { color: NoxColors.aura, fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});
