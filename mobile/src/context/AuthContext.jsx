import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminLogin, setLogoutCallback } from '../services/api';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isStaff: false,
  appMode: 'iti', // 'iti' or 'library'
  setAppMode: () => {},
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppModeState] = useState('iti'); // 'iti' or 'library'

  useEffect(() => {
    loadToken();
    setLogoutCallback(() => logout());
  }, []);

  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('adminToken');
      const savedUser = await AsyncStorage.getItem('adminUser');
      const savedAppMode = await AsyncStorage.getItem('appMode');
      if (savedToken) {
        setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
      }
      if (savedAppMode) {
        setAppModeState(savedAppMode);
      }
    } catch (e) {
      console.error('Failed to load token:', e);
    } finally {
      setLoading(false);
    }
  };

  const setAppMode = async (mode) => {
    setAppModeState(mode);
    await AsyncStorage.setItem('appMode', mode);
  };

  const login = async (email, password) => {
    const response = await adminLogin({ email, password });
    const { token: newToken, user: userData } = response.data;
    await AsyncStorage.setItem('adminToken', newToken);
    await AsyncStorage.setItem('adminUser', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return response.data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('adminToken');
    await AsyncStorage.removeItem('adminUser');
    setToken(null);
    setUser(null);
  };

  const role = user?.role || 'admin';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!token, isAdmin, isStaff, appMode, setAppMode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
