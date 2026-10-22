import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';
import NoxAlert from '../../components/NoxAlert';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


export default function BartenderPrepScreen() {
  const { isDesktop, isLargeScreen } = useResponsive();
  const numColumns = isLargeScreen ? 3 : (isDesktop ? 2 : 1);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<number>>(new Set());

  // Estado de alerta personalizada
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (config: Partial<typeof alertConfig>) => {
    setAlertConfig({ visible: true, title: '', message: '', type: 'info', onConfirm: undefined, onCancel: undefined, confirmText: undefined, cancelText: undefined, ...config });
  };

  useEffect(() => {
    fetchPending();
    const timer = setInterval(fetchPending, 60000); // Refresca cada 60 segundos
    return () => clearInterval(timer);
  }, []);

  const fetchPending = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiClient.get('/pedidos/?estado=pendiente');
      const data = Array.isArray(res.data) ? res.data : [];
      setPedidos(data);
      // Limpiar IDs procesados que ya no están en la lista
      setProcessedIds(prev => {
        const currentIds = new Set(data.map((p: any) => p.id));
        const cleaned = new Set<number>();
        prev.forEach(id => { if (currentIds.has(id)) cleaned.add(id); });
        return cleaned;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleUpdateEstado = async (pedidoId: number, nuevoEstado: string) => {
    // Prevenir doble ejecución
    if (updatingId !== null || processedIds.has(pedidoId)) return;
    
    setUpdatingId(pedidoId);
    setProcessedIds(prev => new Set(prev).add(pedidoId));
    try {
      // Usar PATCH como lo pide el backend para cambios de estado
      const res = await apiClient.patch(`/pedidos/${pedidoId}/`, { estado: nuevoEstado });
      if (res.status === 200 || res.status === 201) {
        // Primero refrescar la lista para quitar el pedido
        await fetchPending();
        // Luego mostrar la alerta de éxito (sin onConfirm para que sea solo informativa)
        showAlert({
            title: '¡Excelente!', 
            message: `Pedido #${pedidoId} marcado como ${nuevoEstado === 'despachado' ? 'LISTO' : 'RECHAZADO'}.`,
            type: 'success'
        });
      }
    } catch (e) {
      // Si falló, quitar del set de procesados para permitir reintento
      setProcessedIds(prev => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
      showAlert({ title: 'Error', message: 'No se pudo actualizar el pedido', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDespacharProducto = async (pedidoId: number, itemId: number) => {
    try {
      await apiClient.post(`/pedidos/${pedidoId}/despachar_producto/`, { item_id: itemId });
      fetchPending();
    } catch (e) {
      showAlert({ title: 'Error', message: 'No se pudo despachar el producto', type: 'error' });
    }
  };

  const confirmAction = (pedidoId: number, estado: string) => {
    // No permitir acción si ya fue procesado o hay otro en curso
    if (updatingId !== null || processedIds.has(pedidoId)) return;
    
    const isDespacho = estado === 'despachado';
    showAlert({
        title: 'Confirmación',
        message: isDespacho 
            ? `¿Confirmas que el pedido #${pedidoId} está listo?`
            : `¿Estás seguro de RECHAZAR el pedido #${pedidoId}?`,
        type: isDespacho ? 'info' : 'warning',
        confirmText: isDespacho ? 'SÍ, LISTO' : 'SÍ, RECHAZAR',
        onConfirm: () => handleUpdateEstado(pedidoId, estado),
        onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const renderPedido = ({ item }: { item: any }) => {
    const hora = new Date(item.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isUpdating = updatingId === item.id;
    const isProcessed = processedIds.has(item.id);
    const isDisabled = isUpdating || isProcessed || updatingId !== null;
    
    // FALLBACK PARA MESA: Intentar encontrar el numero de mesa de varias formas
    const mesaNum = item.mesa_numero || (typeof item.mesa === 'object' ? item.mesa.numero : item.mesa) || "??";

    return (
      <View style={[styles.card, isProcessed && { opacity: 0.5 }, { maxWidth: isLargeScreen ? '32%' : (isDesktop ? '48.8%' : '100%') }]}>
        {/* Encabezado de la Tarjeta */}
        <View style={styles.cardHeader}>
          <View style={styles.leftInfo}>
            <View style={styles.mesaBadge}>
              <Text style={styles.mesaLabel}>MESA</Text>
              <Text style={styles.mesaNum}>#{mesaNum}</Text>
            </View>
            <View style={styles.pedidoInfo}>
              <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
              <Text style={styles.responsable}>{item.usuario_nombre || item.mesera_nombre || item.mesero_nombre || (item.creado_por ? `Usuario #${item.creado_por}` : 'Barra')}</Text>
            </View>
          </View>
          <View style={styles.rightInfo}>
            <Ionicons name="time-outline" size={12} color={NoxColors.muted} />
            <Text style={styles.timeText}>{hora}</Text>
          </View>
        </View>

        {/* Comanda */}
        <View style={styles.comandaHeader}>
          <Text style={styles.comandaLabel}>COMANDA</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.itemsList}>
          {(item.productos_detalle || []).map((prod: any, index: number) => {
            const pendiente = prod.cantidad - (prod.cantidad_despachada || 0);
            return (
              <View key={index} style={styles.itemRow}>
                <View style={styles.cantCircle}>
                  <Text style={styles.cantNum}>x{prod.cantidad}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{prod.producto_nombre}</Text>
                {pendiente > 0 ? (
                  <TouchableOpacity
                    onPress={() => handleDespacharProducto(item.id, prod.id)}
                    style={styles.checkBtn}
                    disabled={isDisabled}
                  >
                    <Ionicons name="checkmark" size={16} color={NoxColors.text} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.doneBtn}>
                    <Ionicons name="checkmark-done" size={16} color={NoxColors.emerald} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Acciones */}
        {isUpdating ? (
          <ActivityIndicator color={NoxColors.aura} style={{ marginTop: 15 }} />
        ) : isProcessed ? (
          <View style={[styles.actions, { justifyContent: 'center' }]}>
            <Text style={{ color: NoxColors.emerald, fontWeight: '900', fontSize: 11, letterSpacing: 2 }}>✓ PROCESADO</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, isDisabled && { opacity: 0.4 }]}
              onPress={() => confirmAction(item.id, 'cancelado')}
              disabled={isDisabled}
            >
              <Ionicons name="close-circle-outline" size={16} color={NoxColors.rose} />
              <Text style={styles.cancelBtnText}>RECHAZAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.listoBtn, isDisabled && { opacity: 0.4 }]}
              onPress={() => confirmAction(item.id, 'despachado')}
              disabled={isDisabled}
            >
              <Ionicons name="checkmark-circle" size={16} color={NoxColors.text} />
              <Text style={styles.listoBtnText}>¡PREPARADO!</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>MONITOR DE PEDIDOS</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchPending()} disabled={loading}>
          <Ionicons name="reload" size={22} color={loading ? '#333' : NoxColors.aura} />
        </TouchableOpacity>
      </View>

      {/* Contador */}
      {pedidos.length > 0 && (
        <View style={styles.countBanner}>
          <View style={styles.countDot} />
          <Text style={styles.countText}>{pedidos.length} PEDIDO{pedidos.length !== 1 ? 'S' : ''} PENDIENTE{pedidos.length !== 1 ? 'S' : ''}</Text>
        </View>
      )}

      {loading && pedidos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={NoxColors.aura} />
          <Text style={styles.emptyText}>MONITOR ACTIVO...</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={pedidos}
          keyExtractor={item => String(item.id)}
          renderItem={renderPedido}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPending(true)} tintColor={NoxColors.aura} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="beer-outline" size={64} color={NoxColors.container} />
              <Text style={styles.emptyTitle}>SILENCIO EN LA BARRA</Text>
              <Text style={styles.emptyText}>No hay pedidos pendientes</Text>
            </View>
          }
        />
      )}

      <NoxAlert 
        {...alertConfig} 
        onConfirm={() => {
            const callback = alertConfig.onConfirm;
            setAlertConfig(prev => ({ ...prev, visible: false, onConfirm: undefined, onCancel: undefined }));
            if (callback) callback();
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20,
    maxWidth: 1200, width: '100%', alignSelf: 'center',
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  refreshBtn: { backgroundColor: NoxColors.container, width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  countBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(169,68,255,0.1)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(169,68,255,0.2)',
    maxWidth: 1200, width: '100%', alignSelf: 'center',
  },
  countDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NoxColors.aura },
  countText: { color: NoxColors.aura, fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  listContent: { padding: 20, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  card: {
    flex: 1,
    backgroundColor: NoxColors.card,
    borderRadius: 24, padding: 20, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: NoxColors.aura,
    borderWidth: 1, borderColor: NoxColors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  leftInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mesaBadge: {
    backgroundColor: 'rgba(169,68,255,0.1)', padding: 10, borderRadius: 14,
    alignItems: 'center', minWidth: 55,
  },
  mesaLabel: { color: NoxColors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  mesaNum: { color: NoxColors.aura, fontSize: 20, fontWeight: '900' },
  pedidoInfo: { gap: 3 },
  pedidoId: { color: NoxColors.text, fontWeight: 'bold', fontSize: 16 },
  responsable: { color: NoxColors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  rightInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: NoxColors.muted, fontSize: 11, fontWeight: 'bold' },

  comandaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  comandaLabel: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  divider: { flex: 1, height: 1, backgroundColor: NoxColors.border },

  itemsList: { marginBottom: 20, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cantCircle: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center',
  },
  cantNum: { fontWeight: '900', color: NoxColors.aura, fontSize: 13 },
  itemName: { flex: 1, color: NoxColors.text, fontWeight: 'bold', fontSize: 14 },
  checkBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: NoxColors.emerald, justifyContent: 'center', alignItems: 'center',
  },
  doneBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center',
  },

  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  cancelBtnText: { color: NoxColors.rose, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  listoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: NoxColors.emerald,
  },
  listoBtnText: { color: NoxColors.text, fontWeight: '900', fontSize: 10, letterSpacing: 2 },

  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 15 },
  emptyTitle: { color: NoxColors.muted, fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  emptyText: { color: NoxColors.gray, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
});
