import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions, RefreshControl, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { NoxColors } from '../../constants/theme';


const { width, height } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pendiente:  { label: 'PENDIENTE',   color: NoxColors.amber, bg: 'rgba(245,158,11,0.1)',  icon: 'time-outline' },
  Despachado: { label: 'DESPACHADO',  color: NoxColors.emerald, bg: 'rgba(16,185,129,0.1)',  icon: 'checkmark-circle-outline' },
  Cancelado:  { label: 'CANCELADO',   color: NoxColors.rose, bg: 'rgba(239,68,68,0.1)',   icon: 'close-circle-outline' },
  Pagado:     { label: 'PAGADO',      color: NoxColors.aura, bg: 'rgba(169,68,255,0.1)',  icon: 'card-outline' },
  Preparando: { label: 'PREPARANDO',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: 'flash-outline' },
};

export default function AdminHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [meseras, setMeseras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [userFilterModalOpen, setUserFilterModalOpen] = useState(false);
  const [productReportModalOpen, setProductReportModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  
  const [filterType, setFilterType] = useState<'today' | 'all'>('today');
  const [selectedMesera, setSelectedMesera] = useState<number | 'system' | null>(null);

  useFocusEffect(
    useCallback(() => {
        fetchData();
    }, [])
  );

  const fetchData = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else if (pedidos.length === 0) setLoading(true);
    try {
      const [pedRes, mesRes] = await Promise.all([
        apiClient.get('/pedidos/'),
        apiClient.get('/usuarios/')
      ]);
      setPedidos(Array.isArray(pedRes.data) ? pedRes.data : []);
      setMeseras(Array.isArray(mesRes.data) ? mesRes.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChangeStatus = async (pedidoId: number, nuevoEstado: string) => {
    try {
        await apiClient.patch(`/pedidos/${pedidoId}/`, { estado_nombre: nuevoEstado });
        setStatusModalOpen(false);
        fetchData(true);
        Alert.alert("Éxito", "Historial actualizado.");
    } catch (e: any) {
        const errorMsg = e.response?.data?.detail || "No se pudo cambiar el estado.";
        Alert.alert("Error", errorMsg);
    }
  };

  const groupedData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const filtered = pedidos.filter(p => {
      const pedidoDate = (p.fecha_hora || "").split('T')[0];
      if (filterType === 'today') {
         if (pedidoDate !== todayStr && pedidoDate !== localTodayStr) return false;
      }
      if (selectedMesera !== null) {
        if (p.creado_por !== selectedMesera) return false;
      }
      return true;
    });

    const groups: Record<string, any[]> = {};
    filtered.forEach(p => {
      const date = (p.fecha_hora || "").split('T')[0] || 'Sin Fecha';
      if (!groups[date]) groups[date] = [];
      groups[date].push(p);
    });

    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const dayTotal = groups[date]
        .filter(p => p.estado_nombre === 'Pagado' || p.estado_nombre === 'Despachado')
        .reduce((acc, p) => acc + parseFloat(p.total || 0), 0);
      
      return {
        title: date,
        dayTotal,
        data: groups[date]
      };
    });
  }, [pedidos, filterType, selectedMesera]);

  const totalCaja = useMemo(() => {
    return groupedData.reduce((acc, section) => acc + section.dayTotal, 0);
  }, [groupedData]);

  const currentMeseraName = useMemo(() => {
     if (selectedMesera === null) return "TODOS";
     const m = meseras.find(it => it.id === selectedMesera);
     return m ? m.username.toUpperCase() : "TODOS";
  }, [selectedMesera, meseras]);

  const productReportData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const validOrders = pedidos.filter(p => {
      const pedidoDate = (p.fecha_hora || "").split('T')[0];
      if (filterType === 'today') {
        if (pedidoDate !== todayStr && pedidoDate !== localTodayStr) return false;
      }
      if (selectedMesera !== null) {
        if (p.creado_por !== selectedMesera) return false;
      }
      return p.estado_nombre === 'Pagado' || p.estado_nombre === 'Despachado';
    });

    const summary: Record<string, { id: any; nombre: string; cantidad: number; total: number }> = {};

    validOrders.forEach(order => {
      if (Array.isArray(order.productos)) {
        order.productos.forEach((item: any) => {
          const key = item.producto_id ? String(item.producto_id) : (item.producto_nombre || 'Desconocido');
          const name = item.producto_nombre || `Producto #${item.producto_id || ''}`;
          const qty = parseInt(item.cantidad || 1, 10);
          const price = parseFloat(item.producto_price || item.producto_precio || item.precio || 0);

          if (!summary[key]) {
            summary[key] = { id: key, nombre: name, cantidad: 0, total: 0 };
          }
          summary[key].cantidad += qty;
          summary[key].total += (qty * price);
        });
      }
    });

    const list = Object.values(summary).sort((a, b) => b.cantidad - a.cantidad);
    const totalUnidades = list.reduce((acc, i) => acc + i.cantidad, 0);
    const totalRecaudado = list.reduce((acc, i) => acc + i.total, 0);

    return { list, totalUnidades, totalRecaudado };
  }, [pedidos, filterType, selectedMesera]);

  const renderPedido = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.estado_nombre] || { label: item.estado_nombre || 'S/E', color: NoxColors.muted, bg: 'rgba(138,123,175,0.1)', icon: 'help-circle-outline' };
    
    return (
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8}
          onPress={() => { setSelectedPedido(item); setStatusModalOpen(true); }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.mesaTag}>
              <Text style={styles.mesaText}>MESA #{item.mesa_numero ?? item.mesa}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
            </View>
          </View>
    
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>RESPONSABLE</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{item.usuario_nombre || 'SISTEMA'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>HORA</Text>
              <Text style={styles.infoVal} numberOfLines={1}>
                  {item.fecha_hora ? new Date(item.fecha_hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.productSection}>
              {(item.productos_detalle || item.detalles || []).map((p: any, idx: number) => (
                  <View key={idx} style={styles.productRow}>
                      <Text style={styles.productCant}>{p.cantidad || 1}x</Text>
                      <Text style={styles.productName} numberOfLines={1}>{p.producto_nombre || 'Producto'}</Text>
                      <Text style={styles.productPrice}>${parseFloat(p.producto_price || p.producto_precio || 0).toLocaleString()}</Text>
                  </View>
              ))}
          </View>

          <View style={styles.divider} />
    
          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>ID #{item.id}</Text>
            <Text style={styles.totalVal}>${parseFloat(item.total || 0).toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, dayTotal } }: { section: any }) => {
    const dateObj = new Date(title + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = dateObj.toLocaleDateString('es-ES', options).toUpperCase();

    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLine} />
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitleText}>{dateStr}</Text>
          <View style={styles.sectionTotalBadge}>
            <Text style={styles.sectionTotalText}>TOTAL DÍA: ${dayTotal.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>HISTORIAL DE VENTAS</Text>
        </View>
      </View>

      <View style={styles.filterSection}>
          <View style={styles.filterGroup}>
              <TouchableOpacity 
                style={[styles.filterChip, filterType === 'today' && styles.filterChipActive]} 
                onPress={() => setFilterType('today')}
              >
                <Text style={[styles.filterChipText, filterType === 'today' && {color: NoxColors.text}]}>HOY</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]} 
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterChipText, filterType === 'all' && {color: NoxColors.text}]}>HISTÓRICO</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.filterActionsGroup}>
            <TouchableOpacity 
              style={[styles.userSelectBtn, selectedMesera !== null && styles.userSelectBtnActive]}
              onPress={() => setUserFilterModalOpen(true)}
            >
                <Ionicons name="person-circle-outline" size={18} color={selectedMesera !== null ? NoxColors.text : NoxColors.aura} />
                <Text style={[styles.userSelectText, selectedMesera !== null && {color: NoxColors.text}]}>
                    {currentMeseraName}
                </Text>
                <Ionicons name="chevron-down" size={14} color={selectedMesera !== null ? NoxColors.text : NoxColors.muted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.productReportBtn}
              onPress={() => setProductReportModalOpen(true)}
              activeOpacity={0.8}
            >
                <Ionicons name="cube" size={16} color={NoxColors.emerald} />
                <Text style={styles.productReportBtnText}>PRODUCTOS</Text>
            </TouchableOpacity>
          </View>
      </View>

      <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>BALANCE TOTAL ({filterType === 'today' ? 'HOY' : 'TOTAL'})</Text>
                <Text style={styles.summaryAmount}>${totalCaja.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryStats}>
                  <Text style={styles.statCount}>{groupedData.reduce((acc, s) => acc + s.data.length, 0)}</Text>
                  <Text style={styles.statSub}>VENTAS</Text>
              </View>
          </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={item => String(item.id)}
          renderItem={renderPedido}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={NoxColors.aura} />}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={60} color={NoxColors.container} />
                <Text style={styles.emptyText}>SIN REGISTROS DISPONIBLES</Text>
            </View>
          }
        />
      )}

      {/* Modal Selector de Usuario */}
      <Modal visible={userFilterModalOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
              <View style={styles.glassCard}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>FILTRAR POR USUARIO</Text>
                      <TouchableOpacity onPress={() => setUserFilterModalOpen(false)} style={styles.closeBtn}>
                          <Ionicons name="close" size={24} color={NoxColors.text} />
                      </TouchableOpacity>
                  </View>

                  <ScrollView style={{maxHeight: 400}}>
                      <TouchableOpacity 
                        style={[styles.userItem, selectedMesera === null && styles.userItemActive]}
                        onPress={() => { setSelectedMesera(null); setUserFilterModalOpen(false); }}
                      >
                          <Ionicons name="apps-outline" size={20} color={selectedMesera === null ? NoxColors.text : NoxColors.aura} />
                          <Text style={[styles.userItemText, selectedMesera === null && {color: NoxColors.text}]}>TODOS LOS USUARIOS</Text>
                      </TouchableOpacity>

                      <Text style={styles.modalSubLabel}>PERSONAL REGISTRADO</Text>
                      {meseras.map(m => (
                          <TouchableOpacity 
                            key={m.id} 
                            style={[styles.userItem, selectedMesera === m.id && styles.userItemActive]}
                            onPress={() => { setSelectedMesera(m.id); setUserFilterModalOpen(false); }}
                          >
                              <View style={[styles.miniAvatar, {backgroundColor: `${m.user_role === 'admin' ? NoxColors.amber : NoxColors.aura}20`}]}>
                                  <Text style={[styles.miniAvatarText, {color: m.user_role === 'admin' ? NoxColors.amber : NoxColors.aura}]}>{m.username.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View>
                                  <Text style={[styles.userItemText, selectedMesera === m.id && {color: NoxColors.text}]}>{m.username.toUpperCase()}</Text>
                                  <Text style={styles.userRoleText}>{m.user_role?.toUpperCase() || 'PERSONAL'}</Text>
                              </View>
                              {selectedMesera === m.id && <Ionicons name="checkmark-circle" size={20} color={NoxColors.text} style={{marginLeft: 'auto'}} />}
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* Modal Status */}
      <Modal visible={statusModalOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
              <View style={[styles.glassCard, { maxHeight: height * 0.85 }]}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>GESTIONAR</Text>
                            <Text style={styles.selectedProdName}>VENTA #{selectedPedido?.id}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setStatusModalOpen(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={NoxColors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>CAMBIAR ESTADO A:</Text>
                    
                    <View style={styles.statusGrid}>
                        {['Pendiente', 'Despachado', 'Cancelado'].map(s => {
                            const config = STATUS_CONFIG[s];
                            const isSelected = selectedPedido?.estado_nombre === s;
                            return (
                                <TouchableOpacity 
                                    key={s} 
                                    style={[
                                        styles.statusGridItem, 
                                        { borderColor: isSelected ? config.color : NoxColors.border },
                                        isSelected && { backgroundColor: config.bg }
                                    ]}
                                    onPress={() => handleChangeStatus(selectedPedido.id, s)}
                                >
                                    <View style={[styles.statusIconCircle, { backgroundColor: isSelected ? config.color : 'rgba(255,255,255,0.03)' }]}>
                                        <Ionicons name={config.icon} size={22} color={isSelected ? NoxColors.text : config.color} />
                                    </View>
                                    <Text style={[styles.statusItemText, { color: isSelected ? NoxColors.text : NoxColors.muted }]}>{config.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    
                    <View style={styles.infoBox}>
                        <Ionicons name="alert-circle-outline" size={16} color={NoxColors.aura} />
                        <Text style={styles.qrInfo}>Modificar una venta afecta el reporte financiero del día correspondiente.</Text>
                    </View>
                  </ScrollView>
              </View>
          </View>
      </Modal>
    
      {/* Modal Reporte de Cantidades Vendidas por Producto */}
      <Modal visible={productReportModalOpen} transparent animationType="fade">
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalCard}>
            <View style={styles.reportHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.reportIconBox}>
                    <Ionicons name="cube" size={20} color={NoxColors.emerald} />
                  </View>
                  <Text style={styles.reportTitle}>CANTIDADES VENDIDAS</Text>
                </View>
                <Text style={styles.reportSubtitle}>
                  {filterType === 'today' ? 'Ventas de Hoy' : 'Histórico Completo'}
                  {selectedMesera !== null ? ` • Filtro: ${currentMeseraName}` : ' • Todas las Meseras'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setProductReportModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={NoxColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.reportSummaryRow}>
              <View style={styles.reportMetricBox}>
                <Text style={styles.metricVal}>{productReportData.totalUnidades}</Text>
                <Text style={styles.metricLbl}>UNIDADES TOTALES</Text>
              </View>
              <View style={[styles.reportMetricBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' }]}>
                <Text style={[styles.metricVal, { color: NoxColors.emerald }]}>
                  ${productReportData.totalRecaudado.toLocaleString()}
                </Text>
                <Text style={styles.metricLbl}>TOTAL RECAUDADO</Text>
              </View>
            </View>

            {productReportData.list.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="receipt-outline" size={40} color={NoxColors.muted} />
                <Text style={{ color: NoxColors.muted, marginTop: 10, fontSize: 13, fontWeight: '700' }}>
                  No hay ventas registradas con los filtros actuales
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {productReportData.list.map((item, index) => (
                  <View key={item.id} style={styles.reportItemRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={styles.reportItemName} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.reportItemSub}>${item.total.toLocaleString()} generado</Text>
                    </View>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeNum}>{item.cantidad}</Text>
                      <Text style={styles.qtyBadgeUnit}>uds</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.closeReportBtn} 
              onPress={() => setProductReportModalOpen(false)}
            >
              <Text style={styles.closeReportBtnText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },

  filterSection: { paddingHorizontal: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  filterGroup: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border },
  filterChipActive: { backgroundColor: NoxColors.container, borderColor: 'rgba(169,68,255,0.3)' },
  filterChipText: { color: NoxColors.muted, fontSize: 10, fontWeight: '900' },
  
  userSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: NoxColors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)', maxWidth: 160 },
  userSelectBtnActive: { backgroundColor: NoxColors.aura, borderColor: NoxColors.aura },
  userSelectText: { color: NoxColors.aura, fontSize: 10, fontWeight: '900', flexShrink: 1 },

  summaryContainer: { paddingHorizontal: 20, marginBottom: 25, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  summaryCard: { 
    backgroundColor: NoxColors.container, borderRadius: 28, padding: 22, flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.3)'
  },
  summaryInfo: { gap: 4 },
  summaryLabel: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  summaryAmount: { color: NoxColors.text, fontSize: 32, fontWeight: '900' },
  summaryStats: { alignItems: 'center', backgroundColor: 'rgba(169, 68, 255, 0.1)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18 },
  statCount: { color: NoxColors.text, fontSize: 20, fontWeight: '900' },
  statSub: { color: NoxColors.aura, fontSize: 8, fontWeight: '900' },

  listContent: { paddingHorizontal: 20, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingBottom: 100 },
  sectionHeader: { marginTop: 25, marginBottom: 15 },
  sectionHeaderLine: { height: 1, backgroundColor: 'rgba(138, 123, 175, 0.1)', position: 'absolute', left: 0, right: 0, top: 12 },
  sectionHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: NoxColors.background, alignSelf: 'flex-start', paddingRight: 15 },
  sectionTitleText: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 3, backgroundColor: NoxColors.background, paddingRight: 10 },
  sectionTotalBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  sectionTotalText: { color: NoxColors.emerald, fontSize: 9, fontWeight: 'bold' },

  card: { backgroundColor: NoxColors.card, borderRadius: 24, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: NoxColors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mesaTag: { backgroundColor: 'rgba(169, 68, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  mesaText: { color: NoxColors.aura, fontWeight: '900', fontSize: 11 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 9, fontWeight: '900' },

  infoGrid: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  infoCol: { flex: 1, gap: 4 },
  infoLabel: { color: NoxColors.gray, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  infoVal: { color: NoxColors.text, fontSize: 12, fontWeight: 'bold' },

  productSection: { marginTop: 5, gap: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productCant: { color: NoxColors.aura, fontSize: 12, fontWeight: '900', minWidth: 25 },
  productName: { color: NoxColors.muted, fontSize: 13, flex: 1 },
  productPrice: { color: NoxColors.text, fontSize: 12, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: NoxColors.border, marginVertical: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: NoxColors.gray, fontSize: 10, fontWeight: 'bold' },
  totalVal: { color: NoxColors.emerald, fontSize: 24, fontWeight: '900' },

  modalBg: { flex: 1, backgroundColor: 'rgba(5, 5, 16, 0.95)', justifyContent: 'center', padding: 25 },
  glassCard: { backgroundColor: NoxColors.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)', shadowColor: NoxColors.aura, shadowOpacity: 0.1, shadowRadius: 30, maxWidth: 500, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' },
  modalTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  modalSubLabel: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, marginVertical: 20, letterSpacing: 2 },
  closeBtn: { backgroundColor: NoxColors.container, width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 18, borderRadius: 20, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'transparent' },
  userItemActive: { backgroundColor: NoxColors.aura, borderColor: 'rgba(255,255,255,0.2)' },
  miniAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { fontWeight: '900', fontSize: 16 },
  userItemText: { color: NoxColors.text, fontWeight: 'bold', fontSize: 14 },
  userRoleText: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', marginTop: 2 },

  label: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, marginBottom: 20, letterSpacing: 2 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  statusGridItem: { width: '47%', paddingVertical: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 10 },
  statusIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statusItemText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(169, 68, 255, 0.05)', padding: 16, borderRadius: 20, marginTop: 25 },
  qrInfo: { color: NoxColors.muted, fontSize: 10, flex: 1, lineHeight: 16 },

  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 15, opacity: 0.2 },
  emptyText: { color: NoxColors.muted, fontWeight: '900', fontSize: 11, letterSpacing: 3 },
  selectedProdName: { color: NoxColors.aura, fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  filterActionsGroup: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  productReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  productReportBtnText: {
    color: NoxColors.emerald,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: NoxColors.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: NoxColors.emerald,
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  reportIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NoxColors.text,
    letterSpacing: 1,
  },
  reportSubtitle: {
    fontSize: 11,
    color: NoxColors.muted,
    fontWeight: '600',
    marginTop: 4,
  },
  reportSummaryRow: {
    flexDirection: 'row',
    backgroundColor: NoxColors.container,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  reportMetricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: NoxColors.text,
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: '800',
    color: NoxColors.muted,
    letterSpacing: 1,
    marginTop: 4,
  },
  reportItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: NoxColors.muted,
  },
  reportItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: NoxColors.text,
  },
  reportItemSub: {
    fontSize: 11,
    color: NoxColors.muted,
    marginTop: 2,
  },
  qtyBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  qtyBadgeNum: {
    fontSize: 14,
    fontWeight: '900',
    color: NoxColors.emerald,
    marginRight: 2,
  },
  qtyBadgeUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: NoxColors.muted,
  },
  closeReportBtn: {
    marginTop: 18,
    backgroundColor: NoxColors.container,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  closeReportBtnText: {
    color: NoxColors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});

