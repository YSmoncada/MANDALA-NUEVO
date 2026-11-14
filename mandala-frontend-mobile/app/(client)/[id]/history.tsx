import RollsRoyceStars from '../../../components/RollsRoyceStars';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../../../utils/apiClient';
import { NoxColors } from '../../../constants/theme';


const { width } = Dimensions.get('window');

const ESTADO_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  '1':          { label: 'En preparación', color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  '2':          { label: 'En preparación', color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  '3':          { label: 'Entregado',      color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)' },
  '4':          { label: 'Cuenta cerrada', color: NoxColors.subtext, bg: 'rgba(113,113,122,0.1)' },
  '5':          { label: 'Cancelado',      color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)' },
  pendiente:   { label: 'En preparación', color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  preparando:  { label: 'En preparación', color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)' },
  despachado:  { label: 'Entregado',      color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)' },
  entregado:   { label: 'Entregado',      color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)' },
  finalizada:  { label: 'Cuenta cerrada', color: NoxColors.subtext, bg: 'rgba(113,113,122,0.1)' },
  pagado:      { label: 'Cuenta cerrada', color: NoxColors.subtext, bg: 'rgba(113,113,122,0.1)' },
  cancelado:   { label: 'Cancelado',      color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)' },
};

export default function ClientHistoryScreen() {
  const { id: rawId } = useGlobalSearchParams();
  const mesaId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mesaInfo, setMesaInfo] = useState<any>(null);

  useEffect(() => {
    if (!mesaId || mesaId === 'undefined') {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    fetchHistory();
  }, [mesaId]);

  const fetchHistory = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    try {
      // Pedidos sin token — el backend filtra por mesa correctamente
      const res = await axios.get(`${API_URL}/pedidos/?mesa=${mesaId}`);
      const sorted = Array.isArray(res.data) ? res.data.sort((a, b) => b.id - a.id) : [];
      console.log("DEBUG MESERA: Pedidos cargados:", sorted.length);
      if (sorted.length > 0) {
        console.log("DEBUG MESERA: Primer pedido pidiendo_cuenta:", sorted[0].pidiendo_cuenta);
      }
      setPedidos(sorted);
    } catch (e: any) {
      // 404 o lista vacía = sin pedidos aún, no es un error real
      if (e?.response?.status !== 404) {
        console.error('Historial pedidos error:', e?.response?.status);
      }
      setPedidos([]);
    }

    // Mesa info: intento aparte para no bloquear si falla
    try {
      const mesaRes = await axios.get(`${API_URL}/mesas/${mesaId}/`);
      setMesaInfo(mesaRes.data);
    } catch {
      // Si falla, mostramos el ID como fallback — la app sigue funcionando
      setMesaInfo({ numero: mesaId });
    }

    setLoading(false);
    setRefreshing(false);
  };

  const totalConsumido = pedidos.reduce((acc, p) => acc + (p.estado !== 'cancelado' ? parseFloat(p.total) : 0), 0);

  const renderPedido = ({ item }: { item: any }) => {
    const estadoKey = (item.estado_nombre || '').toLowerCase() || String(item.estado_id || item.estado || '');
    const estado = ESTADO_CONFIG[estadoKey] || (Number(item.estado_id || item.estado) === 3 ? ESTADO_CONFIG.despachado : ESTADO_CONFIG.pendiente);
    const hora = item.fecha_hora ? new Date(item.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.pedidoId}>PEDIDO #{item.id}</Text>
            <Text style={styles.hora}>{hora}</Text>
          </View>
          <View style={[styles.badge, {backgroundColor: estado.bg}]}>
            <Text style={[styles.badgeTxt, {color: estado.color}]}>{estado.label.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.itemsList}>
          {(item.productos_detalle || []).map((prod: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{prod.producto_nombre}</Text>
                <Text style={styles.itemQty}>x{prod.cantidad}</Text>
                <Text style={styles.itemPrice}>${(parseFloat(prod.producto_precio) * prod.cantidad).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
           <Text style={styles.itemPriceLabel}>SUBTOTAL</Text>
           <Text style={styles.itemFinalPrice}>${parseFloat(item.total).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) return (
    <View style={styles.loader}><ActivityIndicator color={NoxColors.aura} size="large" /></View>
  );

  return (
    <View style={styles.container}>
      <RollsRoyceStars />
      <View style={styles.header}>
        <View>
          <Text style={styles.branding}>Nox<Text style={{color:NoxColors.subtext}}>OS</Text></Text>
          <Text style={styles.subtitle}>MI CONSUMO - MESA #{mesaInfo?.numero || '?'}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.payBtn, mesaInfo?.pidiendo_cuenta && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: NoxColors.emerald }]} 
          disabled={Boolean(mesaInfo?.pidiendo_cuenta)}
          onPress={async () => {
            const hasPending = pedidos.some(p => {
              const st = (p.estado_nombre || '').toLowerCase();
              const estId = Number(p.estado_id || p.estado);
              return ['pendiente', 'preparando', 'aceptado', '1', '2'].includes(st) || estId === 1 || estId === 2;
            });

            if (hasPending) {
              Alert.alert(
                "Pedidos en Preparación",
                "No puedes pedir la cuenta mientras tengas pedidos pendientes de entrega en barra/cocina."
              );
              return;
            }

            try {
              await axios.post(`${API_URL}/mesas/${mesaId}/pedir-cuenta/`);
              setMesaInfo((prev: any) => ({ ...prev, pidiendo_cuenta: true }));
              Alert.alert("¡Solicitud Enviada!", "Le hemos avisado a tu mesera. Ya viene en camino con tu cuenta.");
            } catch (e: any) {
              const detail = e.response?.data?.detail || "No se pudo solicitar la cuenta.";
              Alert.alert("No se pudo pedir la cuenta", detail);
            }
          }}
        >
           <Ionicons name={mesaInfo?.pidiendo_cuenta ? "checkmark-circle" : "cash-outline"} size={18} color={mesaInfo?.pidiendo_cuenta ? NoxColors.emerald : "#000000"} />
           <Text style={[styles.payBtnText, mesaInfo?.pidiendo_cuenta && { color: NoxColors.emerald }]}>
             {mesaInfo?.pidiendo_cuenta ? 'CUENTA SOLICITADA' : 'PEDIR CUENTA'}
           </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
          <Text style={styles.summaryLbl}>TOTAL CONSUMIDO</Text>
          <Text style={styles.summaryVal}>${totalConsumido.toLocaleString()}</Text>
          <View style={styles.lineGlow} />
      </View>

      <FlatList
        showsVerticalScrollIndicator={false}
        data={pedidos}
        keyExtractor={item => String(item.id)}
        renderItem={renderPedido}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} tintColor={NoxColors.aura} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={NoxColors.container} />
            <Text style={styles.emptyTitle}>SIN CONSUMOS AÚN</Text>
            <Text style={styles.emptyText}>Tus pedidos aparecerán aquí una vez los envíes.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000'},
  loader: { flex: 1, backgroundColor: NoxColors.deep, justifyContent: 'center' },
  header: { paddingHorizontal: 25, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  branding: { color: NoxColors.text, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: NoxColors.muted, fontWeight: '900', fontSize: 9, letterSpacing: 2, marginTop: 4, textTransform:'uppercase' },
  payBtn: { backgroundColor: NoxColors.aura, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flexDirection:'row', alignItems:'center', gap: 6 },
  payBtnText: { color: '#000000', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  summaryCard: { backgroundColor: NoxColors.card, marginHorizontal: 20, padding: 30, borderRadius: 30, alignItems: 'center', marginBottom: 20, borderWidth:1, borderColor: NoxColors.border },
  summaryLbl: { color:NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom:10 },
  summaryVal: { color: NoxColors.text, fontSize: 36, fontWeight: '900' },
  lineGlow: { width: 50, height: 3, backgroundColor: NoxColors.aura, borderRadius: 2, marginTop: 15 },

  card: { backgroundColor: NoxColors.card, borderRadius: 25, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: NoxColors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  pedidoId: { color: NoxColors.text, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  hora: { color: NoxColors.subtext, fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  itemsList: { borderBottomWidth: 1, borderBottomColor: NoxColors.border, paddingBottom: 15, marginBottom: 15 },
  itemRow: { flexDirection:'row', alignItems:'center', marginBottom: 8 },
  itemName: { flex:1, color: NoxColors.text, fontSize: 13, fontWeight:'600' },
  itemQty: { color: NoxColors.muted, fontSize: 12, marginHorizontal: 10, fontWeight: 'bold' },
  itemPrice: { color: NoxColors.text, fontSize: 13, fontWeight: 'bold' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPriceLabel: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  itemFinalPrice: { color: NoxColors.aura, fontSize: 18, fontWeight: '900' },

  empty: { marginTop: 80, alignItems:'center' },
  emptyTitle: { color:NoxColors.muted, fontWeight: '900', fontSize: 14, letterSpacing: 3, marginTop: 20 },
  emptyText: { color: NoxColors.gray, textAlign: 'center', marginTop: 10, paddingHorizontal: 40, fontSize: 12, fontWeight:'bold' }
});
