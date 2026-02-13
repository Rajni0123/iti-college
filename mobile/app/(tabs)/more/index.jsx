import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';

// Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';
import { useAuth } from '../../../src/context/AuthContext';

// ITI Admin menu items
const itiAdminMenuItems = [
  { label: 'Staff', icon: 'people', route: '/(tabs)/more/staff', color: '#6366f1' },
  { label: 'Notices', icon: 'megaphone', route: '/(tabs)/more/notices', color: '#f59e0b' },
  { label: 'Results', icon: 'document-text', route: '/(tabs)/more/results', color: '#10b981' },
  { label: 'Gallery', icon: 'images', route: '/(tabs)/more/gallery', color: '#ec4899' },
  { label: 'Sessions', icon: 'calendar', route: '/(tabs)/more/sessions', color: '#8b5cf6' },
  { label: 'Trades', icon: 'construct', route: '/(tabs)/more/trades', color: '#0ea5e9' },
  { label: 'Faculty', icon: 'school', route: '/(tabs)/more/faculty', color: '#14b8a6' },
  { label: 'Payslip', icon: 'receipt', route: '/(tabs)/more/payslip', color: '#0891b2' },
  { label: 'Printer', icon: 'print', route: '/(tabs)/more/printer', color: '#7c3aed' },
  { label: 'Settings', icon: 'settings', route: '/(tabs)/more/settings', color: '#64748b' },
  { label: 'Profile', icon: 'person-circle', route: '/(tabs)/more/profile', color: Colors.primary },
];

// Library Admin menu items - Bhagwa theme
const libraryMenuItems = [
  { label: 'Students', icon: 'people', route: '/(tabs)/library/students', color: LibraryColor },
  { label: 'Collect Fee', icon: 'cash', route: '/(tabs)/library/fees', color: '#16a34a' },
  { label: 'Expenses', icon: 'wallet', route: '/(tabs)/library/expenses', color: '#ef4444' },
  { label: 'Reports', icon: 'bar-chart', route: '/(tabs)/library/reports', color: LibraryColor },
  { label: 'Printer', icon: 'print', route: '/(tabs)/more/printer', color: '#7c3aed' },
  { label: 'Settings', icon: 'settings', route: '/(tabs)/library/settings', color: '#64748b' },
  { label: 'Profile', icon: 'person-circle', route: '/(tabs)/more/profile', color: LibraryColor },
];

// Staff-only menu items (very limited)
const staffMenuItems = [
  { label: 'My Profile', icon: 'person-circle', route: '/(tabs)/more/profile', color: Colors.primary },
];

export default function MoreIndex() {
  const router = useRouter();
  const { logout, isStaff, user, appMode } = useAuth();

  // Use different menu items based on role and mode
  const getMenuItems = () => {
    if (isStaff) return staffMenuItems;
    if (appMode === 'library') return libraryMenuItems;
    return itiAdminMenuItems;
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Staff Header - Show limited access notice */}
      {isStaff && (
        <View style={styles.staffHeader}>
          <View style={styles.staffBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
            <Text style={styles.staffBadgeText}>Staff Account</Text>
          </View>
          <Text style={styles.staffName}>{user?.name || user?.email || 'Staff'}</Text>
          <Text style={styles.staffNote}>Limited access - Fee collection only</Text>
        </View>
      )}

      {/* Mode Header - Show which mode we're in */}
      {!isStaff && (
        <View style={[styles.modeHeader, appMode === 'library' && styles.modeHeaderLibrary]}>
          <Ionicons
            name={appMode === 'library' ? 'library' : 'school'}
            size={24}
            color={appMode === 'library' ? LibraryColor : Colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>
              {appMode === 'library' ? 'Library Management' : 'ITI Management'}
            </Text>
            <Text style={styles.modeSubtitle}>
              {appMode === 'library' ? 'Managing library operations' : 'Managing college operations'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.gridItem}
            onPress={() => router.push(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  modeHeaderLibrary: {
    backgroundColor: '#FF6B0010',
    borderColor: '#FF6B0030',
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  modeSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  staffHeader: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  staffBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  staffNote: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
