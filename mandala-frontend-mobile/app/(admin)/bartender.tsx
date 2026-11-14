import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/apiClient';
import { NoxColors } from '../../constants/theme';
import NoxAlert from '../../components/NoxAlert';

export default function AdminBartenderScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(admin)/settings');
  };
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchPending();
    const timer = setInterval(fetchPending, 10000); 
    return () => clearInterval(timer);
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pedidos/?estado=pendiente');
      setPedidos(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (pedidoId: number, nuevoEstado: string) => {
    setLoading(true);
    try {
      const res = await apiClient.patch(`/pedidos/${pedidoId}/`, { estado: nuevoEstado });
      if (res.status === 200 || res.status === 201) {
        setAlertConfig({
          visible: true,
          title: '¡Operación Exitosa!',
          message: `Pedido #${pedidoId} marcado como ${nuevoEstado === 'despachado' ? 'LISTO' : 'RECHAZADO'}.`,
          type: 'success',
          confirmText: 'ENTENDIDO',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
        fetchPending();
      }
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo actualizar el estado del pedido',
        type: 'error',
        confirmText: 'CERRAR',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = (pedidoId: number, estado: string) => {
    const isDespacho = estado === 'despachado';
    setAlertConfig({
      visible: true,
      title: isDespacho ? 'Despachar Pedido' : 'Rechazar Pedido',
      message: isDespacho ? `¿Confirmas que el pedido #${pedidoId} está listo y preparado?` : `¿Estás seguro de RECHAZAR el pedido #${pedidoId}?`,
      type: isDespacho ? 'info' : 'warning',
      confirmText: isDespacho ? 'SÍ, DESPACHAR' : 'SÍ, RECHAZAR',
      cancelText: 'CANCELAR',
      onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        handleUpdateEstado(pedidoId, estado);
      }
    });
  };

  const renderPedido = ({ item }: { item: any }) => {
    // FALLBACK PARA MESA
    const mesaNum = item.mesa_numero || (typeof item.mesa === 'object' ? item.mesa.numero : item.mesa) || "??";
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.mesaBadge}>
              <Text style={styles.mesaText}>Mesa #{mesaNum}</Text>
            </View>
            <Text style={{ color: NoxColors.aura, fontSize: 11, fontWeight: '700' }}>
              • {item.usuario_nombre || item.mesera_nombre || 'S/N'}
            </Text>
          </View>
          <Text style={styles.timeText}>{new Date(item.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        <View style={styles.itemsList}>
          {(item.productos_detalle || []).map((it: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.cantCircle}><Text style={styles.cantNum}>{it.cantidad}</Text></View>
              <Text style={styles.itemName}>{it.producto_nombre}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.readyBtn, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: NoxColors.rose }]} 
            onPress={() => confirmAction(item.id, 'cancelado')}
          >
            <Text style={[styles.readyBtnText, { color: NoxColors.rose }]}>RECHAZAR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.readyBtn, { flex: 2 }]} 
            onPress={() => confirmAction(item.id, 'despachado')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#000000" />
            <Text style={styles.readyBtnText}>¡PREPARADO!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <RollsRoyceStars />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={NoxColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>PREPARACIÓN EN BARRA</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPending} disabled={loading}>
          <Ionicons name="reload" size={24} color={loading ? NoxColors.gray : NoxColors.aura} />
        </TouchableOpacity>
      </View>

      {loading && pedidos.length === 0 ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={pedidos}
          keyExtractor={item => String(item.id)}
          renderItem={renderPedido}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="beer-outline" size={64} color={NoxColors.container} />
              <Text style={{ color: NoxColors.muted, marginTop: 15, fontWeight:'bold', letterSpacing: 2 }}>TODO AL DÍA</Text>
              <Text style={{ color: NoxColors.gray, fontSize: 10, marginTop: 5 }}>NO HAY PEDIDOS PENDIENTES</Text>
            </View>
          }
        />
      )}
      <NoxAlert {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', position: 'relative' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 60,
    paddingBottom: 20
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { backgroundColor: NoxColors.container, width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  card: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 20, 
    borderLeftWidth: 4, 
    borderLeftColor: '#00E5FF',
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  mesaBadge: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  mesaText: { color: '#00E5FF', fontWeight: '900', fontSize: 14 },
  timeText: { color: NoxColors.gray, fontSize: 10, fontWeight: 'bold' },
  
  itemsList: { marginBottom: 20 },
  itemRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  cantCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cantNum: { fontWeight: 'bold', color: '#00E5FF', fontSize: 12 },
  itemName: { color: NoxColors.text, fontWeight: 'bold', fontSize: 15 },
  
  readyBtn: { backgroundColor: '#00E5FF', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  readyBtnText: { color: '#000000', fontWeight: '900', marginLeft: 8, fontSize: 11, letterSpacing: 1 },
  
  empty: { alignItems: 'center', marginTop: 120 }
});
