import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, TextInput, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import apiClient from '../../../utils/apiClient';
import { formatImageUrl } from '../../../utils/imageHelpers';
import { NoxColors } from '../../../constants/theme';


import { useResponsive } from '../../../utils/responsive';

const CATEGORIES = [
  { id: "", label: "Todos" },
  { id: "cerveza", label: "Cervezas" },
  { id: "vinos", label: "Vinos" },
  { id: "destilados", label: "Destilados" },
  { id: "cocteles", label: "Cócteles" },
  { id: "bebidas", label: "Bebidas" },
];

export default function ClientMenuScreen() {
  const { isDesktop, isLargeScreen, maxContentWidth: contentMaxWidth, maxModalWidth: modalMaxWidth } = useResponsive();
  const numColumns = isLargeScreen ? 4 : (isDesktop ? 3 : 2);
  const { id: rawId } = useGlobalSearchParams();
  const mesaId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>(CATEGORIES);
  const [mesaInfo, setMesaInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<any>("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [showCart, setShowCart] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!mesaId || mesaId === 'undefined') {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    fetchData();
  }, [mesaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching menu for mesa:", mesaId);
      const [prodRes, mesaRes, catRes] = await Promise.all([
        apiClient.get('/productos/'),
        apiClient.get(`/mesas/${mesaId}/`),
        apiClient.get('/categorias/')
      ]);
      console.log("Data fetched successfully");
      setProductos(prodRes.data);
      setMesaInfo(mesaRes.data);
      const rawCats = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.results || []);
      if (rawCats.length > 0) {
        const dbCats = rawCats.map((c: any) => ({
          id: c.id,
          label: c.nombre || c.label || String(c)
        }));
        setCategorias([{ id: "", label: "Todos" }, ...dbCats]);
      }
    } catch (e: any) {
      console.error("Fetch Data Error:", e.message, e.config?.url);
      Alert.alert(
        'Error de Conexión', 
        `No se pudo cargar el menú. Detalle: ${e.message || 'Error desconocido'}. Revisa la consola o contacta soporte.`
      );
    } finally {
      setLoading(false);
    }

  };

  const addToOrder = (prod: any) => {
    const existing = order.find(i => i.id === prod.id);
    if (existing) {
      setOrder(order.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setOrder([...order, { ...prod, qty: 1 }]);
    }
  };

  const removeFromOrder = (prodId: number) => {
    const existing = order.find(i => i.id === prodId);
    if (existing.qty > 1) {
      setOrder(order.map(i => i.id === prodId ? { ...i, qty: i.qty - 1 } : i));
    } else {
      setOrder(order.filter(i => i.id !== prodId));
    }
  };

  const calculateTotal = () => order.reduce((acc, i) => acc + (i.precio * i.qty), 0);

  const handleSendOrder = async () => {
    if (order.length === 0) return;
    try {
      const payload = {
        mesa: parseInt(String(mesaId), 10),
        productos: order.map(i => ({ 
          producto_id: i.id, 
          cantidad: i.qty,
          precio_unitario: parseFloat(i.precio) || 0
        })),
        force_append: true  // Permite agregar a la cuenta existente de la mesa
      };
      await apiClient.post('/pedidos/', payload);
      setOrder([]);
      setShowCart(false);
      Alert.alert("¡Enviado!", "Tu pedido está siendo preparado.");
      router.push(`/(client)/${mesaId}/history`);
    } catch (e) {
      Alert.alert("Error", "No se pudo enviar el pedido.");
    }
  };


  const filteredProds = productos.filter(p => {
    const matchCat = !filtro || p.categoria === filtro;
    const matchName = !filtroNombre || p.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    return matchCat && matchName;
  });

  if (loading) return (
    <View style={styles.loader}>
        <ActivityIndicator size="large" color={NoxColors.aura} />
        <Text style={styles.loaderText}>CARGANDO MENÚ...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.innerWrapper, { maxWidth: contentMaxWidth }]}>
        {/* Header */}
        <View style={[styles.header, isDesktop && { paddingTop: 30 }]}>
          <View>
            <Text style={styles.branding}>Nox<Text style={{color:NoxColors.subtext}}>OS</Text></Text>
            <Text style={styles.mesaTitle}>MESA #{mesaInfo?.numero || '?'}</Text>
            {mesaInfo?.mesero_nombre && (
              <Text style={styles.meseroAsignado}>Atendido por: <Text style={{color:NoxColors.text}}>{mesaInfo.mesero_nombre}</Text></Text>
            )}
          </View>
          <TouchableOpacity style={styles.cartBtnHeader} onPress={() => setShowCart(true)}>
             <Ionicons name="bag-handle" size={24} color={NoxColors.aura} />
             {order.length > 0 && <View style={styles.badge}><Text style={styles.badgeTxt}>{order.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Buscador y Categorías */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={NoxColors.muted} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor={NoxColors.muted}
              value={filtroNombre}
              onChangeText={setFiltroNombre}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}>
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

        {/* Productos */}
        <FlatList
          key={`client-grid-${numColumns}`}
          data={filteredProds}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 14 } : undefined}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 15, paddingBottom: 180 }}
          renderItem={({ item }) => (
            <View style={styles.prodCard}>
               <View style={styles.imgContainer}>
                  {item.imagen ? <Image source={{uri: formatImageUrl(item.imagen)}} style={styles.prodImg} /> : <Ionicons name="beer-outline" size={32} color={NoxColors.muted} />}
               </View>
               <View style={styles.infoContainer}>
                  <Text style={styles.prodName} numberOfLines={2}>{item.nombre}</Text>
                  <Text style={styles.prodPrice}>${parseFloat(item.precio).toLocaleString()}</Text>
               </View>
               <TouchableOpacity style={styles.addBtn} onPress={() => addToOrder(item)}>
                  <Ionicons name="add" size={20} color={NoxColors.text} />
               </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Flotante Carrito */}
      {order.length > 0 && !showCart && (
        <View style={styles.floatingWrapper} pointerEvents="box-none">
          <TouchableOpacity style={[styles.floatingCart, { maxWidth: modalMaxWidth }]} onPress={() => setShowCart(true)} activeOpacity={0.85}>
            <Text style={styles.cartTotal}>${calculateTotal().toLocaleString()}</Text>
            <Text style={styles.cartConfirm}>VER PEDIDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Carrito */}
      <Modal visible={showCart} transparent animationType="slide" statusBarTranslucent>
        <View style={[styles.cartOverlay, isDesktop && { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <View style={[styles.cartContent, isDesktop && { width: '100%', maxWidth: modalMaxWidth, borderRadius: 28, borderWidth: 1, borderColor: NoxColors.border }]}>
            <View style={styles.cartHead}>
              <Text style={styles.cartTitle}>TU PEDIDO</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close-circle" size={30} color={NoxColors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartList} contentContainerStyle={{ paddingBottom: 10 }}>
              {order.map(i => (
                <View key={i.id} style={styles.cartItem}>
                  <View style={{flex:1}}>
                    <Text style={styles.cartItemName}>{i.nombre}</Text>
                    <Text style={styles.cartItemPrice}>${(i.precio * i.qty).toLocaleString()}</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity onPress={() => removeFromOrder(i.id)} style={styles.qtyBtn}><Ionicons name="remove" size={18} color={NoxColors.text} /></TouchableOpacity>
                    <Text style={styles.qtyVal}>{i.qty}</Text>
                    <TouchableOpacity onPress={() => addToOrder(i)} style={styles.qtyBtn}><Ionicons name="add" size={18} color={NoxColors.text} /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartBottom}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>TOTAL</Text>
                <Text style={styles.totalVal}>${calculateTotal().toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendOrder}>
                <Text style={styles.sendBtnText}>REALIZAR PEDIDO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  innerWrapper: { flex: 1, width: '100%', alignSelf: 'center' },
  loader: { flex: 1, backgroundColor: NoxColors.deep, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: NoxColors.muted, fontWeight: '900', marginTop: 15, fontSize: 10, letterSpacing: 2 },
  header: { paddingHorizontal: 25, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  branding: { color: NoxColors.text, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  mesaTitle: { color: NoxColors.aura, fontWeight: '900', fontSize: 10, letterSpacing: 2, marginTop: 4 },
  meseroAsignado: { color: NoxColors.muted, fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  cartBtnHeader: { backgroundColor: NoxColors.container, width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  badge: { position:'absolute', top: -5, right: -5, backgroundColor: NoxColors.aura, width: 18, height: 18, borderRadius: 9, justifyContent:'center', alignItems:'center' },
  badgeTxt: { color: NoxColors.text, fontSize: 10, fontWeight: 'bold' },

  catBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 12, backgroundColor: NoxColors.container, height: 34, justifyContent:'center' },
  catBtnActive: { backgroundColor: NoxColors.aura },
  catText: { color: NoxColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  catTextActive: { color: NoxColors.text },

  searchSection: { marginTop: 15, marginBottom: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: NoxColors.card, marginHorizontal: 20, marginBottom: 15, paddingHorizontal: 15, height: 45, borderRadius: 15, borderWidth: 1, borderColor: NoxColors.border },
  searchInput: { flex: 1, marginLeft: 10, color: NoxColors.text, fontSize: 14 },

  prodCard: { flex: 1, backgroundColor: NoxColors.card, marginVertical: 7, padding: 15, borderRadius: 24, borderWidth: 1, borderColor: NoxColors.border, minHeight: 230, alignItems: 'center' },
  imgContainer: { width: 110, height: 110, backgroundColor: '#FFFFFF', borderRadius: 25, justifyContent:'center', alignItems:'center', marginBottom: 12, overflow: 'hidden' },
  prodImg: { width: 110, height: 110, borderRadius: 25, resizeMode: 'contain' },
  infoContainer: { alignItems: 'center', width: '100%' },
  prodName: { color: NoxColors.text, fontWeight: 'bold', fontSize: 13, textAlign: 'center', height: 36, lineHeight: 18 },
  prodPrice: { color: NoxColors.emerald, fontSize: 14, fontWeight: '900', marginTop: 5 },
  addBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: NoxColors.aura, width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.4, shadowRadius: 10 },

  floatingWrapper: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 99, elevation: 15, paddingHorizontal: 20 },
  floatingCart: { width: '100%', backgroundColor: NoxColors.aura, padding: 20, borderRadius: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  cartTotal: { color:NoxColors.text, fontSize: 20, fontWeight:'900' },
  cartConfirm: { color:NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 12 },

  cartOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  cartContent: { backgroundColor: NoxColors.card, borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: '85%', padding: 30, paddingBottom: 40 },
  cartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  cartTitle: { color:NoxColors.text, fontSize: 20, fontWeight:'bold', letterSpacing: 2 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth:1, borderBottomColor: NoxColors.border, paddingBottom: 15 },
  cartItemName: { color: NoxColors.text, fontWeight: 'bold', fontSize: 15 },
  cartItemPrice: { color: NoxColors.muted, fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  qtyBtn: { backgroundColor: NoxColors.container, width: 30, height: 30, borderRadius: 10, justifyContent:'center', alignItems:'center' },
  qtyVal: { color: NoxColors.text, fontWeight:'bold', fontSize: 16 },
  cartList: { flexShrink: 1, maxHeight: 300 },
  cartBottom: { paddingTop: 20, paddingBottom: 10 },
  totalRow: { flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', marginBottom: 15 },
  totalLbl: { color: NoxColors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  totalVal: { color: NoxColors.text, fontSize: 28, fontWeight: '900' },
  sendBtn: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 20, alignItems: 'center' },
  sendBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
});
