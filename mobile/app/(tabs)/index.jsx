import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatCard from '../../src/components/StatCard';
import { Colors } from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/formatters';
import { useAuth } from '../../src/context/AuthContext';
import { getDashboardStats, getFeeSummary, getAllStudents, getAllTrades, getLibraryDashboard } from '../../src/services/api';

export default function DashboardScreen() {
  const router = useRouter();
  const { appMode, setAppMode } = useAuth();
  const [stats, setStats] = useState(null);
  const [libraryStats, setLibraryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchITIStats = useCallback(async () => {
    try {
      // Fetch all data sources in parallel
      const [statsRes, feeRes, studentsRes, tradesRes] = await Promise.all([
        getDashboardStats().catch(() => ({ data: {} })),
        getFeeSummary().catch(() => ({ data: {} })),
        getAllStudents().catch(() => ({ data: [] })),
        getAllTrades().catch(() => ({ data: [] })),
      ]);

      const dashData = statsRes.data || {};
      const feeSummary = feeRes.data || {};

      // Count students from direct API
      const studentsData = studentsRes.data;
      const studentsList = Array.isArray(studentsData) ? studentsData : (studentsData?.data || studentsData?.students || []);
      const studentCount = studentsList.length;

      // Build trade seats from trades + students data
      const tradesData = tradesRes.data;
      const tradesList = Array.isArray(tradesData) ? tradesData : (tradesData?.data || tradesData?.trades || []);
      let tradeSeats = dashData.tradeSeats || [];
      if (tradeSeats.length === 0 && tradesList.length > 0) {
        tradeSeats = tradesList.map(t => {
          const tradeName = t.name || t.trade_name;
          const totalSeats = parseInt(t.seats) || 0;
          const enrolled = studentsList.filter(s => (s.trade || s.trade_name) === tradeName).length;
          return {
            id: t.id,
            name: tradeName,
            totalSeats,
            enrolled,
            available: Math.max(0, totalSeats - enrolled),
          };
        });
      }

      // Merge: use dashboard stats, fill gaps from direct API calls
      return {
        ...dashData,
        totalStudents: dashData.totalStudents || studentCount,
        totalFeesCollected: dashData.totalFeesCollected || feeSummary.total_collected || 0,
        totalFeesPending: feeSummary.total_pending || 0,
        pendingAdmissions: dashData.pendingAdmissions ?? 0,
        totalAdmissions: dashData.totalAdmissions ?? 0,
        tradeSeats,
      };
    } catch (err) {
      console.error('ITI Dashboard fetch error:', err.message);
      throw err;
    }
  }, []);

  const fetchLibraryStats = useCallback(async () => {
    try {
      const response = await getLibraryDashboard();
      return response.data || {};
    } catch (err) {
      console.error('Library Dashboard fetch error:', err.message);
      throw err;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      if (appMode === 'library') {
        const libData = await fetchLibraryStats();
        setLibraryStats(libData);
      } else {
        const itiData = await fetchITIStats();
        setStats(itiData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMode, fetchITIStats, fetchLibraryStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh on screen focus for real-time sync
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.centered} edges={['left', 'right', 'bottom']}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ITI Quick Actions
  const itiQuickActions = [
    {
      label: 'New Admission',
      icon: 'plus-circle-outline',
      color: Colors.primary,
      route: '/admissions/create',
    },
    {
      label: 'Collect Fee',
      icon: 'cash-plus',
      color: '#16a34a',
      route: '/fees/collect',
    },
    {
      label: 'View Students',
      icon: 'account-group-outline',
      color: '#8b5cf6',
      route: '/(tabs)/students',
    },
  ];

  // Library Quick Actions
  const libraryQuickActions = [
    {
      label: 'Add Student',
      icon: 'account-plus-outline',
      color: Colors.primary,
      route: '/(tabs)/library/students',
    },
    {
      label: 'Collect Fee',
      icon: 'cash-plus',
      color: '#16a34a',
      route: '/(tabs)/library/fees',
    },
    {
      label: 'Add Expense',
      icon: 'cash-minus',
      color: '#ef4444',
      route: '/(tabs)/library/expenses',
    },
  ];

  const quickActions = appMode === 'library' ? libraryQuickActions : itiQuickActions;
  const tradeSeats = stats?.tradeSeats || [];

  // Mode Toggle Component
  const ModeToggle = () => (
    <View style={styles.modeToggleContainer}>
      <TouchableOpacity
        style={[styles.modeTab, appMode === 'iti' && styles.modeTabActive]}
        onPress={() => setAppMode('iti')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="school"
          size={18}
          color={appMode === 'iti' ? '#fff' : '#64748b'}
        />
        <Text style={[styles.modeTabText, appMode === 'iti' && styles.modeTabTextActive]}>
          ITI
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeTab, appMode === 'library' && styles.modeTabActiveLibrary]}
        onPress={() => setAppMode('library')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="bookshelf"
          size={18}
          color={appMode === 'library' ? '#fff' : '#64748b'}
        />
        <Text style={[styles.modeTabText, appMode === 'library' && styles.modeTabTextActive]}>
          Library
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Library Dashboard Content
  const renderLibraryDashboard = () => {
    const ls = libraryStats || {};
    const occupancyPercent = ls.total_seats > 0
      ? Math.round((ls.occupied_seats / ls.total_seats) * 100)
      : 0;

    return (
      <>
        {/* Library Header - Bhagwa Theme */}
        <View style={[styles.collegeHeader, { backgroundColor: Colors.bhagwa }]}>
          <View style={styles.collegeBadge}>
            <MaterialCommunityIcons name="bookshelf" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.collegeName}>Library Management</Text>
            <Text style={styles.collegeCode}>Maner Pvt ITI</Text>
          </View>
        </View>

        {/* Library Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Today's Collection"
              value={formatCurrency(ls.today_collection ?? 0)}
              icon="cash"
              color="#16a34a"
            />
            <StatCard
              title="Monthly Collection"
              value={formatCurrency(ls.monthly_collection ?? 0)}
              icon="calendar-month"
              color={Colors.bhagwa}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Students"
              value={ls.total_students ?? 0}
              icon="account-group"
              color={Colors.bhagwa}
            />
            <StatCard
              title="Monthly Profit"
              value={formatCurrency(ls.monthly_profit ?? 0)}
              icon="trending-up"
              color={ls.monthly_profit >= 0 ? '#16a34a' : '#ef4444'}
            />
          </View>
        </View>

        {/* Seat Occupancy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seat Occupancy</Text>
          <View style={styles.occupancyCard}>
            <View style={[styles.occupancyCircle, { backgroundColor: Colors.bhagwaLight }]}>
              <Text style={[styles.occupancyPercent, { color: Colors.bhagwa }]}>{occupancyPercent}%</Text>
              <Text style={styles.occupancyLabel}>Occupied</Text>
            </View>
            <View style={styles.occupancyStats}>
              <View style={styles.occupancyStat}>
                <Text style={styles.occupancyValue}>{ls.total_seats ?? 170}</Text>
                <Text style={styles.occupancyStatLabel}>Total</Text>
              </View>
              <View style={styles.occupancyStat}>
                <Text style={[styles.occupancyValue, { color: '#16a34a' }]}>{ls.available_seats ?? 0}</Text>
                <Text style={styles.occupancyStatLabel}>Available</Text>
              </View>
              <View style={styles.occupancyStat}>
                <Text style={[styles.occupancyValue, { color: '#ef4444' }]}>{ls.occupied_seats ?? 0}</Text>
                <Text style={styles.occupancyStatLabel}>Occupied</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Student Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Status</Text>
          <View style={styles.feeStatusRow}>
            <View style={[styles.feeStatusCard, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
              <Text style={[styles.feeStatusValue, { color: '#16a34a' }]}>{ls.paid_students ?? 0}</Text>
              <Text style={styles.feeStatusLabel}>Paid</Text>
            </View>
            <View style={[styles.feeStatusCard, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="clock-alert" size={24} color="#ef4444" />
              <Text style={[styles.feeStatusValue, { color: '#ef4444' }]}>{ls.unpaid_students ?? 0}</Text>
              <Text style={styles.feeStatusLabel}>Unpaid</Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  // ITI Dashboard Content
  const renderITIDashboard = () => (
    <>
      {/* College Header */}
      <View style={styles.collegeHeader}>
        <View style={styles.collegeBadge}>
          <MaterialCommunityIcons name="school" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.collegeName}>Maner Pvt ITI</Text>
          <Text style={styles.collegeCode}>PR10001156</Text>
        </View>
      </View>

      {/* Stats Grid - 2 columns */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Students"
            value={stats?.totalStudents ?? 0}
            icon="account-group"
            color="#8b5cf6"
          />
          <StatCard
            title="Fees Collected"
            value={formatCurrency(stats?.totalFeesCollected ?? 0)}
            icon="cash-check"
            color="#16a34a"
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Admissions"
            value={stats?.totalAdmissions ?? 0}
            icon="file-document-check-outline"
            color={Colors.primary}
            onPress={() => router.push('/admissions')}
          />
          <StatCard
            title="Pending Admissions"
            value={stats?.pendingAdmissions ?? 0}
            icon="file-clock-outline"
            color="#f59e0b"
            onPress={() => router.push('/admissions?status=pending')}
          />
        </View>
      </View>

      {/* Trade Seat Availability */}
      {tradeSeats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seat Availability</Text>
          {tradeSeats.map((trade) => {
            const fillPercent = trade.totalSeats > 0
              ? Math.min((trade.enrolled / trade.totalSeats) * 100, 100)
              : 0;
            const isFull = trade.available <= 0;
            return (
              <View key={trade.id} style={styles.seatCard}>
                <View style={styles.seatHeader}>
                  <Text style={styles.seatTradeName}>{trade.name}</Text>
                  <View style={[styles.seatBadge, isFull ? styles.seatBadgeFull : styles.seatBadgeOpen]}>
                    <Text style={[styles.seatBadgeText, isFull ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                      {isFull ? 'FULL' : `${trade.available} Open`}
                    </Text>
                  </View>
                </View>
                <View style={styles.seatProgressBar}>
                  <View
                    style={[
                      styles.seatProgressFill,
                      {
                        width: `${fillPercent}%`,
                        backgroundColor: isFull ? '#dc2626' : fillPercent > 75 ? '#f59e0b' : '#16a34a',
                      },
                    ]}
                  />
                </View>
                <View style={styles.seatNumbers}>
                  <Text style={styles.seatNumText}>Enrolled: {trade.enrolled}</Text>
                  <Text style={styles.seatNumText}>Total: {trade.totalSeats}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Toggle */}
        <ModeToggle />

        {/* Render based on mode */}
        {appMode === 'library' ? renderLibraryDashboard() : renderITIDashboard()}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.actionCard}
                activeOpacity={0.7}
                onPress={() => router.push(action.route)}
              >
                <View
                  style={[
                    styles.actionIconWrapper,
                    { backgroundColor: action.color + '15' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={26}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Mode Toggle Styles
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  modeTabActiveLibrary: {
    backgroundColor: Colors.bhagwa,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#fff',
  },
  // Library Occupancy Styles
  occupancyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  occupancyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  occupancyPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  occupancyLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  occupancyStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  occupancyStat: {
    alignItems: 'center',
  },
  occupancyValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  occupancyStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  // Fee Status Styles
  feeStatusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feeStatusCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  feeStatusValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  feeStatusLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  collegeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  collegeBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collegeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  collegeCode: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
  },
  seatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  seatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seatTradeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  seatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  seatBadgeOpen: {
    backgroundColor: '#dcfce7',
  },
  seatBadgeFull: {
    backgroundColor: '#fef2f2',
  },
  seatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seatProgressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  seatProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  seatNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatNumText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
});
