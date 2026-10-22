import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


export default function AdmUsersScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(admin)/settings');
  };
  const { isDesktop } = useResponsive();
  const numColumns = isDesktop ? 2 : 1;
  const { user: currentUser } = useAuthStore();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('operativo');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState({ username: '', password: '' });
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newCredentials, setNewCredentials] = useState('');
  const [selectedRole, setSelectedRole] = useState('mesera');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/usuarios/');
      const data = Array.isArray(res.data) ? res.data : [];
      setUsuarios(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const roleCategories = {
    operativo: ['mesera', 'bartender'],
    sistema: ['admin', 'administrador', 'gerente']
  };

  const getFilteredUsers = () => {
    return usuarios.filter(u => {
      const uRole = (u.user_role || 'usuario').toLowerCase();
      if (activeTab === 'operativo') {
        return roleCategories.operativo.includes(uRole) || (!roleCategories.sistema.includes(uRole) && uRole !== 'admin');
      } else {
        return roleCategories.sistema.includes(uRole);
      }
    });
  };

  const handleAddProfile = async () => {
    if (!newProfileForm.username || newProfileForm.password.length < 4) {
      Alert.alert('Error', 'Usuario y contraseña obligatorios (Mín: 4 caracteres).');
      return;
    }
    
    try {
      await apiClient.post('/usuarios/', {
        username: newProfileForm.username,
        password: newProfileForm.password,
        role: selectedRole
      });
      setShowAddModal(false);
      setNewProfileForm({ username: '', password: '' });
      fetchData();
      Alert.alert('Éxito', 'Identidad creada correctamente.');
    } catch (err: any) { 
      const detail = err.response?.data?.detail || 'No se pudo crear el usuario';
      Alert.alert('Error', detail);
    }
  };

  const handleOpenReset = (user: any) => {
    setSelectedUser(user);
    setNewCredentials('');
    setShowResetModal(true);
  };

  const handleUpdateCredentials = async () => {
    if (newCredentials.length < 4) return Alert.alert('Error', 'Mínimo 4 caracteres requeridos.');
    try {
      await apiClient.post(`/usuarios/${selectedUser.id}/cambiar-password/`, { password: newCredentials });
      setShowResetModal(false);
      Alert.alert('Éxito', 'Credenciales actualizadas.');
      fetchData();
    } catch(err) { 
      Alert.alert('Error', 'No se pudo actualizar la clave.');
    }
  };

  const handleToggleStatus = async (user: any) => {
    if (String(user.id) === String(currentUser?.id)) {
      Alert.alert('Acceso Denegado', 'No puedes desactivar tu propia cuenta de administrador.');
      return;
    }
    try {
      const newStatus = !user.activo;
      await apiClient.put(`/usuarios/${user.id}/`, { activo: newStatus });
      fetchData();
      Alert.alert('Éxito', `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cambiar el estado del usuario.');
    }
  };

  const handleDelete = (id: any) => {
    if (String(id) === String(currentUser?.id)) {
      Alert.alert('Acceso Denegado', 'No puedes eliminar tu propia cuenta de administrador.');
      return;
    }
    Alert.alert("Confirmación", "¿Eliminar permanentemente este usuario?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            await apiClient.delete(`/usuarios/${id}/`);
            fetchData();
          } catch (error) { console.error(error); }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const roleText = (item.user_role || 'SISTEMA').toUpperCase();
    const roleColor = roleCategories.sistema.includes(roleText.toLowerCase()) ? NoxColors.amber : NoxColors.aura;
    
    return (
      <View style={[styles.card, isDesktop && { maxWidth: '48.8%' }]}>
        <View style={[styles.cardAccent, { backgroundColor: roleColor }]} />
        <View style={[styles.avatar, { backgroundColor: `${roleColor}15` }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>{(item.username || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>{item.username}</Text>
          <View style={styles.roleTag}>
             <Text style={[styles.roleTagText, { color: roleColor }]}>{roleText}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleToggleStatus(item)} style={[styles.iconBtn, { backgroundColor: item.activo ? '#10b98120' : '#ff444420' }]}>
            <Ionicons name={item.activo ? "person-outline" : "person-remove-outline"} size={18} color={item.activo ? NoxColors.emerald : NoxColors.rose} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleOpenReset(item)} style={styles.iconBtn}>
            <Ionicons name="key-outline" size={18} color={NoxColors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtnDanger}>
            <Ionicons name="trash-outline" size={18} color={NoxColors.rose} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Encabezado Premium */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={NoxColors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>USUARIOS Y ROLES</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="person-add" size={24} color={NoxColors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'operativo' && styles.tabActive]} 
            onPress={() => setActiveTab('operativo')}
        >
            <Text style={[styles.tabText, activeTab === 'operativo' && styles.tabTextActive]}>PERSONAL</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'sistema' && styles.tabActive]} 
            onPress={() => setActiveTab('sistema')}
        >
            <Text style={[styles.tabText, activeTab === 'sistema' && styles.tabTextActive]}>SISTEMA</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{marginTop:50}} />
      ) : (
        <FlatList 
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={getFilteredUsers()} 
          keyExtractor={it => String(it.id)} 
          renderItem={renderItem} 
          contentContainerStyle={styles.listContent} 
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal Agregar Usuario */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>NUEVA IDENTIDAD</Text>
                    <TouchableOpacity onPress={() => setShowAddModal(false)}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>NOMBRE DE USUARIO</Text>
                <TextInput 
                    placeholder="Ej: Mesera01" placeholderTextColor={NoxColors.gray} 
                    style={styles.input} value={newProfileForm.username} 
                    onChangeText={t => setNewProfileForm({...newProfileForm, username: t})} 
                    autoCapitalize="none"
                />

                <Text style={styles.label}>CONTRASEÑA / PIN</Text>
                <TextInput 
                    placeholder="Mínimo 4 caracteres" placeholderTextColor={NoxColors.gray} 
                    secureTextEntry style={styles.input} 
                    value={newProfileForm.password} 
                    onChangeText={t => setNewProfileForm({...newProfileForm, password: t})} 
                />

                <Text style={styles.label}>ROL ASIGNADO</Text>
                <View style={styles.row}>
                    {['mesera', 'bartender', 'admin'].map((r) => (
                    <TouchableOpacity 
                        key={r} onPress={() => setSelectedRole(r)}
                        style={[styles.chip, selectedRole === r && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, selectedRole === r && {color:NoxColors.text}]}>{r.toUpperCase()}</Text>
                    </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleAddProfile}>
                    <Text style={styles.saveBtnText}>REGISTRAR USUARIO</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Modal Reset Password */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>ACTUALIZAR CLAVE</Text>
                    <TouchableOpacity onPress={() => setShowResetModal(false)}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.label, {color: NoxColors.aura}]}>USUARIO: {selectedUser?.username?.toUpperCase()}</Text>
                
                <View style={{marginTop: 15}}>
                    <Text style={styles.label}>NUEVA CONTRASEÑA O PIN</Text>
                    <TextInput 
                        placeholder="Mínimo 4 dígitos" placeholderTextColor={NoxColors.gray} 
                        secureTextEntry style={styles.input} 
                        value={newCredentials} onChangeText={setNewCredentials} 
                    />
                </View>

                <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#3b82f6'}]} onPress={handleUpdateCredentials}>
                    <Text style={styles.saveBtnText}>CAMBIAR CREDENCIALES</Text>
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { gap: 4 },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  addBtn: { backgroundColor: NoxColors.aura, width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 15 },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginBottom: 20, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  tab: { flex: 1, paddingVertical: 14, borderRadius: 18, backgroundColor: NoxColors.card, alignItems: 'center', borderWidth: 1, borderColor: NoxColors.border },
  tabActive: { backgroundColor: NoxColors.container, borderColor: 'rgba(169, 68, 255, 0.4)' },
  tabText: { color: NoxColors.muted, fontWeight: 'bold', fontSize: 10, letterSpacing: 2 },
  tabTextActive: { color: NoxColors.aura },

  listContent: { paddingHorizontal: 20, paddingBottom: 100, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  card: { 
    flex: 1,
    backgroundColor: NoxColors.card, 
    padding: 16, 
    borderRadius: 28, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  cardAccent: { position: 'absolute', left: 0, top: 25, bottom: 25, width: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  avatar: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '900' },
  
  cardMain: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: NoxColors.text },
  roleTag: { marginTop: 4 },
  roleTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center' },
  iconBtnDanger: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(5, 5, 16, 0.95)', justifyContent: 'center', padding: 25 },
  glassCard: { backgroundColor: NoxColors.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)', shadowColor: NoxColors.aura, shadowOpacity: 0.1, shadowRadius: 30, maxWidth: 500, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: NoxColors.text, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  
  label: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  input: { backgroundColor: NoxColors.container, color: NoxColors.text, borderRadius: 20, padding: 20, fontSize: 16, borderWidth: 1, borderColor: NoxColors.border, marginBottom: 20 },
  
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: NoxColors.container, borderWidth: 1, borderColor: NoxColors.border },
  chipActive: { backgroundColor: NoxColors.aura, borderColor: 'rgba(169, 68, 255, 0.3)' },
  chipText: { fontSize: 10, fontWeight: 'bold', color: NoxColors.muted },

  saveBtn: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 25, alignItems: 'center', marginTop: 10, shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 15 },
  saveBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 }
});
