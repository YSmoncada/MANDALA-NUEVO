import { API_URL } from './apiClient';

// Remove '/api' from API_URL to get base URL (e.g., http://192.168.18.11:8000)
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Formats a partial image path into a full URL.
 * Handles cases where the path already includes the base URL, 'http', 'https', 'data:', 'blob:', 'file://', or 'content://'.
 */
export const formatImageUrl = (path: string | null | undefined): string => {
  if (!path || typeof path !== 'string') return '';
  
  const trimmed = path.trim();
  if (!trimmed) return '';

  // If it's already a full URL or a base64/blob data URI or mobile file URI, return it directly
  if (
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') || 
    trimmed.startsWith('data:') || 
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://')
  ) {
    return trimmed;
  }
  
  // Clean the path
  let cleanPath = trimmed;
  
  // If it doesn't start with /media/, prepend it
  if (!cleanPath.startsWith('media/') && !cleanPath.startsWith('/media/')) {
    cleanPath = cleanPath.startsWith('/') ? `/media${cleanPath}` : `/media/${cleanPath}`;
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }
  
  return `${BASE_URL}${cleanPath}`;
};
