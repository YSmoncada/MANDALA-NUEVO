import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';
import { formatImageUrl } from '../../utils/imageHelpers';
import NoxAlert from '../../components/NoxAlert';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


const CATEGORIES = [
  { id: "", label: "Todos" },
  { id: "cerveza", label: "Cervezas" },
  { id: "vinos", label: "Vinos" },
  { id: "destilados", label: "Destilados" },
  { id: "cocteles", label: "Cócteles" },
  { id: "bebidas", label: "Bebidas" },
];

export default function PedidosScreen() {
  const { isDesktop, isLargeScreen } = useResponsive();
  const numColumns = isLargeScreen ? 4 : (isDesktop ? 3 : 2);
  const [productos, setProductos] = useState<any[]>([]);
  const [mesas, setMesas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>(CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<any>(null);
  const [filtro, setFiltro] = useState<any>("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const user = useAuthStore(state => state.user);

  // Estado de alerta personalizada
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean,
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    onConfirm?: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const [turnoAbierto, setTurnoAbierto] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    setLoading(true);
    try {
      const ts = new Date().getTime();
      const [prodRes, mesasRes, catRes, turnoRes] = await Promise.allSettled([
        apiClient.get(`/productos/?_=${ts}`),
        apiClient.get(`/mesas/?_=${ts}`),
        apiClient.get(`/categorias/?_=${ts}`),
        apiClient.get('/contabilidad/turno/actual/')
      ]);
      
      if (prodRes.status === 'fulfilled') setProductos(prodRes.value.data);
      if (mesasRes.status === 'fulfilled') setMesas(mesasRes.value.data);
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        const dbCats = catRes.value.data.map((c: any) => ({
          id: c.id,
          label: c.nombre
        }));
        setCategorias([{ id: "", label: "Todos" }, ...dbCats]);
      }
      
      // Validar turno
      if (turnoRes.status === 'fulfilled' && turnoRes.value.data) {
          setTurnoAbierto(true);
      } else {
          setTurnoAbierto(false);
      }

    } catch (e) {
      showAlert('Error', 'No se pudo sincronizar el menú', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToOrder = (producto: any) => {
    setOrder(prev => {
      const existing = prev.find(item => item.id === producto.id);
      if (existing) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const updateCant = (id: any, delta: number) => {
    setOrder(prev => prev.map(item => {
      if (item.id === id) {
        const newCant = item.cantidad + delta;
        return newCant > 0 ? { ...item, cantidad: newCant } : item;
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const total = order.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0);

  const handleFinalizar = async () => {
    if (!selectedMesa) return showAlert('Error', 'Debes seleccionar una mesa', 'warning');
    if (order.length === 0) return showAlert('Error', 'El pedido está vacío', 'warning');

    // Construir payload incluyendo el usuario para cuentas de sistema
    const payload: any = {
      mesa: selectedMesa.id,
      productos: order.map(it => ({ 
        producto_id: it.id, 
        cantidad: it.cantidad,
        precio_unitario: parseFloat(it.precio)
      })),
      total: total,
      force_append: selectedMesa.estado_nombre === 'Ocupada'
    };

    // Adjuntar usuario si es cuenta del sistema (no PIN de mesera operativa)
    if (user?.id) {
      payload.usuario = parseInt(user.id);
    }

    try {
      const res = await apiClient.post('/pedidos/', payload);
      if (res.status === 201 || res.status === 200) {
        showAlert('¡Excelente!', 'Pedido enviado a cocina/barra', 'success');
        setOrder([]);
        setSelectedMesa(null);
        setShowCheckout(false);
        fetchData();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'No se pudo procesar el pedido';
      showAlert('Error al crear pedido', msg, 'error');
    }
  };

  const filtered = productos.filter(p => {
    const matchCat = !filtro || p.categoria === filtro;
    const matchName = !filtroNombre || p.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    return matchCat && matchName;
  });

  return (
    <View style={styles.container}>
      {/* Encabezado Premium */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>CARTA DE PRODUCTOS</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => setShowCheckout(true)}>
          <Ionicons name="cart-outline" size={24} color={NoxColors.text} />
          {order.length > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{order.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {!turnoAbierto && (
        <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={20} color={NoxColors.text} />
            <Text style={styles.lockText}>VENTAS BLOQUEADAS: EL ADMIN DEBE ABRIR TURNO</Text>
        </View>
      )}

      {/* Buscador y Categorías */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={NoxColors.muted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar producto por nombre..."
            placeholderTextColor={NoxColors.muted}
            value={filtroNombre}
            onChangeText={setFiltroNombre}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {categorias.map(cat => (
            <TouchableOpacity 
                key={cat.id} 
                style={[styles.catBtn, filtro === cat.id && styles.catBtnActive]}
                onPress={() => setFiltro(cat.id)}
            >
                <Text style={[styles.catText, filtro === cat.id && styles.catTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          key={numColumns}
          data={filtered}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.prodCard} onPress={() => addToOrder(item)}>
              <View style={styles.prodImageContainer}>
                {item.imagen ? (
                  <Image 
                    key={`img-${item.id}-${item.imagen}`}
                    source={{ uri: formatImageUrl(item.imagen) }} 
                    style={styles.prodImage}
                  />
                ) : (
                  <Ionicons name="fast-food-outline" size={32} color={NoxColors.muted} />
                )}
              </View>
              <View style={styles.prodInfo}>
                <Text style={styles.prodName} numberOfLines={2}>{item.nombre}</Text>
                <Text style={styles.prodPrice}>${parseFloat(item.precio).toLocaleString()}</Text>
              </View>
              <View style={styles.addIcon}><Ionicons name="add" size={16} color={NoxColors.text} /></View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL DE PAGO - Estilo NoxOS */}
      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalBg}>
            <View style={styles.chkCard}>
                <View style={styles.chkHeader}>
                    <Text style={styles.chkTitle}>RESUMEN DEL PEDIDO</Text>
                    <TouchableOpacity onPress={() => setShowCheckout(false)}>
                        <Ionicons name="close-circle-outline" size={32} color={NoxColors.subtext} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>SELECCIONA LA MESA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 60, flexGrow: 0, marginBottom: 25 }}>
                    {mesas.map(m => {
                        const isOcupada = m.estado_nombre === 'Ocupada';
                        const esMia = isOcupada && m.mesero_id === parseInt(user?.id || '0');
                        const deOtro = isOcupada && !esMia;
                        
                        return (
                            <TouchableOpacity 
                                key={m.id} 
                                style={[
                                    styles.mesaMini, 
                                    isOcupada && (esMia ? styles.mesaMiniOcupada : styles.mesaMiniOtro),
                                    selectedMesa?.id === m.id && styles.mesaMiniActive
                                ]}
                                onPress={() => setSelectedMesa(m)}
                                disabled={deOtro}
                            >
                                <Text style={[
                                    styles.mesaMiniText, 
                                    esMia && { color: NoxColors.aura },
                                    deOtro && { color: '#3f3f46' },
                                    selectedMesa?.id === m.id && { color: NoxColors.text }
                                ]}>#{m.numero}</Text>
                                {esMia && <View style={[styles.myBadge, selectedMesa?.id === m.id && { backgroundColor: NoxColors.text }]} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>PRODUCTOS SELECCIONADOS</Text>
                    <FlatList
                    data={order}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => (
                        <View style={styles.orderItem}>
                            <View style={{flex: 1}}>
                                <Text style={styles.itemTitle}>{item.nombre}</Text>
                                <Text style={styles.itemPrice}>${(item.precio * item.cantidad).toLocaleString()}</Text>
                            </View>
                            <View style={styles.cantCtrl}>
                                <TouchableOpacity onPress={() => updateCant(item.id, -1)} style={styles.ctrlBtn}>
                                    <Ionicons name="remove" size={20} color={NoxColors.text} />
                                </TouchableOpacity>
                                <Text style={styles.cantNum}>{item.cantidad}</Text>
                                <TouchableOpacity onPress={() => updateCant(item.id, 1)} style={styles.ctrlBtn}>
                                    <Ionicons name="add" size={20} color={NoxColors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    />
                </View>

                <View style={styles.footer}>
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLbl}>TOTAL A PAGAR</Text>
                        <Text style={styles.totalVal}>${total.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.finishBtn, !turnoAbierto && { backgroundColor: '#3f3f46', opacity: 0.5 }]} 
                        onPress={handleFinalizar}
                        disabled={!turnoAbierto}
                    >
                        <Text style={styles.finishBtnText}>{turnoAbierto ? "CONFIRMAR Y ENVIAR" : "TURNO CERRADO"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <NoxAlert 
        {...alertConfig} 
        onConfirm={() => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            if (alertConfig.onConfirm) alertConfig.onConfirm();
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  header: { 
    paddingHorizontal: 25, 
    paddingTop: 40, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  brandingNox: { fontSize: 28, fontWeight: '900', color: NoxColors.text, letterSpacing: 2 },
  brandingOS: { color: NoxColors.subtext },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  cartBtn: { backgroundColor: NoxColors.container, width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: NoxColors.aura, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 2, borderColor: NoxColors.deep },
  cartBadgeText: { color: NoxColors.text, fontSize: 10, fontWeight: 'bold' },

  catScroll: { marginBottom: 15, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: NoxColors.container, marginRight: 10 },
  catBtnActive: { backgroundColor: NoxColors.aura },
  catText: { fontSize: 11, fontWeight: 'bold', color: NoxColors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  catTextActive: { color: NoxColors.text },

  listContent: { padding: 15, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  prodCard: { 
    flex: 1,
    backgroundColor: NoxColors.card, 
    margin: 8, 
    borderRadius: 24, 
    padding: 15,
    borderWidth: 1, 
    borderColor: NoxColors.border,
    height: 235,
    alignItems: 'center'
  },
  prodImageContainer: { 
    width: 105, 
    height: 105, 
    backgroundColor: 'rgba(138, 123, 175, 0.05)', 
    borderRadius: 22,
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 12
  },
  prodImage: {
    width: 105,
    height: 105,
    borderRadius: 22
  },
  prodInfo: { alignItems: 'center', width: '100%' },
  prodName: { fontSize: 13, fontWeight: 'bold', color: NoxColors.text, textAlign: 'center', height: 36, lineHeight: 18 },
  prodPrice: { fontSize: 14, color: NoxColors.emerald, fontWeight: '900', marginTop: 5 },
  addIcon: { position: 'absolute', bottom: 12, right: 12, backgroundColor: NoxColors.aura, width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.4, shadowRadius: 8 },

  searchSection: { marginBottom: 10, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: NoxColors.card, marginHorizontal: 20, marginBottom: 15, paddingHorizontal: 15, height: 48, borderRadius: 18, borderWidth: 1, borderColor: NoxColors.border },
  searchInput: { flex: 1, marginLeft: 10, color: NoxColors.text, fontSize: 14 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  chkCard: { 
    backgroundColor: NoxColors.card, 
    borderRadius: 36, 
    padding: 30, 
    maxHeight: '90%',
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171, 0, 255, 0.2)'
  },
  chkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  chkTitle: { color: NoxColors.text, fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  label: { fontSize: 10, fontWeight: '900', color: NoxColors.muted, marginBottom: 15, letterSpacing: 2, textTransform: 'uppercase' },
  mesaMini: { 
    width: 55, 
    height: 55, 
    borderRadius: 18, 
    backgroundColor: NoxColors.container, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: NoxColors.border
  },
  mesaMiniActive: { 
    backgroundColor: NoxColors.aura, 
    borderColor: NoxColors.text, 
    borderWidth: 2,
    shadowColor: NoxColors.aura,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10
  },
  mesaMiniOcupada: { backgroundColor: 'rgba(169, 68, 255, 0.1)', borderColor: 'rgba(169, 68, 255, 0.3)' },
  mesaMiniOtro: { backgroundColor: NoxColors.container, opacity: 0.3, borderColor: 'transparent' },
  mesaMiniText: { color: NoxColors.muted, fontWeight: 'bold' },
  myBadge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: NoxColors.aura },
  
  orderItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: NoxColors.border 
  },
  itemTitle: { color: NoxColors.text, fontWeight: 'bold', fontSize: 15 },
  itemPrice: { color: NoxColors.emerald, fontSize: 13, fontWeight: '600' },
  cantCtrl: { flexDirection: 'row', alignItems: 'center', backgroundColor: NoxColors.container, borderRadius: 15, padding: 4 },
  ctrlBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: NoxColors.card, justifyContent: 'center', alignItems: 'center' },
  cantNum: { color: NoxColors.text, marginHorizontal: 15, fontWeight: 'bold', fontSize: 16 },
  
  footer: { marginTop: 20, paddingTop: 20 },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 25 },
  totalLbl: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  totalVal: { color: NoxColors.text, fontSize: 32, fontWeight: '900' },
  finishBtn: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 25, alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.3, shadowRadius: 15 },
  finishBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  lockBanner: { backgroundColor: NoxColors.rose, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 10, marginBottom: 10 },
  lockText: { color: NoxColors.text, fontWeight: '900', fontSize: 10, letterSpacing: 1 }
});
