import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors } from '../../../../src/constants/colors';
import { getStudentById, updateStudent, getAllTrades, getActiveSessions } from '../../../../src/services/api';
import FormInput from '../../../../src/components/FormInput';
import FormSelect from '../../../../src/components/FormSelect';
import LoadingScreen from '../../../../src/components/LoadingScreen';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['GEN', 'OBC', 'SC', 'ST', 'EWS'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Passout', 'Dropout'];
const SHIFT_OPTIONS = ['1st', '2nd'];
const QUALIFICATION_OPTIONS = ['8th Pass', '10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Other'];
const REGISTRATION_TYPE_OPTIONS = ['Regular', 'Student Credit Card'];

export default function EditStudentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trades, setTrades] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentRes, tradesRes, sessionsRes] = await Promise.all([
        getStudentById(id),
        getAllTrades().catch(() => ({ data: [] })),
        getActiveSessions().catch(() => ({ data: [] })),
      ]);

      const student = studentRes.data?.data || studentRes.data?.student || studentRes.data;
      setForm({
        student_name: student.student_name || student.name || '',
        father_name: student.father_name || '',
        mother_name: student.mother_name || '',
        mobile: student.mobile || '',
        email: student.email || '',
        dob: student.dob || '',
        gender: student.gender || '',
        category: student.category || '',
        uidai_number: student.uidai_number || '',
        village_town_city: student.village_town_city || '',
        district: student.district || '',
        state: student.state || '',
        pincode: student.pincode || '',
        block: student.block || '',
        post_office: student.post_office || '',
        police_station: student.police_station || '',
        trade: student.trade || '',
        qualification: student.qualification || '',
        enrollment_number: student.enrollment_number || '',
        session: student.session || '',
        shift: student.shift || '',
        academic_year: student.academic_year || '',
        status: student.status || 'Active',
        registration_type: student.registration_type || '',
        state_registration: student.state_registration || '',
        central_registration: student.central_registration || '',
        class_10th_school: student.class_10th_school || '',
        class_10th_marks_obtained: student.class_10th_marks_obtained || '',
        class_10th_total_marks: student.class_10th_total_marks || '',
        class_10th_percentage: student.class_10th_percentage || '',
        class_10th_subject: student.class_10th_subject || '',
        class_12th_school: student.class_12th_school || '',
        class_12th_marks_obtained: student.class_12th_marks_obtained || '',
        class_12th_total_marks: student.class_12th_total_marks || '',
        class_12th_percentage: student.class_12th_percentage || '',
        class_12th_subject: student.class_12th_subject || '',
      });

      const tradesData = tradesRes.data?.trades || tradesRes.data || [];
      setTrades(tradesData.map(t => ({ label: t.name || t.trade_name, value: t.name || t.trade_name })));

      const sessionsData = sessionsRes.data?.sessions || sessionsRes.data || [];
      setSessions(sessionsData.map(s => ({ label: s.name || s.session_name, value: s.name || s.session_name })));
    } catch (e) {
      console.error('Failed to load student:', e);
      Toast.show({ type: 'error', text1: 'Failed to load student data' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'class_10th_marks_obtained' || field === 'class_10th_total_marks') {
        const marks = parseFloat(field === 'class_10th_marks_obtained' ? value : updated.class_10th_marks_obtained);
        const total = parseFloat(field === 'class_10th_total_marks' ? value : updated.class_10th_total_marks);
        if (marks && total && total > 0) {
          updated.class_10th_percentage = ((marks / total) * 100).toFixed(2);
        }
      }
      if (field === 'class_12th_marks_obtained' || field === 'class_12th_total_marks') {
        const marks = parseFloat(field === 'class_12th_marks_obtained' ? value : updated.class_12th_marks_obtained);
        const total = parseFloat(field === 'class_12th_total_marks' ? value : updated.class_12th_total_marks);
        if (marks && total && total > 0) {
          updated.class_12th_percentage = ((marks / total) * 100).toFixed(2);
        }
      }

      return updated;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.student_name?.trim()) newErrors.student_name = 'Name is required';
    if (!form.mobile?.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!/^\d{10}$/.test(form.mobile.trim())) {
      newErrors.mobile = 'Mobile must be 10 digits';
    }
    if (!form.trade) newErrors.trade = 'Trade is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields' });
      return;
    }

    try {
      setSaving(true);
      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          payload[key] = val;
        }
      });

      await updateStudent(id, payload);
      Toast.show({ type: 'success', text1: 'Student updated successfully' });
      router.back();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.response?.data?.message || 'Failed to update student',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <FormInput label="Full Name" required value={form.student_name} onChangeText={v => updateField('student_name', v)} error={errors.student_name} placeholder="Enter full name" />
        <FormInput label="Father's Name" value={form.father_name} onChangeText={v => updateField('father_name', v)} placeholder="Enter father's name" />
        <FormInput label="Mother's Name" value={form.mother_name} onChangeText={v => updateField('mother_name', v)} placeholder="Enter mother's name" />
        <FormInput label="Mobile" required value={form.mobile} onChangeText={v => updateField('mobile', v)} error={errors.mobile} placeholder="10 digit mobile number" keyboardType="phone-pad" maxLength={10} />
        <FormInput label="Email" value={form.email} onChangeText={v => updateField('email', v)} placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" />
        <FormInput label="Date of Birth" value={form.dob} onChangeText={v => updateField('dob', v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <FormSelect label="Gender" value={form.gender} options={GENDER_OPTIONS} onValueChange={v => updateField('gender', v)} placeholder="Select gender" />
        <FormSelect label="Category" value={form.category} options={CATEGORY_OPTIONS} onValueChange={v => updateField('category', v)} placeholder="Select category" />
        <FormInput label="Aadhaar Number" value={form.uidai_number} onChangeText={v => updateField('uidai_number', v)} placeholder="12 digit Aadhaar" keyboardType="numeric" maxLength={12} />
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <FormInput label="Village/Town/City" value={form.village_town_city} onChangeText={v => updateField('village_town_city', v)} placeholder="Enter village/town/city" />
        <FormInput label="District" value={form.district} onChangeText={v => updateField('district', v)} placeholder="Enter district" />
        <FormInput label="State" value={form.state} onChangeText={v => updateField('state', v)} placeholder="Enter state" />
        <FormInput label="Pincode" value={form.pincode} onChangeText={v => updateField('pincode', v)} placeholder="Enter pincode" keyboardType="numeric" maxLength={6} />
        <FormInput label="Block" value={form.block} onChangeText={v => updateField('block', v)} placeholder="Enter block" />
        <FormInput label="Post Office" value={form.post_office} onChangeText={v => updateField('post_office', v)} placeholder="Enter post office" />
        <FormInput label="Police Station" value={form.police_station} onChangeText={v => updateField('police_station', v)} placeholder="Enter police station" />
      </View>

      {/* Education - 10th */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education - Class 10th</Text>
        <FormInput label="School" value={form.class_10th_school} onChangeText={v => updateField('class_10th_school', v)} placeholder="Enter school name" />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput label="Marks Obtained" value={form.class_10th_marks_obtained} onChangeText={v => updateField('class_10th_marks_obtained', v)} placeholder="Marks" keyboardType="numeric" />
          </View>
          <View style={styles.halfField}>
            <FormInput label="Total Marks" value={form.class_10th_total_marks} onChangeText={v => updateField('class_10th_total_marks', v)} placeholder="Total" keyboardType="numeric" />
          </View>
        </View>
        <FormInput label="Percentage" value={form.class_10th_percentage} onChangeText={v => updateField('class_10th_percentage', v)} placeholder="Auto-calculated" keyboardType="numeric" editable={false} />
        <FormInput label="Subject" value={form.class_10th_subject} onChangeText={v => updateField('class_10th_subject', v)} placeholder="Enter subject" />
      </View>

      {/* Education - 12th */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education - Class 12th</Text>
        <FormInput label="School" value={form.class_12th_school} onChangeText={v => updateField('class_12th_school', v)} placeholder="Enter school name" />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput label="Marks Obtained" value={form.class_12th_marks_obtained} onChangeText={v => updateField('class_12th_marks_obtained', v)} placeholder="Marks" keyboardType="numeric" />
          </View>
          <View style={styles.halfField}>
            <FormInput label="Total Marks" value={form.class_12th_total_marks} onChangeText={v => updateField('class_12th_total_marks', v)} placeholder="Total" keyboardType="numeric" />
          </View>
        </View>
        <FormInput label="Percentage" value={form.class_12th_percentage} onChangeText={v => updateField('class_12th_percentage', v)} placeholder="Auto-calculated" keyboardType="numeric" editable={false} />
        <FormInput label="Subject" value={form.class_12th_subject} onChangeText={v => updateField('class_12th_subject', v)} placeholder="Enter subject" />
      </View>

      {/* Admission Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admission Details</Text>
        <FormSelect label="Trade" required value={form.trade} options={trades} onValueChange={v => updateField('trade', v)} placeholder="Select trade" error={errors.trade} />
        <FormSelect label="Qualification" value={form.qualification} options={QUALIFICATION_OPTIONS} onValueChange={v => updateField('qualification', v)} placeholder="Select qualification" />
        <FormInput label="Enrollment Number" value={form.enrollment_number} onChangeText={v => updateField('enrollment_number', v)} placeholder="Enter enrollment number" />
        <FormSelect label="Session" value={form.session} options={sessions} onValueChange={v => updateField('session', v)} placeholder="Select session" />
        <FormSelect label="Shift" value={form.shift} options={SHIFT_OPTIONS} onValueChange={v => updateField('shift', v)} placeholder="Select shift" />
        <FormInput label="Academic Year" value={form.academic_year} onChangeText={v => updateField('academic_year', v)} placeholder="e.g. 2025-2026" />
        <FormSelect label="Status" value={form.status} options={STATUS_OPTIONS} onValueChange={v => updateField('status', v)} placeholder="Select status" />
      </View>

      {/* Registration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration</Text>
        <FormSelect label="Registration Type" value={form.registration_type} options={REGISTRATION_TYPE_OPTIONS} onValueChange={v => updateField('registration_type', v)} placeholder="Select type" />
        <FormInput label="State Registration" value={form.state_registration} onChangeText={v => updateField('state_registration', v)} placeholder="State registration number" />
        <FormInput label="Central Registration" value={form.central_registration} onChangeText={v => updateField('central_registration', v)} placeholder="Central registration number" />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16 },
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
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
