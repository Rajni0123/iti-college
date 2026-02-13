import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../../src/constants/colors';
import { getNotices, createNotice, deleteNotice } from '../../../src/services/api';
import { formatDate } from '../../../src/utils/formatters';
import FormInput from '../../../src/components/FormInput';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

export default function NoticesScreen() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchNotices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getNotices();
      const data = res.data?.data || res.data?.notices || (Array.isArray(res.data) ? res.data : []);
      setNotices(data);
    } catch (e) {
      console.error('Failed to fetch notices:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotices(); }, []);

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        setPdfFile(result.assets[0]);
      }
    } catch (e) {
      console.error('PDF pick error:', e);
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' });
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (pdfFile) {
        formData.append('pdf', {
          uri: pdfFile.uri,
          name: pdfFile.name || 'notice.pdf',
          type: pdfFile.mimeType || 'application/pdf',
        });
      }
      await createNotice(formData);
      Toast.show({ type: 'success', text1: 'Notice created' });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setPdfFile(null);
      fetchNotices();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to create notice' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotice(deleteId);
      Toast.show({ type: 'success', text1: 'Notice deleted' });
      setDeleteId(null);
      fetchNotices();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete notice' });
      setDeleteId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.date}>{formatDate(item.created_at || item.date)}</Text>
        </View>
        {(item.pdf_url || item.pdf) ? (
          <View style={styles.pdfBadge}>
            <Text style={styles.pdfBadgeText}>PDF</Text>
          </View>
        ) : null}
      </View>
      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <TouchableOpacity style={styles.deleteRow} onPress={() => setDeleteId(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={notices.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No notices" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotices(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setTitle(''); setDescription(''); setPdfFile(null); setModalVisible(true); }}>
        <Text style={styles.fabText}>+ Add Notice</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Notice</Text>
            <FormInput label="Title" required value={title} onChangeText={setTitle} placeholder="Notice title" />
            <FormInput label="Description" value={description} onChangeText={setDescription} placeholder="Description (optional)" multiline numberOfLines={3} />
            <TouchableOpacity style={styles.pdfPicker} onPress={pickPdf}>
              <Text style={styles.pdfPickerText}>{pdfFile ? pdfFile.name : 'Pick PDF (optional)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Creating...' : 'Create Notice'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Notice"
        message="Are you sure you want to delete this notice?"
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  date: { fontSize: 12, color: Colors.textSecondary },
  pdfBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pdfBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.error },
  desc: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  deleteRow: { marginTop: 10, alignSelf: 'flex-end' },
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
  pdfPicker: {
    backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  pdfPickerText: { fontSize: 14, color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
