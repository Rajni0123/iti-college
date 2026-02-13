import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, Switch, ScrollView, RefreshControl,
} from 'react-native';
import { Colors } from '../../../src/constants/colors';
import { getAllFacultyAdmin, createFaculty, updateFaculty, deleteFaculty } from '../../../src/services/api';
import FormInput from '../../../src/components/FormInput';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const emptyForm = {
  name: '', designation: '', department: '', qualification: '', experience: '',
  email: '', phone: '', bio: '', is_principal: false, display_order: '', is_active: true,
};

export default function FacultyScreen() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchFaculty = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getAllFacultyAdmin();
      const data = res.data?.data || res.data?.faculty || (Array.isArray(res.data) ? res.data : []);
      setFaculty(data);
    } catch (e) {
      console.error('Failed to fetch faculty:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFaculty(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalVisible(true); };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      designation: item.designation || '',
      department: item.department || '',
      qualification: item.qualification || '',
      experience: item.experience || '',
      email: item.email || '',
      phone: item.phone || '',
      bio: item.bio || '',
      is_principal: item.is_principal === 1 || item.is_principal === true,
      display_order: String(item.display_order || ''),
      is_active: item.is_active === 1 || item.is_active === true,
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        is_principal: form.is_principal ? 1 : 0,
        is_active: form.is_active ? 1 : 0,
        display_order: form.display_order ? parseInt(form.display_order) : 0,
      };
      if (editingId) {
        await updateFaculty(editingId, payload);
        Toast.show({ type: 'success', text1: 'Faculty updated' });
      } else {
        await createFaculty(payload);
        Toast.show({ type: 'success', text1: 'Faculty created' });
      }
      setModalVisible(false);
      fetchFaculty();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save faculty' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFaculty(deleteId);
      Toast.show({ type: 'success', text1: 'Faculty deleted' });
      setDeleteId(null);
      fetchFaculty();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete faculty' });
      setDeleteId(null);
    }
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {(item.is_principal === 1 || item.is_principal === true) ? (
              <View style={styles.principalBadge}>
                <Text style={styles.principalText}>Principal</Text>
              </View>
            ) : null}
          </View>
          {item.designation ? <Text style={styles.sub}>{item.designation}</Text> : null}
          {item.department ? <Text style={styles.dept}>{item.department}</Text> : null}
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
        data={faculty}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={faculty.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No faculty members" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFaculty(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Add Faculty</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Faculty' : 'Add Faculty'}</Text>
              <FormInput label="Name" required value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="Full name" />
              <FormInput label="Designation" value={form.designation} onChangeText={(v) => updateField('designation', v)} placeholder="e.g. Assistant Professor" />
              <FormInput label="Department" value={form.department} onChangeText={(v) => updateField('department', v)} placeholder="Department" />
              <FormInput label="Qualification" value={form.qualification} onChangeText={(v) => updateField('qualification', v)} placeholder="e.g. M.Tech" />
              <FormInput label="Experience" value={form.experience} onChangeText={(v) => updateField('experience', v)} placeholder="e.g. 5 years" />
              <FormInput label="Email" value={form.email} onChangeText={(v) => updateField('email', v)} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
              <FormInput label="Phone" value={form.phone} onChangeText={(v) => updateField('phone', v)} placeholder="Phone" keyboardType="phone-pad" />
              <FormInput label="Bio" value={form.bio} onChangeText={(v) => updateField('bio', v)} placeholder="Short bio" multiline numberOfLines={3} />
              <FormInput label="Display Order" value={form.display_order} onChangeText={(v) => updateField('display_order', v)} placeholder="0" keyboardType="numeric" />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Is Principal</Text>
                <Switch value={form.is_principal} onValueChange={(v) => updateField('is_principal', v)} trackColor={{ true: Colors.primary }} thumbColor="#fff" />
              </View>
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
        title="Delete Faculty"
        message="Are you sure you want to delete this faculty member?"
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  principalBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  principalText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 1 },
  dept: { fontSize: 12, color: Colors.textLight },
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
