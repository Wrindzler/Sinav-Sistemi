const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function apiRequest(endpoint, options = {}) {
  try {
    console.log('API Request:', endpoint, options);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    console.log('API Response Status:', response.status);

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      return null;
    }

    // Response body'yi okumadan önce kontrol et
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Sunucu beklenmeyen yanıt döndü (${response.status})`);
    }

    const data = await response.json();
    console.log('API Response Data:', data);

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Network hatası
    if (error.message === 'Failed to fetch') {
      throw new Error('Sunucuya bağlanılamıyor. Lütfen backend\'in çalıştığından emin olun.');
    }
    
    throw error;
  }
}

