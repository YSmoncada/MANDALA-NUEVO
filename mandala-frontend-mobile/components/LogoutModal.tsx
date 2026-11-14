import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxColors } from '../constants/theme';


interface LogoutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut?: boolean;
  userName?: string;
}

export default function LogoutModal({ visible, onConfirm, onCancel, isLoggingOut = false }: LogoutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="log-out-outline" size={40} color={NoxColors.rose} />
          </View>
          
          <Text style={styles.title}>CERRAR SESIÓN</Text>
          <Text style={styles.message}>¿Estás seguro de que deseas salir del sistema?</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onCancel}
              disabled={isLoggingOut}
            >
              <Text style={styles.cancelText}>CANCELAR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={onConfirm}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={NoxColors.text} size="small" />
              ) : (
                <Text style={styles.confirmText}>SALIR</Text>
              )}
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: NoxColors.card,
    width: '100%',
    maxWidth: 380,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    shadowColor: NoxColors.rose,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: NoxColors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  message: {
    color: NoxColors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: NoxColors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: NoxColors.text,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: NoxColors.rose,
    alignItems: 'center',
    shadowColor: NoxColors.rose,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  confirmText: {
    color: NoxColors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
