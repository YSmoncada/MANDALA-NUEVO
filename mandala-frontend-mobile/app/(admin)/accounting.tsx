import RollsRoyceStars from '../../components/RollsRoyceStars';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/apiClient';
import { useAlertStore } from '../../store/alertStore';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';

export default function AdminAccountingScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(admin)/settings');
  };
  const { isDesktop, width } = useResponsive();
  const [turno, setTurno] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showCerrar, setShowCerrar] = useState(false);
  const [showMovimiento, setShowMovimiento] = useState(false);
  
  const [baseInicial, setBaseInicial] = useState("0");
  const [efectivoReal, setEfectivoReal] = useState("0");
  const [observaciones, setObservaciones] = useState("");

  // Estado para nuevo movimiento de caja
  const [tipoMov, setTipoMov] = useState<'salida' | 'entrada'>('salida');
  const [conceptoMov, setConceptoMov] = useState("");
  const [montoMov, setMontoMov] = useState("");

  const { showAlert } = useAlertStore();

  useEffect(() => {
    fetchTurnoActual();
  }, []);

  const fetchTurnoActual = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/contabilidad/turno/actual/');
      setTurno(res.data);
      if (res.data) {
        fetchMovimientos();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimientos = async () => {
    try {
      const res = await apiClient.get('/contabilidad/turno/movimientos/');
      setMovimientos(res.data || []);
    } catch (e: any) {
      console.error("Error al obtener movimientos de caja", e);
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

  const handleRegistrarMovimiento = async () => {
    const monto = parseFloat(montoMov);
    if (!monto || monto <= 0) {
      showAlert("Atención", "Ingresa un monto válido mayor a 0", "error");
      return;
    }
    if (!conceptoMov.trim()) {
      showAlert("Atención", "Ingresa el concepto del movimiento", "error");
      return;
    }

    try {
      await apiClient.post('/contabilidad/turno/movimiento-caja/', {
        tipo: tipoMov,
        concepto: conceptoMov.trim(),
        monto: monto
      });
      setShowMovimiento(false);
      setConceptoMov("");
      setMontoMov("");
      showAlert("¡Registrado!", `${tipoMov === 'salida' ? 'Egreso' : 'Ingreso'} de caja guardado exitosamente.`, "success");
      fetchTurnoActual();
    } catch (e: any) {
      showAlert("Error", e.response?.data?.detail || "No se pudo registrar el movimiento", "error");
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
      <RollsRoyceStars />
      
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={NoxColors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>CONTABILIDAD Y CIERRE</Text>
          </View>
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

                {/* Rejilla de Desglose Financiero */}
                <View style={styles.grid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLbl}>Base Inicial</Text>
                        <Text style={styles.statVal}>${parseFloat(turno.base_inicial || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLbl}>Ventas Efectivo</Text>
                        <Text style={[styles.statVal, {color: NoxColors.emerald}]}>${parseFloat(turno.ventas_efectivo || turno.total_ventas || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLbl}>Tarjetas / Nequi</Text>
                        <Text style={[styles.statVal, {color: NoxColors.aura}]}>${(parseFloat(turno.ventas_tarjeta || 0) + parseFloat(turno.ventas_transferencia || 0)).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.statBox, {borderColor: NoxColors.aura, backgroundColor: 'rgba(0, 229, 255, 0.05)'}]}>
                        <Text style={[styles.statLbl, {color: NoxColors.aura}]}>Efectivo Esperado</Text>
                        <Text style={[styles.statVal, {color: '#FFFFFF', fontSize: 18}]}>${parseFloat(turno.efectivo_esperado || 0).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Sección de Movimientos de Caja Menor */}
                <View style={styles.cajaMenorCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                        <View>
                            <Text style={styles.cajaMenorTitle}>CAJA MENOR Y GASTOS DE TURNO</Text>
                            <Text style={styles.cajaMenorSubtitle}>
                                Entradas: +${parseFloat(turno.entradas_caja || 0).toLocaleString()} | Salidas: -${parseFloat(turno.salidas_caja || 0).toLocaleString()}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.addMovBtn} onPress={() => setShowMovimiento(true)} activeOpacity={0.8}>
                            <Ionicons name="add" size={16} color="#000" />
                            <Text style={styles.addMovBtnText}>REGISTRAR</Text>
                        </TouchableOpacity>
                    </View>

                    {movimientos && movimientos.length > 0 ? (
                        <View style={{gap: 8}}>
                            {movimientos.slice(0, 5).map((m: any) => (
                                <View key={m.id} style={styles.movRow}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
                                        <View style={[styles.movBadge, {backgroundColor: m.tipo === 'entrada' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}]}>
                                            <Ionicons name={m.tipo === 'entrada' ? "arrow-down" : "arrow-up"} size={14} color={m.tipo === 'entrada' ? NoxColors.emerald : NoxColors.rose} />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.movConcepto} numberOfLines={1}>{m.concepto}</Text>
                                            <Text style={styles.movHora}>{new Date(m.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.movMonto, {color: m.tipo === 'entrada' ? NoxColors.emerald : NoxColors.rose}]}>
                                        {m.tipo === 'entrada' ? '+' : '-'}${parseFloat(m.monto || 0).toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{color: NoxColors.muted, fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10}}>
                            Sin movimientos de caja chica en este turno.
                        </Text>
                    )}
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
                        <Text style={[styles.modalTitle, {color: NoxColors.rose}]}>CIERRE Y ARQUEO DE CAJA</Text>
                        
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 15}}>
                            <Text style={{color: NoxColors.muted, fontSize: 11, fontWeight: '700'}}>EFECTIVO ESPERADO:</Text>
                            <Text style={{color: '#FFFFFF', fontSize: 13, fontWeight: '900'}}>${parseFloat(turno?.efectivo_esperado || 0).toLocaleString()}</Text>
                        </View>

                        <Text style={styles.modalLabel}>EFECTIVO REAL CONTADO EN CAJÓN</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            keyboardType="numeric" 
                            value={efectivoReal} 
                            onChangeText={setEfectivoReal}
                            placeholder="Cuenta el dinero físico..."
                            placeholderTextColor={NoxColors.gray}
                            returnKeyType="done"
                        />

                        {efectivoReal !== "0" && efectivoReal !== "" && (
                            <View style={{padding: 10, borderRadius: 10, marginBottom: 15, alignItems: 'center', backgroundColor: (parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) === 0 ? 'rgba(16, 185, 129, 0.15)' : (parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) > 0 ? 'rgba(0, 229, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)'}}>
                                <Text style={{fontSize: 11, fontWeight: '900', color: (parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) === 0 ? NoxColors.emerald : (parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) > 0 ? NoxColors.aura : NoxColors.rose}}>
                                    {(parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) === 0 ? "✅ CUADRE EXACTO ($0)" : (parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)) > 0 ? `🟢 SOBRANTE EN CAJA: +$${(parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)).toLocaleString()}` : `🔴 FALTANTE EN CAJA: -$${Math.abs(parseFloat(efectivoReal) - parseFloat(turno?.efectivo_esperado || 0)).toLocaleString()}`}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.modalLabel}>NOTAS DE CIERRE</Text>
                        <TextInput 
                            style={[styles.modalInput, {height: 70}]} 
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
                                <Text style={{color: '#FFFFFF', fontWeight: '900'}}>CERRAR TURNO</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Registrar Movimiento de Caja */}
      <Modal visible={showMovimiento} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBg}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ width: '100%' }}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>MOVIMIENTO DE CAJA</Text>
                        
                        <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
                          <TouchableOpacity 
                            onPress={() => setTipoMov('salida')}
                            style={[styles.tipoBtn, tipoMov === 'salida' && {borderColor: NoxColors.rose, backgroundColor: 'rgba(239,68,68,0.1)'}]}
                          >
                            <Ionicons name="arrow-up" size={16} color={tipoMov === 'salida' ? NoxColors.rose : NoxColors.gray} />
                            <Text style={[styles.tipoBtnText, tipoMov === 'salida' && {color: NoxColors.rose}]}>EGRESO / GASTO</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            onPress={() => setTipoMov('entrada')}
                            style={[styles.tipoBtn, tipoMov === 'entrada' && {borderColor: NoxColors.emerald, backgroundColor: 'rgba(16,185,129,0.1)'}]}
                          >
                            <Ionicons name="arrow-down" size={16} color={tipoMov === 'entrada' ? NoxColors.emerald : NoxColors.gray} />
                            <Text style={[styles.tipoBtnText, tipoMov === 'entrada' && {color: NoxColors.emerald}]}>INGRESO / BASE</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>CONCEPTO / MOTIVO</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            value={conceptoMov} 
                            onChangeText={setConceptoMov}
                            placeholder="Ej: Compra de 2 bolsas de hielo"
                            placeholderTextColor={NoxColors.gray}
                        />

                        <Text style={styles.modalLabel}>MONTO ($)</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            keyboardType="numeric" 
                            value={montoMov} 
                            onChangeText={setMontoMov}
                            placeholder="0"
                            placeholderTextColor={NoxColors.gray}
                            returnKeyType="done"
                        />
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMovimiento(false)}>
                                <Text style={{color: NoxColors.text, fontWeight: 'bold'}}>CANCELAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirm, {backgroundColor: tipoMov === 'salida' ? NoxColors.rose : NoxColors.emerald}]} onPress={handleRegistrarMovimiento}>
                                <Text style={{color: '#FFFFFF', fontWeight: '900'}}>GUARDAR</Text>
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
  container: { flex: 1, backgroundColor: '#000000', position: 'relative' },
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
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
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
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  closeBtnText: { color: NoxColors.aura, fontWeight: '900', marginLeft: 15, fontSize: 12, letterSpacing: 2 },

  metaText: { color: NoxColors.muted, fontSize: 10, marginTop: 10, fontWeight: '600' },
  
  closedState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 20 },
  closedTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2, marginTop: 25, marginBottom: 15 },
  closedMsg: { color: NoxColors.muted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 40 },
  
  openBtn: { backgroundColor: '#181822', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.25)', paddingVertical: 18, paddingHorizontal: 36, borderRadius: 20 },
  openBtnText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalCard: { backgroundColor: NoxColors.card, borderRadius: 35, padding: 30, width: '100%', maxWidth: 480, alignSelf: 'center', borderWidth: 1, borderColor: NoxColors.border },
  modalTitle: { color: NoxColors.aura, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: 25, textAlign: 'center' },
  modalLabel: { color: NoxColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  modalInput: { backgroundColor: NoxColors.deep, borderRadius: 15, padding: 18, color: NoxColors.text, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: NoxColors.border },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancel: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center', backgroundColor: NoxColors.border },
  modalConfirm: { flex: 1.5, padding: 20, borderRadius: 20, alignItems: 'center', backgroundColor: '#181822', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.25)' },

  cajaMenorCard: {
    backgroundColor: NoxColors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  cajaMenorTitle: { color: NoxColors.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cajaMenorSubtitle: { color: NoxColors.gray, fontSize: 10, marginTop: 4, fontWeight: '600' },
  addMovBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: NoxColors.aura,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  addMovBtnText: { color: '#000000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  movRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  movBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  movConcepto: { color: NoxColors.text, fontSize: 12, fontWeight: '600' },
  movHora: { color: NoxColors.muted, fontSize: 9, marginTop: 2 },
  movMonto: { fontSize: 12, fontWeight: 'bold' },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: NoxColors.border,
    backgroundColor: NoxColors.deep
  },
  tipoBtnText: { color: NoxColors.gray, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }
});
