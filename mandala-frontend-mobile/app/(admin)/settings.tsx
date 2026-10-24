import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../utils/apiClient';
import LogoutModal from '../../components/LogoutModal';
import { NoxColors } from '../../constants/theme';


// ─── Sub-pantalla: Config de Marca ───────────────────────────────────────────
function BrandConfigScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [mensajeFooter, setMensajeFooter] = useState('');
  const [moneda, setMoneda] = useState('$');
  const [impuesto, setImpuesto] = useState('0');
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/config/');
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (data) {
          setEmpresa(data);
          setNombre(data.nombre ?? '');
          setNit(data.nit ?? '');
          setTelefono(data.telefono ?? '');
          setDireccion(data.direccion ?? '');
          setMensajeFooter(data.mensaje_footer ?? '');
          setMoneda(data.moneda ?? '$');
          setImpuesto(String(data.impuesto_porcentaje ?? '0'));
        }
      } catch (e) {
        Alert.alert('Error', 'No se pudo cargar la info de la empresa');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleGuardar = async () => {
    if (!nombre.trim()) return Alert.alert('Error', 'El nombre no puede estar vacío');
    setSaving(true);
    try {
      const id = empresa?.id;
      const payload = { nombre, nit, telefono, direccion, mensaje_footer: mensajeFooter, moneda, impuesto_porcentaje: parseFloat(impuesto) || 0 };
      if (id) {
        await apiClient.patch(`/config/${id}/`, payload);
      } else {
        await apiClient.post('/config/', payload);
      }
      Alert.alert('✅ Guardado', 'La identidad de la empresa ha sido actualizada.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={NoxColors.aura} style={{ flex: 1 }} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: 80 }}>
        {/* Header con texto AJUSTES para volver */}
        <TouchableOpacity style={[styles.header, { paddingHorizontal: 0 }]} onPress={onBack} activeOpacity={0.6}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.brandingNox}>Ajustes <Text style={styles.brandingOS}>Nox</Text></Text>
            <Text style={styles.subtitle}>CONFIGURACIÓN DE MARCA</Text>
          </View>
          <View style={styles.userBadge}>
              <Ionicons name="close-circle-outline" size={24} color={NoxColors.aura} />
          </View>
        </TouchableOpacity>

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>DATOS LEGALES (PARA TICKETS)</Text>

          <Text style={styles.fieldLabel}>NOMBRE DEL ESTABLECIMIENTO</Text>
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre en el ticket" placeholderTextColor={NoxColors.gray} />

          <Text style={styles.fieldLabel}>NIT / RUT / ID FISCAL</Text>
          <TextInput style={styles.input} value={nit} onChangeText={setNit} placeholder="Obligatorio para tickets" placeholderTextColor={NoxColors.gray} />

          <View style={styles.formRow}>
             <View style={{flex:1, marginRight:10}}>
                <Text style={styles.fieldLabel}>TELÉFONO CONTACTO</Text>
                <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Para el cliente" placeholderTextColor={NoxColors.gray} keyboardType="phone-pad" />
             </View>
             <View style={{flex:1}}>
                <Text style={styles.fieldLabel}>SÍMBOLO MONEDA</Text>
                <TextInput style={styles.input} value={moneda} onChangeText={setMoneda} placeholder="$" placeholderTextColor={NoxColors.gray} />
             </View>
          </View>

          <Text style={styles.fieldLabel}>DIRECCIÓN LOCAL</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={direccion} onChangeText={setDireccion} placeholder="Dirección en el ticket" placeholderTextColor={NoxColors.gray} multiline />

          <Text style={styles.fieldLabel}>MENSAJE FINAL DEL TICKET</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={mensajeFooter} onChangeText={setMensajeFooter} placeholder="Ej: Vuelva pronto..." placeholderTextColor={NoxColors.gray} multiline />

          <Text style={styles.fieldLabel}>IMPUESTO (%)</Text>
          <TextInput style={styles.input} value={impuesto} onChangeText={setImpuesto} placeholder="0" placeholderTextColor={NoxColors.gray} keyboardType="decimal-pad" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar} disabled={saving}>
          {saving
            ? <ActivityIndicator color={NoxColors.text} />
            : <Text style={styles.saveBtnText}>GUARDAR DATOS DEL TICKET</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── SettingCard ──────────────────────────────────────────────────────────────
const SettingCard = ({ icon, title, description, onPress, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={[styles.cardAccent, { backgroundColor: color }]} />
    <View style={[styles.cardIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.cardMain}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
  </TouchableOpacity>
);

// ─── Main Settings Screen ─────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const [showBrand, setShowBrand] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  if (showBrand) return <BrandConfigScreen onBack={() => setShowBrand(false)} />;

  const handleLogout = () => {
    setShowLogout(true);
  };

  const confirmLogout = () => {
    setShowLogout(false);
    clearAuth();
    router.replace("/(auth)/login");
  };
return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>PANEL DE ADMINISTRACIÓN</Text>
        </View>
        <View style={styles.userBadge}>
            <Text style={styles.userText}>{user?.username?.charAt(0).toUpperCase() || 'A'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>GESTIÓN OPERATIVA</Text>
        <SettingCard
            icon="people-outline"
            title="Usuarios y Roles"
            description="Control de meseras y bartenders"
            onPress={() => router.push('/(admin)/users')}
            color={NoxColors.aura}
        />
        <SettingCard
            icon="grid-outline"
            title="Distribución de Mesas"
            description="Plano físico y zonas del local"
            onPress={() => router.push('/(admin)/mesas')}
            color="#3b82f6"
        />

        <Text style={styles.sectionTitle}>REPORTES Y FINANZAS</Text>
        <SettingCard
            icon="receipt-outline"
            title="Historial de Ventas"
            description="Registro detallado de pedidos"
            onPress={() => router.push('/(admin)/history')}
            color={NoxColors.emerald}
        />
        <SettingCard
            icon="stats-chart-outline"
            title="Contabilidad General"
            description="Ingresos y egresos consolidados"
            onPress={() => router.push('/(admin)/accounting')}
            color={NoxColors.amber}
        />

        <Text style={styles.sectionTitle}>SISTEMA Y MARCA</Text>
        <SettingCard
            icon="business-outline"
            title="Configuración de Marca"
            description="Identidad y políticas del negocio"
            onPress={() => setShowBrand(true)}
            color="#ec4899"
        />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={NoxColors.rose} />
            <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

      </ScrollView>

      <LogoutModal 
        visible={showLogout} 
        onCancel={() => setShowLogout(false)} 
        onConfirm={confirmLogout} 
      />
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitleContainer: { gap: 4 },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  
  userBadge: { width: 45, height: 45, borderRadius: 15, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.3)' },
  userText: { color: NoxColors.aura, fontWeight: 'bold', fontSize: 18 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, letterSpacing: 2, marginTop: 30, marginBottom: 15, marginLeft: 5 },

  card: { 
    backgroundColor: NoxColors.card, 
    marginBottom: 12, 
    padding: 18, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: NoxColors.border,
  },
  cardAccent: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  cardIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardMain: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: NoxColors.text },
  cardDescription: { fontSize: 12, color: NoxColors.muted, marginTop: 2 },

  // Form Styles
  backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  formSection: { marginTop: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: NoxColors.aura, letterSpacing: 3, marginBottom: 30, opacity: 0.8 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: NoxColors.muted, marginBottom: 8, letterSpacing: 2, marginLeft: 5 },
  input: { backgroundColor: NoxColors.card, borderRadius: 22, padding: 18, color: NoxColors.text, fontSize: 15, borderWidth: 1, borderColor: NoxColors.border, marginBottom: 28 },
  formRow: { flexDirection: 'row', gap: 10 },

  saveBtn: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 25, alignItems: 'center', marginTop: 10, marginHorizontal: 5, shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 15 },
  saveBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 },

  cancelLink: { marginTop: 25, alignItems: 'center', padding: 10 },
  cancelLinkText: { color: NoxColors.muted, fontWeight: '900', fontSize: 10, letterSpacing: 2, textDecorationLine: 'underline' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, padding: 20, borderRadius: 20, backgroundColor: 'rgba(255, 68, 68, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.1)' },
  logoutText: { color: NoxColors.rose, fontWeight: '900', fontSize: 12, letterSpacing: 2 }
});
