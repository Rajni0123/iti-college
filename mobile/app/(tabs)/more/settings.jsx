import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { getSettings, updateSettings } from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';
import LoadingScreen from '../../../src/components/LoadingScreen';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Block staff access
  if (isStaff) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#dc2626" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You don't have permission to access settings.
          {'\n'}Contact admin for assistance.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fetchSettings = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getSettings();
      const data = res.data?.data || res.data?.settings || res.data || {};
      // If it's an array of {key, value}, convert to object
      if (Array.isArray(data)) {
        const obj = {};
        data.forEach(item => { obj[item.key || item.setting_key] = item.value || item.setting_value || ''; });
        setSettings(obj);
      } else {
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(settings);
      Toast.show({ type: 'success', text1: 'Settings saved' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const formatLabel = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) return <LoadingScreen />;

  const settingKeys = Object.keys(settings).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSettings(true)} colors={[Colors.primary]} />}
      >
        {settingKeys.map((key) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{formatLabel(key)}</Text>
            <TextInput
              style={styles.input}
              value={String(settings[key] ?? '')}
              onChangeText={(v) => handleChange(key, v)}
              placeholder={formatLabel(key)}
              placeholderTextColor={Colors.textLight}
              multiline={String(settings[key] ?? '').length > 100}
            />
          </View>
        ))}

        {settingKeys.length === 0 && (
          <Text style={styles.empty}>No settings found</Text>
        )}
      </ScrollView>

      {settingKeys.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save All Settings'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  accessDenied: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  backBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontSize: 14 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
