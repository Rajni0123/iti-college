import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { getAllStaff, getStaffSalaries, createStaffSalary, deleteStaffSalary } from '../../../src/services/api';
import { formatCurrency } from '../../../src/utils/formatters';
import { printPayslip, sharePayslipAsPDF } from '../../../src/utils/payslip';
import { useAuth } from '../../../src/context/AuthContext';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import LoadingScreen from '../../../src/components/LoadingScreen';
import EmptyState from '../../../src/components/EmptyState';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import Toast from 'react-native-toast-message';

const MONTHS = [
  { label: 'January', value: '1' }, { label: 'February', value: '2' },
  { label: 'March', value: '3' }, { label: 'April', value: '4' },
  { label: 'May', value: '5' }, { label: 'June', value: '6' },
  { label: 'July', value: '7' }, { label: 'August', value: '8' },
  { label: 'September', value: '9' }, { label: 'October', value: '10' },
  { label: 'November', value: '11' }, { label: 'December', value: '12' },
];

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];

const currentDate = new Date();
const currentMonth = String(currentDate.getMonth() + 1);
const currentYear = String(currentDate.getFullYear());

const emptyForm = {
  staff_id: '',
  month: currentMonth,
  year: currentYear,
  basic_salary: '',
  hra: '',
  da: '',
  ta: '',
  bonus: '',
  other_allowances: '',
  pf_deduction: '',
  tax_deduction: '',
  other_deductions: '',
  payment_method: 'Cash',
  payment_date: currentDate.toISOString().split('T')[0],
  notes: '',
};

