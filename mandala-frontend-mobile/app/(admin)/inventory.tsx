import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Image, 
  RefreshControl, 
  Platform, 
  KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../utils/apiClient';
import { formatImageUrl } from '../../utils/imageHelpers';
import { NoxColors } from '../../constants/theme';
import { useResponsive } from '../../utils/responsive';

const INITIAL_FORM = { 
  nombre: "", 
  categoria_id: "", 
  precio: "0", 
  stock_actual: "0", 
  imagen: "" 
};

export default function AdmInventarioScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const numColumns = isDesktop ? 2 : 1;

  // --- ESTADOS DE PRODUCTOS & CATEGORÍAS ---
  const [productos, setProductos] = useState<any[]>([]);
  const [dbCategorias, setDbCategorias] = useState<any[]>([]);
  const [categoriasFiltro, setCategoriasFiltro] = useState<any[]>([{ id: "", label: "Todos" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<any>("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  // --- ESTADOS DE FORMULARIO (CREAR / EDITAR PRODUCTO) ---
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState<any>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // --- ESTADOS PARA ELIMINACIÓN SEGURA (COMPATIBLE CON WEB) ---
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- ESTADOS PARA MOVIMIENTOS (SOLO ENTRADA Y SALIDA) ---
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [tiposMov, setTiposMov] = useState<any[]>([]);
  const [movForm, setMovForm] = useState({ tipo_id: "", cantidad: "", motivo: "" });
  const [isSavingMov, setIsSavingMov] = useState(false);

  // --- ESTADOS PARA HISTORIAL DE MOVIMIENTOS ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historialMovimientos, setHistorialMovimientos] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState<'todos' | 'entrada' | 'salida'>('todos');
  const [historySearch, setHistorySearch] = useState("");

  // --- CARGA DE DATOS ---
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
      // Aseguramos estrictamente solo Entrada y Salida
      const soloEntradaSalida = (res.data || []).filter((t: any) => 
        t.nombre?.toLowerCase().includes('entrada') || t.nombre?.toLowerCase().includes('salida')
      );
      setTiposMov(soloEntradaSalida);
    } catch (e) { 
      console.error("Error al cargar tipos de movimiento:", e); 
    }
  };

  const fetchData = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else if (productos.length === 0) setIsLoading(true);
    
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get('/productos/'),
        apiClient.get('/categorias/')
      ]);

      const prods = Array.isArray(prodRes.data) ? prodRes.data : [];
      setProductos(prods);

      const rawCats = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.results || []);
      setDbCategorias(rawCats);

      const filterList = [
        { id: "", label: "Todos" },
        ...rawCats.map((c: any) => ({
          id: c.id,
          label: c.nombre || c.label || `Cat #${c.id}`
        }))
      ];
      setCategoriasFiltro(filterList);

    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally { 
      setIsLoading(false); 
      setRefreshing(false); 
    }
  };

  // --- SUBIDA DE IMAGEN (CLOUDINARY COMPATIBLE CON WEB & MOBILE) ---
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadToCloudinary(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Error al seleccionar imagen:", e);
      Alert.alert("Error", "No se pudo abrir la galería de imágenes.");
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    setIsUploadingImage(true);
    try {
      const data = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        data.append("file", blob, "image.jpg");
      } else {
        data.append("file", { uri, type: "image/jpeg", name: "upload.jpg" } as any);
      }
      data.append("upload_preset", "noxos_mobile");
      data.append("cloud_name", "dakfgzabb");
      
      const res = await fetch("https://api.cloudinary.com/v1_1/dakfgzabb/image/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.secure_url) {
        setForm(prev => ({ ...prev, imagen: result.secure_url }));
        Alert.alert("¡Imagen cargada!", "La fotografía se guardó correctamente.");
      } else {
        console.error("Cloudinary response:", result);
        Alert.alert("Aviso", "No se pudo subir a Cloudinary. Puedes pegar la URL directa en el campo.");
      }
    } catch (e) {
      console.error("Cloudinary error:", e);
      Alert.alert("Error", "Hubo un problema al subir la foto.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // --- CREAR CATEGORÍA INLINE ---
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      return Alert.alert("Campo vacío", "Escribe el nombre de la nueva categoría.");
    }
    setIsCreatingCat(true);
    try {
      const res = await apiClient.post('/categorias/', { nombre: newCatName.trim() });
      const created = res.data;
      setDbCategorias(prev => [...prev, created]);
      setCategoriasFiltro(prev => [...prev, { id: created.id, label: created.nombre }]);
      setForm(prev => ({ ...prev, categoria_id: String(created.id) }));
      setNewCatName("");
      setShowNewCategoryInput(false);
      Alert.alert("Categoría Creada", `Categoría "${created.nombre}" añadida y seleccionada.`);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "No se pudo crear la categoría.");
    } finally {
      setIsCreatingCat(false);
    }
  };

  // --- GUARDAR / EDITAR PRODUCTO ---
  const handleOpenNew = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setShowNewCategoryInput(false);
    setModalOpen(true);
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
    setShowNewCategoryInput(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      return Alert.alert('Campo requerido', 'Por favor ingresa el nombre del producto.');
    }
    if (!form.categoria_id) {
      return Alert.alert('Categoría requerida', 'Debes seleccionar una categoría para el producto.');
    }

    try {
      const payload = { 
        nombre: form.nombre.trim(),
        categoria: parseInt(form.categoria_id),
        precio: parseFloat(form.precio) || 0,
        stock_actual: parseInt(form.stock_actual) || 0,
        activo: true,
        imagen: form.imagen?.trim() || null
      };

      if (editId) {
        await apiClient.patch(`/productos/${editId}/`, payload);
      } else {
        await apiClient.post('/productos/', payload);
      }

      setModalOpen(false);
      fetchData();
      Alert.alert('¡Éxito!', editId ? 'Producto actualizado correctamente.' : 'Producto registrado en el catálogo.');
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar el producto.');
    }
  };

  // --- ELIMINAR PRODUCTO (MODAL CONFIRMACIÓN COMPATIBLE WEB/MÓVIL) ---
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/productos/${itemToDelete.id}/`);
      setItemToDelete(null);
      fetchData();
      Alert.alert('Eliminado', res.data?.detail || 'Producto removido del inventario.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- MOVIMIENTOS DE STOCK (SOLO ENTRADA Y SALIDA) ---
  const handleOpenMov = (prod: any) => {
    setSelectedProduct(prod);
    // Preseleccionar Entrada por defecto si existe
    const defaultTipo = tiposMov.find(t => t.nombre.toLowerCase().includes('entrada')) || tiposMov[0];
    setMovForm({ 
      tipo_id: defaultTipo ? String(defaultTipo.id) : "", 
      cantidad: "", 
      motivo: "" 
    });
    setMovModalOpen(true);
  };

  const handleSaveMov = async () => {
    if (!movForm.tipo_id) {
      return Alert.alert('Error', 'Selecciona si es Entrada o Salida.');
    }
    const cantNum = parseInt(movForm.cantidad);
    if (isNaN(cantNum) || cantNum <= 0) {
      return Alert.alert('Cantidad inválida', 'La cantidad debe ser un número entero mayor a 0.');
    }

    setIsSavingMov(true);
    try {
      await apiClient.post('/movimientos/', {
        producto_id: selectedProduct.id,
        tipo_id: parseInt(movForm.tipo_id),
        cantidad: cantNum,
        motivo: movForm.motivo.trim() || undefined
      });

      setMovModalOpen(false);
      fetchData();
      Alert.alert('Éxito', 'Movimiento de inventario registrado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo registrar el movimiento.');
    } finally {
      setIsSavingMov(false);
    }
  };

  // --- HISTORIAL DE MOVIMIENTOS ---
  const openHistoryModal = async (prodId?: number) => {
    setHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryFilterType('todos');
    setHistorySearch(prodId && selectedProduct ? selectedProduct.nombre : "");
    try {
      const url = prodId ? `/movimientos/?producto_id=${prodId}` : '/movimientos/';
      const res = await apiClient.get(url);
      setHistorialMovimientos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error al cargar historial:", e);
      Alert.alert("Error", "No se pudo cargar el historial de movimientos.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const filteredHistory = historialMovimientos.filter(m => {
    const isEntrada = m.tipo_nombre?.toLowerCase().includes('entrada');
    const isSalida = m.tipo_nombre?.toLowerCase().includes('salida') || m.tipo_nombre?.toLowerCase().includes('merma') || m.tipo_nombre?.toLowerCase().includes('venta');

    if (historyFilterType === 'entrada' && !isEntrada) return false;
    if (historyFilterType === 'salida' && !isSalida) return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchProd = m.producto_nombre?.toLowerCase().includes(q);
      const matchMotivo = m.motivo?.toLowerCase().includes(q);
      const matchUser = m.usuario_nombre?.toLowerCase().includes(q);
      if (!matchProd && !matchMotivo && !matchUser) return false;
    }

    return true;
  });

  // --- FILTRO DE PRODUCTOS PRINCIPAL ---
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

  const getTipoNombre = (tipoId: string) => {
    const t = tiposMov.find(item => String(item.id) === String(tipoId));
    return t ? t.nombre : '';
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Premium con Botón de Historial y Agregar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.brandingNox}>Nox<Text style={styles.brandingOS}>OS</Text></Text>
          <Text style={styles.subtitle}>CONTROL DE EXISTENCIAS & ALMACÉN</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.historyBtn} 
            onPress={() => openHistoryModal()}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={20} color={NoxColors.aura} />
            <Text style={styles.historyBtnText}>HISTORIAL</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={handleOpenNew}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={NoxColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Buscador y Filtro Horizontal de Categorías */}
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

      {/* 3. Lista de Productos en Grid Responsivo */}
      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={NoxColors.aura} />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : (
        <FlatList 
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          data={filteredProductos} 
          keyExtractor={it => String(it.id)} 
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => fetchData(true)} 
              tintColor={NoxColors.aura} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={NoxColors.muted} />
              <Text style={styles.emptyTitle}>No se encontraron productos</Text>
              <Text style={styles.emptySub}>Añade un nuevo producto o prueba cambiando los filtros</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, isDesktop && { maxWidth: '48.8%' }]}>
              <View style={styles.cardAccent} />
              
              {/* Imagen del Producto con Fallback seguro */}
              <View style={styles.cardIcon}>
                {item.imagen && !brokenImages[item.id] ? (
                  <Image 
                    source={{ uri: formatImageUrl(item.imagen) }} 
                    style={styles.cardImage}
                    onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                  />
                ) : (
                  <Ionicons name="cube-outline" size={26} color={NoxColors.aura} />
                )}
              </View>

              {/* Información del Producto */}
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.nombre}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.categoria_nombre || 'General'}</Text>
                  </View>
                  <Text style={[styles.stockText, item.stock_actual < 10 && { color: NoxColors.rose }]}>
                    STOCK: {item.stock_actual}
                  </Text>
                </View>
                <Text style={styles.cardPrice}>
                  ${parseFloat(item.precio || 0).toLocaleString()}
                </Text>
              </View>

              {/* Acciones: Entrada/Salida, Editar, Eliminar */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  onPress={() => handleOpenMov(item)} 
                  style={styles.iconBtnMov}
                >
                  <Ionicons name="swap-vertical" size={18} color={NoxColors.aura} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleEdit(item)} 
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil-outline" size={18} color={NoxColors.text} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setItemToDelete(item)} 
                  style={styles.iconBtnDanger}
                >
                  <Ionicons name="trash-outline" size={18} color={NoxColors.rose} />
                </TouchableOpacity>
              </View>
            </View>
          )} 
        />
      )}

      {/* ============================================================ */}
      {/* 4. MODAL MOVIMIENTO DE STOCK (SOLO ENTRADA Y SALIDA)          */}
      {/* ============================================================ */}
      <Modal visible={movModalOpen} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.glassCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>MOVIMIENTO DE STOCK</Text>
                  <Text style={styles.selectedProdName} numberOfLines={1}>{selectedProduct?.nombre}</Text>
                  <Text style={styles.stockInfoPill}>
                    Stock actual: <Text style={{ color: NoxColors.text, fontWeight: 'bold' }}>{selectedProduct?.stock_actual} unidades</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setMovModalOpen(false)}>
                  <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              {/* Selector Estricto: Entrada vs Salida */}
              <Text style={styles.label}>TIPO DE OPERACIÓN</Text>
              <View style={styles.row}>
                {tiposMov.map((t: any) => {
                  const isEntrada = t.nombre.toLowerCase().includes('entrada');
                  const isSelected = movForm.tipo_id === String(t.id);
                  return (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[
                        styles.chipMov, 
                        isSelected && (isEntrada ? styles.chipActiveEntrada : styles.chipActiveSalida)
                      ]} 
                      onPress={() => setMovForm({ ...movForm, tipo_id: String(t.id) })}
                    >
                      <Ionicons 
                        name={isEntrada ? "arrow-down-circle" : "arrow-up-circle"} 
                        size={18} 
                        color={isSelected ? NoxColors.text : (isEntrada ? NoxColors.emerald : NoxColors.rose)} 
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.chipTextMov, isSelected && { color: NoxColors.text }]}>
                        {isEntrada ? "ENTRADA (+)" : "SALIDA (-)"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CANTIDAD (UNIDADES)</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  placeholder="Ej: 12" 
                  placeholderTextColor={NoxColors.gray}
                  value={movForm.cantidad} 
                  onChangeText={t => setMovForm({ ...movForm, cantidad: t })} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>MOTIVO / OBSERVACIONES</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  placeholder="Ej: Compra proveedor / Merma por rotura..." 
                  placeholderTextColor={NoxColors.gray}
                  value={movForm.motivo} 
                  onChangeText={t => setMovForm({ ...movForm, motivo: t })} 
                />
              </View>

              <TouchableOpacity 
                style={[
                  styles.saveBtnMov, 
                  getTipoNombre(movForm.tipo_id).toLowerCase().includes('salida') && { backgroundColor: NoxColors.rose }
                ]} 
                onPress={handleSaveMov}
                disabled={isSavingMov}
              >
                {isSavingMov ? (
                  <ActivityIndicator color={NoxColors.text} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {getTipoNombre(movForm.tipo_id).toLowerCase().includes('salida') ? 'REGISTRAR SALIDA (-)' : 'REGISTRAR ENTRADA (+)'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Enlace rápido para ver el historial de este producto */}
              <TouchableOpacity 
                style={styles.viewProductHistoryBtn}
                onPress={() => {
                  setMovModalOpen(false);
                  openHistoryModal(selectedProduct?.id);
                }}
              >
                <Ionicons name="time-outline" size={16} color={NoxColors.aura} />
                <Text style={styles.viewProductHistoryText}>Ver historial de movimientos de este producto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* 5. MODAL FORMULARIO PRODUCTO (CREAR / EDITAR)                 */}
      {/* ============================================================ */}
      <Modal visible={modalOpen} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.glassCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editId ? 'EDITAR' : 'NUEVO'} PRODUCTO</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}>
                  <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Nombre */}
                <Text style={styles.label}>NOMBRE DEL PRODUCTO *</Text>
                <TextInput 
                  placeholder="Ej: Cerveza Corona 330ml, Ron Añejo..." 
                  placeholderTextColor={NoxColors.gray}
                  style={styles.input} 
                  value={form.nombre} 
                  onChangeText={t => setForm({ ...form, nombre: t })} 
                />

                {/* Selección de Categoría (Visual & Robusto) */}
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.label}>CATEGORÍA *</Text>
                  <TouchableOpacity 
                    onPress={() => setShowNewCategoryInput(!showNewCategoryInput)}
                    style={styles.addCategoryToggle}
                  >
                    <Ionicons name={showNewCategoryInput ? "close-circle" : "add-circle"} size={16} color={NoxColors.aura} />
                    <Text style={styles.addCategoryToggleText}>
                      {showNewCategoryInput ? "Cancelar" : "+ Nueva Categoría"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Input rápido para crear nueva categoría inline */}
                {showNewCategoryInput && (
                  <View style={styles.newCatBox}>
                    <TextInput 
                      style={styles.newCatInput}
                      placeholder="Nombre de la nueva categoría..."
                      placeholderTextColor={NoxColors.gray}
                      value={newCatName}
                      onChangeText={setNewCatName}
                    />
                    <TouchableOpacity 
                      style={styles.newCatSaveBtn} 
                      onPress={handleCreateCategory}
                      disabled={isCreatingCat}
                    >
                      {isCreatingCat ? (
                        <ActivityIndicator size="small" color={NoxColors.text} />
                      ) : (
                        <Text style={styles.newCatSaveBtnText}>CREAR</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Chips de categorías reales de la base de datos */}
                <View style={styles.categoryGrid}>
                  {dbCategorias.length === 0 ? (
                    <Text style={styles.noCategoriesHint}>No hay categorías disponibles. Crea una con el botón de arriba.</Text>
                  ) : (
                    dbCategorias.map((c: any) => {
                      const isSelected = form.categoria_id === String(c.id);
                      return (
                        <TouchableOpacity 
                          key={String(c.id)} 
                          style={[styles.categoryChip, isSelected && styles.categoryChipActive]} 
                          onPress={() => setForm({ ...form, categoria_id: String(c.id) })}
                        >
                          <Ionicons 
                            name={isSelected ? "checkmark-circle" : "radio-button-off"} 
                            size={16} 
                            color={isSelected ? NoxColors.text : NoxColors.muted} 
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                            {c.nombre || `Cat #${c.id}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Subida & Vista Previa de Imagen */}
                <Text style={[styles.label, { marginTop: 15 }]}>IMAGEN DEL PRODUCTO</Text>
                
                {form.imagen ? (
                  <View style={styles.imagePreviewBox}>
                    <Image source={{ uri: form.imagen }} style={styles.previewImage} />
                    <View style={styles.previewDetails}>
                      <Text style={styles.previewSuccessText}>Imagen cargada</Text>
                      <TouchableOpacity 
                        style={styles.changeImageBtn} 
                        onPress={pickImage} 
                        disabled={isUploadingImage}
                      >
                        <Ionicons name="camera" size={16} color={NoxColors.text} />
                        <Text style={styles.changeImageBtnText}>Cambiar foto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeImageBtn} 
                        onPress={() => setForm({ ...form, imagen: "" })}
                      >
                        <Ionicons name="trash-outline" size={16} color={NoxColors.rose} />
                        <Text style={styles.removeImageBtnText}>Quitar foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.imagePickerDashed}
                    onPress={pickImage}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <View style={{ alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator color={NoxColors.aura} size="large" />
                        <Text style={{ color: NoxColors.aura, fontSize: 12 }}>Subiendo fotografía a Cloudinary...</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Ionicons name="cloud-upload-outline" size={36} color={NoxColors.aura} />
                        <Text style={styles.imagePickerPrompt}>Tocar para subir imagen desde el dispositivo</Text>
                        <Text style={styles.imagePickerSubPrompt}>Formatos JPG o PNG (cuadrada recomendada)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Opción adicional: Pegar URL directa */}
                <View style={{ marginTop: 10, marginBottom: 15 }}>
                  <Text style={[styles.label, { fontSize: 8 }]}>O PEGAR URL DIRECTA DE IMAGEN</Text>
                  <TextInput 
                    placeholder="https://ejemplo.com/foto.jpg" 
                    placeholderTextColor={NoxColors.gray}
                    style={[styles.input, { paddingVertical: 12, fontSize: 13 }]} 
                    value={form.imagen} 
                    onChangeText={t => setForm({ ...form, imagen: t })} 
                  />
                </View>

                {/* Precio y Stock Inicial */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>PRECIO DE VENTA ($) *</Text>
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      placeholder="0"
                      placeholderTextColor={NoxColors.gray}
                      value={form.precio} 
                      onChangeText={t => setForm({ ...form, precio: t })} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>STOCK INICIAL *</Text>
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      placeholder="0"
                      placeholderTextColor={NoxColors.gray}
                      value={form.stock_actual} 
                      onChangeText={t => setForm({ ...form, stock_actual: t })} 
                    />
                  </View>
                </View>

                {/* Botón Guardar */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>
                    {editId ? 'ACTUALIZAR PRODUCTO' : 'GUARDAR EN CATÁLOGO'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* 6. MODAL CONFIRMACIÓN DE ELIMINACIÓN (WEB & MÓVIL)            */}
      {/* ============================================================ */}
      <Modal visible={!!itemToDelete} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalBg}>
          <View style={[styles.glassCard, { maxWidth: 440 }]}>
            <View style={styles.deleteIconBox}>
              <Ionicons name="trash" size={32} color={NoxColors.rose} />
            </View>

            <Text style={styles.deleteTitle}>¿ELIMINAR PRODUCTO?</Text>
            <Text style={styles.deleteMessage}>
              ¿Estás seguro de que deseas eliminar <Text style={{ color: NoxColors.text, fontWeight: 'bold' }}>"{itemToDelete?.nombre}"</Text>?
              {'\n\n'}
              Si el producto tiene ventas registradas, será retirado del catálogo activo preservando el historial contable.
            </Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setItemToDelete(null)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmDeleteBtn} 
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={NoxColors.text} size="small" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>SÍ, ELIMINAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 7. MODAL HISTORIAL COMPLETO DE ENTRADAS Y SALIDAS             */}
      {/* ============================================================ */}
      <Modal visible={historyModalOpen} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalBg}>
          <View style={[styles.glassCard, { maxWidth: 840, maxHeight: '90%', padding: 24 }]}>
            {/* Cabecera del Historial */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>HISTORIAL DE MOVIMIENTOS</Text>
                <Text style={styles.selectedProdName}>Registro de Entradas y Salidas de Almacén</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalOpen(false)}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Filtros de Historial: Tabs + Buscador */}
            <View style={styles.historyFiltersRow}>
              <View style={styles.historyTabs}>
                <TouchableOpacity 
                  style={[styles.historyTab, historyFilterType === 'todos' && styles.historyTabActive]}
                  onPress={() => setHistoryFilterType('todos')}
                >
                  <Text style={[styles.historyTabText, historyFilterType === 'todos' && styles.historyTabTextActive]}>TODOS</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.historyTab, historyFilterType === 'entrada' && styles.historyTabActiveEntrada]}
                  onPress={() => setHistoryFilterType('entrada')}
                >
                  <Text style={[styles.historyTabText, historyFilterType === 'entrada' && { color: NoxColors.emerald }]}>ENTRADAS (+)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.historyTab, historyFilterType === 'salida' && styles.historyTabActiveSalida]}
                  onPress={() => setHistoryFilterType('salida')}
                >
                  <Text style={[styles.historyTabText, historyFilterType === 'salida' && { color: NoxColors.rose }]}>SALIDAS (-)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.historySearchBar}>
                <Ionicons name="search" size={16} color={NoxColors.muted} />
                <TextInput 
                  style={styles.historySearchInput}
                  placeholder="Filtrar por producto o motivo..."
                  placeholderTextColor={NoxColors.muted}
                  value={historySearch}
                  onChangeText={setHistorySearch}
                />
                {historySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setHistorySearch("")}>
                    <Ionicons name="close-circle" size={16} color={NoxColors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Lista de Registros */}
            {isLoadingHistory ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color={NoxColors.aura} />
                <Text style={styles.loadingText}>Cargando registros de inventario...</Text>
              </View>
            ) : (
              <FlatList 
                data={filteredHistory}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={44} color={NoxColors.muted} />
                    <Text style={styles.emptyTitle}>No hay movimientos registrados</Text>
                    <Text style={styles.emptySub}>Las entradas y salidas que realices aparecerán aquí con su fecha y responsable</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isEntrada = item.tipo_nombre?.toLowerCase().includes('entrada');
                  const fechaStr = item.fecha ? new Date(item.fecha).toLocaleString() : 'Fecha no registrada';

                  return (
                    <View style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View style={[styles.historyBadge, isEntrada ? styles.historyBadgeEntrada : styles.historyBadgeSalida]}>
                          <Ionicons 
                            name={isEntrada ? "arrow-down-circle" : "arrow-up-circle"} 
                            size={16} 
                            color={isEntrada ? NoxColors.emerald : NoxColors.rose} 
                          />
                          <Text style={[styles.historyBadgeText, isEntrada ? { color: NoxColors.emerald } : { color: NoxColors.rose }]}>
                            {isEntrada ? `ENTRADA: +${item.cantidad}` : `SALIDA: -${item.cantidad}`} UDS
                          </Text>
                        </View>

                        <Text style={styles.historyDate}>{fechaStr}</Text>
                      </View>

                      <Text style={styles.historyProdTitle}>{item.producto_nombre || `Producto #${item.producto_id}`}</Text>

                      <View style={styles.historyMetaRow}>
                        <Text style={styles.historyMotivo} numberOfLines={2}>
                          <Text style={{ color: NoxColors.muted }}>Motivo: </Text>
                          {item.motivo || 'Sin observaciones especificadas'}
                        </Text>
                        <Text style={styles.historyUser}>
                          <Ionicons name="person-circle-outline" size={14} color={NoxColors.subtext} /> {item.usuario_nombre || 'Admin'}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitleContainer: { gap: 4 },
  brandingNox: { fontSize: 32, fontWeight: '900', color: NoxColors.text, letterSpacing: -1 },
  brandingOS: { color: NoxColors.aura },
  subtitle: { fontSize: 10, color: NoxColors.muted, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase' },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(169, 68, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  historyBtnText: { color: NoxColors.aura, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  addBtn: {
    backgroundColor: NoxColors.aura,
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NoxColors.aura,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },

  searchSection: { marginBottom: 8, maxWidth: 1200, width: '100%', alignSelf: 'center' },
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
    borderColor: NoxColors.border,
  },
  searchInput: { flex: 1, marginLeft: 10, color: NoxColors.text, fontSize: 14 },
  catScroll: { marginBottom: 10, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  catBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: NoxColors.container,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catBtnActive: { backgroundColor: NoxColors.aura, borderColor: 'rgba(255,255,255,0.2)' },
  catText: { fontSize: 11, fontWeight: 'bold', color: NoxColors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  catTextActive: { color: NoxColors.text },

  loadingWrapper: { marginTop: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: NoxColors.muted, fontSize: 13, letterSpacing: 1 },

  listContent: { padding: 20, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  columnWrapper: { gap: 16 },
  card: {
    flex: 1,
    backgroundColor: NoxColors.card,
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  cardAccent: { position: 'absolute', left: 0, top: 25, bottom: 25, width: 4, backgroundColor: NoxColors.aura, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  cardIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.03)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  cardMain: { flex: 1, marginHorizontal: 14 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: NoxColors.text, marginBottom: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: 'rgba(169, 68, 255, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { color: NoxColors.aura, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  stockText: { color: NoxColors.emerald, fontSize: 10, fontWeight: 'bold' },
  cardPrice: { color: NoxColors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },

  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: NoxColors.container, justifyContent: 'center', alignItems: 'center' },
  iconBtnMov: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(169, 68, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(169, 68, 255, 0.2)' },
  iconBtnDanger: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: NoxColors.text, fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: NoxColors.muted, fontSize: 12, textAlign: 'center', maxWidth: 300 },

  // --- MODAL BASE ---
  modalBg: { flex: 1, backgroundColor: 'rgba(5, 5, 16, 0.95)', justifyContent: 'center', padding: 20 },
  glassCard: {
    backgroundColor: NoxColors.card,
    borderRadius: 32,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.2)',
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { color: NoxColors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  selectedProdName: { color: NoxColors.aura, fontSize: 13, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  stockInfoPill: { color: NoxColors.muted, fontSize: 12, marginTop: 4 },

  label: { fontSize: 10, fontWeight: '900', color: NoxColors.muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 16 },
  input: {
    backgroundColor: NoxColors.container,
    color: NoxColors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },

  // --- MOVIMIENTOS STYLES ---
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  chipMov: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: NoxColors.container,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  chipActiveEntrada: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: NoxColors.emerald },
  chipActiveSalida: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: NoxColors.rose },
  chipTextMov: { fontSize: 12, fontWeight: '900', color: NoxColors.muted, letterSpacing: 1 },
  saveBtnMov: {
    backgroundColor: NoxColors.emerald,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  viewProductHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  viewProductHistoryText: { color: NoxColors.aura, fontSize: 12, fontWeight: 'bold' },

  // --- CATEGORÍAS FORMULARIO ---
  categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  addCategoryToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addCategoryToggleText: { color: NoxColors.aura, fontSize: 11, fontWeight: 'bold' },
  newCatBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    backgroundColor: NoxColors.container,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.3)',
  },
  newCatInput: { flex: 1, color: NoxColors.text, paddingHorizontal: 10, fontSize: 13 },
  newCatSaveBtn: { backgroundColor: NoxColors.aura, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: 'center' },
  newCatSaveBtnText: { color: NoxColors.text, fontWeight: '900', fontSize: 11 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: NoxColors.container,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  categoryChipActive: { backgroundColor: NoxColors.aura, borderColor: 'rgba(255,255,255,0.3)' },
  categoryChipText: { fontSize: 12, fontWeight: 'bold', color: NoxColors.muted },
  categoryChipTextActive: { color: NoxColors.text },
  noCategoriesHint: { color: NoxColors.muted, fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },

  // --- IMAGEN FORMULARIO ---
  imagePickerDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(169, 68, 255, 0.3)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(169, 68, 255, 0.03)',
  },
  imagePickerPrompt: { color: NoxColors.text, fontSize: 13, fontWeight: 'bold', marginTop: 8 },
  imagePickerSubPrompt: { color: NoxColors.muted, fontSize: 10, marginTop: 4 },
  imagePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: NoxColors.container,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NoxColors.border,
  },
  previewImage: { width: 90, height: 90, borderRadius: 14, resizeMode: 'cover' },
  previewDetails: { flex: 1, gap: 8 },
  previewSuccessText: { color: NoxColors.emerald, fontSize: 12, fontWeight: 'bold' },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NoxColors.aura,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  changeImageBtnText: { color: NoxColors.text, fontSize: 11, fontWeight: 'bold' },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  removeImageBtnText: { color: NoxColors.rose, fontSize: 11, fontWeight: 'bold' },

  formRow: { flexDirection: 'row', marginBottom: 20 },
  saveBtn: { backgroundColor: NoxColors.emerald, paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },

  // --- MODAL ELIMINACIÓN ---
  deleteIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteTitle: { color: NoxColors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  deleteMessage: { color: NoxColors.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  deleteActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: NoxColors.container, alignItems: 'center' },
  cancelBtnText: { color: NoxColors.subtext, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: NoxColors.rose, alignItems: 'center' },
  confirmDeleteBtnText: { color: NoxColors.text, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

  // --- MODAL HISTORIAL ---
  historyFiltersRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  historyTabs: { flexDirection: 'row', backgroundColor: NoxColors.container, borderRadius: 14, padding: 3 },
  historyTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11 },
  historyTabActive: { backgroundColor: NoxColors.aura },
  historyTabActiveEntrada: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  historyTabActiveSalida: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  historyTabText: { fontSize: 10, fontWeight: '900', color: NoxColors.muted, letterSpacing: 1 },
  historyTabTextActive: { color: NoxColors.text },
  historySearchBar: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoxColors.container,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 38,
  },
  historySearchInput: { flex: 1, color: NoxColors.text, fontSize: 12, marginLeft: 8 },

  historyCard: {
    backgroundColor: NoxColors.container,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  historyBadgeEntrada: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  historyBadgeSalida: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  historyBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  historyDate: { color: NoxColors.muted, fontSize: 11 },
  historyProdTitle: { color: NoxColors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  historyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyMotivo: { color: NoxColors.subtext, fontSize: 11, flex: 1, marginRight: 10 },
  historyUser: { color: NoxColors.muted, fontSize: 11 },
});
