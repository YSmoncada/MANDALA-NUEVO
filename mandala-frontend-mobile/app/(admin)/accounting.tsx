import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';
import { useAlertStore } from '../../store/alertStore';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


export default function AdminAccountingScreen() {
  const { isDesktop, width } = useResponsive();
  const [turno, setTurno] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showCerrar, setShowCerrar] = useState(false);
  
  const [baseInicial, setBaseInicial] = useState("0");
  const [efectivoReal, setEfectivoReal] = useState("0");
  const [observaciones, setObservaciones] = useState("");

  const { showAlert } = useAlertStore();

  useEffect(() => {
    fetchTurnoActual();
  }, []);

  const fetchTurnoActual = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/contabilidad/turno/actual/');
      setTurno(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirTurno = async () => {
    try {
        await apiClient.post('/contabilidad/turno/abrir/', {
            base_inicial: parseFloat(baseInicial) || 0,
            observaciones: observaciones
        });
        setShowAbrir(false);
        setBaseInicial("0");
        setObservaciones("");
        showAlert("¡Éxito!", "Turno iniciado correctamente. Los meseros ya pueden realizar pedidos.", "success");
        fetchTurnoActual();
    } catch (e: any) {
        showAlert("Error", e.response?.data?.detail || "No se pudo abrir el turno", "error");
    }
  };

  const handleCerrarTurno = async () => {
    try {
        await apiClient.post('/contabilidad/turno/cerrar/', {
            efectivo_real: parseFloat(efectivoReal) || 0,
            observaciones: observaciones
        });
        setShowCerrar(false);
        setEfectivoReal("0");
        setObservaciones("");
        showAlert("¡Cierre Completado!", "El turno ha sido cerrado y las ventas se han bloqueado.", "success");
        fetchTurnoActual();
    } catch (e: any) {
        showAlert("Error", e.response?.data?.detail || "No se pudo cerrar el turno", "error");
    }
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>CONTABILIDAD Y CIERRE</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTurnoActual} disabled={loading}>
          <Ionicons name="sync-outline" size={24} color={loading ? NoxColors.gray : NoxColors.aura} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={NoxColors.aura} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {turno ? (
                <>
                {/* Resumen Principal Turno Abierto */}
                <View style={styles.cardMain}>
                    <Text style={styles.cardMainTitle}>VENTAS ACUMULADAS EN TURNO</Text>
                    <Text style={styles.totalVal}>${parseFloat(turno.total_ventas || 0).toLocaleString()}</Text>
                    <View style={styles.lineGlow} />
                    <View style={[styles.statusBadge, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                        <Text style={{color: NoxColors.emerald, fontSize: 10, fontWeight: '900', letterSpacing: 1}}>TURNO ABIERTO</Text>
                    </View>
                    <Text style={styles.metaText}>Iniciado por: {turno.usuario_apertura_nombre}</Text>
                </View>

                {/* Rejilla de Totales */}
                <View style={styles.grid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLbl}>Base Inicial</Text>
                        <Text style={styles.statVal}>${parseFloat(turno.base_inicial).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLbl}>Efectivo Esperado</Text>
                        <Text style={styles.statVal}>${(parseFloat(turno.base_inicial) + parseFloat(turno.total_ventas)).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Acciones de Cierre */}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCerrar(true)}>
                    <Ionicons name="lock-closed-outline" size={24} color={NoxColors.text} />
                    <Text style={styles.closeBtnText}>REALIZAR CORTE DE CAJA</Text>
                </TouchableOpacity>
                </>
            ) : (
                <View style={styles.closedState}>
                    <Ionicons name="calendar-outline" size={80} color={NoxColors.container} />
                    <Text style={styles.closedTitle}>SISTEMA FUERA DE TURNO</Text>
                    <Text style={styles.closedMsg}>No hay una operación activa. Abre un nuevo turno para habilitar las ventas.</Text>
                    
                    <TouchableOpacity style={styles.openBtn} onPress={() => setShowAbrir(true)}>
                        <Text style={styles.openBtnText}>INICIAR NUEVA JORNADA</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{height: 100}} />
        </ScrollView>
      )}

      {/* Modal Abrir Turno */}
      <Modal visible={showAbrir} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBg}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ width: '100%' }}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>INICIAR TURNO</Text>
                        <Text style={styles.modalLabel}>BASE INICIAL (EFECTIVO)</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            keyboardType="numeric" 
                            value={baseInicial} 
                            onChangeText={setBaseInicial}
                            placeholder="0"
                            placeholderTextColor={NoxColors.gray}
                            returnKeyType="done"
                        />
                        <Text style={styles.modalLabel}>OBSERVACIONES</Text>
                        <TextInput 
                            style={[styles.modalInput, {height: 80}]} 
                            multiline 
                            value={observaciones} 
                            onChangeText={setObservaciones}
                            placeholder="Ej: Turno nocturno viernes"
                            placeholderTextColor={NoxColors.gray}
                        />
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAbrir(false)}>
                                <Text style={{color: NoxColors.text, fontWeight: 'bold'}}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={handleAbrirTurno}>
                                <Text style={{color: NoxColors.text, fontWeight: '900'}}>ABRIR TURNO</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Cerrar Turno */}
      <Modal visible={showCerrar} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBg}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ width: '100%' }}
                >
                    <View style={styles.modalCard}>
                        <Text style={[styles.modalTitle, {color: NoxColors.rose}]}>CIERRE DE CAJA</Text>
                        <Text style={styles.modalLabel}>EFECTIVO REAL EN CAJA</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            keyboardType="numeric" 
                            value={efectivoReal} 
                            onChangeText={setEfectivoReal}
                            placeholder="Cuenta el dinero físico..."
                            placeholderTextColor={NoxColors.gray}
                            returnKeyType="done"
                        />
                        <Text style={styles.modalLabel}>NOTAS DE CIERRE</Text>
                        <TextInput 
                            style={[styles.modalInput, {height: 80}]} 
                            multiline 
                            value={observaciones} 
                            onChangeText={setObservaciones}
                            placeholder="Diferencias, novedades, etc."
                            placeholderTextColor={NoxColors.gray}
                        />
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCerrar(false)}>
                                <Text style={{color: NoxColors.text, fontWeight: 'bold'}}>VOLVER</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirm, {backgroundColor: NoxColors.rose}]} onPress={handleCerrarTurno}>
                                <Text style={{color: NoxColors.text, fontWeight: '900'}}>CERRAR TURNO</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  refreshBtn: { backgroundColor: NoxColors.container, width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  scrollContent: {
    padding: 25,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },

  cardMain: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 35, 
    padding: 35, 
    marginBottom: 30, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border,
    shadowColor: NoxColors.aura,
    shadowOpacity: 0.1,
    shadowRadius: 20
  },
  cardMainTitle: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 15 },
  totalVal: { color: NoxColors.text, fontSize: 42, fontWeight: '900', textAlign: 'center' },
  lineGlow: { width: 60, height: 4, backgroundColor: NoxColors.aura, borderRadius: 2, marginVertical: 20 },
  statusBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 40 },
  statBox: { 
    flex: 1,
    minWidth: 160, 
    backgroundColor: NoxColors.card, 
    borderRadius: 24, 
    padding: 20,
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  statLbl: { color: NoxColors.gray, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  statVal: { color: NoxColors.text, fontSize: 15, fontWeight: 'bold' },

  closeBtn: { 
    backgroundColor: NoxColors.container, 
    padding: 22, 
    borderRadius: 25, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.3)'
  },
  closeBtnText: { color: NoxColors.aura, fontWeight: '900', marginLeft: 15, fontSize: 12, letterSpacing: 2 },

  metaText: { color: NoxColors.muted, fontSize: 10, marginTop: 10, fontWeight: '600' },
  
  closedState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 20 },
  closedTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2, marginTop: 25, marginBottom: 15 },
  closedMsg: { color: NoxColors.muted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 40 },
  
  openBtn: { backgroundColor: NoxColors.aura, paddingVertical: 20, paddingHorizontal: 40, borderRadius: 25, shadowColor: NoxColors.aura, shadowOpacity: 0.3, shadowRadius: 15 },
  openBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalCard: { backgroundColor: NoxColors.card, borderRadius: 35, padding: 30, width: '100%', maxWidth: 480, alignSelf: 'center', borderWidth: 1, borderColor: NoxColors.border },
  modalTitle: { color: NoxColors.aura, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: 25, textAlign: 'center' },
  modalLabel: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  modalInput: { backgroundColor: NoxColors.deep, borderRadius: 15, padding: 18, color: NoxColors.text, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: NoxColors.border },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancel: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center', backgroundColor: NoxColors.border },
  modalConfirm: { flex: 1.5, padding: 20, borderRadius: 20, alignItems: 'center', backgroundColor: NoxColors.aura }
});