export default function PayslipScreen() {
  const router = useRouter();
  const { isStaff } = useAuth();

  // Block staff access
  if (isStaff) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#dc2626" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You don't have permission to manage payslips.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [staffList, setStaffList] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  // Fetch staff list
  useEffect(() => {
    getAllStaff().then(res => {
      const data = res.data?.data || res.data?.staff || (Array.isArray(res.data) ? res.data : []);
      setStaffList(data);
    }).catch(() => {});
  }, []);

  // Fetch salaries
  const fetchSalaries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterStaff) params.staff_id = filterStaff;
      const res = await getStaffSalaries(params);
      const data = res.data?.salaries || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSalaries(data);
    } catch (e) {
      console.error('Failed to fetch salaries:', e);
      // If API doesn't exist yet, show empty
      setSalaries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterMonth, filterStaff]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const openPaySalary = (staffMember) => {
    setForm({
      ...emptyForm,
      staff_id: staffMember ? String(staffMember.id) : '',
      staff_name: staffMember?.name || '',
    });
    setModalVisible(true);
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Calculate totals
  const grossSalary = (parseFloat(form.basic_salary) || 0) +
    (parseFloat(form.hra) || 0) + (parseFloat(form.da) || 0) +
    (parseFloat(form.ta) || 0) + (parseFloat(form.bonus) || 0) +
    (parseFloat(form.other_allowances) || 0);

  const totalDeductions = (parseFloat(form.pf_deduction) || 0) +
    (parseFloat(form.tax_deduction) || 0) + (parseFloat(form.other_deductions) || 0);

  const netSalary = grossSalary - totalDeductions;

  const handleSave = async () => {
    if (!form.staff_id) {
      Toast.show({ type: 'error', text1: 'Please select a staff member' });
      return;
    }
    if (!form.basic_salary || parseFloat(form.basic_salary) <= 0) {
      Toast.show({ type: 'error', text1: 'Basic salary is required' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        basic_salary: parseFloat(form.basic_salary) || 0,
        hra: parseFloat(form.hra) || 0,
        da: parseFloat(form.da) || 0,
        ta: parseFloat(form.ta) || 0,
        bonus: parseFloat(form.bonus) || 0,
        other_allowances: parseFloat(form.other_allowances) || 0,
        pf_deduction: parseFloat(form.pf_deduction) || 0,
        tax_deduction: parseFloat(form.tax_deduction) || 0,
        other_deductions: parseFloat(form.other_deductions) || 0,
        net_salary: netSalary,
        gross_salary: grossSalary,
      };
      // Find staff name for the payload
      const staff = staffList.find(s => String(s.id) === String(form.staff_id));
      if (staff) {
        payload.staff_name = staff.name;
        payload.staff_email = staff.email;
        payload.staff_phone = staff.phone;
        payload.staff_role = staff.role;
      }

      await createStaffSalary(payload);
      Toast.show({ type: 'success', text1: 'Salary paid!', text2: 'Payslip generated' });
      setModalVisible(false);
      setForm(emptyForm);
      fetchSalaries();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save salary' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStaffSalary(deleteId);
      Toast.show({ type: 'success', text1: 'Salary record deleted' });
      setDeleteId(null);
      fetchSalaries();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to delete' });
      setDeleteId(null);
    }
  };

  const handlePrint = async (salary) => {
    try {
      await printPayslip(salary);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Print failed', text2: err.message });
    }
  };

  const handleShare = async (salary) => {
    try {
      await sharePayslipAsPDF(salary);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Share failed', text2: err.message });
    }
  };

  const getMonthName = (m) => {
    const month = MONTHS.find(mo => mo.value === String(m));
    return month?.label || '';
  };

  const renderSalary = ({ item }) => {
    const net = parseFloat(item.net_salary) || 0;
    const gross = parseFloat(item.gross_salary) || parseFloat(item.basic_salary) || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardAvatar}>
            <Text style={styles.cardAvatarText}>
              {(item.staff_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.staff_name || 'Staff'}</Text>
            <Text style={styles.cardSub}>
              {item.staff_role ? item.staff_role.charAt(0).toUpperCase() + item.staff_role.slice(1) : 'Staff'}
              {item.staff_email ? ` • ${item.staff_email}` : ''}
            </Text>
          </View>
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>
              {getMonthName(item.month)} {item.year}
            </Text>
          </View>
        </View>

        {/* Salary breakdown */}
        <View style={styles.salaryRow}>
          <View style={styles.salaryCol}>
            <Text style={styles.salaryLabel}>Gross</Text>
            <Text style={styles.salaryValue}>{formatCurrency(gross)}</Text>
          </View>
          <View style={styles.salaryCol}>
            <Text style={styles.salaryLabel}>Deductions</Text>
            <Text style={[styles.salaryValue, { color: Colors.error }]}>
              {formatCurrency(parseFloat(item.pf_deduction || 0) + parseFloat(item.tax_deduction || 0) + parseFloat(item.other_deductions || 0))}
            </Text>
          </View>
          <View style={styles.salaryCol}>
            <Text style={styles.salaryLabel}>Net Pay</Text>
            <Text style={[styles.salaryValue, { color: Colors.success }]}>
              {formatCurrency(net)}
            </Text>
          </View>
        </View>

        {/* Payment info */}
        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoText}>
            {(item.payment_method || 'Cash')} • {item.payment_date ?
              new Date(item.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'N/A'}
          </Text>
          {item.slip_number && (
            <Text style={styles.slipNum}>#{item.slip_number}</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.printBtn} onPress={() => handlePrint(item)}>
            <Ionicons name="print-outline" size={16} color="#fff" />
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-outline" size={16} color={Colors.primary} />
            <Text style={styles.shareBtnText}>Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleteId(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Staff Quick Pay */}
      <Text style={styles.sectionTitle}>Quick Pay</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.staffChipsRow}
      >
        {staffList.map(staff => (
          <TouchableOpacity
            key={staff.id}
            style={styles.staffChip}
            onPress={() => openPaySalary(staff)}
            activeOpacity={0.7}
          >
            <View style={styles.staffChipAvatar}>
              <Text style={styles.staffChipAvatarText}>
                {(staff.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.staffChipName} numberOfLines={1}>{staff.name}</Text>
            <View style={styles.payNowBadge}>
              <Text style={styles.payNowText}>Pay</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Salary Records</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filterMonth && styles.filterChipActive]}
            onPress={() => setFilterMonth('')}
          >
            <Text style={[styles.filterChipText, !filterMonth && styles.filterChipTextActive]}>
              All Months
            </Text>
          </TouchableOpacity>
          {MONTHS.map(m => {
            const isActive = filterMonth === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilterMonth(isActive ? '' : m.value)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {m.label.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {staffList.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, !filterStaff && styles.staffFilterActive]}
              onPress={() => setFilterStaff('')}
            >
              <Text style={[styles.filterChipText, !filterStaff && styles.staffFilterTextActive]}>
                All Staff
              </Text>
            </TouchableOpacity>
            {staffList.map(s => {
              const isActive = filterStaff === String(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.filterChip, isActive && styles.staffFilterActive]}
                  onPress={() => setFilterStaff(isActive ? '' : String(s.id))}
                >
                  <Text style={[styles.filterChipText, isActive && styles.staffFilterTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={salaries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSalary}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={salaries.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            title="No salary records"
            subtitle="Tap on a staff member above to pay salary"
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSalaries(true)} colors={[Colors.primary]} />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openPaySalary(null)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="cash-plus" size={22} color="#fff" />
        <Text style={styles.fabText}>Pay Salary</Text>
      </TouchableOpacity>

      {/* Pay Salary Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Pay Salary</Text>

              {/* Staff Select */}
              <FormSelect
                label="Staff Member"
                required
                value={form.staff_id}
                options={staffList.map(s => ({ label: s.name, value: String(s.id) }))}
                onValueChange={(v) => {
                  updateField('staff_id', v);
                  const staff = staffList.find(s => String(s.id) === v);
                  if (staff) updateField('staff_name', staff.name);
                }}
                placeholder="Select staff"
              />

              {/* Period */}
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <FormSelect
                    label="Month"
                    required
                    value={form.month}
                    options={MONTHS}
                    onValueChange={(v) => updateField('month', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Year"
                    required
                    value={form.year}
                    onChangeText={(v) => updateField('year', v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Earnings Section */}
              <Text style={styles.formSectionTitle}>Earnings</Text>
              <View style={styles.formSection}>
                <FormInput
                  label="Basic Salary (₹)"
                  required
                  value={form.basic_salary}
                  onChangeText={(v) => updateField('basic_salary', v)}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="HRA (₹)"
                      value={form.hra}
                      onChangeText={(v) => updateField('hra', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="DA (₹)"
                      value={form.da}
                      onChangeText={(v) => updateField('da', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="TA (₹)"
                      value={form.ta}
                      onChangeText={(v) => updateField('ta', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Bonus (₹)"
                      value={form.bonus}
                      onChangeText={(v) => updateField('bonus', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
                <FormInput
                  label="Other Allowances (₹)"
                  value={form.other_allowances}
                  onChangeText={(v) => updateField('other_allowances', v)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              {/* Deductions Section */}
              <Text style={[styles.formSectionTitle, { color: Colors.error }]}>Deductions</Text>
              <View style={styles.formSection}>
                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="PF (₹)"
                      value={form.pf_deduction}
                      onChangeText={(v) => updateField('pf_deduction', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Tax/TDS (₹)"
                      value={form.tax_deduction}
                      onChangeText={(v) => updateField('tax_deduction', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
                <FormInput
                  label="Other Deductions (₹)"
                  value={form.other_deductions}
                  onChangeText={(v) => updateField('other_deductions', v)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Gross Salary</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(grossSalary)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.error }]}>Total Deductions</Text>
                  <Text style={[styles.summaryValue, { color: Colors.error }]}>- {formatCurrency(totalDeductions)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.netLabel}>NET PAY</Text>
                  <Text style={styles.netValue}>{formatCurrency(netSalary)}</Text>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <FormSelect
                    label="Payment Method"
                    value={form.payment_method}
                    options={PAYMENT_METHODS}
                    onValueChange={(v) => updateField('payment_method', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Payment Date"
                    value={form.payment_date}
                    onChangeText={(v) => updateField('payment_date', v)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <FormInput
                label="Notes"
                value={form.notes}
                onChangeText={(v) => updateField('notes', v)}
                placeholder="Optional notes"
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash-check" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Pay & Generate Payslip</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Salary Record"
        message="Are you sure you want to delete this salary record?"
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
    flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  accessDeniedTitle: { fontSize: 22, fontWeight: '700', color: '#dc2626', marginTop: 16 },
  accessDeniedText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  backBtn: { marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, paddingHorizontal: 16,
  },

  // Staff quick pay chips
  staffChipsRow: {
    paddingHorizontal: 16, gap: 10, paddingBottom: 16,
  },
  staffChip: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    width: 100, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  staffChipAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  staffChipAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  staffChipName: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  payNowBadge: {
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12,
  },
  payNowText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Filter section
  filterSection: { marginTop: 8 },
  filterChipsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 6, paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  staffFilterActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  staffFilterTextActive: { color: '#fff' },

  // Salary card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10,
  },
  cardAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  cardAvatarText: { fontSize: 17, fontWeight: '700', color: Colors.primary },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  periodBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  periodText: { fontSize: 11, fontWeight: '600', color: '#1e40af' },

  salaryRow: {
    flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  salaryCol: { flex: 1, alignItems: 'center' },
  salaryLabel: { fontSize: 10, color: Colors.textLight, marginBottom: 2 },
  salaryValue: { fontSize: 14, fontWeight: '700', color: Colors.text },

  paymentInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  paymentInfoText: { fontSize: 11, color: Colors.textSecondary },
  slipNum: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  cardActions: {
    flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12,
  },
  printBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10,
  },
  printBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary,
  },
  shareBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  deleteBtn: {
    width: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca',
  },

  // FAB
  fab: {
    position: 'absolute', bottom: 20, right: 16, left: 16,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },

  rowFields: { flexDirection: 'row', gap: 10 },

  formSectionTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.success, marginTop: 12, marginBottom: 8,
  },
  formSection: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginVertical: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  summaryDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  netLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  netValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
