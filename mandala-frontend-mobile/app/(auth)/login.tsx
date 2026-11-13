import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, getDashboardRoute } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import apiClient from '../../utils/apiClient';
import RollsRoyceStars from '../../components/RollsRoyceStars';

export default function LoginScreen() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const showAlert = useAlertStore((state) => state.showAlert);
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Acceso Requerido', 'Por favor ingresa tu usuario y clave de seguridad.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/login/', {
        username: username.trim(),
        password: password,
      });

      const { token, refresh, role, username: responseUsername, user_id } = response.data;

      if (!token) {
        throw new Error('No se recibió el token de seguridad.');
      }

      setAuth(token, refresh || '', {
        id: String(user_id || ''),
        username: responseUsername || username,
        role: role || 'usuario',
      });

      const dashboardRoute = getDashboardRoute(role);
      router.replace(dashboardRoute as any);
    } catch (error: any) {
      // Manejado automáticamente por el interceptor de apiClient
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Fondo Techo Rolls-Royce Starlight */}
      <RollsRoyceStars />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo y Encabezado Superior */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Text style={styles.logoNox}>NOX</Text>
              <Text style={styles.logoOs}>OS</Text>
            </View>
            <View style={styles.glowLine} />
            <Text style={styles.subtitle}>SISTEMA DE GESTIÓN PREMIUM</Text>
          </View>

          {/* Tarjeta Central Oscura */}
          <View style={styles.card}>
            {/* Campo: Usuario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>USUARIO</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={17}
                  color="#52525B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="NOMBRE DE USUARIO"
                  placeholderTextColor="#3F3F46"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Campo: Clave de Seguridad */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CLAVE DE SEGURIDAD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color="#52525B"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="••••••••••••"
                  placeholderTextColor="#3F3F46"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#52525B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Opción: Recordar Sesión */}
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.circleCheckbox, rememberMe && styles.circleCheckboxActive]}>
                {rememberMe && <View style={styles.circleInnerDot} />}
              </View>
              <Text style={styles.rememberText}>RECORDAR SESIÓN</Text>
            </TouchableOpacity>

            {/* Botón Principal Blanco Sólido */}
            <TouchableOpacity
              style={[
                styles.btnSubmit,
                (!username || !password) && styles.btnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || !username || !password}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.btnSubmitText}>ACCEDER AL SISTEMA</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pie de Página de Seguridad */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>ACCESO RESTRINGIDO — PERSONAL AUTORIZADO</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoNox: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  logoOs: {
    fontSize: 42,
    fontWeight: '900',
    color: '#71717A',
    letterSpacing: 6,
  },
  glowLine: {
    width: 70,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1,
    marginTop: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#0E0E11',
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.9,
    shadowRadius: 36,
    elevation: 16,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070709',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
  eyeBtn: {
    padding: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 26,
    marginLeft: 2,
  },
  circleCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  circleCheckboxActive: {
    borderColor: '#A1A1AA',
  },
  circleInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E4E7',
  },
  rememberText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  btnSubmit: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnSubmitText: {
    color: '#000000',
    fontWeight: '900',
    letterSpacing: 2.5,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerText: {
    color: '#3F3F46',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
});
