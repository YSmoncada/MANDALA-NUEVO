import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, getDashboardRoute } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import apiClient from "../../utils/apiClient";
import { NoxColors } from '../../constants/theme';


export default function LoginScreen() {
  const setAuth = useAuthStore(state => state.setAuth);
  const showAlert = useAlertStore(state => state.showAlert);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert("Acceso Requerido", "Por favor ingresa tu usuario y clave de seguridad.", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/login/", {
        username: username.trim(),
        password: password
      });

      const { token, refresh, role, username: responseUsername, user_id } = response.data;

      if (!token) {
        throw new Error("No se recibió el token de seguridad.");
      }

      // Guardar en el Store (Zustand se encarga del almacenamiento persistente)
      setAuth(token, refresh || '', {
        id: String(user_id || ''),
        username: responseUsername || username,
        role: role || 'usuario'
      });

      // Redirección inmediata según el rol
      const dashboardRoute = getDashboardRoute(role);
      router.replace(dashboardRoute as any);

    } catch (error: any) {
      // El error de red o credenciales incorrectas ya es manejado por el interceptor de apiClient
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Identidad de Marca de NoxOS */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Nox<Text style={styles.logoAltText}>OS</Text></Text>
              <View style={styles.logoLine} />
            </View>

          </View>

          {/* Campos del Formulario */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usuario</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={NoxColors.muted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Nombre de usuario"
                  placeholderTextColor="#8A7BAF50"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clave de Seguridad</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={NoxColors.muted} style={styles.inputIcon} />
                <TextInput
                  placeholder="••••••••••••"
                  placeholderTextColor="#8A7BAF50"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={NoxColors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, (!username || !password) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !username || !password}
            >
              {loading ? (
                <ActivityIndicator color={NoxColors.text} />
              ) : (
                <Text style={styles.btnText}>ACCEDER AL SISTEMA</Text>
              )}
            </TouchableOpacity>


          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NoxColors.deep },
  card: {
    backgroundColor: NoxColors.container,
    marginHorizontal: 20,
    borderRadius: 40,
    padding: 35,
    borderWidth: 1,
    borderColor: NoxColors.border,
    shadowColor: NoxColors.deep,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10
  },
  header: { alignItems: 'center', marginBottom: 45 },
  logoContainer: { alignItems: 'center', marginBottom: 10 },
  logoText: { fontSize: 48, fontWeight: '900', color: NoxColors.text, letterSpacing: 5 },
  logoAltText: { color: NoxColors.subtext },
  logoLine: { width: 60, height: 4, backgroundColor: NoxColors.aura, borderRadius: 2, marginTop: -5, opacity: 0.5 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 10, color: NoxColors.muted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, marginLeft: 5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoxColors.card,
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(108, 63, 168, 0.3)'
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 18, fontSize: 14, color: NoxColors.text, fontWeight: '600' },
  eyeBtn: { padding: 10 },

  btn: {
    backgroundColor: '#441E73',
    padding: 22,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: NoxColors.aura,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: NoxColors.text, fontWeight: '900', letterSpacing: 3, fontSize: 11 }
});
