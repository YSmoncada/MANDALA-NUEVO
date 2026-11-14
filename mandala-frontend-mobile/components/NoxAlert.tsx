import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxColors } from '../constants/theme';

interface NoxAlertProps {
  visible: boolean;
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function NoxAlert({ 
  visible, 
  type = 'info', 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'ACEPTAR',
  cancelText = 'CANCELAR'
}: NoxAlertProps) {

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle-outline' as const,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
          btnBg: '#10B981',
          textColor: '#000000'
        };
      case 'error':
        return {
          name: 'close-circle-outline' as const,
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.12)',
          btnBg: '#EF4444',
          textColor: '#FFFFFF'
        };
      case 'warning':
        return {
          name: 'warning-outline' as const,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
          btnBg: '#F59E0B',
          textColor: '#000000'
        };
      default:
        return {
          name: 'information-circle-outline' as const,
          color: '#00E5FF',
          bg: 'rgba(0, 229, 255, 0.12)',
          btnBg: '#00E5FF',
          textColor: '#000000'
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg, borderColor: `${iconConfig.color}30` }]}>
            <Ionicons name={iconConfig.name} size={28} color={iconConfig.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            {onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: iconConfig.btnBg }]} 
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { color: iconConfig.textColor }]}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#0E0E12',
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  message: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#16161E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  cancelText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  confirmText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
