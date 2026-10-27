import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import apiClient from '../utils/apiClient';
import { NoxColors } from '../constants/theme';

export interface TicketItem {
  producto_nombre?: string;
  nombre?: string;
  cantidad: number;
  precio_unitario?: number;
  precio?: number;
  producto_precio?: number;
  producto?: {
    id?: number;
    nombre?: string;
    precio?: number;
  };
}

interface TicketModalProps {
  visible: boolean;
  onClose: () => void;
  mesaNumero?: number | string;
  pedidoId?: number | string;
  meseraNombre?: string;
  productos: TicketItem[];
  total?: number;
  tituloTicket?: string; // "PRE-CUENTA DE MESA" | "TICKET DE CONSUMO" | "RECIBO DE CAJA" | "COMANDA DE BARRA"
}

export default function TicketModal({
  visible,
  onClose,
  mesaNumero = 'Barra',
  pedidoId,
  meseraNombre,
  productos = [],
  total,
  tituloTicket = 'PRE-CUENTA DE MESA'
}: TicketModalProps) {
  const [empresa, setEmpresa] = useState<any>({
    nombre: 'Mandala Disco Club',
    nit: '901.482.391-4',
    direccion: 'Calle 7 # 14-22, Melgar, Tolima',
    telefono: '+57 312 456 7890',
    mensaje_footer: '¡Gracias por su visita a Mandala! Síguenos en @mandala_melgar',
    moneda: '$',
    impuesto_porcentaje: 0
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [incluirPropina, setIncluirPropina] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchEmpresaConfig();
    }
  }, [visible]);

  const fetchEmpresaConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await apiClient.get('/config/');
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      if (data && data.nombre) {
        setEmpresa(data);
      }
    } catch (e) {
      console.warn('Usando configuración predeterminada de marca:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Cálculos matemáticos ultra-robustos ante cualquier estructura de producto
  const subtotalCalculado = (productos || []).reduce((acc, p) => {
    const pr = parseFloat(String(p.precio || p.precio_unitario || p.producto_precio || p.producto?.precio || 0));
    const cant = parseInt(String(p.cantidad || 1), 10);
    return acc + (pr * cant);
  }, 0);

  const subtotalFinal = total !== undefined && total > 0 ? total : subtotalCalculado;
  const propinaSugerida = Math.round(subtotalFinal * 0.10);
  const impuestoMonto = empresa.impuesto_porcentaje > 0 
    ? Math.round(subtotalFinal * (parseFloat(empresa.impuesto_porcentaje) / 100)) 
    : 0;

  const granTotal = subtotalFinal + (incluirPropina ? propinaSugerida : 0) + impuestoMonto;

  const now = new Date();
  const fechaActual = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // Generador de texto plano para compartir / WhatsApp / RawBT
  const generateReceiptText = () => {
    const sep = "------------------------------------------\n";
    let t = `*${(empresa.nombre || 'MANDALA DISCO CLUB').toUpperCase()}*\n`;
    if (empresa.nit) t += `NIT: ${empresa.nit}\n`;
    if (empresa.direccion) t += `${empresa.direccion}\n`;
    if (empresa.telefono) t += `Tel: ${empresa.telefono}\n`;
    t += sep;
    t += `*${tituloTicket}*\n`;
    if (pedidoId) t += `ORDEN: #${pedidoId}  `;
    t += `MESA: #${mesaNumero}\n`;
    t += `FECHA: ${fechaActual}  HORA: ${horaActual}\n`;
    if (meseraNombre) t += `ATENDIDO POR: ${meseraNombre}\n`;
    t += sep;
    t += `CANT  DESCRIPCIÓN             TOTAL\n`;
    t += sep;

    (productos || []).forEach((item) => {
      const cant = String(item.cantidad || 1).padEnd(4, ' ');
      const rawName = (item.producto_nombre || item.nombre || item.producto?.nombre || 'Producto');
      const nom = rawName.substring(0, 18).padEnd(18, ' ');
      const pUnit = parseFloat(String(item.precio || item.precio_unitario || item.producto_precio || item.producto?.precio || 0));
      const totItem = `$${(pUnit * (item.cantidad || 1)).toLocaleString()}`;
      t += `${cant}  ${nom} ${totItem}\n`;
    });

    t += sep;
    t += `SUBTOTAL:                 $${subtotalFinal.toLocaleString()}\n`;
    if (impuestoMonto > 0) {
      t += `IMPOCONSUMO / IVA:        $${impuestoMonto.toLocaleString()}\n`;
    }
    if (incluirPropina) {
      t += `PROPINA SUGERIDA (10%):   $${propinaSugerida.toLocaleString()}\n`;
    }
    t += `*TOTAL A PAGAR:            $${granTotal.toLocaleString()}*\n`;
    t += sep;
    t += `MEDIOS DE PAGO: Efectivo, Nequi, Daviplata, Tarjeta\n\n`;
    if (empresa.mensaje_footer) {
      t += `${empresa.mensaje_footer}\n`;
    }
    t += `Software POS operado por NoxOS\n`;
    return t;
  };

  const handleShare = async () => {
    try {
      const text = generateReceiptText();
      await Share.share({
        title: `Ticket Mesa #${mesaNumero} - ${empresa.nombre}`,
        message: text
      });
    } catch (error) {
      console.error('Error compartiendo ticket:', error);
    }
  };

  const generateTicketHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <meta charset="utf-8">
          <title>Ticket Mesa ${mesaNumero}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              line-height: 1.35;
              margin: 0;
              padding: 14px 10px;
              width: 72mm;
              color: #000000;
              background: #FFFFFF;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
            .total-row { font-size: 16px; font-weight: 900; margin: 8px 0; border-top: 2px solid #000; padding-top: 6px; }
            .footer { font-size: 11px; text-align: center; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="center bold title">${(empresa.nombre || 'MANDALA DISCO CLUB').toUpperCase()}</div>
          ${empresa.nit ? `<div class="center">NIT: ${empresa.nit}</div>` : ''}
          ${empresa.direccion ? `<div class="center">${empresa.direccion}</div>` : ''}
          ${empresa.telefono ? `<div class="center">Tel: ${empresa.telefono}</div>` : ''}
          
          <div class="divider"></div>
          <div class="center bold">${tituloTicket}</div>
          <div class="row">
            <span>MESA: #${mesaNumero}</span>
            ${pedidoId ? `<span>ORDEN: #${pedidoId}</span>` : ''}
          </div>
          <div class="row">
            <span>FECHA: ${fechaActual}</span>
            <span>HORA: ${horaActual}</span>
          </div>
          ${meseraNombre ? `<div class="row"><span>ATENDIÓ: ${meseraNombre}</span></div>` : ''}
          
          <div class="divider"></div>
          <div class="row bold">
            <span style="width: 15%">CANT</span>
            <span style="width: 55%">PRODUCTO</span>
            <span style="width: 30%; text-align: right">TOTAL</span>
          </div>
          <div class="divider"></div>

          ${(productos || []).map(p => {
            const pr = parseFloat(String(p.precio || p.precio_unitario || p.producto_precio || p.producto?.precio || 0));
            const cant = parseInt(String(p.cantidad || 1), 10);
            const nom = p.producto_nombre || p.nombre || p.producto?.nombre || 'Producto';
            return `
              <div class="row">
                <span style="width: 15%">${cant}x</span>
                <span style="width: 55%">${nom}</span>
                <span style="width: 30%; text-align: right">$${(pr * cant).toLocaleString()}</span>
              </div>
            `;
          }).join('')}

          <div class="divider"></div>
          <div class="row">
            <span>SUBTOTAL:</span>
            <span>$${subtotalFinal.toLocaleString()}</span>
          </div>
          ${impuestoMonto > 0 ? `
            <div class="row">
              <span>IMPOCONSUMO / IVA:</span>
              <span>$${impuestoMonto.toLocaleString()}</span>
            </div>
          ` : ''}
          ${incluirPropina ? `
            <div class="row">
              <span>PROPINA (10%):</span>
              <span>$${propinaSugerida.toLocaleString()}</span>
            </div>
          ` : ''}

          <div class="row total-row">
            <span>TOTAL A PAGAR:</span>
            <span>$${granTotal.toLocaleString()}</span>
          </div>

          <div class="divider"></div>
          <div class="footer">
            <div>PAGOS: Efectivo, Nequi, Daviplata, Tarjeta</div>
            ${empresa.mensaje_footer ? `<div style="margin-top: 6px;">${empresa.mensaje_footer}</div>` : ''}
            <div style="margin-top: 4px; font-size: 9px; color: #555;">Software POS operado por NoxOS</div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateTicketHtml();
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank', 'width=400,height=650');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = function() {
            printWindow.print();
            setTimeout(() => { printWindow.close(); }, 500);
          };
        } else {
          window.print();
        }
      } else {
        // En iOS / Android (Expo Go) abre la cola nativa de impresión
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.warn('Fallo en impresión directa, abriendo diálogo alternativo:', error);
      handleShare();
    }
  };

  const screenH = Dimensions.get('window').height;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { height: Platform.OS === 'web' ? '90%' : Math.min(screenH * 0.88, 720) }]}>
          {/* Header Superior del Modal */}
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="receipt-outline" size={20} color={NoxColors.aura} />
              <Text style={styles.topBarTitle}>Ticket Térmico POS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Opciones Rápidas: Alternar Propina Sugerida */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.propinaToggle, incluirPropina && styles.propinaToggleActive]}
              onPress={() => setIncluirPropina(!incluirPropina)}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={incluirPropina ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={incluirPropina ? "#fff" : NoxColors.muted} 
              />
              <Text style={[styles.propinaText, incluirPropina && styles.propinaTextActive]}>
                Incluir Propina Voluntaria (+10%: ${propinaSugerida.toLocaleString()})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vista Previa de la Tirilla Térmica de Papel */}
          <ScrollView
            style={styles.receiptScroll}
            contentContainerStyle={styles.receiptScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.thermalPaper}>
              {/* Borde Superior Perforado */}
              <View style={styles.perforationLine} />

              {loadingConfig && (
                <ActivityIndicator size="small" color="#000" style={{ marginVertical: 8 }} />
              )}

              {/* Cabecera de Marca */}
              <Text style={styles.receiptBrandName}>{(empresa.nombre || 'MANDALA DISCO CLUB').toUpperCase()}</Text>
              {empresa.nit ? <Text style={styles.receiptMeta}>NIT: {empresa.nit}</Text> : null}
              {empresa.direccion ? <Text style={styles.receiptMeta}>{empresa.direccion}</Text> : null}
              {empresa.telefono ? <Text style={styles.receiptMeta}>Tel: {empresa.telefono}</Text> : null}

              <View style={styles.dashedDivider} />

              {/* Tipo y Metadatos de la Mesa */}
              <Text style={styles.receiptTicketType}>{tituloTicket}</Text>
              
              <View style={styles.receiptRow}>
                <Text style={styles.receiptBold}>MESA: #{mesaNumero}</Text>
                {pedidoId ? <Text style={styles.receiptBold}>ORDEN #{pedidoId}</Text> : null}
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptMono}>FECHA: {fechaActual}</Text>
                <Text style={styles.receiptMono}>{horaActual}</Text>
              </View>

              {meseraNombre ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMono}>ATENDIÓ: {meseraNombre}</Text>
                </View>
              ) : null}

              <View style={styles.dashedDivider} />

              {/* Encabezado de Columnas */}
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptBold, { width: '15%' }]}>CANT</Text>
                <Text style={[styles.receiptBold, { width: '55%' }]}>DESCRIPCIÓN</Text>
                <Text style={[styles.receiptBold, { width: '30%', textAlign: 'right' }]}>TOTAL</Text>
              </View>
              
              <View style={styles.dashedDivider} />

              {/* Lista de Productos */}
              {(!productos || productos.length === 0) ? (
                <Text style={[styles.receiptMono, { textAlign: 'center', marginVertical: 12, color: '#666' }]}>
                  Sin productos registrados
                </Text>
              ) : (
                productos.map((item, idx) => {
                  const pr = parseFloat(String(item.precio || item.precio_unitario || item.producto_precio || item.producto?.precio || 0));
                  const cant = parseInt(String(item.cantidad || 1), 10);
                  const subItem = pr * cant;
                  const nombreItem = item.producto_nombre || item.nombre || item.producto?.nombre || 'Producto';
                  return (
                    <View key={idx} style={styles.receiptItemRow}>
                      <Text style={[styles.receiptMono, { width: '15%' }]}>{cant}x</Text>
                      <Text style={[styles.receiptMono, { width: '55%' }]} numberOfLines={2}>{nombreItem}</Text>
                      <Text style={[styles.receiptMono, { width: '30%', textAlign: 'right' }]}>${subItem.toLocaleString()}</Text>
                    </View>
                  );
                })
              )}

              <View style={styles.dashedDivider} />

              {/* Resumen Monetario */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMono}>SUBTOTAL:</Text>
                <Text style={styles.receiptMono}>${subtotalFinal.toLocaleString()}</Text>
              </View>

              {impuestoMonto > 0 ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMono}>IMPOCONSUMO / IVA:</Text>
                  <Text style={styles.receiptMono}>${impuestoMonto.toLocaleString()}</Text>
                </View>
              ) : null}

              {incluirPropina ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptMono}>PROPINA SUGERIDA (10%):</Text>
                  <Text style={styles.receiptMono}>${propinaSugerida.toLocaleString()}</Text>
                </View>
              ) : null}

              <View style={styles.doubleDivider} />

              <View style={styles.receiptRowTotal}>
                <Text style={styles.receiptTotalLabel}>TOTAL A PAGAR:</Text>
                <Text style={styles.receiptTotalVal}>${granTotal.toLocaleString()}</Text>
              </View>

              <View style={styles.doubleDivider} />

              {/* Pie de Página del Ticket */}
              <Text style={styles.receiptFooterMethods}>MEDIOS DE PAGO: Efectivo, Nequi, Daviplata, Tarjeta</Text>
              
              {empresa.mensaje_footer ? (
                <Text style={styles.receiptFooterCustom}>{empresa.mensaje_footer}</Text>
              ) : (
                <Text style={styles.receiptFooterCustom}>¡Gracias por su visita a Mandala!</Text>
              )}

              <Text style={styles.receiptWatermark}>Software POS operado por NoxOS</Text>

              {/* Borde Inferior Perforado */}
              <View style={styles.perforationLine} />
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint} activeOpacity={0.8}>
              <Ionicons name="print-outline" size={18} color="#fff" />
              <Text style={styles.printBtnText}>IMPRIMIR TICKET</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.shareBtnText}>COMPARTIR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0A0818',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: 'rgba(169, 68, 255, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F0D24',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  propinaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  propinaToggleActive: {
    backgroundColor: 'rgba(169, 68, 255, 0.25)',
    borderColor: NoxColors.aura,
  },
  propinaText: {
    color: NoxColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  propinaTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  receiptScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: '#06050F',
  },
  receiptScrollContent: {
    padding: 16,
    alignItems: 'center',
    flexGrow: 1,
  },
  thermalPaper: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  perforationLine: {
    width: '100%',
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  dashedDivider: {
    width: '100%',
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  doubleDivider: {
    width: '100%',
    height: 2,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    marginVertical: 8,
  },
  receiptBrandName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  receiptMeta: {
    color: '#333333',
    fontSize: 10.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 14,
  },
  receiptTicketType: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4,
    letterSpacing: 0.5,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  receiptBold: {
    color: '#000000',
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptMono: {
    color: '#111111',
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 14,
  },
  receiptRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptTotalLabel: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptTotalVal: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptFooterMethods: {
    color: '#333333',
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptFooterCustom: {
    color: '#111111',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptWatermark: {
    color: '#666666',
    fontSize: 8.5,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#0F0D24',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NoxColors.aura,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: NoxColors.aura,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 13,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
