import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../../src/constants/colors';
import { formatCurrency } from '../../../src/utils/formatters';
import { searchStudents, getStudentBalance, createFee, payFee, getRecentPayments } from '../../../src/services/api';
import { printReceipt, shareReceiptAsPDF } from '../../../src/utils/receipt';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import { useDebounce } from '../../../src/hooks/useDebounce';

const FEE_TYPES = [
  'Admission Fee',
  'Tuition Fee',
  'Examination Fee',
  'Workshop Fee',
  'Library Fee',
  'Other',
];

const INSTALLMENT_OPTIONS = [
  { label: '2 Installments', value: '2' },
  { label: '3 Installments', value: '3' },
  { label: '4 Installments', value: '4' },
  { label: '6 Installments', value: '6' },
  { label: '12 Installments', value: '12' },
];

const TRADE_OPTIONS = ['Electrician', 'Fitter'];

function getDefaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

export default function CollectFeeScreen() {
  const router = useRouter();

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Form
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [trade, setTrade] = useState('');
  const [feeType, setFeeType] = useState('');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment method & date (always collect on submit)
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Installments
  const [installmentEnabled, setInstallmentEnabled] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');
  const [installmentAmounts, setInstallmentAmounts] = useState([]);
  const [installmentDueDates, setInstallmentDueDates] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Recent collections for receipt printing
  const [recentCollections, setRecentCollections] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch recent payments on mount and focus
  const fetchRecentCollections = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const res = await getRecentPayments();
      const data = res.data?.payments || res.data || [];
      setRecentCollections(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (err) {
      console.error('Failed to fetch recent collections:', err);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentCollections();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecentCollections();
    }, [fetchRecentCollections])
  );

  // Print receipt handler
  const handlePrintReceipt = async (fee) => {
    try {
      await printReceipt(fee);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Print failed', text2: err.message });
    }
  };

  // Share receipt as PDF
  const handleShareReceipt = async (fee) => {
    try {
      await shareReceiptAsPDF(fee);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Share failed', text2: err.message });
    }
  };

  // Search students
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const doSearch = async () => {
      setSearching(true);
      try {
        const res = await searchStudents(debouncedSearch);
        const results = res.data?.students || res.data || [];
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    doSearch();
  }, [debouncedSearch]);

  // Select student
  const handleSelectStudent = useCallback(async (student) => {
    setSelectedStudent(student);
    setSearchQuery(student.student_name);
    setStudentName(student.student_name);
    setFatherName(student.father_name || '');
    setMobile(student.mobile || '');
    setTrade(student.trade || '');
    setShowDropdown(false);
    setSearchResults([]);

    // Fetch balance
    setLoadingBalance(true);
    try {
      const res = await getStudentBalance(student.admission_id);
      setBalance(res.data);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const clearStudent = () => {
    setSelectedStudent(null);
    setBalance(null);
    setSearchQuery('');
    setStudentName('');
    setFatherName('');
    setMobile('');
    setTrade('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Handle installment count change
  useEffect(() => {
    if (installmentEnabled && totalInstallments && amount) {
      const count = parseInt(totalInstallments);
      const totalAmt = parseFloat(amount);
      if (count > 0 && totalAmt > 0) {
        const perInstallment = Math.round((totalAmt / count) * 100) / 100;
        const amounts = Array(count).fill(perInstallment);
        // Adjust last installment for rounding
        const sum = amounts.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - totalAmt) > 0.01) {
          amounts[count - 1] = Math.round((totalAmt - (perInstallment * (count - 1))) * 100) / 100;
        }
        setInstallmentAmounts(amounts.map(String));
        setInstallmentDueDates(Array(count).fill(''));
      }
    } else {
      setInstallmentAmounts([]);
      setInstallmentDueDates([]);
    }
  }, [installmentEnabled, totalInstallments, amount]);

  const updateInstallmentAmount = (index, val) => {
    setInstallmentAmounts(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const updateInstallmentDueDate = (index, val) => {
    setInstallmentDueDates(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!studentName.trim()) newErrors.studentName = 'Student name is required';
    if (!trade) newErrors.trade = 'Trade is required';
    if (!feeType) newErrors.feeType = 'Fee type is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Enter a valid amount';
    if (installmentEnabled && !totalInstallments) {
      newErrors.totalInstallments = 'Select number of installments';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        admission_id: selectedStudent?.admission_id || null,
        student_name: studentName.trim(),
        father_name: fatherName.trim() || null,
        mobile: mobile.trim() || null,
        trade,
        fee_type: feeType,
        amount: parseFloat(amount),
        due_date: dueDate || null,
        notes: notes || null,
        installment_enabled: installmentEnabled,
        total_installments: installmentEnabled ? parseInt(totalInstallments) : 1,
        academic_year: academicYear || null,
        // Send advance payment fields (for updated backends)
        advance_payment: parseFloat(amount),
        payment_method: paymentMethod || 'Cash',
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
      };

      if (installmentEnabled && installmentAmounts.length > 0) {
        data.installment_amounts = installmentAmounts.map(Number);
        data.installment_due_dates = installmentDueDates;
      }

      // Step 1: Create fee record
      const res = await createFee(data);
      const feeId = res.data?.id;
      const feeAmount = parseFloat(amount);

      // Step 2: If fee created but paid_amount is still 0, call payFee to record payment
      const alreadyPaid = parseFloat(res.data?.paid_amount) || 0;
      if (feeId && feeAmount > 0 && alreadyPaid < feeAmount) {
        try {
          const payRes = await payFee(feeId, {
            paid_amount: feeAmount,
            payment_method: paymentMethod || 'Cash',
            payment_date: paymentDate || new Date().toISOString().split('T')[0],
          });
          Toast.show({
            type: 'success',
            text1: 'Fee Collected',
            text2: `Receipt: ${payRes.data?.receipt_number || res.data?.invoice_number || ''}`,
          });
        } catch (payErr) {
          console.error('Pay fee failed:', payErr.response?.data || payErr.message);
          Toast.show({
            type: 'success',
            text1: 'Fee Created',
            text2: 'Payment recording failed - record manually',
          });
        }
      } else {
        Toast.show({
          type: 'success',
          text1: 'Fee Collected',
          text2: `Receipt: ${res.data?.receipt_number || res.data?.invoice_number || ''}`,
        });
      }

      // Refresh recent collections and reset form
      fetchRecentCollections();
      clearStudent();
      setFeeType('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setInstallmentEnabled(false);
      setTotalInstallments('');
      // Don't go back - stay on screen to show receipt option
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to create fee';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Student Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Student</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textLight} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, mobile, admission ID..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (selectedStudent) clearStudent();
              }}
            />
            {searching && <ActivityIndicator size="small" color={Colors.primary} />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={clearStudent}>
                <Ionicons name="close-circle" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown */}
          {showDropdown && (
            <View style={styles.dropdown}>
              {searchResults.slice(0, 10).map((student, index) => (
                <TouchableOpacity
                  key={student.admission_id || index}
                  style={[styles.dropdownItem, index < searchResults.length - 1 && styles.dropdownBorder]}
                  onPress={() => handleSelectStudent(student)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownName}>{student.student_name}</Text>
                    <Text style={styles.dropdownSub}>
                      S/O {student.father_name} | {student.trade}
                    </Text>
                    <Text style={styles.dropdownSub}>{student.mobile}</Text>
                  </View>
                  {student.total_due_balance > 0 && (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueText}>Due: {formatCurrency(student.total_due_balance)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Selected Student Card */}
        {selectedStudent && (
          <View style={styles.section}>
            <View style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <Ionicons name="person-circle-outline" size={36} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.studentName}>{selectedStudent.student_name}</Text>
                  <Text style={styles.studentSub}>S/O {selectedStudent.father_name}</Text>
                </View>
                <TouchableOpacity onPress={clearStudent}>
                  <Ionicons name="close" size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              <View style={styles.studentInfo}>
                <View style={styles.infoChip}>
                  <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{selectedStudent.mobile}</Text>
                </View>
                <View style={styles.infoChip}>
                  <Ionicons name="school-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{selectedStudent.trade}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Student Balance */}
        {selectedStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Balance</Text>
            {loadingBalance ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 20 }} />
            ) : balance ? (
              <View style={styles.balanceCard}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Total Fees</Text>
                  <Text style={[styles.balanceValue, { color: Colors.text }]}>
                    {formatCurrency(balance.total_fees)}
                  </Text>
                </View>
                <View style={[styles.balanceDivider]} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Paid</Text>
                  <Text style={[styles.balanceValue, { color: Colors.success }]}>
                    {formatCurrency(balance.total_paid)}
                  </Text>
                </View>
                <View style={[styles.balanceDivider]} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Due Balance</Text>
                  <Text style={[styles.balanceValue, { color: Colors.error }]}>
                    {formatCurrency(balance.total_due)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Student Info (manual or auto-filled) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.card}>
            <FormInput
              label="Student Name"
              required
              value={studentName}
              onChangeText={setStudentName}
              placeholder="Enter student name"
              error={errors.studentName}
            />
            <FormInput
              label="Father's Name"
              value={fatherName}
              onChangeText={setFatherName}
              placeholder="Enter father's name"
            />
            <FormInput
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10 digit mobile"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <FormSelect
              label="Trade"
              required
              value={trade}
              options={TRADE_OPTIONS}
              onValueChange={setTrade}
              placeholder="Select trade"
            />
            {errors.trade && <Text style={styles.errorText}>{errors.trade}</Text>}
          </View>
        </View>

        {/* Fee Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Details</Text>
          <View style={styles.card}>
            <FormSelect
              label="Fee Type"
              required
              value={feeType}
              options={FEE_TYPES}
              onValueChange={setFeeType}
              placeholder="Select fee type"
            />
            {errors.feeType && <Text style={styles.errorText}>{errors.feeType}</Text>}

            <FormInput
              label="Academic Year"
              value={academicYear}
              onChangeText={setAcademicYear}
              placeholder="e.g. 2024-2025"
            />

            <FormInput
              label="Total Amount (₹)"
              required
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              error={errors.amount}
            />

            <FormInput
              label="Due Date"
              placeholder="YYYY-MM-DD (optional)"
              value={dueDate}
              onChangeText={setDueDate}
            />

            {/* Installment Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Enable Installment (EMI)</Text>
                <Text style={styles.switchSub}>Split fee into multiple installments</Text>
              </View>
              <Switch
                value={installmentEnabled}
                onValueChange={setInstallmentEnabled}
                trackColor={{ false: '#e2e8f0', true: Colors.primaryLight }}
                thumbColor={installmentEnabled ? Colors.primary : '#fff'}
              />
            </View>

            {installmentEnabled && (
              <>
                <FormSelect
                  label="Number of Installments"
                  required
                  value={totalInstallments}
                  options={INSTALLMENT_OPTIONS}
                  onValueChange={setTotalInstallments}
                  placeholder="Select installments"
                />
                {errors.totalInstallments && (
                  <Text style={styles.errorText}>{errors.totalInstallments}</Text>
                )}

                {/* Installment Breakdown */}
                {installmentAmounts.length > 0 && (
                  <View style={styles.installmentSection}>
                    <Text style={styles.installmentTitle}>Installment Breakdown</Text>
                    {installmentAmounts.map((amt, idx) => (
                      <View key={idx} style={styles.installmentRow}>
                        <Text style={styles.installmentLabel}>EMI {idx + 1}</Text>
                        <View style={styles.installmentFields}>
                          <View style={{ flex: 1 }}>
                            <TextInput
                              style={styles.installmentInput}
                              value={amt}
                              onChangeText={(v) => updateInstallmentAmount(idx, v)}
                              keyboardType="numeric"
                              placeholder="Amount"
                              placeholderTextColor={Colors.textLight}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <TextInput
                              style={styles.installmentInput}
                              value={installmentDueDates[idx]}
                              onChangeText={(v) => updateInstallmentDueDate(idx, v)}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor={Colors.textLight}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <FormInput
              label="Notes"
              placeholder="Additional notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <View style={styles.collectNowCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.collectNowTitle}>Payment will be collected on submit</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FormSelect
                  label="Payment Method"
                  value={paymentMethod}
                  options={['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card']}
                  onValueChange={setPaymentMethod}
                  placeholder="Method"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Payment Date"
                  placeholder="YYYY-MM-DD"
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Collect Fee</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Recent Collections - Print Receipt */}
        <View style={styles.section}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Collections</Text>
            {loadingRecent && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          {recentCollections.length === 0 && !loadingRecent ? (
            <View style={styles.emptyRecent}>
              <MaterialCommunityIcons name="receipt" size={40} color="#cbd5e1" />
              <Text style={styles.emptyRecentText}>No recent collections</Text>
            </View>
          ) : (
            recentCollections.map((fee) => {
              const paidAmt = parseFloat(fee.paid_amount) || 0;
              return (
                <View key={fee.id} style={styles.recentCard}>
                  <View style={styles.recentCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentName}>{fee.student_name}</Text>
                      <Text style={styles.recentSub}>
                        {fee.fee_type} • {fee.trade}
                      </Text>
                      <Text style={styles.recentSub}>
                        {fee.receipt_number || fee.invoice_number || `#${fee.id}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.recentAmount}>{formatCurrency(paidAmt)}</Text>
                      <Text style={styles.recentDate}>
                        {fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recentActions}>
                    <TouchableOpacity
                      style={styles.printBtn}
                      onPress={() => handlePrintReceipt(fee)}
                    >
                      <Ionicons name="print-outline" size={16} color="#fff" />
                      <Text style={styles.printBtnText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleShareReceipt(fee)}
                    >
                      <Ionicons name="share-outline" size={16} color={Colors.primary} />
                      <Text style={styles.shareBtnText}>Share PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
  },
  errorText: {
    fontSize: 11,
    color: Colors.error,
    marginTop: -8,
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 280,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  dropdownBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dueBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  studentSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  studentInfo: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f1f5f9',
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  installmentSection: {
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  installmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  installmentRow: {
    marginBottom: 10,
  },
  installmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 6,
  },
  installmentFields: {
    flexDirection: 'row',
    gap: 8,
  },
  installmentInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  collectNowCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  collectNowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 20,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  recentSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  recentDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
