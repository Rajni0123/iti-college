import { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../../src/constants/colors';
import StatusBadge from '../../../src/components/StatusBadge';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import LoadingScreen from '../../../src/components/LoadingScreen';
import { updateAdmissionStatus, updateAdmission } from '../../../src/services/api';
import { formatDate } from '../../../src/utils/formatters';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['GEN', 'OBC', 'SC', 'ST', 'EWS'];
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'];
const SHIFT_OPTIONS = ['1st', '2nd'];

export default function AdmissionDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [admission, setAdmission] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState(null); // 'Approved' or 'Rejected'
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (params.admission) {
      try {
        const parsed = JSON.parse(params.admission);
        setAdmission(parsed);
        setEditData(parsed);
      } catch {
        console.error('Failed to parse admission data');
      }
    }
  }, [params.admission]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (editMode) {
              handleSave();
            } else {
              setEditMode(true);
            }
          }}
          style={{ marginRight: 8 }}
        >
          <Ionicons name={editMode ? 'checkmark' : 'create-outline'} size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [editMode, editData]);

  const updateField = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAdmission(admission.id, editData);
      setAdmission(editData);
      setEditMode(false);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Admission updated successfully' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to update admission' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatusAction(newStatus);
    setConfirmVisible(true);
  };

  const confirmStatusChange = async () => {
    setConfirmVisible(false);
    try {
      setSaving(true);
      await updateAdmissionStatus(admission.id, statusAction);
      setAdmission((prev) => ({ ...prev, status: statusAction }));
      setEditData((prev) => ({ ...prev, status: statusAction }));
      Toast.show({ type: 'success', text1: 'Status Updated', text2: `Admission ${statusAction.toLowerCase()} successfully` });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.error || 'Failed to update status' });
    } finally {
      setSaving(false);
    }
  };

  if (!admission) return <LoadingScreen />;

  const data = editMode ? editData : admission;

  const InfoRow = ({ label, field, editable = true, keyboardType }) => (
    <View style={styles.infoRow}>
      {editMode && editable ? (
        <FormInput
          label={label}
          value={String(data[field] ?? '')}
          onChangeText={(val) => updateField(field, val)}
          keyboardType={keyboardType}
        />
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{data[field] || '-'}</Text>
        </>
      )}
    </View>
  );

  const SelectRow = ({ label, field, options }) => (
    <View style={styles.infoRow}>
      {editMode ? (
        <FormSelect
          label={label}
          value={data[field]}
          options={options}
          onValueChange={(val) => updateField(field, val)}
        />
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{data[field] || '-'}</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName}>{data.name}</Text>
              <Text style={styles.headerSub}>S/o {data.father_name}</Text>
            </View>
            <StatusBadge status={data.status} />
          </View>
          {data.trade && <Text style={styles.headerTrade}>{data.trade}</Text>}
          <Text style={styles.headerDate}>Applied: {formatDate(data.created_at)}</Text>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Full Name" field="name" />
          <InfoRow label="Father's Name" field="father_name" />
          <InfoRow label="Mother's Name" field="mother_name" />
          <InfoRow label="Mobile" field="mobile" keyboardType="phone-pad" />
          <InfoRow label="Email" field="email" keyboardType="email-address" />
          <InfoRow label="Date of Birth" field="dob" editable={false} />
          <SelectRow label="Gender" field="gender" options={GENDER_OPTIONS} />
          <SelectRow label="Category" field="category" options={CATEGORY_OPTIONS} />
          <InfoRow label="Aadhaar Number" field="uidai_number" keyboardType="numeric" />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <InfoRow label="Village/Town/City" field="village_town_city" />
          <InfoRow label="District" field="district" />
          <InfoRow label="State" field="state" />
          <InfoRow label="Pincode" field="pincode" keyboardType="numeric" />
        </View>

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          <InfoRow label="10th School" field="class_10th_school" />
          <InfoRow label="10th Percentage" field="class_10th_percentage" keyboardType="numeric" />
          <InfoRow label="12th School" field="class_12th_school" />
          <InfoRow label="12th Percentage" field="class_12th_percentage" keyboardType="numeric" />
        </View>

        {/* Admission Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admission Details</Text>
          <InfoRow label="Trade" field="trade" editable={false} />
          <InfoRow label="Qualification" field="qualification" />
          <InfoRow label="Session" field="session" editable={false} />
          <SelectRow label="Shift" field="shift" options={SHIFT_OPTIONS} />
        </View>

        {/* Registration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration</Text>
          <InfoRow label="Registration Type" field="registration_type" editable={false} />
          <InfoRow label="Student Credit Card" field="student_credit_card" editable={false} />
          <InfoRow label="State Registration" field="state_registration" />
          <InfoRow label="Central Registration" field="central_registration" />
        </View>

        {/* Action Buttons for Pending */}
        {data.status === 'Pending' && !editMode && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.success }]}
              onPress={() => handleStatusChange('Approved')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.error }]}
              onPress={() => handleStatusChange('Rejected')}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {editMode && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: '#f1f5f9' }]}
              onPress={() => {
                setEditMode(false);
                setEditData(admission);
              }}
            >
              <Text style={[styles.editBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: Colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.editBtnText, { color: '#fff' }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title={`${statusAction} Admission`}
        message={`Are you sure you want to ${statusAction?.toLowerCase()} this admission for ${data.name}?`}
        confirmText={statusAction}
        confirmColor={statusAction === 'Approved' ? Colors.success : Colors.error}
        onConfirm={confirmStatusChange}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerTrade: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  headerDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
