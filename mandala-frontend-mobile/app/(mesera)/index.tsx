import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';
import { NoxColors } from '../../constants/theme';


const { width } = Dimensions.get('window');

export default function MesasScreen() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ numero: '', capacidad: '4' });

  useEffect(() => { fetchMesas(); }, []);

  const fetchMesas = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/mesas/');
      setMesas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleAddMesa = async () => {
    if (!formData.numero) return Alert.alert('Error', 'Número de mesa requerido');
    try {
      await apiClient.post('/mesas/', {
        numero: formData.numero,
        capacidad: parseInt(formData.capacidad)
      });
      setModalOpen(false);
      setFormData({ numero: '', capacidad: '4' });
      fetchMesas();
      Alert.alert('Éxito', 'Mesa agregada correctamente');
    } catch (error) { 
        console.error(error); 
        Alert.alert('Error', 'No se pudo crear la mesa');
    }
  };

  const handleDeleteMesa = (id: any, numero: any) => {
    Alert.alert("Eliminar Mesa", `¿Confirmas eliminar la Mesa #${numero}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            await apiClient.delete(`/mesas/${id}/`);
            fetchMesas();
          } catch (error) { console.error(error); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <RollsRoyceStars />
      {/* Header Premium - NoxOS Style */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>GESTIÓN DE SALÓN</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={24} color={NoxColors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
        showsVerticalScrollIndicator={false} 
          data={mesas} 
          keyExtractor={it => String(it.id)} 
          contentContainerStyle={styles.listContent} 
          numColumns={2}
          renderItem={({item}) => (
            <View style={styles.mesaCardContainer}>
              <View style={[styles.mesaCard, item.ocupada_por_id && styles.cardOcupada]}>
                <View style={[styles.mesaIcon, item.ocupada_por_id ? styles.iconOcupada : styles.iconLibre]}>
                  <Ionicons name="restaurant" size={24} color={NoxColors.text} />
                </View>
                
                <Text style={styles.mesaNum}>MESA {item.numero}</Text>
                <Text style={styles.mesaCap}>CAPACIDAD: {item.capacidad}</Text>
                
                <View style={[styles.statusBadge, item.ocupada_por_id ? styles.badgeOcupada : styles.badgeLibre]}>
                    <Text style={styles.statusText}>
                        {item.ocupada_por_id ? 'OCUPADA' : 'DISPONIBLE'}
                    </Text>
                </View>

                {item.ocupada_por_id && (
                    <Text style={styles.ocupadaPor} numberOfLines={1}>
                        {item.ocupada_por}
                    </Text>
                )}

                <TouchableOpacity 
                    onPress={() => handleDeleteMesa(item.id, item.numero)} 
                    style={styles.deleteOverlay}
                >
                    <Ionicons name="trash-outline" size={16} color="rgba(244, 67, 54, 0.4)" />
                </TouchableOpacity>
              </View>
            </View>
          )} 
        />
      )}

      {/* MODAL CONFIGURACIÓN MESA */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
            <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>NUEVA MESA</Text>
                    <TouchableOpacity onPress={() => setModalOpen(false)}>
                        <Ionicons name="close-circle-outline" size={32} color={NoxColors.subtext} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>NÚMERO DE MESA</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ej: 15" 
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="number-pad" 
                    value={formData.numero} 
                    onChangeText={t => setFormData({...formData, numero: t})} 
                />
                
                <Text style={styles.label}>CAPACIDAD DE PERSONAS</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ej: 4" 
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="number-pad" 
                    value={formData.capacidad} 
                    onChangeText={t => setFormData({...formData, capacidad: t})} 
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleAddMesa}>
                    <Text style={styles.saveBtnText}>REGISTRAR MESA</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000'},
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
  addBtn: { 
    backgroundColor: '#181822', 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  
  listContent: { padding: 15, paddingBottom: 100 },
  mesaCardContainer: { flex: 0.5, padding: 8 },
  mesaCard: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 30, 
    padding: 20, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border,
    shadowColor: NoxColors.deep,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    minHeight: 180
  },
  cardOcupada: { borderColor: 'rgba(169, 68, 255, 0.3)' },
  mesaIcon: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  iconLibre: { backgroundColor: NoxColors.emerald },
  iconOcupada: { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  
  mesaNum: { color: NoxColors.text, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  mesaCap: { color: NoxColors.muted, fontSize: 9, fontWeight: 'bold', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 15 },
  badgeLibre: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeOcupada: { backgroundColor: 'rgba(169, 68, 255, 0.1)' },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  
  ocupadaPor: { color: NoxColors.text, fontSize: 10, fontWeight: '600', marginTop: 10, opacity: 0.8 },
  
  deleteOverlay: { position: 'absolute', top: 15, right: 15, padding: 5 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { 
    backgroundColor: NoxColors.card, 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 30, 
    height: '60%',
    borderWidth: 1,
    borderColor: 'rgba(171, 0, 255, 0.2)'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: NoxColors.text, fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  label: { fontSize: 10, fontWeight: '900', color: NoxColors.muted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  input: { 
    backgroundColor: NoxColors.container, 
    color: NoxColors.text, 
    borderRadius: 18, 
    padding: 18, 
    fontSize: 15, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  saveBtn: { 
    backgroundColor: NoxColors.emerald, 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13 }
});

