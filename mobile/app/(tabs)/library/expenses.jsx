import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../src/constants/colors';

// Use Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';
import { formatCurrency } from '../../../src/utils/formatters';
import {
  getLibraryExpenses,
  createLibraryExpense,
  deleteLibraryExpense,
} from '../../../src/services/api';

const EXPENSE_TYPES = [
  { value: 'fixed', label: 'Fixed', icon: 'calendar-sync', color: '#7c3aed' },
  { value: 'variable', label: 'Variable', icon: 'swap-vertical', color: '#f59e0b' },
];

const FIXED_EXPENSES = ['Rent', 'Electricity', 'WiFi', 'Water', 'Salary'];
const VARIABLE_EXPENSES = ['Cleaning', 'Repairs', 'Supplies', 'Maintenance', 'Other'];

export default function LibraryExpensesScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [expenseType, setExpenseType] = useState('fixed');
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Summary
  const [summary, setSummary] = useState({ fixed: 0, variable: 0, total: 0 });

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await getLibraryExpenses();
      const data = response.data?.expenses || response.data || [];
      setExpenses(data);

      // Calculate summary
      const fixed = data.filter(e => e.expense_type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
      const variable = data.filter(e => e.expense_type === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);
      setSummary({ fixed, variable, total: fixed + variable });
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const resetForm = () => {
    setExpenseType('fixed');
    setExpenseName('');
    setAmount('');
    setNotes('');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!expenseName.trim()) {
      Alert.alert('Error', 'Please select or enter expense name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await createLibraryExpense({
        expense_type: expenseType,
        expense_name: expenseName,
        amount: parseFloat(amount),
        date: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
        notes: notes,
      });

      Alert.alert('Success', 'Expense added successfully');
      setModalVisible(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.expense_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLibraryExpense(expense.id);
              Alert.alert('Success', 'Expense deleted');
              fetchExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const renderExpense = ({ item }) => {
    const typeInfo = EXPENSE_TYPES.find(t => t.value === item.expense_type) || EXPENSE_TYPES[0];
    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <View style={[styles.expenseIcon, { backgroundColor: typeInfo.color + '20' }]}>
            <MaterialCommunityIcons name={typeInfo.icon} size={22} color={typeInfo.color} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseName}>{item.expense_name}</Text>
            <Text style={styles.expenseType}>{typeInfo.label} Expense</Text>
          </View>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        {item.notes && (
          <Text style={styles.expenseNotes}>{item.notes}</Text>
        )}
        <View style={styles.expenseFooter}>
          <Text style={styles.expenseDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN')}
          </Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: '#f5f3ff' }]}>
        <MaterialCommunityIcons name="calendar-sync" size={24} color="#7c3aed" />
        <Text style={styles.summaryValue}>{formatCurrency(summary.fixed)}</Text>
        <Text style={styles.summaryLabel}>Fixed</Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
        <MaterialCommunityIcons name="swap-vertical" size={24} color="#f59e0b" />
        <Text style={styles.summaryValue}>{formatCurrency(summary.variable)}</Text>
        <Text style={styles.summaryLabel}>Variable</Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
        <MaterialCommunityIcons name="calculator" size={24} color="#ef4444" />
        <Text style={styles.summaryValue}>{formatCurrency(summary.total)}</Text>
        <Text style={styles.summaryLabel}>Total</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={LibraryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpense}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No expenses recorded</Text>
          </View>
        }
      />

      {/* Add Expense Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={LibraryColor} />
                ) : (
                  <Text style={styles.saveBtn}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Expense Type */}
              <Text style={styles.inputLabel}>Expense Type</Text>
              <View style={styles.typeRow}>
                {EXPENSE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeBtn,
                      expenseType === type.value && { backgroundColor: type.color, borderColor: type.color },
                    ]}
                    onPress={() => { setExpenseType(type.value); setExpenseName(''); }}
                  >
                    <MaterialCommunityIcons
                      name={type.icon}
                      size={20}
                      color={expenseType === type.value ? '#fff' : type.color}
                    />
                    <Text style={[
                      styles.typeBtnText,
                      expenseType === type.value && { color: '#fff' },
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Select */}
              <Text style={styles.inputLabel}>Quick Select</Text>
              <View style={styles.quickSelectGrid}>
                {(expenseType === 'fixed' ? FIXED_EXPENSES : VARIABLE_EXPENSES).map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.quickSelectBtn,
                      expenseName === name && styles.quickSelectBtnActive,
                    ]}
                    onPress={() => setExpenseName(name)}
                  >
                    <Text style={[
                      styles.quickSelectText,
                      expenseName === name && styles.quickSelectTextActive,
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Name */}
              <Text style={styles.inputLabel}>Or Enter Custom Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter expense name"
                value={expenseName}
                onChangeText={setExpenseName}
              />

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
  listContent: {
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  expenseType: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ef4444',
  },
  expenseNotes: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontStyle: 'italic',
  },
  expenseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expenseDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: LibraryColor,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  quickSelectBtnActive: {
    backgroundColor: LibraryColor,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  quickSelectTextActive: {
    color: '#fff',
  },
});
