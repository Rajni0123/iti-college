import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  Image, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../../src/constants/colors';
import { getStudentById, getStudentFeeHistory } from '../../../src/services/api';
import { formatDate, formatCurrency } from '../../../src/utils/formatters';
import { printReceipt, shareReceiptAsPDF } from '../../../src/utils/receipt';
import LoadingScreen from '../../../src/components/LoadingScreen';
import StatusBadge from '../../../src/components/StatusBadge';
import Toast from 'react-native-toast-message';

const API_BASE = 'https://manerpvtiti.space';

export default function StudentProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [feeHistory, setFeeHistory] = useState([]);
  const [feeSummary, setFeeSummary] = useState({ total: 0, paid: 0, due: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharingId, setSharingId] = useState(null);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await getStudentById(id);
      const data = res.data?.data || res.data?.student || res.data;
      setStudent(data);

      // Fetch fee history using admission_id
      const admissionId = data?.admission_id || data?.id;
      if (admissionId) {
        try {
          const feeRes = await getStudentFeeHistory(admissionId);
          const feeData = feeRes.data;
          setFeeHistory(feeData?.fees || []);
          setFeeSummary({
            total: feeData?.total_fees || 0,
            paid: feeData?.total_paid || 0,
            due: feeData?.total_due || 0,
          });
        } catch {
          setFeeHistory([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch student:', e);
      Toast.show({ type: 'error', text1: 'Failed to load student details' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleShareReceipt = async (fee) => {
    setSharingId(fee.id);
    try {
      await shareReceiptAsPDF({
        ...fee,
        student_name: student?.student_name || student?.name,
        father_name: student?.father_name,
        mobile: student?.mobile,
        trade: student?.trade,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to share receipt' });
    } finally {
      setSharingId(null);
    }
  };

  const handlePrintReceipt = async (fee) => {
    try {
      await printReceipt({
        ...fee,
        student_name: student?.student_name || student?.name,
        father_name: student?.father_name,
        mobile: student?.mobile,
        trade: student?.trade,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to print receipt' });
    }
  };

  const handleCall = () => {
    if (student?.mobile) Linking.openURL(`tel:${student.mobile}`);
  };

  const handlePrintStudentForm = async () => {
    if (!student) return;

    const name = student.student_name || student.name || '';
    const photoUrl = student.photo && student.photo !== 'manual_verified'
      ? `${API_BASE}/uploads/${student.photo}`
      : null;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Admission Form - ${name}</title>
    <style>
      @media print {
        @page { margin: 10mm; size: A4 portrait; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }
      }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 8px; line-height: 1.25; font-size: 10px; position: relative; }
      .student-photo { position: absolute; top: 8px; right: 8px; width: 88px; height: 105px; border: 2px solid #195de6; border-radius: 3px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .student-photo img { width: 100%; height: 100%; object-fit: cover; }
      .student-photo-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); display: flex; align-items: center; justify-content: center; color: #999; font-size: 8px; text-align: center; padding: 4px; }
      .header { text-align: center; border-bottom: 2px solid #195de6; padding-bottom: 5px; margin-bottom: 7px; margin-right: 100px; }
      .header h1 { margin: 0 0 2px 0; font-size: 19px; font-weight: bold; color: #195de6; letter-spacing: 0.4px; }
      .header .address { margin: 1px 0; font-size: 8px; color: #555; line-height: 1.2; }
      .header .contact-info { margin: 1px 0; font-size: 8px; color: #555; }
      .header .form-title { margin: 4px 0 2px 0; font-size: 12px; font-weight: bold; color: #333; }
      .header .enrollment-id { margin: 1px 0; font-size: 9px; font-weight: bold; color: #195de6; }
      .form-section { margin-bottom: 6px; page-break-inside: avoid; }
      .form-section h3 { background: linear-gradient(to right, #195de6, #1e40af); color: white; padding: 3px 7px; margin: 0 0 4px 0; border-radius: 2px; font-size: 9.5px; font-weight: bold; }
      .form-row { display: flex; margin-bottom: 4px; gap: 7px; }
      .form-field { flex: 1; }
      .form-label { font-weight: 600; color: #333; margin-bottom: 1px; display: block; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.2px; }
      .form-value { padding: 3px 5px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 2px; min-height: 15px; font-size: 9px; color: #212529; }
      .status-badge { display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 10px; font-size: 8.5px; font-weight: 600; background: #d4edda; color: #155724; }
      .signature-section { margin-top: 10px; display: flex; justify-content: space-between; page-break-inside: avoid; }
      .signature-box { width: 45%; text-align: center; }
      .signature-line { border-top: 1px solid #000; margin-top: 20px; padding-top: 3px; font-weight: 600; font-size: 9px; }
      .footer { margin-top: 8px; text-align: center; font-size: 7.5px; color: #666; border-top: 1px solid #ddd; padding-top: 4px; }
      .declaration-box { background: #fff8dc; border: 1px solid #ffd700; padding: 5px 7px; margin-top: 6px; border-radius: 2px; font-size: 8.5px; line-height: 1.35; }
    </style>
  </head>
  <body>
    <div class="student-photo">
      ${photoUrl ?
        `<img src="${photoUrl}" alt="Student Photo">` :
        `<div class="student-photo-placeholder">Photo Not Available</div>`
      }
    </div>

    <div class="header">
      <h1>Maner Pvt ITI</h1>
      <p class="address">Maner MAHINAWAN, NEAR VISHWAKARMA MANDIR, MANER, PATNA - 801108</p>
      <p class="contact-info">Contact: 9155401839 | Email: MANERPVTITI@GMAIL.COM</p>
      <p class="form-title">Student Admission Form</p>
      ${student.enrollment_number ? `<p class="enrollment-id">Enrollment No: ${student.enrollment_number}</p>` : ''}
    </div>

    <div class="form-section">
      <h3>Personal Information</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Full Name:</span><div class="form-value">${name}</div></div>
        <div class="form-field"><span class="form-label">Father's Name:</span><div class="form-value">${student.father_name || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Mother's Name:</span><div class="form-value">${student.mother_name || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">UIDAI No (Aadhaar):</span><div class="form-value">${student.uidai_number || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Mobile Number:</span><div class="form-value">${student.mobile || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Email:</span><div class="form-value">${student.email || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Date of Birth:</span><div class="form-value">${student.dob ? formatDate(student.dob) : 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Gender:</span><div class="form-value">${student.gender || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Category:</span><div class="form-value">${student.category || 'N/A'}</div></div>
      </div>
    </div>

    <div class="form-section">
      <h3>Address Information</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Village/Town/City:</span><div class="form-value">${student.village_town_city || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Post Office:</span><div class="form-value">${student.post_office || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Police Station:</span><div class="form-value">${student.police_station || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Block:</span><div class="form-value">${student.block || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">District:</span><div class="form-value">${student.district || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">State:</span><div class="form-value">${student.state || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Pincode:</span><div class="form-value">${student.pincode || 'N/A'}</div></div>
      </div>
    </div>

    <div class="form-section">
      <h3>Qualification - Class 10th</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">School Name:</span><div class="form-value">${student.class_10th_school || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Subject:</span><div class="form-value">${student.class_10th_subject || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Marks Obtained:</span><div class="form-value">${student.class_10th_marks_obtained || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Total Marks:</span><div class="form-value">${student.class_10th_total_marks || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Percentage:</span><div class="form-value">${student.class_10th_percentage || 'N/A'}%</div></div>
      </div>
    </div>

    <div class="form-section">
      <h3>Qualification - Class 12th (If Applicable)</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">School Name:</span><div class="form-value">${student.class_12th_school || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Subject:</span><div class="form-value">${student.class_12th_subject || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Marks Obtained:</span><div class="form-value">${student.class_12th_marks_obtained || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Total Marks:</span><div class="form-value">${student.class_12th_total_marks || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Percentage:</span><div class="form-value">${student.class_12th_percentage || 'N/A'}%</div></div>
      </div>
    </div>

    <div class="form-section">
      <h3>Admission Details</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Session:</span><div class="form-value">${student.session || student.academic_year || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Shift:</span><div class="form-value">${student.shift || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Trade:</span><div class="form-value">${student.trade || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Status:</span><div class="form-value"><span class="status-badge">${student.status || 'Approved'}</span></div></div>
      </div>
    </div>

    <div class="declaration-box">
      <strong>Declaration:</strong> The details provided above were given by me. If any detail is incorrect, the institute has full authority to take action. I agree to abide by the rules and regulations of the institute.
    </div>

    <div class="signature-section">
      <div class="signature-box"><div class="signature-line">Student Signature</div></div>
      <div class="signature-box"><div class="signature-line">Authorized Signatory</div></div>
    </div>

    <div class="footer">
      <p>This is a computer-generated document. Generated on: ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </body>
</html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Toast.show({ type: 'error', text1: 'Failed to print form' });
    }
  };

  const handleShareStudentForm = async () => {
    if (!student) return;

    const name = student.student_name || student.name || '';
    const photoUrl = student.photo && student.photo !== 'manual_verified'
      ? `${API_BASE}/uploads/${student.photo}`
      : null;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Admission Form - ${name}</title>
    <style>
      @media print {
        @page { margin: 10mm; size: A4 portrait; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }
      }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 8px; line-height: 1.25; font-size: 10px; position: relative; }
      .student-photo { position: absolute; top: 8px; right: 8px; width: 88px; height: 105px; border: 2px solid #195de6; border-radius: 3px; overflow: hidden; }
      .student-photo img { width: 100%; height: 100%; object-fit: cover; }
      .student-photo-placeholder { width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 8px; }
      .header { text-align: center; border-bottom: 2px solid #195de6; padding-bottom: 5px; margin-bottom: 7px; margin-right: 100px; }
      .header h1 { margin: 0 0 2px 0; font-size: 19px; font-weight: bold; color: #195de6; }
      .header .address { margin: 1px 0; font-size: 8px; color: #555; }
      .header .contact-info { margin: 1px 0; font-size: 8px; color: #555; }
      .header .form-title { margin: 4px 0 2px 0; font-size: 12px; font-weight: bold; color: #333; }
      .header .enrollment-id { margin: 1px 0; font-size: 9px; font-weight: bold; color: #195de6; }
      .form-section { margin-bottom: 6px; }
      .form-section h3 { background: linear-gradient(to right, #195de6, #1e40af); color: white; padding: 3px 7px; margin: 0 0 4px 0; border-radius: 2px; font-size: 9.5px; font-weight: bold; }
      .form-row { display: flex; margin-bottom: 4px; gap: 7px; }
      .form-field { flex: 1; }
      .form-label { font-weight: 600; color: #333; margin-bottom: 1px; display: block; font-size: 7.5px; text-transform: uppercase; }
      .form-value { padding: 3px 5px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 2px; min-height: 15px; font-size: 9px; color: #212529; }
      .status-badge { display: inline-flex; padding: 2px 6px; border-radius: 10px; font-size: 8.5px; font-weight: 600; background: #d4edda; color: #155724; }
      .signature-section { margin-top: 10px; display: flex; justify-content: space-between; }
      .signature-box { width: 45%; text-align: center; }
      .signature-line { border-top: 1px solid #000; margin-top: 20px; padding-top: 3px; font-weight: 600; font-size: 9px; }
      .footer { margin-top: 8px; text-align: center; font-size: 7.5px; color: #666; border-top: 1px solid #ddd; padding-top: 4px; }
      .declaration-box { background: #fff8dc; border: 1px solid #ffd700; padding: 5px 7px; margin-top: 6px; border-radius: 2px; font-size: 8.5px; }
    </style>
  </head>
  <body>
    <div class="student-photo">
      ${photoUrl ? `<img src="${photoUrl}" alt="Student Photo">` : `<div class="student-photo-placeholder">Photo Not Available</div>`}
    </div>
    <div class="header">
      <h1>Maner Pvt ITI</h1>
      <p class="address">Maner MAHINAWAN, NEAR VISHWAKARMA MANDIR, MANER, PATNA - 801108</p>
      <p class="contact-info">Contact: 9155401839 | Email: MANERPVTITI@GMAIL.COM</p>
      <p class="form-title">Student Admission Form</p>
      ${student.enrollment_number ? `<p class="enrollment-id">Enrollment No: ${student.enrollment_number}</p>` : ''}
    </div>
    <div class="form-section">
      <h3>Personal Information</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Full Name:</span><div class="form-value">${name}</div></div>
        <div class="form-field"><span class="form-label">Father's Name:</span><div class="form-value">${student.father_name || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Mother's Name:</span><div class="form-value">${student.mother_name || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">UIDAI No:</span><div class="form-value">${student.uidai_number || 'N/A'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Mobile:</span><div class="form-value">${student.mobile || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Category:</span><div class="form-value">${student.category || 'N/A'}</div></div>
      </div>
    </div>
    <div class="form-section">
      <h3>Address Information</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Village/Town:</span><div class="form-value">${student.village_town_city || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">District:</span><div class="form-value">${student.district || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">State:</span><div class="form-value">${student.state || 'N/A'}</div></div>
      </div>
    </div>
    <div class="form-section">
      <h3>Admission Details</h3>
      <div class="form-row">
        <div class="form-field"><span class="form-label">Trade:</span><div class="form-value">${student.trade || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Session:</span><div class="form-value">${student.session || student.academic_year || 'N/A'}</div></div>
        <div class="form-field"><span class="form-label">Status:</span><div class="form-value"><span class="status-badge">${student.status || 'Approved'}</span></div></div>
      </div>
    </div>
    <div class="declaration-box">
      <strong>Declaration:</strong> The details provided above were given by me. I agree to abide by the rules and regulations of the institute.
    </div>
    <div class="signature-section">
      <div class="signature-box"><div class="signature-line">Student Signature</div></div>
      <div class="signature-box"><div class="signature-line">Authorized Signatory</div></div>
    </div>
    <div class="footer">
      <p>This is a computer-generated document. Generated on: ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </body>
</html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Share error:', error);
      Toast.show({ type: 'error', text1: 'Failed to share PDF' });
    }
  };

  if (loading) return <LoadingScreen />;
  if (!student) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Student not found</Text>
      </View>
    );
  }

  const name = student.student_name || student.name || '';
  const photoUrl = student.photo && student.photo !== 'manual_verified'
    ? `${API_BASE}/uploads/${student.photo}`
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{name}</Text>
              {student.father_name && (
                <Text style={styles.profileSubtext}>S/o {student.father_name}</Text>
              )}
              {student.mother_name && (
                <Text style={styles.profileSubtext}>M/o {student.mother_name}</Text>
              )}
            </View>
          </View>
          <View style={styles.profileMeta}>
            <MetaItem icon="briefcase-outline" label="Trade" value={student.trade || '-'} />
            <MetaItem icon="calendar-outline" label="Session" value={student.session || student.academic_year || '-'} />
            <MetaItem icon="card-account-details-outline" label="Enrollment" value={student.enrollment_number || 'Not Assigned'} />
          </View>
          {student.mobile && (
            <TouchableOpacity style={styles.callRow} onPress={handleCall} activeOpacity={0.7}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.callRowText}>Call {student.mobile}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fee Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fee Summary</Text>
          <View style={styles.feeGrid}>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Total Fees</Text>
              <Text style={[styles.feeValue, { color: Colors.text }]}>{formatCurrency(feeSummary.total)}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Paid</Text>
              <Text style={[styles.feeValue, { color: Colors.success }]}>{formatCurrency(feeSummary.paid)}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Due</Text>
              <Text style={[styles.feeValue, { color: feeSummary.due > 0 ? Colors.error : Colors.success }]}>
                {formatCurrency(feeSummary.due)}
              </Text>
            </View>
          </View>
          {feeSummary.total > 0 && (
            <View style={styles.feeProgress}>
              <View style={styles.feeProgressBar}>
                <View style={[styles.feeProgressFill, { width: `${Math.min((feeSummary.paid / feeSummary.total) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.feeProgressText}>
                {Math.round((feeSummary.paid / feeSummary.total) * 100)}% paid
              </Text>
            </View>
          )}
        </View>

        {/* Payment History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment History ({feeHistory.length})</Text>
          {feeHistory.length === 0 ? (
            <Text style={styles.emptyText}>No fee records found</Text>
          ) : (
            feeHistory.map((fee, idx) => {
              const paid = parseFloat(fee.paid_amount) || 0;
              const total = parseFloat(fee.amount || fee.total_amount) || 0;
              return (
                <View key={fee.id || idx} style={styles.paymentItem}>
                  <View style={styles.paymentHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentType}>{fee.fee_type || 'Fee'}</Text>
                      <Text style={styles.paymentDate}>
                        {fee.payment_date ? formatDate(fee.payment_date) : formatDate(fee.created_at)}
                      </Text>
                    </View>
                    <StatusBadge status={fee.status || (paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending')} />
                  </View>
                  <View style={styles.paymentAmounts}>
                    <View style={styles.paymentAmountItem}>
                      <Text style={styles.paymentAmountLabel}>Total</Text>
                      <Text style={styles.paymentAmountValue}>{formatCurrency(total)}</Text>
                    </View>
                    <View style={styles.paymentAmountItem}>
                      <Text style={styles.paymentAmountLabel}>Paid</Text>
                      <Text style={[styles.paymentAmountValue, { color: Colors.success }]}>{formatCurrency(paid)}</Text>
                    </View>
                    {fee.payment_method && (
                      <View style={styles.paymentAmountItem}>
                        <Text style={styles.paymentAmountLabel}>Method</Text>
                        <Text style={styles.paymentAmountValue}>{fee.payment_method}</Text>
                      </View>
                    )}
                    {fee.receipt_number && (
                      <View style={styles.paymentAmountItem}>
                        <Text style={styles.paymentAmountLabel}>Receipt</Text>
                        <Text style={styles.paymentAmountValue}>{fee.receipt_number}</Text>
                      </View>
                    )}
                  </View>
                  {paid > 0 && (
                    <View style={styles.paymentActions}>
                      <TouchableOpacity
                        style={styles.miniBtn}
                        onPress={() => handlePrintReceipt(fee)}
                      >
                        <Ionicons name="print-outline" size={14} color={Colors.primary} />
                        <Text style={styles.miniBtnText}>Print</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.miniBtn, styles.miniBtnFilled]}
                        onPress={() => handleShareReceipt(fee)}
                        disabled={sharingId === fee.id}
                      >
                        {sharingId === fee.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="share-outline" size={14} color="#fff" />
                            <Text style={[styles.miniBtnText, { color: '#fff' }]}>Share PDF</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Personal Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <InfoRow label="Date of Birth" value={formatDate(student.dob)} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Category" value={student.category} />
          <InfoRow label="Aadhaar" value={student.uidai_number} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Mobile" value={student.mobile} />
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Address</Text>
          <InfoRow label="Village/City" value={student.village_town_city} />
          <InfoRow label="Post Office" value={student.post_office} />
          <InfoRow label="Police Station" value={student.police_station} />
          <InfoRow label="Block" value={student.block} />
          <InfoRow label="District" value={student.district} />
          <InfoRow label="State" value={student.state} />
          <InfoRow label="PIN Code" value={student.pincode} />
        </View>

        {/* Education Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Education</Text>
          <InfoRow label="Qualification" value={student.qualification} />
          {student.class_10th_school && (
            <>
              <Text style={styles.subSectionTitle}>Class 10th</Text>
              <InfoRow label="School" value={student.class_10th_school} />
              <InfoRow label="Marks" value={student.class_10th_marks_obtained ? `${student.class_10th_marks_obtained}/${student.class_10th_total_marks}` : null} />
              <InfoRow label="Percentage" value={student.class_10th_percentage ? `${student.class_10th_percentage}%` : null} />
            </>
          )}
          {student.class_12th_school && (
            <>
              <Text style={styles.subSectionTitle}>Class 12th</Text>
              <InfoRow label="School" value={student.class_12th_school} />
              <InfoRow label="Marks" value={student.class_12th_marks_obtained ? `${student.class_12th_marks_obtained}/${student.class_12th_total_marks}` : null} />
              <InfoRow label="Percentage" value={student.class_12th_percentage ? `${student.class_12th_percentage}%` : null} />
            </>
          )}
        </View>

        {/* Edit / Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(tabs)/students/edit/${id}`)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePrintStudentForm}
          >
            <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFilled]}
            onPress={handleShareStudentForm}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Share PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.textSecondary} />
      <View>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },

  // Profile Card
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  profileSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  profileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  callRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Generic Card
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  // Fee Summary
  feeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeItem: {
    alignItems: 'center',
    flex: 1,
  },
  feeLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  feeValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  feeProgress: {
    marginTop: 4,
  },
  feeProgressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  feeProgressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  feeProgressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Payment History
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  paymentItem: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  paymentAmountItem: {},
  paymentAmountLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  paymentAmountValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 1,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  miniBtnFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 10,
    marginBottom: 4,
  },

  // Actions
  actionsRow: {
    paddingHorizontal: 14,
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  actionBtnFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
