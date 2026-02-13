import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../../src/constants/colors';
import { getResults, createResult, deleteResult, getAllTrades } from '../../../src/services/api';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

export default function ResultsScreen() {
  const [results, setResults] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState('');
  const [year, setYear] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [resResults, resTrades] = await Promise.all([getResults(), getAllTrades()]);
      const resultData = resResults.data?.data || resResults.data?.results || (Array.isArray(resResults.data) ? resResults.data : []);
      setResults(resultData);
      const tradeData = resTrades.data?.data || resTrades.data?.trades || (Array.isArray(resTrades.data) ? resTrades.data : []);
      setTrades(tradeData);
    } catch (e) {
      console.error('Failed to fetch results:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

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
      if (trade) formData.append('trade', trade);
      if (year) formData.append('year', year);
      if (pdfFile) {
        formData.append('pdf', {
          uri: pdfFile.uri,
          name: pdfFile.name || 'result.pdf',
          type: pdfFile.mimeType || 'application/pdf',
        });
      }
      await createResult(formData);
      Toast.show({ type: 'success', text1: 'Result created' });
      setModalVisible(false);
      setTitle('');
      setTrade('');
      setYear('');
      setPdfFile(null);
      fetchData();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to create result' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResult(deleteId);
      Toast.show({ type: 'success', text1: 'Result deleted' });
      setDeleteId(null);
      fetchData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete result' });
      setDeleteId(null);
    }
  };

  const tradeOptions = trades.map(t => ({ label: t.name, value: t.name }));

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.meta}>
        {item.trade ? <Text style={styles.metaText}>{item.trade}</Text> : null}
        {item.year ? <Text style={styles.metaText}>{item.year}</Text> : null}
      </View>
      <TouchableOpacity style={styles.deleteRow} onPress={() => setDeleteId(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={results.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState title="No results" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[Colors.primary]} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setTitle(''); setTrade(''); setYear(''); setPdfFile(null); setModalVisible(true); }}>
        <Text style={styles.fabText}>+ Add Result</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Result</Text>
            <FormInput label="Title" required value={title} onChangeText={setTitle} placeholder="Result title" />
            <FormSelect label="Trade" value={trade} options={tradeOptions} onValueChange={setTrade} placeholder="Select trade" />
            <FormInput label="Year" value={year} onChangeText={setYear} placeholder="e.g. 2024" keyboardType="numeric" />
            <TouchableOpacity style={styles.pdfPicker} onPress={pickPdf}>
              <Text style={styles.pdfPickerText}>{pdfFile ? pdfFile.name : 'Pick PDF (optional)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Creating...' : 'Create Result'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Result"
        message="Are you sure you want to delete this result?"
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
  resultTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12, color: Colors.textSecondary, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
