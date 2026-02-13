import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { getProfile, updateProfile, changePassword } from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';
import FormInput from '../../../src/components/FormInput';
import LoadingScreen from '../../../src/components/LoadingScreen';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const { isStaff, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await getProfile();
      const data = res.data?.data || res.data?.user || res.data;
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    try {
      setSavingProfile(true);
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      fetchProfile();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Toast.show({ type: 'error', text1: 'All password fields are required' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Toast.show({ type: 'error', text1: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} colors={[Colors.primary]} />}
    >
      {/* Role Badge */}
      <View style={[styles.roleBadge, isStaff ? styles.staffRoleBadge : styles.adminRoleBadge]}>
        <Ionicons
          name={isStaff ? "shield-checkmark" : "shield"}
          size={20}
          color={isStaff ? "#b45309" : "#166534"}
        />
        <Text style={[styles.roleBadgeText, isStaff ? styles.staffRoleText : styles.adminRoleText]}>
          {isStaff ? 'Staff Account' : 'Admin Account'}
        </Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <FormInput label="Name" required value={name} onChangeText={setName} placeholder="Your name" />
        <FormInput label="Email" value={email} editable={false} placeholder="Email" />
        <FormInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={savingProfile}>
          <Text style={styles.saveBtnText}>{savingProfile ? 'Saving...' : 'Update Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <FormInput
          label="Current Password"
          required
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
        />
        <FormInput
          label="New Password"
          required
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
        />
        <FormInput
          label="Confirm New Password"
          required
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          placeholder="Confirm new password"
          secureTextEntry
        />
        <TouchableOpacity style={[styles.saveBtn, styles.passwordBtn]} onPress={handleChangePassword} disabled={changingPassword}>
          <Text style={styles.saveBtnText}>{changingPassword ? 'Changing...' : 'Change Password'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  staffRoleBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  adminRoleBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  staffRoleText: {
    color: '#b45309',
  },
  adminRoleText: {
    color: '#166534',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  passwordBtn: { backgroundColor: '#f59e0b' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
