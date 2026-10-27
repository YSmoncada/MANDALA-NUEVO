import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import TicketModal from '../../components/TicketModal';
import { NoxColors } from '../../constants/theme';


const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',   color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  despachado:  { label: 'Despachado',  color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)' },
  finalizada:  { label: 'Finalizado',  color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)' },
  cancelado:   { label: 'Cancelado',   color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)' },
};

export default function BartenderHistoryScreen() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const user = useAuthStore(state => state.user);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ticketData, setTicketData] = useState<{
    visible: boolean;
    mesaNumero: number | string;
    pedidoId?: number | string;
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
      productos: (item.detalles || item.productos_detalle || []).map((p: any) => ({
        nombre: p.producto_nombre || p.nombre || (p.producto ? p.producto.nombre : 'Producto'),
        cantidad: p.cantidad || 1,
        precio: p.producto_precio || p.precio_unitario || (p.producto ? p.producto.precio : 0)
      })),
      total: parseFloat(item.total || 0)
    });
  };
  const router = useRouter();

  const fetchPedidos = useCallback(async (uid?: string) => {
    const id = uid || user?.id;
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/pedidos/?usuario=${id}`);
      const data = Array.isArray(res.data) ? res.data : [];
      const sorted = data.sort((a: any, b: any) => {
        const activo = (e: string) => ['pendiente', 'despachado'].includes(e);
        if (activo((a.estado_nombre || '').toLowerCase()) && !activo((b.estado_nombre || '').toLowerCase())) return -1;
        if (!activo((a.estado_nombre || '').toLowerCase()) && activo((b.estado_nombre || '').toLowerCase())) return 1;
        return new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime();
      });
      setPedidos(sorted);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchPedidos(user.id);
    }, [user?.id, fetchPedidos])
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

  const handleUpdateEstado = async (pedidoId: number, nuevoEstado: string) => {
    try {
      await apiClient.patch(`/pedidos/${pedidoId}/`, { estado: nuevoEstado });
      fetchPedidos();
      Alert.alert('¡Excelente!', `Pedido #${pedidoId} actualizado.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    }
  };

  const renderPedido = ({ item }: { item: any }) => {
    const estado = ESTADO_CONFIG[(item.estado_nombre || '').toLowerCase()] || ESTADO_CONFIG.pendiente;
    const isExpanded = expandedId === item.id;
    const isActive = ['pendiente', 'despachado'].includes((item.estado_nombre || '').toLowerCase());
    const fecha = item.date || (item.fecha_hora ? item.fecha_hora.split('T')[0] : '');
    const hora  = item.time || (item.fecha_hora ? item.fecha_hora.split('T')[1]?.substring(0,5) : '');

    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHead}>
          <View style={styles.cardLeft}>
            <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
              <Text style={[styles.estadoText, { color: estado.color }]}>{estado.label}</Text>
            </View>
            <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.mesaText}>Mesa #{item.mesa_numero || (typeof item.mesa === 'object' ? item.mesa.numero : item.mesa) || "??"}</Text>
            <Text style={styles.totalText}>${parseFloat(item.total || 0).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={NoxColors.muted} />
          <Text style={styles.metaText}>{fecha}</Text>
          <Ionicons name="time-outline" size={12} color={NoxColors.muted} style={{ marginLeft: 10 }} />
          <Text style={styles.metaText}>{hora}</Text>
        </View>

        {isExpanded && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>PRODUCTOS</Text>
            {(item.productos_detalle || []).map((prod: any, idx: number) => (
              <View key={idx} style={styles.prodRow}>
                <Text style={styles.prodName} numberOfLines={1}>{prod.producto_nombre}</Text>
                <Text style={styles.prodQty}>x{prod.cantidad}</Text>
                <Text style={styles.prodPrice}>
                  ${(parseFloat(prod.producto_precio || 0) * prod.cantidad).toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>${parseFloat(item.total || 0).toLocaleString()}</Text>
            </View>

            {/* Gestión de Estado */}
            {isActive && (
              <View style={styles.actionsHistory}>
                  <TouchableOpacity 
                    style={styles.cancelBtnMini} 
                    onPress={() => Alert.alert("Confirmar", "¿RECHAZAR este pedido?", [
                        {text:'No'}, {text:'Sí', onPress:() => handleUpdateEstado(item.id, 'cancelado')}
                    ])}>
                    <Ionicons name="close" size={14} color={NoxColors.rose} />
                    <Text style={styles.cancelBtnTextMini}>RECHAZAR</Text>
                  </TouchableOpacity>
                  
                  {(item.estado_nombre || '').toLowerCase() === 'pendiente' && (
                    <TouchableOpacity 
                        style={styles.listoBtnMini} 
                        onPress={() => handleUpdateEstado(item.id, 'despachado')}>
                        <Ionicons name="checkmark-circle" size={14} color={NoxColors.text} />
                        <Text style={styles.listoBtnTextMini}>¡LISTO!</Text>
                    </TouchableOpacity>
                  )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.printTicketBtnBar}
              onPress={() => handleOpenTicket(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={15} color={NoxColors.aura} />
              <Text style={styles.printTicketBtnBarText}>IMPRIMIR TICKET POS</Text>
            </TouchableOpacity>
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

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 60 }} />
      ) : pedidos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={NoxColors.container} />
          <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
          <Text style={styles.emptyText}>Tus pedidos aparecerán aquí</Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={item => String(item.id)}
          renderItem={renderPedido}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NoxColors.aura} />}
        />
      )}

      <TicketModal
        visible={ticketData.visible}
        onClose={() => setTicketData(prev => ({ ...prev, visible: false }))}
        mesaNumero={ticketData.mesaNumero}
        pedidoId={ticketData.pedidoId}
        meseraNombre={(user as any)?.nombre_completo || user?.username || 'Bartender'}
        productos={ticketData.productos}
        total={ticketData.total}
        tituloTicket="TICKET DE BARRA"
      />


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25,
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
  logoutBtn: { backgroundColor: NoxColors.container, padding: 12, borderRadius: 15 },
  card: {
    backgroundColor: NoxColors.card, borderRadius: 24, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: NoxColors.border,
  },
  cardActive: { borderColor: 'rgba(169,68,255,0.3)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { gap: 6 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  estadoText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  pedidoId: { color: NoxColors.text, fontWeight: 'bold', fontSize: 16 },
  mesaText: { color: NoxColors.muted, fontSize: 12, fontWeight: '600' },
  totalText: { color: NoxColors.emerald, fontWeight: '900', fontSize: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: NoxColors.muted, fontSize: 11, marginRight: 5 },
  detail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: NoxColors.border },
  detailLabel: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, letterSpacing: 2, marginBottom: 12 },
  prodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prodName: { flex: 1, color: NoxColors.text, fontSize: 13 },
  prodQty: { color: NoxColors.muted, fontSize: 12, marginHorizontal: 8 },
  prodPrice: { color: NoxColors.aura, fontWeight: 'bold', fontSize: 13 },
  divider: { height: 1, backgroundColor: NoxColors.border, marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  totalValue: { color: NoxColors.text, fontWeight: '900', fontSize: 22 },
  actionsHistory: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20 },
  cancelBtnMini: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  cancelBtnTextMini: { color: NoxColors.rose, fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  listoBtnMini: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: NoxColors.emerald },
  listoBtnTextMini: { color: NoxColors.text, fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: NoxColors.text, fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: NoxColors.muted, fontSize: 13 },
  printTicketBtnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(169, 68, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.35)',
  },
  printTicketBtnBarText: {
    color: NoxColors.aura,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 2,
  },
});
