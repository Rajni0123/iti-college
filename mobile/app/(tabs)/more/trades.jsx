import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, Switch, ScrollView, RefreshControl,
} from 'react-native';
import { Colors } from '../../../src/constants/colors';
import { getAllTrades, createTrade, updateTrade, deleteTrade } from '../../../src/services/api';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const emptyForm = {
  name: '', slug: '', category: '', description: '', duration: '', eligibility: '', seats: '', is_active: true,
};

export default function TradesScreen() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchTrades = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getAllTrades();
      const data = res.data?.data || res.data?.trades || (Array.isArray(res.data) ? res.data : []);
      setTrades(data);
    } catch (e) {
      console.error('Failed to fetch trades:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTrades(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalVisible(true); };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      category: item.category || '',
      description: item.description || '',
      duration: item.duration || '',
      eligibility: item.eligibility || '',
      seats: String(item.seats || ''),
      is_active: item.is_active === 1 || item.is_active === true,
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Trade name is required' });
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      if (form.slug) formData.append('slug', form.slug);
      if (form.category) formData.append('category', form.category);
      if (form.description) formData.append('description', form.description);
      if (form.duration) formData.append('duration', form.duration);
      if (form.eligibility) formData.append('eligibility', form.eligibility);
      if (form.seats) formData.append('seats', form.seats);
      formData.append('is_active', form.is_active ? '1' : '0');

      if (editingId) {
        await updateTrade(editingId, formData);
        Toast.show({ type: 'success', text1: 'Trade updated' });
      } else {
        await createTrade(formData);
        Toast.show({ type: 'success', text1: 'Trade created' });
      }
      setModalVisible(false);
      fetchTrades();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save trade' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTrade(deleteId);
      Toast.show({ type: 'success', text1: 'Trade deleted' });
      setDeleteId(null);
      fetchTrades();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete trade' });
      setDeleteId(null);
    }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const categoryOptions = [
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Non-Engineering', value: 'Non-Engineering' },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.meta}>
            {item.category ? <Text style={styles.metaText}>{item.category}</Text> : null}
            {item.duration ? <Text style={styles.metaText}>{item.duration}</Text> : null}
            {item.seats ? <Text style={styles.metaText}>{item.seats} seats</Text> : null}
          </View>
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
        data={trades}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={trades.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No trades" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTrades(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Add Trade</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Trade' : 'Add Trade'}</Text>
              <FormInput label="Name" required value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="Trade name" />
              <FormInput label="Slug" value={form.slug} onChangeText={(v) => updateField('slug', v)} placeholder="trade-slug" autoCapitalize="none" />
              <FormSelect label="Category" value={form.category} options={categoryOptions} onValueChange={(v) => updateField('category', v)} placeholder="Select category" />
              <FormInput label="Description" value={form.description} onChangeText={(v) => updateField('description', v)} placeholder="Description" multiline numberOfLines={3} />
              <FormInput label="Duration" value={form.duration} onChangeText={(v) => updateField('duration', v)} placeholder="e.g. 2 years" />
              <FormInput label="Eligibility" value={form.eligibility} onChangeText={(v) => updateField('eligibility', v)} placeholder="Eligibility criteria" />
              <FormInput label="Seats" value={form.seats} onChangeText={(v) => updateField('seats', v)} placeholder="Number of seats" keyboardType="numeric" />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch value={form.is_active} onValueChange={(v) => updateField('is_active', v)} trackColor={{ true: Colors.primary }} thumbColor="#fff" />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Trade"
        message="Are you sure you want to delete this trade?"
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText: { fontSize: 12, color: Colors.textSecondary, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
    padding: 24, maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
