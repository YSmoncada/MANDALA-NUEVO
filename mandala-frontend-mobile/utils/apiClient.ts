import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';

// Detección automática y robusta del backend para Local y Producción (Render)
const getBaseApiUrl = (): string => {
  const envUrl = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;
  if (envUrl && envUrl.trim().length > 0) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    return 'https://mandala-backend-n3n6.onrender.com/api';
  }

  return 'https://mandala-backend-n3n6.onrender.com/api';
};

export const API_URL = getBaseApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { showAlert } = useAlertStore.getState();

    // Manejo de expiración de token (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // No reintentar si es login o si ya falló un reintento anterior
      if (originalRequest.url.includes('/login') || originalRequest.url.includes('/token/refresh/')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          // Intentar obtener un nuevo access token
          const response = await axios.post(`${API_URL}/token/refresh/`, { 
            refresh: refreshToken 
          });
          
          const { token: access } = response.data;
          
          // Actualizar el store
          useAuthStore.getState().updateToken(access);
          
          // Reintentar la petición original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
          
        } catch (refreshError) {
          // Si el refresh token también falló, cerramos sesión
          useAuthStore.getState().clearAuth();
          showAlert("Sesión Expirada", "Tu sesión ha expirado. Por favor ingresa de nuevo.", "warning");
          return Promise.reject(refreshError);
        }
      }
    }

    // Manejo de otros errores
    if (!error.response) {
      showAlert("Error de Conexión", "No se pudo contactar al servidor. Verifica tu internet.", "error");
    } else {
      const { status, data } = error.response;
      let message = data?.detail || data?.message || "Ocurrió un error inesperado";
      
      // Si el mensaje es un objeto o array (como errores de validación de FastAPI)
      // lo convertimos a string para evitar que React explote
      if (typeof message === 'object') {
        if (Array.isArray(message)) {
          // Extraer el primer mensaje de error legible si es un array de Pydantic
          message = message[0]?.msg || JSON.stringify(message);
        } else {
          message = JSON.stringify(message);
        }
      }
      
      if (status === 401) {
        if (originalRequest.url.includes('/login')) {
          showAlert("Acceso Denegado", "El usuario o la clave no coinciden.", "error");
        } else {
          showAlert("Sesión Expirada", "Vuelve a iniciar sesión.", "warning");
        }
      } else if (status === 400 && message === "Usuario inactivo") {
        showAlert("Acceso Restringido", "Tu cuenta ha sido desactivada. Contacta con el administrador.", "error");
      } else {
        showAlert(`Error ${status}`, message, "error");
      }
    }
    console.log("API ERROR:", error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default apiClient;
