import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, Switch, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const emptyForm = { name: '', email: '', password: '', phone: '', role: 'staff', is_active: true };

export default function StaffScreen() {
  const router = useRouter();
  const { isStaff } = useAuth();

  // Block staff access
  if (isStaff) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#dc2626" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You don't have permission to manage staff.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchStaff = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getAllStaff();
      const data = res.data?.data || res.data?.staff || (Array.isArray(res.data) ? res.data : []);
      setStaff(data);
    } catch (e) {
      console.error('Failed to fetch staff:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setForm({ name: item.name || '', email: item.email || '', password: '', phone: item.phone || '', role: item.role || 'staff', is_active: item.is_active !== false && item.is_active !== 0 });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      Toast.show({ type: 'error', text1: 'Name and email are required' });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, is_active: form.is_active ? 1 : 0 };
      if (!editingId && !payload.password) {
        Toast.show({ type: 'error', text1: 'Password is required for new staff' });
        setSaving(false);
        return;
      }
      if (editingId && !payload.password) delete payload.password;
      if (editingId) {
        await updateStaff(editingId, payload);
        Toast.show({ type: 'success', text1: 'Staff updated' });
      } else {
        await createStaff(payload);
        Toast.show({ type: 'success', text1: 'Staff created' });
      }
      setModalVisible(false);
      fetchStaff();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStaff(deleteId);
      Toast.show({ type: 'success', text1: 'Staff deleted' });
      setDeleteId(null);
      fetchStaff();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete staff' });
      setDeleteId(null);
    }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.sub}>{item.email}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: item.role === 'admin' ? Colors.primaryLight : '#f0fdf4' }]}>
            <Text style={[styles.badgeText, { color: item.role === 'admin' ? Colors.primary : Colors.success }]}>{item.role}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: (item.is_active === 1 || item.is_active === true) ? '#dcfce7' : '#fef2f2' }]}>
            <Text style={[styles.badgeText, { color: (item.is_active === 1 || item.is_active === true) ? Colors.success : Colors.error }]}>
              {(item.is_active === 1 || item.is_active === true) ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteOverlay} onPress={() => setDeleteId(item.id)}>
        <Text style={{ color: Colors.error, fontSize: 12, fontWeight: '600' }}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={staff}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={staff.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No staff found" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStaff(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Add Staff</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Staff' : 'Add Staff'}</Text>
            <FormInput label="Name" required value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="Full name" />
            <FormInput label="Email" required value={form.email} onChangeText={(v) => updateField('email', v)} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
            <FormInput label={editingId ? 'Password (leave blank to keep)' : 'Password'} required={!editingId} value={form.password} onChangeText={(v) => updateField('password', v)} placeholder="Password" secureTextEntry />
            <FormInput label="Phone" value={form.phone} onChangeText={(v) => updateField('phone', v)} placeholder="Phone number" keyboardType="phone-pad" />
            <FormSelect label="Role" value={form.role} options={[{ label: 'Admin', value: 'admin' }, { label: 'Staff', value: 'staff' }]} onValueChange={(v) => updateField('role', v)} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={form.is_active} onValueChange={(v) => updateField('is_active', v)} trackColor={{ true: Colors.primary }} thumbColor="#fff" />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Staff"
        message="Are you sure you want to delete this staff member?"
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
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
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  sub: { fontSize: 12, color: Colors.textSecondary },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  deleteOverlay: { position: 'absolute', bottom: 10, right: 16 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, left: 20,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
