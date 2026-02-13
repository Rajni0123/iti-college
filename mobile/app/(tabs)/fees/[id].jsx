import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, StatusColors } from '../../../src/constants/colors';
import { formatCurrency, formatDate } from '../../../src/utils/formatters';
import { getFeeById, payFee, deleteFee, getInstallments, payInstallment } from '../../../src/services/api';
import { printReceipt, shareReceiptAsPDF } from '../../../src/utils/receipt';
import { printThermalFeeReceipt, isPrinterConnected } from '../../../src/utils/thermalPrinter';
import StatusBadge from '../../../src/components/StatusBadge';
import LoadingScreen from '../../../src/components/LoadingScreen';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card'];

export default function FeeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [fee, setFee] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Installment payment modal
  const [installmentModalVisible, setInstallmentModalVisible] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentMethod, setInstallmentMethod] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [installmentSubmitting, setInstallmentSubmitting] = useState(false);

  // Delete dialog
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Receipt sharing
  const [sharingReceipt, setSharingReceipt] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await getFeeById(id);
      const feeData = res.data?.fee || res.data;
      setFee(feeData);

      if (feeData?.installment_enabled) {
        try {
          const instRes = await getInstallments(id);
          setInstallments(instRes.data?.installments || instRes.data || []);
        } catch {
          setInstallments(feeData.installments || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch fee:', err);
      Toast.show({ type: 'error', text1: 'Failed to load fee details' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handlePayment = async () => {
    if (!paidAmount || parseFloat(paidAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    if (!paymentMethod) {
      Toast.show({ type: 'error', text1: 'Select a payment method' });
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await payFee(id, {
        paid_amount: parseFloat(paidAmount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
      });
      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: `Receipt: ${res.data?.receipt_number || ''}`,
      });
      setPaymentModalVisible(false);
      setPaidAmount('');
      setPaymentMethod('');
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleInstallmentPayment = async () => {
    if (!installmentAmount || parseFloat(installmentAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    if (!installmentMethod) {
      Toast.show({ type: 'error', text1: 'Select a payment method' });
      return;
    }

    setInstallmentSubmitting(true);
    try {
      await payInstallment(id, selectedInstallment.id, {
        paid_amount: parseFloat(installmentAmount),
        payment_method: installmentMethod,
        payment_date: installmentDate,
      });
      Toast.show({ type: 'success', text1: 'Installment Payment Recorded' });
      setInstallmentModalVisible(false);
      setInstallmentAmount('');
      setInstallmentMethod('');
      setSelectedInstallment(null);
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setInstallmentSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFee(id);
      Toast.show({ type: 'success', text1: 'Fee deleted successfully' });
      setDeleteDialogVisible(false);
      router.back();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete fee';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintReceipt = async () => {
    try {
      await printReceipt(fee);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to print receipt' });
    }
  };

  const handleThermalPrint = async () => {
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
        student_name: fee.student_name,
        father_name: fee.father_name,
        mobile: fee.mobile,
        trade: fee.trade,
        fee_type: fee.fee_type,
        amount: fee.total_amount || fee.amount,
        paid_amount: fee.paid_amount,
        payment_method: fee.payment_method,
        payment_date: fee.payment_date,
        academic_year: fee.academic_year,
      };
      const success = await printThermalFeeReceipt(thermalData);
      if (success) {
        Toast.show({ type: 'success', text1: 'Receipt printed successfully!' });
      }
    } catch (err) {
      console.error('Thermal print error:', err);
      Toast.show({ type: 'error', text1: 'Failed to print receipt' });
    }
  };

  const handleShareReceipt = async () => {
    setSharingReceipt(true);
    try {
      await shareReceiptAsPDF(fee);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to share receipt' });
    } finally {
      setSharingReceipt(false);
    }
  };

  const openInstallmentPayment = (inst) => {
    setSelectedInstallment(inst);
    setInstallmentAmount(String(inst.amount - (inst.paid_amount || 0)));
    setInstallmentMethod('');
    setInstallmentDate(new Date().toISOString().split('T')[0]);
    setInstallmentModalVisible(true);
  };

  if (loading) return <LoadingScreen />;
  if (!fee) return null;

  const totalAmount = parseFloat(fee.total_amount || fee.amount) || 0;
  const paidTotal = parseFloat(fee.paid_amount) || 0;
  const remaining = totalAmount - paidTotal;
  const progress = totalAmount > 0 ? paidTotal / totalAmount : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Fee Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Fee Information</Text>
            <StatusBadge status={fee.status} />
          </View>
          <View style={styles.infoGrid}>
            <InfoItem label="Student" value={fee.student_name} />
            <InfoItem label="Father's Name" value={fee.father_name} />
            <InfoItem label="Trade" value={fee.trade} />
            <InfoItem label="Fee Type" value={fee.fee_type} />
            <InfoItem label="Academic Year" value={fee.academic_year || '-'} />
            <InfoItem label="Due Date" value={formatDate(fee.due_date)} />
          </View>
        </View>

        {/* Amount Card with Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, { color: Colors.text }]}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Paid</Text>
              <Text style={[styles.amountValue, { color: Colors.success }]}>
                {formatCurrency(paidTotal)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Remaining</Text>
              <Text style={[styles.amountValue, { color: remaining > 0 ? Colors.error : Colors.success }]}>
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress * 100)}% collected</Text>
          </View>
        </View>

        {/* Receipt & Invoice Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documents</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Invoice No." value={fee.invoice_number || '-'} />
            <InfoItem label="Receipt No." value={fee.receipt_number || '-'} />
            <InfoItem label="Payment Date" value={formatDate(fee.payment_date)} />
            <InfoItem label="Payment Method" value={fee.payment_method || '-'} />
          </View>

          {/* Receipt Buttons */}
          {paidTotal > 0 && (
            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={handlePrintReceipt}
                activeOpacity={0.7}
              >
                <Ionicons name="print-outline" size={18} color={Colors.primary} />
                <Text style={styles.receiptButtonText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptButton, styles.thermalButton]}
                onPress={handleThermalPrint}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="printer-pos" size={18} color="#7c3aed" />
                <Text style={[styles.receiptButtonText, { color: '#7c3aed' }]}>Thermal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptButton, styles.shareButton]}
                onPress={handleShareReceipt}
                disabled={sharingReceipt}
                activeOpacity={0.7}
              >
                {sharingReceipt ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={[styles.receiptButtonText, { color: '#fff' }]}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Installments */}
        {fee.installment_enabled && installments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Installments ({installments.length})
            </Text>
            {installments.map((inst, index) => {
              const instPaid = parseFloat(inst.paid_amount) || 0;
              const instAmount = parseFloat(inst.amount) || 0;
              const instStatus = inst.status || (instPaid >= instAmount ? 'Paid' : instPaid > 0 ? 'Partially Paid' : 'Pending');
              return (
                <View key={inst.id || index} style={styles.installmentItem}>
                  <View style={styles.installmentHeader}>
                    <Text style={styles.installmentNumber}>
                      Installment {inst.installment_number || index + 1}
                    </Text>
                    <StatusBadge status={instStatus} />
                  </View>
                  <View style={styles.installmentDetails}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instLabel}>Amount: {formatCurrency(instAmount)}</Text>
                      <Text style={styles.instLabel}>Paid: {formatCurrency(instPaid)}</Text>
                      {inst.due_date && (
                        <Text style={styles.instLabel}>Due: {formatDate(inst.due_date)}</Text>
                      )}
                    </View>
                    {instStatus !== 'Paid' && (
                      <TouchableOpacity
                        style={styles.payInstButton}
                        onPress={() => openInstallmentPayment(inst)}
                      >
                        <Text style={styles.payInstButtonText}>Pay</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {fee.status !== 'Paid' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setPaidAmount(String(remaining));
                setPaymentMethod('');
                setPaymentDate(new Date().toISOString().split('T')[0]);
                setPaymentModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Record Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteDialogVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Delete Fee</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPaymentModalVisible(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalSubtitle}>
              Remaining: {formatCurrency(remaining)}
            </Text>

            <FormInput
              label="Amount"
              required
              placeholder="Enter payment amount"
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />

            <FormSelect
              label="Payment Method"
              required
              value={paymentMethod}
              options={PAYMENT_METHODS}
              onValueChange={setPaymentMethod}
              placeholder="Select method"
            />

            <FormInput
              label="Payment Date"
              placeholder="YYYY-MM-DD"
              value={paymentDate}
              onChangeText={setPaymentDate}
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, paymentSubmitting && { opacity: 0.7 }]}
              onPress={handlePayment}
              disabled={paymentSubmitting}
            >
              {paymentSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Payment</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Installment Payment Modal */}
      <Modal visible={installmentModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setInstallmentModalVisible(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Pay Installment {selectedInstallment?.installment_number || ''}
            </Text>

            <FormInput
              label="Amount"
              required
              placeholder="Enter payment amount"
              keyboardType="numeric"
              value={installmentAmount}
              onChangeText={setInstallmentAmount}
            />

            <FormSelect
              label="Payment Method"
              required
              value={installmentMethod}
              options={PAYMENT_METHODS}
              onValueChange={setInstallmentMethod}
              placeholder="Select method"
            />

            <FormInput
              label="Payment Date"
              placeholder="YYYY-MM-DD"
              value={installmentDate}
              onChangeText={setInstallmentDate}
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, installmentSubmitting && { opacity: 0.7 }]}
              onPress={handleInstallmentPayment}
              disabled={installmentSubmitting}
            >
              {installmentSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Payment</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Fee"
        message={`Are you sure you want to delete this ${fee.fee_type} record for ${fee.student_name}? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </View>
  );
}

function InfoItem({ label, value }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
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
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  shareButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  thermalButton: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  receiptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  installmentItem: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  installmentNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  installmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  payInstButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payInstButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actionSection: {
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  modalSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
