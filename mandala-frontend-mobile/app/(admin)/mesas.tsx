import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Image, Share, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import apiClient, { API_URL } from '../../utils/apiClient';
import * as Linking from 'expo-linking';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';

export default function AdminMesasScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(admin)/settings');
  };
  const { isDesktop, isLargeScreen } = useResponsive();
  const numColumns = isLargeScreen ? 3 : (isDesktop ? 2 : 1);
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<any>(null);
  const [formData, setFormData] = useState({ numero: '', capacidad: '4' });
  const [refreshing, setRefreshing] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      fetchMesas();
      const interval = setInterval(() => fetchMesas(), 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const fetchMesas = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (mesas.length === 0) setLoading(true);
    try {
      const res = await apiClient.get('/mesas/');
      setMesas(Array.isArray(res.data) ? res.data : []);
    } finally { 
        setLoading(false); 
        setRefreshing(false);
    }
  };

  const handleAddMesa = async () => {
    if (!formData.numero) return Alert.alert('Error', 'Número de mesa requerido');
    try {
      await apiClient.post('/mesas/', {
        numero: parseInt(formData.numero),
        capacidad: parseInt(formData.capacidad) || 1
      });
      setModalOpen(false);
      setFormData({ numero: '', capacidad: '4' });
      fetchMesas();
      Alert.alert('Éxito', 'Mesa agregada correctamente');
    } catch (error) { Alert.alert('Error', 'Ya existe una mesa con este número'); }
  };

  const handleDeleteMesa = (id: any, numero: any) => {
    Alert.alert("Eliminar Mesa", `¿Estás seguro de eliminar la Mesa #${numero}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            await apiClient.delete(`/mesas/${id}/`);
            fetchMesas();
          } catch (error) { console.error(error); }
      }}
    ]);
  };

  const getClientUrl = (mesaId: any) => {
      const baseUrl = API_URL.replace(/\/api\/?$/, '');
      return `${baseUrl}/menu/${mesaId}`;
  };

  const getQrUrl = (mesaId: any) => {
      const url = getClientUrl(mesaId);
      const encodedUrl = encodeURIComponent(url);
      return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodedUrl}`;
  };

  const handleShareQr = async (mesa: any) => {
      const url = getClientUrl(mesa.id);
      try {
          await Share.share({
              message: `Menú Digital - Mesa #${mesa.numero}\nPide aquí: ${url}`,
              url: url
          });
      } catch (error) { console.log(error); }
  };

  return (
    <View style={styles.container}>
      <RollsRoyceStars />
      {/* Encabezado Premium */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={NoxColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>CONTROL Y MAPA DE SALÓN</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
          {isDesktop && <Text style={styles.addBtnText}>NUEVA MESA</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          showsVerticalScrollIndicator={false}
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={mesas} 
          keyExtractor={it => String(it.id)} 
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMesas(true)} tintColor={NoxColors.aura} />}
          renderItem={({item}) => {
            const isOcupada = item.estado_nombre === 'Ocupada';
            const isSolicitando = item.estado_nombre === 'Solicitando Cuenta';
            const isLibre = !isOcupada && !isSolicitando;

            let dotColor = NoxColors.emerald;
            let statusText = 'Disponible';
            let statusTextColor = '#A1A1AA';

            if (isOcupada) {
              dotColor = NoxColors.aura;
              statusText = 'En Servicio';
              statusTextColor = NoxColors.aura;
            } else if (isSolicitando) {
              dotColor = NoxColors.amber;
              statusText = 'Pidiendo Cuenta';
              statusTextColor = NoxColors.amber;
            }

            const formattedNum = item.numero < 10 ? `0${item.numero}` : `${item.numero}`;

            return (
              <View style={[styles.mesaCard, { maxWidth: isLargeScreen ? '32%' : (isDesktop ? '48.8%' : '100%') }]}>
                {/* Cabecera de la Tarjeta: Número, Capacidad y Acciones */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.tableNumberBox}>
                    <Text style={styles.mesaNumber}>Mesa {formattedNum}</Text>
                    <View style={styles.capPill}>
                      <Text style={styles.capPillText}>{item.capacidad}p</Text>
                    </View>
                  </View>

                  <View style={styles.cardActionIcons}>
                    {/* Botón QR directo */}
                    <TouchableOpacity 
                      onPress={() => { setSelectedMesa(item); setQrModalOpen(true); }} 
                      style={styles.iconBtnAction}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="qr-code-outline" size={17} color={NoxColors.subtext} />
                    </TouchableOpacity>

                    {/* Menú de opciones de la mesa */}
                    <TouchableOpacity 
                      onPress={() => { setSelectedMesa(item); setActionModalOpen(true); }} 
                      style={styles.iconBtnAction}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={17} color={NoxColors.subtext} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Centro: Micro-indicador de Estado */}
                <View style={styles.cardBodyRow}>
                  <View style={styles.statusIndicatorRow}>
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.statusLabel, { color: statusTextColor }]}>
                      {statusText}
                    </Text>
                  </View>
                  <Text style={styles.salonSectionText}>Salón Principal</Text>
                </View>
              </View>
            );
          }} 
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={50} color="rgba(255, 255, 255, 0.15)" />
                <Text style={styles.emptyText}>NO HAY MESAS REGISTRADAS</Text>
            </View>
          }
        />
      )}

      {/* MODAL ACCIONES / GESTIÓN DE MESA */}
      <Modal visible={actionModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.glassCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>GESTIÓN DE MESA</Text>
                <Text style={styles.selectedProdName}>MESA #{selectedMesa?.numero} ({selectedMesa?.capacidad} PERSONAS)</Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalOpen(false)}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.actionModalRow}
              onPress={() => { setActionModalOpen(false); setQrModalOpen(true); }}
              activeOpacity={0.7}
            >
              <View style={styles.actionModalIcon}>
                <Ionicons name="qr-code-outline" size={20} color={NoxColors.aura} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionModalTitle}>Ver y Compartir Código QR</Text>
                <Text style={styles.actionModalDesc}>Abre el código escaneable para pedidos desde mesa</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#71717A" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionModalRow, { borderColor: 'rgba(255, 68, 68, 0.25)', backgroundColor: 'rgba(255, 68, 68, 0.04)' }]}
              onPress={() => {
                const mesaToDelete = selectedMesa;
                setActionModalOpen(false);
                if (mesaToDelete) {
                  handleDeleteMesa(mesaToDelete.id, mesaToDelete.numero);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionModalIcon, { backgroundColor: 'rgba(255, 68, 68, 0.12)' }]}>
                <Ionicons name="trash-outline" size={20} color={NoxColors.rose} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionModalTitle, { color: NoxColors.rose }]}>Eliminar Mesa del Salón</Text>
                <Text style={styles.actionModalDesc}>Retira permanentemente esta mesa de la distribución</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={NoxColors.rose} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelModalBtn}
              onPress={() => setActionModalOpen(false)}
            >
              <Text style={styles.cancelModalBtnText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL QR MESA */}
      <Modal visible={qrModalOpen} transparent animationType="fade">
          <View style={styles.modalBg}>
              <View style={styles.glassCard}>
                  <View style={styles.modalHeader}>
                      <View>
                        <Text style={styles.modalTitle}>CÓDIGO QR</Text>
                        <Text style={styles.selectedProdName}>MESA #{selectedMesa?.numero}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setQrModalOpen(false)}>
                          <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                  </View>
                  
                  <View style={styles.qrFrame}>
                      {selectedMesa && (
                          <Image source={{ uri: getQrUrl(selectedMesa.id) }} style={styles.qrImage} resizeMode="contain" />
                      )}
                  </View>
                  
                  <Text style={styles.qrInfo}>Escanea este código para realizar pedidos directamente desde esta mesa en el portal del cliente.</Text>
                  
                  <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareQr(selectedMesa)}>
                      <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{marginRight: 8}} />
                      <Text style={styles.saveBtnText}>COMPARTIR ENLACE</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* MODAL REGISTRAR NUEVA MESA */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>NUEVA MESA</Text>
                    <TouchableOpacity onPress={() => setModalOpen(false)}>
                        <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>NÚMERO IDENTIFICADOR</Text>
                <TextInput 
                    style={styles.input} placeholder="Ej: 101" placeholderTextColor={NoxColors.gray}
                    keyboardType="number-pad" value={formData.numero} onChangeText={t => setFormData({...formData, numero: t})} 
                />
                
                <Text style={styles.label}>CAPACIDAD MÁXIMA</Text>
                <TextInput 
                    style={styles.input} placeholder="4" placeholderTextColor={NoxColors.gray}
                    keyboardType="number-pad" value={formData.capacidad} onChangeText={t => setFormData({...formData, capacidad: t})} 
                />
                
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddMesa}>
                    <Text style={styles.saveBtnText}>REGISTRAR EN SALÓN</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', position: 'relative' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  brandingNox: { fontSize: 26, fontWeight: '900', color: NoxColors.text, letterSpacing: -0.5 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#16161D', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.2)', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14 
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 },

  listContent: { padding: 16, paddingBottom: 110, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 14 },

  // Tarjeta de Mesa Ultra-Premium
  mesaCard: { 
    flex: 1,
    backgroundColor: 'rgba(15, 15, 19, 0.94)', 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tableNumberBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  mesaNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  capPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  capPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  cardActionIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtnAction: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  salonSectionText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
  },

  // Modal de Gestión / Opciones de Mesa
  actionModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    gap: 12,
  },
  actionModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionModalDesc: {
    fontSize: 11,
    color: '#71717A',
  },
  cancelModalBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: NoxColors.muted,
    letterSpacing: 1,
  },

  // Modal Styles Comunes
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.88)', justifyContent: 'center', padding: 20 },
  glassCard: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 28, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    maxWidth: 480, 
    width: '100%', 
    alignSelf: 'center',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85)',
    elevation: 20,
  },
  qrFrame: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 22, 
    marginBottom: 20, 
    width: '100%', 
    maxWidth: 280, 
    height: 260, 
    alignSelf: 'center', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  qrImage: { width: '100%', height: '100%' },
  qrInfo: { color: NoxColors.muted, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  shareBtn: { 
    backgroundColor: '#181822', 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.25)', 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    width: '100%', 
    justifyContent: 'center' 
  },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, width: '100%' },
  modalTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  selectedProdName: { color: NoxColors.aura, fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  label: { fontSize: 10, fontWeight: '800', color: NoxColors.muted, marginBottom: 8, letterSpacing: 1.5 },
  input: { 
    backgroundColor: NoxColors.container, 
    color: NoxColors.text, 
    borderRadius: 14, 
    padding: 16, 
    fontSize: 15, 
    marginBottom: 18, 
    borderWidth: 1, 
    borderColor: NoxColors.border 
  },
  saveBtn: { 
    backgroundColor: '#181822', 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.25)', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    width: '100%' 
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.5, fontSize: 13 },

  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 12, opacity: 0.6 },
  emptyText: { color: NoxColors.muted, fontWeight: '800', fontSize: 12, letterSpacing: 2 }
});
