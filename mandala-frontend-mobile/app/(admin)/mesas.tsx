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
    Alert.alert("Eliminar Mesa", `¿Eliminar Mesa #${numero}?`, [
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
      // Menú digital rápido servido directamente por el backend sin proyectos externos
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
      {/* Encabezado Premium */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={NoxColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>CONFIGURACIÓN DE SALÓN</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={24} color={NoxColors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
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

            let statusColor = NoxColors.emerald; // Libre
            if (isOcupada) statusColor = NoxColors.aura;
            if (isSolicitando) statusColor = NoxColors.amber; // Amarillo/Naranja

            return (
              <View style={[styles.mesaCard, { maxWidth: isLargeScreen ? '32%' : (isDesktop ? '48.8%' : '100%') }]}>
                <View style={[styles.cardAccent, {backgroundColor: statusColor}]} />
                <View style={[styles.mesaIcon, {backgroundColor: statusColor}]}>
                  <Ionicons name={isSolicitando ? "cash-outline" : "restaurant-outline"} size={24} color={NoxColors.text} />
                </View>
                <View style={styles.mesaMain}>
                  <Text style={styles.mesaTitle}>Mesa {item.numero}</Text>
                  <Text style={styles.mesaSap}>CAPACIDAD: {item.capacidad} PERSONAS</Text>
                  <View style={[styles.badge, {backgroundColor: `${statusColor}1A`}]}>
                    <View style={[styles.dot, {backgroundColor: statusColor}]} />
                    <Text style={[styles.badgeText, {color: statusColor}]}>
                        {item.estado_nombre?.toUpperCase() || 'LIBRE'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.actions}>
                    <TouchableOpacity 
                        onPress={() => { setSelectedMesa(item); setQrModalOpen(true); }} 
                        style={styles.iconBtnQr}
                    >
                        <Ionicons name="qr-code-outline" size={18} color={NoxColors.aura} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMesa(item.id, item.numero)} style={styles.iconBtnDanger}>
                        <Ionicons name="trash-outline" size={18} color={NoxColors.rose} />
                    </TouchableOpacity>
                </View>
              </View>
            );
          }} 
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={60} color="rgba(138, 123, 175, 0.1)" />
                <Text style={styles.emptyText}>SIN MESAS ACTIVAS</Text>
            </View>
          }
        />
      )}

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
                          <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                  </View>
                  
                  <View style={styles.qrFrame}>
                      {selectedMesa && (
                          <Image source={{ uri: getQrUrl(selectedMesa.id) }} style={styles.qrImage} resizeMode="contain" />
                      )}
                  </View>
                  
                  <Text style={styles.qrInfo}>Escanea este código para realizar pedidos directamente desde esta mesa en el portal del cliente.</Text>
                  
                  <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareQr(selectedMesa)}>
                      <Ionicons name="share-social-outline" size={20} color={NoxColors.text} style={{marginRight: 10}} />
                      <Text style={styles.saveBtnText}>COMPARTIR ENLACE</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* MODAL CONFIG MESA */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>NUEVA MESA</Text>
                    <TouchableOpacity onPress={() => setModalOpen(false)}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
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
  container: { flex: 1, backgroundColor: NoxColors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    paddingBottom: 25,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: NoxColors.aura, width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 15 },

  listContent: { padding: 20, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  mesaCard: { 
    flex: 1,
    backgroundColor: NoxColors.card, 
    borderRadius: 28, 
    padding: 16, 
    marginBottom: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: NoxColors.border
  },
  cardAccent: { position: 'absolute', left: 0, top: 25, bottom: 25, width: 4, backgroundColor: NoxColors.aura, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  mesaIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.deep, shadowOpacity: 0.2, shadowRadius: 5 },
  mesaLibre: { backgroundColor: NoxColors.emerald },
  mesaOcupada: { backgroundColor: NoxColors.aura },
  
  mesaMain: { flex: 1, marginLeft: 16, gap: 2 },
  mesaTitle: { fontSize: 17, fontWeight: 'bold', color: NoxColors.text },
  mesaSap: { fontSize: 9, color: NoxColors.muted, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  badgeLibre: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeOcupada: { backgroundColor: 'rgba(169, 68, 255, 0.1)' },
  
  actions: { flexDirection: 'row', gap: 8 },
  iconBtnQr: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(169, 68, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)' },
  iconBtnDanger: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255, 68, 68, 0.05)', justifyContent: 'center', alignItems: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(5, 5, 16, 0.95)', justifyContent: 'center', padding: 25 },
  glassCard: { backgroundColor: NoxColors.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)', maxWidth: 500, width: '100%', alignSelf: 'center' },
  qrFrame: { backgroundColor: NoxColors.text, padding: 20, borderRadius: 30, marginBottom: 25, width: '100%', maxWidth: 320, height: 280, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  qrImage: { width: '100%', height: '100%' },
  qrInfo: { color: NoxColors.muted, fontSize: 12, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  shareBtn: { backgroundColor: NoxColors.aura, flexDirection: 'row', padding: 22, borderRadius: 25, alignItems: 'center', width: '100%', justifyContent: 'center' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, width: '100%' },
  modalTitle: { color: NoxColors.text, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  selectedProdName: { color: NoxColors.aura, fontSize: 12, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  label: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  input: { backgroundColor: NoxColors.container, color: NoxColors.text, borderRadius: 20, padding: 20, fontSize: 16, marginBottom: 25, borderWidth:1, borderColor:NoxColors.border },
  saveBtn: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 25, alignItems: 'center', width: '100%' },
  saveBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 15, opacity: 0.5 },
  emptyText: { color: NoxColors.muted, fontWeight: '900', fontSize: 12, letterSpacing: 3 }
});
