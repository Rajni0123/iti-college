import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../src/constants/colors';

// Use Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';
import { getLibrarySettings, updateLibrarySettings } from '../../../src/services/api';

export default function LibrarySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    library_name: '',
    default_monthly_fee: '',
    total_seats: '',
    total_lockers: '',
    address: '',
    phone: '',
    email: '',
    receipt_header: '',
    receipt_footer: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await getLibrarySettings();
      const data = response.data || {};

      // Convert array of settings to object
      if (Array.isArray(data)) {
        const settingsObj = {};
        data.forEach(item => {
          settingsObj[item.setting_key] = item.setting_value;
        });
        setSettings(s => ({ ...s, ...settingsObj }));
      } else {
        setSettings(s => ({ ...s, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLibrarySettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={LibraryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={20} color={LibraryColor} />
            <Text style={styles.sectionTitle}>General Settings</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Library Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter library name"
              value={settings.library_name}
              onChangeText={(v) => updateSetting('library_name', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Monthly Fee</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter default fee"
              value={settings.default_monthly_fee}
              onChangeText={(v) => updateSetting('default_monthly_fee', v)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Total Seats</Text>
              <TextInput
                style={styles.input}
                placeholder="170"
                value={settings.total_seats}
                onChangeText={(v) => updateSetting('total_seats', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Total Lockers</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                value={settings.total_lockers}
                onChangeText={(v) => updateSetting('total_lockers', v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="card-account-phone" size={20} color="#7c3aed" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Enter address"
              value={settings.address}
              onChangeText={(v) => updateSetting('address', v)}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={settings.phone}
              onChangeText={(v) => updateSetting('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              value={settings.email}
              onChangeText={(v) => updateSetting('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Receipt Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="receipt" size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Receipt Settings</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receipt Header</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Text to show at top of receipt"
              value={settings.receipt_header}
              onChangeText={(v) => updateSetting('receipt_header', v)}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receipt Footer</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Text to show at bottom of receipt"
              value={settings.receipt_footer}
              onChangeText={(v) => updateSetting('receipt_footer', v)}
              multiline
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: LibraryColor,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
