import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // GECICI: Otomatik login'i devre disi birak - her zaman login sayfasindan basla
    console.log('AuthContext: Checking authentication...');
    
    const token = localStorage.getItem('token');
    console.log('Token found:', token ? 'YES' : 'NO');
    
    if (token) {
      console.log('Verifying token with backend...');
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          console.log('Backend response status:', res.status);
          if (!res.ok) {
            throw new Error('Invalid token');
          }
          return res.json();
        })
        .then(data => {
          console.log('User data received:', data);
          if (data.id) {
            setUser(data);
            console.log('User set:', data.role);
          } else {
            console.log('Invalid user data, clearing token');
            localStorage.clear(); // Tum localStorage'i temizle
            setUser(null);
          }
        })
        .catch((error) => {
          console.log('Token verification failed:', error.message);
          localStorage.clear(); // Tum localStorage'i temizle
          setUser(null);
        })
        .finally(() => {
          console.log('Loading complete, user:', user ? 'logged in' : 'logged out');
          setLoading(false);
        });
    } else {
      console.log('No token found, going to login');
      localStorage.clear(); // Eminim olmak icin tum storage'i temizle
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.access_token);
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return React.createElement(AuthContext.Provider, {
    value: { user, login, logout, loading }
  }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}

