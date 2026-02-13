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
  getLibraryStudents,
  createLibraryStudent,
  updateLibraryStudent,
  deleteLibraryStudent,
  getLibrarySeats,
  getLibraryLockers,
} from '../../../src/services/api';

export default function LibraryStudentsScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  // Seats and Lockers
  const [availableSeats, setAvailableSeats] = useState([]);
  const [availableLockers, setAvailableLockers] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    whatsapp_number: '',
    has_whatsapp: true,
    admission_fee: '',
    monthly_fee: '',
    advance_paid: '0',
    seat_number: '',
    locker_number: '',
  });

  const fetchStudents = useCallback(async () => {
    try {
      const response = await getLibraryStudents({ search: searchQuery });
      setStudents(response.data?.students || response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  // Fetch available seats and lockers
  const fetchSeatsAndLockers = async (currentSeat = null, currentLocker = null) => {
    setLoadingSeats(true);
    try {
      const [seatsRes, lockersRes] = await Promise.all([
        getLibrarySeats(),
        getLibraryLockers(),
      ]);

      // Filter available seats (or include current student's seat)
      const seats = (seatsRes.data || []).filter(
        s => s.status === 'Available' || s.seat_number === currentSeat
      );
      // Sort seats by number
      seats.sort((a, b) => {
        const numA = parseInt(a.seat_number) || 0;
        const numB = parseInt(b.seat_number) || 0;
        return numA - numB;
      });
      setAvailableSeats(seats);

      // Filter available lockers (or include current student's locker)
      const lockers = (lockersRes.data || []).filter(
        l => l.status === 'Available' || l.locker_number === currentLocker
      );
      // Sort lockers by number
      lockers.sort((a, b) => {
        const numA = parseInt(a.locker_number) || 0;
        const numB = parseInt(b.locker_number) || 0;
        return numA - numB;
      });
      setAvailableLockers(lockers);

      return { seats, lockers };
    } catch (error) {
      console.error('Error fetching seats/lockers:', error);
      return { seats: [], lockers: [] };
    } finally {
      setLoadingSeats(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      mobile: '',
      whatsapp_number: '',
      has_whatsapp: true,
      admission_fee: '',
      monthly_fee: '',
      advance_paid: '0',
      seat_number: '',
      locker_number: '',
    });
    setEditingStudent(null);
  };

  const openAddModal = async () => {
    resetForm();
    setModalVisible(true);
    // Fetch seats and auto-select first available
    const { seats } = await fetchSeatsAndLockers();
    if (seats.length > 0) {
      setForm(prev => ({ ...prev, seat_number: seats[0].seat_number }));
    }
  };

  const openEditModal = async (student) => {
    setEditingStudent(student);
    setForm({
      name: student.name || '',
      mobile: student.mobile || '',
      whatsapp_number: student.whatsapp_number || '',
      has_whatsapp: student.has_whatsapp ?? true,
      admission_fee: String(student.admission_fee || ''),
      monthly_fee: String(student.monthly_fee || ''),
      advance_paid: String(student.advance_paid || '0'),
      seat_number: student.seat_number || '',
      locker_number: student.locker_number || '',
    });
    setModalVisible(true);
    // Fetch seats and lockers (include current student's assigned ones)
    await fetchSeatsAndLockers(student.seat_number, student.locker_number);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.mobile.trim()) {
      Alert.alert('Error', 'Name and Mobile are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        admission_fee: parseFloat(form.admission_fee) || 0,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        advance_paid: parseFloat(form.advance_paid) || 0,
        seat_number: form.seat_number || null,
        locker_number: form.locker_number || null,
      };

      if (editingStudent) {
        await updateLibraryStudent(editingStudent.id, payload);
        Alert.alert('Success', 'Student updated successfully');
      } else {
        await createLibraryStudent(payload);
        Alert.alert('Success', 'Student added successfully');
      }

      setModalVisible(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLibraryStudent(student.id);
              Alert.alert('Success', 'Student deleted');
              fetchStudents();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete student');
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentAvatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentMobile}>{item.mobile}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.fee_status === 'Paid' ? '#dcfce7' : '#fef2f2' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.fee_status === 'Paid' ? '#16a34a' : '#ef4444' }
          ]}>
            {item.fee_status || 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.studentDetails}>
        {item.seat_number && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="seat" size={16} color="#64748b" />
            <Text style={styles.detailText}>Seat: {item.seat_number}</Text>
          </View>
        )}
        {item.locker_number && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="locker" size={16} color="#64748b" />
            <Text style={styles.detailText}>Locker: {item.locker_number}</Text>
          </View>
        )}
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="currency-inr" size={16} color="#64748b" />
          <Text style={styles.detailText}>Fee: {formatCurrency(item.monthly_fee || 0)}/mo</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
        >
          <MaterialCommunityIcons name="pencil" size={18} color={LibraryColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
          onPress={() => handleDelete(item)}
        >
          <MaterialCommunityIcons name="delete" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchStudents}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchStudents(); }}>
            <MaterialCommunityIcons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudent}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
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
              <Text style={styles.modalTitle}>
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={LibraryColor} />
                ) : (
                  <Text style={styles.saveBtn}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student name"
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                value={form.mobile}
                onChangeText={(text) => setForm({ ...form, mobile: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter WhatsApp number"
                value={form.whatsapp_number}
                onChangeText={(text) => setForm({ ...form, whatsapp_number: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Admission Fee</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={form.admission_fee}
                onChangeText={(text) => setForm({ ...form, admission_fee: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Monthly Fee</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={form.monthly_fee}
                onChangeText={(text) => setForm({ ...form, monthly_fee: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Advance Paid</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={form.advance_paid}
                onChangeText={(text) => setForm({ ...form, advance_paid: text })}
                keyboardType="numeric"
              />

              {/* Seat Selection */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="seat" size={20} color={LibraryColor} />
                <Text style={styles.sectionTitle}>Seat Allocation</Text>
              </View>

              {loadingSeats ? (
                <ActivityIndicator size="small" color={LibraryColor} style={{ marginVertical: 10 }} />
              ) : (
                <>
                  <Text style={styles.inputLabel}>
                    Select Seat {availableSeats.length > 0 && `(${availableSeats.length} available)`}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seatScrollView}>
                    <View style={styles.seatGrid}>
                      <TouchableOpacity
                        style={[
                          styles.seatBtn,
                          !form.seat_number && styles.seatBtnSelected,
                        ]}
                        onPress={() => setForm({ ...form, seat_number: '' })}
                      >
                        <Text style={[styles.seatBtnText, !form.seat_number && styles.seatBtnTextSelected]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {availableSeats.map((seat) => (
                        <TouchableOpacity
                          key={seat.id}
                          style={[
                            styles.seatBtn,
                            form.seat_number === seat.seat_number && styles.seatBtnSelected,
                          ]}
                          onPress={() => setForm({ ...form, seat_number: seat.seat_number })}
                        >
                          <Text style={[
                            styles.seatBtnText,
                            form.seat_number === seat.seat_number && styles.seatBtnTextSelected,
                          ]}>
                            {seat.seat_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {form.seat_number && (
                    <Text style={styles.selectedInfo}>
                      Selected Seat: <Text style={styles.selectedValue}>{form.seat_number}</Text>
                    </Text>
                  )}
                </>
              )}

              {/* Locker Selection */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="locker" size={20} color={LibraryColor} />
                <Text style={styles.sectionTitle}>Locker (Optional)</Text>
              </View>

              {loadingSeats ? (
                <ActivityIndicator size="small" color={LibraryColor} style={{ marginVertical: 10 }} />
              ) : (
                <>
                  <Text style={styles.inputLabel}>
                    Select Locker {availableLockers.length > 0 && `(${availableLockers.length} available)`}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seatScrollView}>
                    <View style={styles.seatGrid}>
                      <TouchableOpacity
                        style={[
                          styles.lockerBtn,
                          !form.locker_number && styles.lockerBtnSelected,
                        ]}
                        onPress={() => setForm({ ...form, locker_number: '' })}
                      >
                        <Text style={[styles.lockerBtnText, !form.locker_number && styles.lockerBtnTextSelected]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {availableLockers.map((locker) => (
                        <TouchableOpacity
                          key={locker.id}
                          style={[
                            styles.lockerBtn,
                            form.locker_number === locker.locker_number && styles.lockerBtnSelected,
                          ]}
                          onPress={() => setForm({ ...form, locker_number: locker.locker_number })}
                        >
                          <Text style={[
                            styles.lockerBtnText,
                            form.locker_number === locker.locker_number && styles.lockerBtnTextSelected,
                          ]}>
                            {locker.locker_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {form.locker_number && (
                    <Text style={styles.selectedInfo}>
                      Selected Locker: <Text style={styles.selectedValue}>{form.locker_number}</Text>
                    </Text>
                  )}
                </>
              )}

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LibraryColor + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: LibraryColor,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  studentMobile: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  studentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LibraryColor + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: LibraryColor,
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
    marginBottom: 6,
    marginTop: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  seatScrollView: {
    marginVertical: 8,
  },
  seatGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  seatBtn: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBtnSelected: {
    backgroundColor: LibraryColor,
  },
  seatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  seatBtnTextSelected: {
    color: '#fff',
  },
  lockerBtn: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockerBtnSelected: {
    backgroundColor: '#7c3aed',
  },
  lockerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
  },
  lockerBtnTextSelected: {
    color: '#fff',
  },
  selectedInfo: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  selectedValue: {
    fontWeight: '700',
    color: LibraryColor,
  },
});
