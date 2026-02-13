import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, Switch, RefreshControl,
} from 'react-native';
import { Colors } from '../../../src/constants/colors';
import { getSessions, createSession, updateSession, deleteSession } from '../../../src/services/api';
import FormInput from '../../../src/components/FormInput';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const emptyForm = { session_name: '', start_year: '', end_year: '', is_active: true };

export default function SessionsScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchSessions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getSessions();
      const data = res.data?.data || res.data?.sessions || (Array.isArray(res.data) ? res.data : []);
      setSessions(data);
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalVisible(true); };

  const openEdit = (item) => {
    setForm({
      session_name: item.session_name || '',
      start_year: String(item.start_year || ''),
      end_year: String(item.end_year || ''),
      is_active: item.is_active === 1 || item.is_active === true,
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.session_name.trim()) {
      Toast.show({ type: 'error', text1: 'Session name is required' });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, is_active: form.is_active ? 1 : 0 };
      if (editingId) {
        await updateSession(editingId, payload);
        Toast.show({ type: 'success', text1: 'Session updated' });
      } else {
        await createSession(payload);
        Toast.show({ type: 'success', text1: 'Session created' });
      }
      setModalVisible(false);
      fetchSessions();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save session' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSession(deleteId);
      Toast.show({ type: 'success', text1: 'Session deleted' });
      setDeleteId(null);
      fetchSessions();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete session' });
      setDeleteId(null);
    }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.session_name}</Text>
          <Text style={styles.sub}>{item.start_year} - {item.end_year}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: (item.is_active === 1 || item.is_active === true) ? '#dcfce7' : '#fef2f2' }]}>
          <Text style={[styles.badgeText, { color: (item.is_active === 1 || item.is_active === true) ? Colors.success : Colors.error }]}>
            {(item.is_active === 1 || item.is_active === true) ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteRow} onPress={() => setDeleteId(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={sessions.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No sessions" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSessions(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Add Session</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Session' : 'Add Session'}</Text>
            <FormInput label="Session Name" required value={form.session_name} onChangeText={(v) => updateField('session_name', v)} placeholder="e.g. 2024-2025" />
            <FormInput label="Start Year" value={form.start_year} onChangeText={(v) => updateField('start_year', v)} placeholder="2024" keyboardType="numeric" />
            <FormInput label="End Year" value={form.end_year} onChangeText={(v) => updateField('end_year', v)} placeholder="2025" keyboardType="numeric" />
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
        title="Delete Session"
        message="Are you sure you want to delete this session?"
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  sub: { fontSize: 12, color: Colors.textSecondary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  deleteRow: { marginTop: 8, alignSelf: 'flex-end' },
  deleteText: { color: Colors.error, fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, left: 20,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
