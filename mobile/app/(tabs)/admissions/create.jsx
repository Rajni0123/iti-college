import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../../src/constants/colors';
import FormInput from '../../../src/components/FormInput';
import FormSelect from '../../../src/components/FormSelect';
import { createManualAdmission, getActiveSessions, getAllTrades, createFee, payFee } from '../../../src/services/api';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['GEN', 'OBC', 'SC', 'ST', 'EWS'];
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'];
const SHIFT_OPTIONS = ['1st', '2nd'];
const QUALIFICATION_OPTIONS = [
  '8th Pass',
  '10th Pass',
  '12th Pass',
  'Graduate',
  'Post Graduate',
  'Other',
];
const REGISTRATION_TYPE_OPTIONS = ['Regular', 'Student Credit Card'];
const FEE_TYPES = ['Admission Fee', 'Tuition Fee', 'Examination Fee', 'Workshop Fee', 'Library Fee', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card'];

function getDefaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

const initialForm = {
  name: '',
  father_name: '',
  mother_name: '',
  mobile: '',
  email: '',
  dob: '',
  gender: '',
  category: '',
  uidai_number: '',
  village_town_city: '',
  district: '',
  state: '',
  pincode: '',
  block: '',
  post_office: '',
  police_station: '',
  class_10th_school: '',
  class_10th_marks_obtained: '',
  class_10th_total_marks: '',
  class_10th_percentage: '',
  class_10th_subject: '',
  class_12th_school: '',
  class_12th_marks_obtained: '',
  class_12th_total_marks: '',
  class_12th_percentage: '',
  class_12th_subject: '',
  trade: '',
  qualification: '',
  session: '',
  shift: '',
  registration_type: '',
  state_registration: '',
  central_registration: '',
  status: 'Approved',
  // Fee fields
  fee_type: 'Admission Fee',
  fee_amount: '',
  advance_payment: '',
  payment_method: 'Cash',
  academic_year: getDefaultAcademicYear(),
};

const DOCUMENT_TYPES = [
  { key: 'photo', label: 'Student Photo', icon: 'account-circle' },
  { key: 'aadhaar', label: 'Aadhaar Card', icon: 'card-account-details' },
  { key: 'marksheet_10th', label: '10th Marksheet', icon: 'file-document' },
  { key: 'marksheet_12th', label: '12th Marksheet', icon: 'file-document-outline' },
  { key: 'caste_certificate', label: 'Caste Certificate', icon: 'certificate' },
  { key: 'income_certificate', label: 'Income Certificate', icon: 'file-certificate' },
];

export default function CreateAdmissionScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [trades, setTrades] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState({});

  useEffect(() => {
    loadOptions();
  }, []);

  // Image picker function
  const pickImage = async (docKey, useCamera = false) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
          return;
        }
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: docKey === 'photo' ? [1, 1] : [4, 3],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        setDocuments((prev) => ({
          ...prev,
          [docKey]: result.assets[0],
        }));
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick image' });
    }
  };

  const showImageOptions = (docKey) => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => pickImage(docKey, true) },
        { text: 'Gallery', onPress: () => pickImage(docKey, false) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeDocument = (docKey) => {
    setDocuments((prev) => {
      const updated = { ...prev };
      delete updated[docKey];
      return updated;
    });
  };

  const loadOptions = async () => {
    try {
      const [tradesRes, sessionsRes] = await Promise.all([
        getAllTrades(),
        getActiveSessions(),
      ]);
      const tradesData = tradesRes.data?.trades || tradesRes.data || [];
      setTrades(tradesData.map((t) => ({ label: t.name || t.trade_name, value: t.name || t.trade_name })));
      const sessionsData = sessionsRes.data?.sessions || sessionsRes.data || [];
      setSessions(sessionsData.map((s) => ({ label: s.name || s.session_name, value: s.name || s.session_name })));

      // Set academic_year from active session (find session matching current year)
      if (sessionsData.length > 0) {
        const currentYear = new Date().getFullYear();
        // Find session where current year falls within the range
        let activeSession = sessionsData.find(s => {
          const startYear = s.start_year || parseInt(s.session_name?.split('-')[0]);
          const endYear = s.end_year || parseInt(s.session_name?.split('-')[1]);
          return currentYear >= startYear && currentYear <= endYear;
        });
        // Fallback to first session if no match
        if (!activeSession) activeSession = sessionsData[0];
        const sessionName = activeSession.name || activeSession.session_name;
        if (sessionName) {
          setForm(prev => ({ ...prev, academic_year: sessionName, session: sessionName }));
        }
      }
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate 10th percentage
      if (field === 'class_10th_marks_obtained' || field === 'class_10th_total_marks') {
        const marks = parseFloat(field === 'class_10th_marks_obtained' ? value : updated.class_10th_marks_obtained);
        const total = parseFloat(field === 'class_10th_total_marks' ? value : updated.class_10th_total_marks);
        if (marks && total && total > 0) {
          updated.class_10th_percentage = ((marks / total) * 100).toFixed(2);
        }
      }

      // Auto-calculate 12th percentage
      if (field === 'class_12th_marks_obtained' || field === 'class_12th_total_marks') {
        const marks = parseFloat(field === 'class_12th_marks_obtained' ? value : updated.class_12th_marks_obtained);
        const total = parseFloat(field === 'class_12th_total_marks' ? value : updated.class_12th_total_marks);
        if (marks && total && total > 0) {
          updated.class_12th_percentage = ((marks / total) * 100).toFixed(2);
        }
      }

      return updated;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // DOB is a plain text field now

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.father_name.trim()) newErrors.father_name = "Father's name is required";
    if (!form.mobile.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!/^\d{10}$/.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile must be 10 digits';
    }
    if (!form.category) newErrors.category = 'Category is required';
    if (!form.trade) newErrors.trade = 'Trade is required';
    if (!form.qualification) newErrors.qualification = 'Qualification is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields' });
      return;
    }

    try {
      setSubmitting(true);
      // Filter out empty string values, exclude fee-only fields from admission payload
      const feeFields = ['fee_type', 'fee_amount', 'advance_payment', 'payment_method', 'academic_year'];

      // Build FormData for multipart upload with documents
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && !feeFields.includes(key)) {
          formData.append(key, val);
        }
      });

      // Add documents to FormData
      Object.entries(documents).forEach(([docKey, docData]) => {
        if (docData?.uri) {
          const filename = docData.uri.split('/').pop();
          const ext = filename.split('.').pop().toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          formData.append(docKey, {
            uri: docData.uri,
            type: mimeType,
            name: `${docKey}_${Date.now()}.${ext}`,
          });
        }
      });

      const admissionRes = await createManualAdmission(formData, true);
      const admissionId = admissionRes.data?.applicationId;

      // Create fee record if fee amount is entered
      const feeAmount = parseFloat(form.fee_amount);
      if (feeAmount > 0 && admissionId) {
        const advanceAmt = parseFloat(form.advance_payment) || feeAmount;
        const pMethod = form.payment_method || 'Cash';
        const pDate = new Date().toISOString().split('T')[0];
        try {
          // Step 1: Create fee
          const feeRes = await createFee({
            admission_id: admissionId,
            student_name: form.name,
            father_name: form.father_name,
            mobile: form.mobile,
            trade: form.trade,
            fee_type: form.fee_type || 'Admission Fee',
            amount: feeAmount,
            academic_year: form.academic_year || getDefaultAcademicYear(),
            advance_payment: advanceAmt,
            payment_method: pMethod,
            payment_date: pDate,
          });
          const feeId = feeRes.data?.id;
          const alreadyPaid = parseFloat(feeRes.data?.paid_amount) || 0;

          // Step 2: If not already paid, call payFee separately
          if (feeId && advanceAmt > 0 && alreadyPaid < advanceAmt) {
            try {
              await payFee(feeId, {
                paid_amount: advanceAmt,
                payment_method: pMethod,
                payment_date: pDate,
              });
            } catch (payErr) {
              console.error('Pay fee failed:', payErr.message);
            }
          }

          Toast.show({
            type: 'success',
            text1: 'Admission Created',
            text2: `Fee ₹${feeAmount} collected (₹${advanceAmt} paid)`,
          });
        } catch (feeErr) {
          Toast.show({
            type: 'success',
            text1: 'Admission Created',
            text2: 'But fee creation failed - add fee separately',
          });
        }
      } else {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Admission created successfully' });
      }

      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || err.response?.data?.error || 'Failed to create admission' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <FormInput
          label="Full Name"
          required
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
          error={errors.name}
          placeholder="Enter full name"
        />
        <FormInput
          label="Father's Name"
          required
          value={form.father_name}
          onChangeText={(v) => updateField('father_name', v)}
          error={errors.father_name}
          placeholder="Enter father's name"
        />
        <FormInput
          label="Mother's Name"
          value={form.mother_name}
          onChangeText={(v) => updateField('mother_name', v)}
          placeholder="Enter mother's name"
        />
        <FormInput
          label="Mobile"
          required
          value={form.mobile}
          onChangeText={(v) => updateField('mobile', v)}
          error={errors.mobile}
          placeholder="10 digit mobile number"
          keyboardType="phone-pad"
          maxLength={10}
        />
        <FormInput
          label="Email"
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          error={errors.email}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormInput
          label="Date of Birth"
          value={form.dob}
          onChangeText={(v) => updateField('dob', v)}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <FormSelect
          label="Gender"
          value={form.gender}
          options={GENDER_OPTIONS}
          onValueChange={(v) => updateField('gender', v)}
          placeholder="Select gender"
        />
        <FormSelect
          label="Category"
          required
          value={form.category}
          options={CATEGORY_OPTIONS}
          onValueChange={(v) => updateField('category', v)}
          placeholder="Select category"
        />
        <FormInput
          label="Aadhaar Number"
          value={form.uidai_number}
          onChangeText={(v) => updateField('uidai_number', v)}
          placeholder="12 digit Aadhaar number"
          keyboardType="numeric"
          maxLength={12}
        />
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <FormInput
          label="Village/Town/City"
          value={form.village_town_city}
          onChangeText={(v) => updateField('village_town_city', v)}
          placeholder="Enter village/town/city"
        />
        <FormInput
          label="District"
          value={form.district}
          onChangeText={(v) => updateField('district', v)}
          placeholder="Enter district"
        />
        <FormInput
          label="State"
          value={form.state}
          onChangeText={(v) => updateField('state', v)}
          placeholder="Enter state"
        />
        <FormInput
          label="Pincode"
          value={form.pincode}
          onChangeText={(v) => updateField('pincode', v)}
          placeholder="Enter pincode"
          keyboardType="numeric"
          maxLength={6}
        />
        <FormInput
          label="Block"
          value={form.block}
          onChangeText={(v) => updateField('block', v)}
          placeholder="Enter block"
        />
        <FormInput
          label="Post Office"
          value={form.post_office}
          onChangeText={(v) => updateField('post_office', v)}
          placeholder="Enter post office"
        />
        <FormInput
          label="Police Station"
          value={form.police_station}
          onChangeText={(v) => updateField('police_station', v)}
          placeholder="Enter police station"
        />
      </View>

      {/* Education - 10th */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education - Class 10th</Text>
        <FormInput
          label="School"
          value={form.class_10th_school}
          onChangeText={(v) => updateField('class_10th_school', v)}
          placeholder="Enter school name"
        />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              label="Marks Obtained"
              value={form.class_10th_marks_obtained}
              onChangeText={(v) => updateField('class_10th_marks_obtained', v)}
              placeholder="Marks"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              label="Total Marks"
              value={form.class_10th_total_marks}
              onChangeText={(v) => updateField('class_10th_total_marks', v)}
              placeholder="Total"
              keyboardType="numeric"
            />
          </View>
        </View>
        <FormInput
          label="Percentage"
          value={form.class_10th_percentage}
          onChangeText={(v) => updateField('class_10th_percentage', v)}
          placeholder="Auto-calculated"
          keyboardType="numeric"
          editable={false}
        />
        <FormInput
          label="Subject"
          value={form.class_10th_subject}
          onChangeText={(v) => updateField('class_10th_subject', v)}
          placeholder="Enter subject"
        />
      </View>

      {/* Education - 12th */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education - Class 12th</Text>
        <FormInput
          label="School"
          value={form.class_12th_school}
          onChangeText={(v) => updateField('class_12th_school', v)}
          placeholder="Enter school name"
        />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              label="Marks Obtained"
              value={form.class_12th_marks_obtained}
              onChangeText={(v) => updateField('class_12th_marks_obtained', v)}
              placeholder="Marks"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              label="Total Marks"
              value={form.class_12th_total_marks}
              onChangeText={(v) => updateField('class_12th_total_marks', v)}
              placeholder="Total"
              keyboardType="numeric"
            />
          </View>
        </View>
        <FormInput
          label="Percentage"
          value={form.class_12th_percentage}
          onChangeText={(v) => updateField('class_12th_percentage', v)}
          placeholder="Auto-calculated"
          keyboardType="numeric"
          editable={false}
        />
        <FormInput
          label="Subject"
          value={form.class_12th_subject}
          onChangeText={(v) => updateField('class_12th_subject', v)}
          placeholder="Enter subject"
        />
      </View>

      {/* Admission Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admission Details</Text>
        <FormSelect
          label="Trade"
          required
          value={form.trade}
          options={trades}
          onValueChange={(v) => updateField('trade', v)}
          placeholder="Select trade"
        />
        <FormSelect
          label="Qualification"
          required
          value={form.qualification}
          options={QUALIFICATION_OPTIONS}
          onValueChange={(v) => updateField('qualification', v)}
          placeholder="Select qualification"
        />
        <FormSelect
          label="Session"
          value={form.session}
          options={sessions}
          onValueChange={(v) => updateField('session', v)}
          placeholder="Select session"
        />
        <FormSelect
          label="Shift"
          value={form.shift}
          options={SHIFT_OPTIONS}
          onValueChange={(v) => updateField('shift', v)}
          placeholder="Select shift"
        />
      </View>

      {/* Registration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration</Text>
        <FormSelect
          label="Registration Type"
          value={form.registration_type}
          options={REGISTRATION_TYPE_OPTIONS}
          onValueChange={(v) => updateField('registration_type', v)}
          placeholder="Select type"
        />
        <FormInput
          label="State Registration"
          value={form.state_registration}
          onChangeText={(v) => updateField('state_registration', v)}
          placeholder="State registration number"
        />
        <FormInput
          label="Central Registration"
          value={form.central_registration}
          onChangeText={(v) => updateField('central_registration', v)}
          placeholder="Central registration number"
        />
      </View>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <FormSelect
          label="Admission Status"
          value={form.status}
          options={STATUS_OPTIONS}
          onValueChange={(v) => updateField('status', v)}
          placeholder="Select status"
        />
      </View>

      {/* Photo & Documents Upload */}
      <View style={[styles.section, { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }]}>
        <Text style={[styles.sectionTitle, { color: '#4338ca' }]}>Photo & Documents</Text>
        <Text style={styles.docSubtitle}>Tap to capture photo or select from gallery</Text>

        <View style={styles.documentsGrid}>
          {DOCUMENT_TYPES.map((doc) => {
            const hasDoc = documents[doc.key];
            return (
              <View key={doc.key} style={styles.docItem}>
                <TouchableOpacity
                  style={[styles.docUploadBox, hasDoc && styles.docUploadBoxFilled]}
                  onPress={() => showImageOptions(doc.key)}
                  activeOpacity={0.7}
                >
                  {hasDoc ? (
                    <Image source={{ uri: hasDoc.uri }} style={styles.docPreview} />
                  ) : (
                    <View style={styles.docPlaceholder}>
                      <MaterialCommunityIcons name={doc.icon} size={32} color="#6366f1" />
                      <MaterialCommunityIcons name="camera-plus" size={16} color="#a5b4fc" style={styles.cameraIcon} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.docLabel} numberOfLines={2}>{doc.label}</Text>
                {hasDoc && (
                  <TouchableOpacity
                    style={styles.docRemoveBtn}
                    onPress={() => removeDocument(doc.key)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Admission Fee */}
      <View style={[styles.section, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
        <Text style={[styles.sectionTitle, { color: '#15803d' }]}>Admission Fee</Text>
        <FormSelect
          label="Fee Type"
          value={form.fee_type}
          options={FEE_TYPES}
          onValueChange={(v) => updateField('fee_type', v)}
          placeholder="Select fee type"
        />
        <FormInput
          label="Total Fee Amount (₹)"
          value={form.fee_amount}
          onChangeText={(v) => {
            updateField('fee_amount', v);
            updateField('advance_payment', v);
          }}
          placeholder="Enter fee amount"
          keyboardType="numeric"
        />
        <FormInput
          label="Advance Payment (₹)"
          value={form.advance_payment}
          onChangeText={(v) => updateField('advance_payment', v)}
          placeholder="Enter advance amount"
          keyboardType="numeric"
        />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormSelect
              label="Payment Method"
              value={form.payment_method}
              options={PAYMENT_METHODS}
              onValueChange={(v) => updateField('payment_method', v)}
              placeholder="Method"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              label="Academic Year"
              value={form.academic_year}
              onChangeText={(v) => updateField('academic_year', v)}
              placeholder="e.g. 2025-2026"
            />
          </View>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Create Admission</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  dateButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  docSubtitle: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 14,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docItem: {
    width: '30%',
    alignItems: 'center',
    position: 'relative',
  },
  docUploadBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  docUploadBoxFilled: {
    borderStyle: 'solid',
    borderColor: '#6366f1',
  },
  docPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -4,
    right: -8,
  },
  docPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docLabel: {
    fontSize: 10,
    color: '#4338ca',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  docRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});
