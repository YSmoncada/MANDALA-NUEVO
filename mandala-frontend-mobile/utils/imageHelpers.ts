import { API_URL } from './apiClient';

// Remove '/api' from API_URL to get base URL (e.g., http://192.168.18.12:8000)
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Formats a partial image path into a full URL.
 * Handles cases where the path already includes the base URL, 'http', 'https', 'data:', or 'blob:'.
 */
export const formatImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // If it's already a full URL or a base64/blob data URI, return it directly
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // Clean the path
  let cleanPath = path;
  
  // If it doesn't start with /media/, prepend it
  if (!cleanPath.startsWith('media/') && !cleanPath.startsWith('/media/')) {
    cleanPath = cleanPath.startsWith('/') ? `/media${cleanPath}` : `/media/${cleanPath}`;
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }
  
  return `${BASE_URL}${cleanPath}`;
};
