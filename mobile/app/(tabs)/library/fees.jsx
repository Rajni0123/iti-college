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
  Linking,
  Share,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import { Colors } from '../../../src/constants/colors';
import { printThermalLibraryReceipt, isPrinterConnected } from '../../../src/utils/thermalPrinter';

// Use Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';
import { formatCurrency } from '../../../src/utils/formatters';
import {
  getLibraryFees,
  searchLibraryStudents,
  collectLibraryFee,
  getLibraryStudentById,
} from '../../../src/services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate Receipt HTML for printing
const generateReceiptHTML = (fee, studentInfo = {}) => {
  const monthName = MONTHS[fee.month - 1] || fee.month;
  const date = new Date(fee.created_at || fee.payment_date).toLocaleDateString('en-IN');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-bottom: 15px; }
        .title { color: #FF6B00; font-size: 20px; font-weight: bold; margin: 0; }
        .subtitle { color: #666; font-size: 12px; margin: 5px 0 0; }
        .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; background: #FFF7ED; padding: 8px; border-radius: 5px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
        .label { color: #666; }
        .value { font-weight: bold; color: #333; }
        .amount-row { background: #f0fdf4; padding: 12px; border-radius: 8px; margin: 15px 0; }
        .amount { font-size: 24px; color: #16a34a; font-weight: bold; text-align: center; }
        .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
        .footer-text { color: #999; font-size: 11px; }
        .receipt-no { color: #FF6B00; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <p class="title">📚 Maa Sarita Library</p>
        <p class="subtitle">Fee Receipt</p>
      </div>

      <div class="receipt-title">PAYMENT RECEIPT</div>

      <div class="row">
        <span class="label">Receipt No:</span>
        <span class="value receipt-no">${fee.receipt_number || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${date}</span>
      </div>
      <div class="row">
        <span class="label">Student Name:</span>
        <span class="value">${fee.student_name || studentInfo.name || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Mobile:</span>
        <span class="value">${studentInfo.mobile || fee.mobile || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Month:</span>
        <span class="value">${monthName} ${fee.year}</span>
      </div>
      <div class="row">
        <span class="label">Payment Mode:</span>
        <span class="value">${fee.payment_mode || 'Cash'}</span>
      </div>

      <div class="amount-row">
        <div class="amount">₹${fee.amount || 0}</div>
        <p style="text-align:center; margin:5px 0 0; color:#16a34a; font-size:12px;">Amount Paid</p>
      </div>

      <div class="footer">
        <p class="footer-text">Thank you for your payment!</p>
        <p class="footer-text">This is a computer generated receipt.</p>
      </div>
    </body>
    </html>
  `;
};

// Generate WhatsApp message for receipt
const generateWhatsAppMessage = (fee, studentInfo = {}) => {
  const monthName = MONTHS[fee.month - 1] || fee.month;
  const date = new Date(fee.created_at || fee.payment_date).toLocaleDateString('en-IN');

  return `📚 *Maa Sarita Library*
━━━━━━━━━━━━━━━━
*PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━

📋 *Receipt No:* ${fee.receipt_number || 'N/A'}
📅 *Date:* ${date}

👤 *Student:* ${fee.student_name || studentInfo.name || 'N/A'}
📱 *Mobile:* ${studentInfo.mobile || fee.mobile || 'N/A'}

📆 *Month:* ${monthName} ${fee.year}
💳 *Mode:* ${fee.payment_mode || 'Cash'}

💰 *Amount Paid:* ₹${fee.amount || 0}

━━━━━━━━━━━━━━━━
✅ Payment Received Successfully!
Thank you for your payment.
━━━━━━━━━━━━━━━━`;
};

export default function LibraryFeesScreen() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  const fetchFees = useCallback(async () => {
    try {
      const response = await getLibraryFees();
      setFees(response.data?.fees || response.data || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFees();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await searchLibraryStudents(query);
      setSearchResults(response.data?.students || response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setAmount(String(student.monthly_fee || ''));
    setSearchQuery('');
    setSearchResults([]);
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setAmount('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setPaymentMode('Cash');
    setNotes('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const openCollectModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Print receipt (Standard)
  const handlePrint = async (fee, studentInfo = {}) => {
    try {
      const html = generateReceiptHTML(fee, studentInfo);
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  // Thermal print receipt
  const handleThermalPrint = async (fee, studentInfo = {}) => {
    if (!isPrinterConnected()) {
      Alert.alert(
        'Printer Not Connected',
        'Please connect to a thermal printer first from More > Printer settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const thermalData = {
        receipt_number: fee.receipt_number,
        student_name: fee.student_name || studentInfo.name,
        mobile: studentInfo.mobile || fee.mobile,
        seat_number: studentInfo.seat_number || fee.seat_number,
        month: fee.month,
        year: fee.year,
        amount: fee.amount,
        payment_mode: fee.payment_mode,
        created_at: fee.created_at,
      };
      const success = await printThermalLibraryReceipt(thermalData);
      if (success) {
        Alert.alert('Success', 'Receipt printed successfully!');
      }
    } catch (error) {
      console.error('Thermal print error:', error);
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  // Share on WhatsApp
  const handleWhatsAppShare = async (fee, studentInfo = {}) => {
    const whatsappNumber = studentInfo.whatsapp_number || studentInfo.mobile || fee.mobile;
    if (!whatsappNumber) {
      Alert.alert('Error', 'No WhatsApp number available for this student');
      return;
    }

    const message = generateWhatsAppMessage(fee, studentInfo);
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  // Show receipt options
  const showReceiptOptions = (fee, studentInfo = {}) => {
    Alert.alert(
      'Receipt Options',
      `Receipt: ${fee.receipt_number}`,
      [
        {
          text: 'Print',
          onPress: () => handlePrint(fee, studentInfo),
        },
        {
          text: 'WhatsApp',
          onPress: () => handleWhatsAppShare(fee, studentInfo),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCollect = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const response = await collectLibraryFee({
        student_id: selectedStudent.id,
        amount: parseFloat(amount),
        month: selectedMonth,
        year: selectedYear,
        payment_mode: paymentMode,
        notes: notes,
      });

      const newFee = {
        ...response.data,
        student_name: selectedStudent.name,
        amount: parseFloat(amount),
        month: selectedMonth,
        year: selectedYear,
        payment_mode: paymentMode,
        created_at: new Date().toISOString(),
      };

      // Show success with share options
      Alert.alert(
        'Fee Collected!',
        `Receipt: ${response.data?.receipt_number || 'N/A'}\nAmount: ₹${amount}`,
        [
          {
            text: 'Print',
            onPress: () => {
              handlePrint(newFee, selectedStudent);
              setModalVisible(false);
              fetchFees();
            },
          },
          {
            text: 'Thermal',
            onPress: () => {
              handleThermalPrint(newFee, selectedStudent);
              setModalVisible(false);
              fetchFees();
            },
          },
          {
            text: 'WhatsApp',
            onPress: () => {
              handleWhatsAppShare(newFee, selectedStudent);
              setModalVisible(false);
              fetchFees();
            },
          },
          {
            text: 'Done',
            onPress: () => {
              setModalVisible(false);
              fetchFees();
            },
          },
        ]
      );
      resetForm();
    } catch (error) {
      console.error('Collection error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to collect fee');
    } finally {
      setSaving(false);
    }
  };

  const renderFee = ({ item }) => (
    <View style={styles.feeCard}>
      <View style={styles.feeHeader}>
        <View style={[styles.studentAvatar, { backgroundColor: LibraryColor + '20' }]}>
          <Text style={[styles.avatarText, { color: LibraryColor }]}>
            {item.student_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.feeInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.feeMonth}>
            {MONTHS[item.month - 1]} {item.year}
          </Text>
        </View>
        <Text style={styles.feeAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={styles.feeFooter}>
        <View style={[styles.modeBadge, { backgroundColor: item.payment_mode === 'Cash' ? '#dcfce7' : '#dbeafe' }]}>
          <Text style={[styles.modeText, { color: item.payment_mode === 'Cash' ? '#16a34a' : '#2563eb' }]}>
            {item.payment_mode}
          </Text>
        </View>
        <Text style={styles.receiptText}>{item.receipt_number}</Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-IN')}
        </Text>
      </View>
      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: LibraryColor + '15' }]}
          onPress={() => handlePrint(item, { mobile: item.mobile })}
        >
          <MaterialCommunityIcons name="printer" size={16} color={LibraryColor} />
          <Text style={[styles.actionBtnText, { color: LibraryColor }]}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#f5f3ff' }]}
          onPress={() => handleThermalPrint(item, { mobile: item.mobile, seat_number: item.seat_number })}
        >
          <MaterialCommunityIcons name="printer-pos" size={16} color="#7c3aed" />
          <Text style={[styles.actionBtnText, { color: '#7c3aed' }]}>Thermal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#dcfce7' }]}
          onPress={() => handleWhatsAppShare(item, { mobile: item.mobile, whatsapp_number: item.whatsapp_number })}
        >
          <MaterialCommunityIcons name="whatsapp" size={16} color="#16a34a" />
          <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>WhatsApp</Text>
        </TouchableOpacity>
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
        data={fees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFee}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-off" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No fee records found</Text>
          </View>
        }
      />

      {/* Collect Fee Button */}
      <TouchableOpacity style={styles.fab} onPress={openCollectModal}>
        <MaterialCommunityIcons name="cash-plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Collect Fee Modal */}
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
              <Text style={styles.modalTitle}>Collect Fee</Text>
              <TouchableOpacity onPress={handleCollect} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={LibraryColor} />
                ) : (
                  <Text style={styles.saveBtn}>Collect</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Student Search */}
              <Text style={styles.inputLabel}>Select Student *</Text>
              {selectedStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={styles.selectedStudentInfo}>
                    <Text style={styles.selectedName}>{selectedStudent.name}</Text>
                    <Text style={styles.selectedMobile}>{selectedStudent.mobile}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by name or mobile..."
                      value={searchQuery}
                      onChangeText={handleSearch}
                    />
                    {searching && <ActivityIndicator size="small" color={LibraryColor} />}
                  </View>
                  {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      {searchResults.map((student) => (
                        <TouchableOpacity
                          key={student.id}
                          style={styles.searchResultItem}
                          onPress={() => selectStudent(student)}
                        >
                          <Text style={styles.resultName}>{student.name}</Text>
                          <Text style={styles.resultMobile}>{student.mobile}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Month Selection */}
              <Text style={styles.inputLabel}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.monthBtn, selectedMonth === index + 1 && styles.monthBtnActive]}
                    onPress={() => setSelectedMonth(index + 1)}
                  >
                    <Text style={[styles.monthText, selectedMonth === index + 1 && styles.monthTextActive]}>
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Year */}
              <Text style={styles.inputLabel}>Year</Text>
              <View style={styles.yearRow}>
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Mode */}
              <Text style={styles.inputLabel}>Payment Mode</Text>
              <View style={styles.modeRow}>
                {['Cash', 'UPI'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeBtn, paymentMode === mode && styles.modeBtnActive]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <MaterialCommunityIcons
                      name={mode === 'Cash' ? 'cash' : 'cellphone'}
                      size={20}
                      color={paymentMode === mode ? '#fff' : '#64748b'}
                    />
                    <Text style={[styles.modeBtnText, paymentMode === mode && styles.modeBtnTextActive]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
  feeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7c3aed',
  },
  feeInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  feeMonth: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
  },
  feeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  receiptText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#16a34a',
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
    color: '#16a34a',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
  },
  searchResultItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  resultMobile: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  selectedStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 12,
  },
  selectedStudentInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedMobile: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  monthScroll: {
    flexGrow: 0,
  },
  monthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  monthBtnActive: {
    backgroundColor: LibraryColor,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  monthTextActive: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  yearBtnActive: {
    backgroundColor: LibraryColor,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  yearTextActive: {
    color: '#fff',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  modeBtnActive: {
    backgroundColor: LibraryColor,
  },
  modeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
});
