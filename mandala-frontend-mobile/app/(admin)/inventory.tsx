import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView, Image, RefreshControl, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../utils/apiClient';
import { formatImageUrl } from '../../utils/imageHelpers';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';


const DEFAULT_CATEGORIES = [
  { id: "", label: "Todos" },
  { id: "cerveza", label: "Cervezas" },
  { id: "vinos", label: "Vinos" },
  { id: "destilados", label: "Destilados" },
  { id: "cocteles", label: "Cócteles" },
  { id: "bebidas", label: "Bebidas" },
];

const INITIAL_FORM = { nombre: "", categoria_id: "", precio: "0", stock_actual: "0", imagen: "" };

export default function AdmInventarioScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)');
    }
  };
  const { isDesktop } = useResponsive();
  const numColumns = isDesktop ? 2 : 1;
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<any>("");
  const [filtroNombre, setFiltroNombre] = useState("");

  // Estados para Movimientos
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [tiposMov, setTiposMov] = useState<any[]>([]);
  const [movForm, setMovForm] = useState({ tipo_id: "", cantidad: "", motivo: "" });

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadToCloudinary(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    setIsUploadingImage(true);
    try {
      const data = new FormData();
      data.append("file", { uri, type: "image/jpeg", name: "upload.jpg" } as any);
      data.append("upload_preset", "noxos_mobile");
      data.append("cloud_name", "dakfgzabb");
      
      const res = await fetch("https://api.cloudinary.com/v1_1/dakfgzabb/image/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.secure_url) {
        setForm(prev => ({ ...prev, imagen: result.secure_url }));
      } else {
        Alert.alert("Error", "No se pudo subir la imagen a Cloudinary.");
      }
    } catch (e) {
      console.error("Cloudinary error:", e);
      Alert.alert("Error", "Hubo un problema al subir la foto.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchTipos();
      const interval = setInterval(fetchData, 30000); 
      return () => clearInterval(interval);
    }, [])
  );
  
  const fetchTipos = async () => {
    try {
        const res = await apiClient.get('/tipos-movimiento/');
        setTiposMov(res.data);
    } catch (e) { console.error(e); }
  }

  const fetchData = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else if (productos.length === 0) setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
          apiClient.get('/productos/'),
          apiClient.get('/categorias/')
      ]);
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : []);
      const rawCats = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.results || []);
      if (rawCats.length > 0) {
        const dbCats = rawCats.map((c: any) => ({
          id: c.id,
          label: c.nombre || c.label || String(c)
        }));
        setCategorias([{ id: "", label: "Todos" }, ...dbCats]);
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally { 
        setIsLoading(false); 
        setRefreshing(false); 
    }
  };

  const handleOpenMov = (prod: any) => {
      setSelectedProduct(prod);
      setMovForm({ tipo_id: "", cantidad: "", motivo: "" });
      setMovModalOpen(true);
  };

  const handleSaveMov = async () => {
      if(!movForm.tipo_id || !movForm.cantidad) return Alert.alert('Error', 'Completa los campos obligatorios.');
      try {
          await apiClient.post('/movimientos/', {
              producto_id: selectedProduct.id,
              tipo_id: parseInt(movForm.tipo_id),
              cantidad: parseInt(movForm.cantidad),
              motivo: movForm.motivo
          });
          setMovModalOpen(false);
          fetchData();
          Alert.alert('Éxito', 'Movimiento registrado correctamente.');
      } catch (e: any) {
          Alert.alert('Error', e.response?.data?.detail || 'No se pudo registrar.');
      }
  };

  const handleEdit = (producto: any) => {
    setForm({
      nombre: producto.nombre || "",
      categoria_id: String(producto.categoria || ''),
      precio: String(producto.precio || 0),
      stock_actual: String(producto.stock_actual || 0),
      imagen: producto.imagen || "",
    });
    setEditId(producto.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if(!form.nombre || !form.categoria_id) return Alert.alert('Error', 'Completa los campos.');
    try {
      const payload = { 
          nombre: form.nombre,
          categoria: parseInt(form.categoria_id),
          precio: parseFloat(form.precio) || 0,
          stock_actual: parseInt(form.stock_actual) || 0,
          activo: true,
          imagen: form.imagen || null
      };
      if (editId) await apiClient.patch(`/productos/${editId}/`, payload);
      else await apiClient.post('/productos/', payload);
      setModalOpen(false);
      fetchData();
      Alert.alert('¡Hecho!', 'Catálogo actualizado.');
    } catch(e: any) { 
        Alert.alert('Error', 'No se pudo guardar.');
    }
  };

  const handleDelete = (id: any) => {
    const performDelete = async () => {
      try {
        await apiClient.delete(`/productos/${id}/`);
        fetchData();
      } catch (e) {
        Alert.alert('Error', 'No se pudo eliminar.');
      }
    };
    Alert.alert("¿Eliminar?", "Esta acción es irreversible.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: performDelete }
    ]);
  };

  const filteredProductos = productos.filter((p) => {
    const matchCat =
      !filtro ||
      p.categoria === filtro ||
      p.categoria_id === filtro ||
      String(p.categoria) === String(filtro) ||
      String(p.categoria_id) === String(filtro);

    const matchName =
      !filtroNombre ||
      p.nombre?.toLowerCase().includes(filtroNombre.toLowerCase());

    return matchCat && matchName;
  });

  const categoriasFiltro = categorias;

  return (
    <View style={styles.container}>
      {/* Header Premium con Gradiente Visual */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {isDesktop && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={NoxColors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
            <Text style={styles.subtitle}>CONTROL DE EXISTENCIAS</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => {setForm(INITIAL_FORM); setEditId(null); setModalOpen(true);}}>
          <Ionicons name="add" size={24} color={NoxColors.text} />
        </TouchableOpacity>
      </View>

      {/* Buscador y Categorías Estilo Mesera */}
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
          {filtroNombre.length > 0 && (
            <TouchableOpacity onPress={() => setFiltroNombre("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={NoxColors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.catScroll} 
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {categoriasFiltro.map(cat => (
            <TouchableOpacity 
              key={String(cat.id)} 
              style={[styles.catBtn, filtro === cat.id && styles.catBtnActive]}
              onPress={() => setFiltro(cat.id)}
            >
              <Text style={[styles.catText, filtro === cat.id && styles.catTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={NoxColors.aura} style={{marginTop:50}} />
      ) : (
        <FlatList 
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={filteredProductos} 
          keyExtractor={it => String(it.id)} 
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={NoxColors.aura} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={44} color={NoxColors.muted} />
              <Text style={styles.emptyTitle}>No se encontraron productos</Text>
              <Text style={styles.emptySub}>Prueba cambiando la categoría o término de búsqueda</Text>
            </View>
          }
          renderItem={({item}) => (
          <View style={[styles.card, isDesktop && { maxWidth: '48.8%' }]}>
            <View style={styles.cardAccent} />
            <View style={styles.cardIcon}>
                {item.imagen ? (
                    <Image source={{ uri: formatImageUrl(item.imagen) }} style={styles.cardImage} />
                ) : (
                    <Ionicons name="cube-outline" size={26} color={NoxColors.aura} />
                )}
            </View>
            <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.nombre}</Text>
                <View style={styles.tagRow}>
                   <View style={styles.tag}><Text style={styles.tagText}>{item.categoria_nombre || 'N/A'}</Text></View>
                   <Text style={[styles.stockText, item.stock_actual < 10 && {color: NoxColors.rose}]}>STOCK: {item.stock_actual}</Text>
                </View>
                <Text style={styles.cardPrice}>${parseFloat(item.precio || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleOpenMov(item)} style={styles.iconBtnMov}>
                <Ionicons name="git-compare-outline" size={18} color={NoxColors.aura} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={18} color={NoxColors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtnDanger}>
                <Ionicons name="trash-outline" size={18} color={NoxColors.rose} />
              </TouchableOpacity>
            </View>
          </View>
        )} />
      )}

      {/* MODAL MOVIMIENTO AJUSTADO */}
      <Modal visible={movModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <View>
                        <Text style={styles.modalTitle}>AJUSTE DE STOCK</Text>
                        <Text style={styles.selectedProdName}>{selectedProduct?.nombre}</Text>
                    </View>
                    <TouchableOpacity onPress={()=>setMovModalOpen(false)}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>TIPO DE OPERACIÓN</Text>
                <View style={styles.row}>
                    {tiposMov.map((t: any) => (
                        <TouchableOpacity 
                            key={t.id} 
                            style={[styles.chip, movForm.tipo_id === String(t.id) && styles.chipActiveMov]} 
                            onPress={()=>setMovForm({...movForm, tipo_id: String(t.id)})}
                        >
                            <Text style={[styles.chipText, movForm.tipo_id === String(t.id) && {color:NoxColors.text}]}>{t.nombre}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>CANTIDAD</Text>
                    <TextInput 
                        style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={NoxColors.gray}
                        value={movForm.cantidad} onChangeText={t => setMovForm({...movForm, cantidad: t})} 
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>OBSERVACIONES</Text>
                    <TextInput 
                        style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                        multiline placeholder="Escribe el motivo..." placeholderTextColor={NoxColors.gray}
                        value={movForm.motivo} onChangeText={t => setMovForm({...movForm, motivo: t})} 
                    />
                </View>

                <TouchableOpacity style={styles.saveBtnMov} onPress={handleSaveMov}>
                    <Text style={styles.saveBtnText}>REGISTRAR CAMBIO</Text>
                </TouchableOpacity>
            </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL FORM PRODUCTO AJUSTADO */}
      <Modal visible={modalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalBg}>
            <View style={styles.glassCard}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editId ? 'EDITAR' : 'NUEVO'} ITEM</Text>
                    <TouchableOpacity onPress={()=>setModalOpen(false)}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>NOMBRE DEL PRODUCTO</Text>
                    <TextInput 
                        placeholder="Ej: Ron Añejo..." placeholderTextColor={NoxColors.gray}
                        style={styles.input} value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} 
                    />

                    <Text style={[styles.label, { marginTop: 15 }]}>IMAGEN DEL PRODUCTO</Text>
                    <TouchableOpacity 
                      style={[styles.input, { alignItems: 'center', justifyContent: 'center', padding: 15, borderStyle: 'dashed' }]}
                      onPress={pickImage}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <ActivityIndicator color={NoxColors.aura} />
                      ) : form.imagen ? (
                        <Image source={{ uri: form.imagen }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Ionicons name="camera-outline" size={32} color={NoxColors.muted} />
                          <Text style={{ color: NoxColors.muted, fontSize: 12, marginTop: 5 }}>Tocar para elegir foto de galería</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <Text style={[styles.label, { marginTop: 15 }]}>CATEGORÍA</Text>
                    <View style={styles.row}>
                        {categorias.map((c: any) => (
                            <TouchableOpacity 
                                key={c.id} 
                                style={[styles.chip, form.categoria_id === String(c.id) && styles.chipActive]} 
                                onPress={()=>setForm({...form, categoria_id: String(c.id)})}
                            >
                                <Text style={[styles.chipText, form.categoria_id === String(c.id) && {color:NoxColors.text}]}>{c.nombre}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.formRow}>
                        <View style={{flex:1, marginRight:10}}>
                            <Text style={styles.label}>PRECIO VENTA</Text>
                            <TextInput 
                                style={styles.input} keyboardType="numeric" 
                                value={form.precio} onChangeText={t => setForm({...form, precio: t})} 
                            />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.label}>STOCK INICIAL</Text>
                            <TextInput 
                                style={styles.input} keyboardType="numeric" 
                                value={form.stock_actual} onChangeText={t => setForm({...form, stock_actual: t})} 
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>GUARDAR EN CATÁLOGO</Text>
                    </TouchableOpacity>
                    <View style={{height: 40}} />
                </ScrollView>
            </View>
        </View>
        </KeyboardAvoidingView>
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
    backgroundColor: NoxColors.background,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: NoxColors.card, borderWidth: 1, borderColor: NoxColors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { gap: 4 },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  addBtn: { backgroundColor: NoxColors.aura, width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: NoxColors.aura, shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: {width:0, height:5} },
  
  listContent: { padding: 20, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  card: { 
    flex: 1,
    backgroundColor: NoxColors.card, 
    marginBottom: 16, 
    padding: 16, 
    borderRadius: 28, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: NoxColors.border,
  },
  cardAccent: { position: 'absolute', left: 0, top: 25, bottom: 25, width: 4, backgroundColor: NoxColors.aura, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  cardIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.02)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  cardMain: { flex: 1, marginHorizontal: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: NoxColors.text, marginBottom: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: 'rgba(169, 68, 255, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { color: NoxColors.aura, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  stockText: { color: NoxColors.emerald, fontSize: 10, fontWeight: 'bold' },
  cardPrice: { color: NoxColors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
  
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center' },
  iconBtnMov: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(169, 68, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)' },
  iconBtnDanger: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(5, 5, 16, 0.95)', justifyContent: 'center', padding: 25 },
  glassCard: { backgroundColor: NoxColors.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)', shadowColor: NoxColors.aura, shadowOpacity: 0.1, shadowRadius: 30, maxWidth: 580, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  modalTitle: { color: NoxColors.text, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  selectedProdName: { color: NoxColors.aura, fontSize: 12, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  
  label: { fontSize: 9, fontWeight: '900', color: NoxColors.muted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 20 },
  input: { backgroundColor: NoxColors.container, color: NoxColors.text, borderRadius: 20, padding: 20, fontSize: 16, borderWidth: 1, borderColor: NoxColors.border },
  
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 30, gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: NoxColors.container, borderWidth: 1, borderColor: NoxColors.border },
  chipActive: { backgroundColor: NoxColors.emerald, borderColor: 'rgba(16, 185, 129, 0.3)' },
  chipActiveMov: { backgroundColor: NoxColors.aura, borderColor: 'rgba(169, 68, 255, 0.3)' },
  chipText: { fontSize: 11, fontWeight: 'bold', color: NoxColors.muted, textTransform: 'uppercase' },
  
  saveBtn: { backgroundColor: NoxColors.emerald, padding: 22, borderRadius: 25, alignItems: 'center', marginTop: 20 },
  saveBtnMov: { backgroundColor: NoxColors.aura, padding: 22, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  formRow: { flexDirection: 'row', gap: 10 },

  // Estilos del Buscador y Categorías (Estilo Mesera)
  searchSection: { 
    marginBottom: 8, 
    maxWidth: 1200, 
    width: '100%', 
    alignSelf: 'center' 
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: NoxColors.card, 
    marginHorizontal: 20, 
    marginBottom: 12, 
    paddingHorizontal: 16, 
    height: 48, 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: NoxColors.border 
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    color: NoxColors.text, 
    fontSize: 14 
  },
  catScroll: { 
    marginBottom: 10, 
    maxWidth: 1200, 
    width: '100%', 
    alignSelf: 'center' 
  },
  catBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 9, 
    borderRadius: 18, 
    backgroundColor: NoxColors.container, 
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catBtnActive: { 
    backgroundColor: NoxColors.aura,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  catText: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: NoxColors.muted, 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  catTextActive: { 
    color: NoxColors.text 
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: NoxColors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: NoxColors.muted,
    fontSize: 13,
    marginTop: 4,
  },
});
