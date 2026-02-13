import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../src/constants/colors';

// Use Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';
import { formatCurrency } from '../../../src/utils/formatters';
import {
  getLibraryDailyReport,
  getLibraryMonthlyReport,
  getLibrarySeatReport,
} from '../../../src/services/api';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function LibraryReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [seatReport, setSeatReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [daily, monthly, seats] = await Promise.all([
        getLibraryDailyReport().catch(() => ({ data: {} })),
        getLibraryMonthlyReport().catch(() => ({ data: {} })),
        getLibrarySeatReport().catch(() => ({ data: {} })),
      ]);

      setDailyReport(daily.data);
      setMonthlyReport(monthly.data);
      setSeatReport(seats.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'daily', label: 'Daily', icon: 'calendar-today' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar-month' },
    { key: 'seats', label: 'Seats', icon: 'seat' },
  ];

  const renderDailyReport = () => (
    <View style={styles.reportSection}>
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <MaterialCommunityIcons name="calendar-today" size={24} color={LibraryColor} />
          <Text style={styles.reportTitle}>Today's Summary</Text>
        </View>
        <Text style={styles.reportDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatCurrency(dailyReport?.total_collection || 0)}</Text>
            <Text style={styles.statLabel}>Collection</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{dailyReport?.total_transactions || 0}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.modeBreakdown}>
          <View style={styles.modeItem}>
            <View style={[styles.modeIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="cash" size={18} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeLabel}>Cash</Text>
              <Text style={styles.modeCount}>{dailyReport?.cash_count || 0} payments</Text>
            </View>
            <Text style={styles.modeAmount}>{formatCurrency(dailyReport?.cash_total || 0)}</Text>
          </View>
          <View style={styles.modeItem}>
            <View style={[styles.modeIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="cellphone" size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeLabel}>UPI</Text>
              <Text style={styles.modeCount}>{dailyReport?.upi_count || 0} payments</Text>
            </View>
            <Text style={styles.modeAmount}>{formatCurrency(dailyReport?.upi_total || 0)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMonthlyReport = () => (
    <View style={styles.reportSection}>
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <MaterialCommunityIcons name="calendar-month" size={24} color="#7c3aed" />
          <Text style={styles.reportTitle}>Monthly Summary</Text>
        </View>
        <Text style={styles.reportDate}>
          {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>
              {formatCurrency(monthlyReport?.total_collection || 0)}
            </Text>
            <Text style={styles.statLabel}>Collection</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {formatCurrency(monthlyReport?.total_expenses || 0)}
            </Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
        </View>

        <View style={styles.profitBox}>
          <Text style={styles.profitLabel}>Net Profit</Text>
          <Text style={[
            styles.profitValue,
            { color: (monthlyReport?.net_profit || 0) >= 0 ? '#16a34a' : '#ef4444' }
          ]}>
            {formatCurrency(monthlyReport?.net_profit || 0)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.studentStats}>
          <View style={styles.studentStatItem}>
            <Text style={styles.studentStatValue}>{monthlyReport?.total_students || 0}</Text>
            <Text style={styles.studentStatLabel}>Total Students</Text>
          </View>
          <View style={styles.studentStatItem}>
            <Text style={[styles.studentStatValue, { color: '#16a34a' }]}>
              {monthlyReport?.paid_students || 0}
            </Text>
            <Text style={styles.studentStatLabel}>Paid</Text>
          </View>
          <View style={styles.studentStatItem}>
            <Text style={[styles.studentStatValue, { color: '#ef4444' }]}>
              {monthlyReport?.unpaid_students || 0}
            </Text>
            <Text style={styles.studentStatLabel}>Unpaid</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSeatReport = () => {
    const occupancy = seatReport?.total_seats > 0
      ? Math.round((seatReport?.occupied_seats / seatReport?.total_seats) * 100)
      : 0;

    return (
      <View style={styles.reportSection}>
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <MaterialCommunityIcons name="seat" size={24} color="#f59e0b" />
            <Text style={styles.reportTitle}>Seat Occupancy</Text>
          </View>

          <View style={styles.occupancyCircleContainer}>
            <View style={styles.occupancyCircle}>
              <Text style={styles.occupancyPercent}>{occupancy}%</Text>
              <Text style={styles.occupancyLabel}>Occupied</Text>
            </View>
          </View>

          <View style={styles.seatStats}>
            <View style={styles.seatStatItem}>
              <View style={[styles.seatDot, { backgroundColor: '#64748b' }]} />
              <Text style={styles.seatStatLabel}>Total</Text>
              <Text style={styles.seatStatValue}>{seatReport?.total_seats || 170}</Text>
            </View>
            <View style={styles.seatStatItem}>
              <View style={[styles.seatDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.seatStatLabel}>Available</Text>
              <Text style={styles.seatStatValue}>{seatReport?.available_seats || 0}</Text>
            </View>
            <View style={styles.seatStatItem}>
              <View style={[styles.seatDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.seatStatLabel}>Occupied</Text>
              <Text style={styles.seatStatValue}>{seatReport?.occupied_seats || 0}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.lockerSection}>
            <Text style={styles.lockerTitle}>Lockers</Text>
            <View style={styles.lockerStats}>
              <View style={styles.lockerStatItem}>
                <Text style={styles.lockerValue}>{seatReport?.total_lockers || 50}</Text>
                <Text style={styles.lockerLabel}>Total</Text>
              </View>
              <View style={styles.lockerStatItem}>
                <Text style={[styles.lockerValue, { color: '#16a34a' }]}>
                  {seatReport?.available_lockers || 0}
                </Text>
                <Text style={styles.lockerLabel}>Available</Text>
              </View>
              <View style={styles.lockerStatItem}>
                <Text style={[styles.lockerValue, { color: '#ef4444' }]}>
                  {seatReport?.occupied_lockers || 0}
                </Text>
                <Text style={styles.lockerLabel}>Occupied</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={LibraryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? LibraryColor : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'daily' && renderDailyReport()}
        {activeTab === 'monthly' && renderMonthlyReport()}
        {activeTab === 'seats' && renderSeatReport()}
      </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: LibraryColor + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: LibraryColor,
  },
  content: {
    flex: 1,
  },
  reportSection: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 20,
  },
  modeBreakdown: {
    gap: 12,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  modeCount: {
    fontSize: 12,
    color: '#64748b',
  },
  modeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  profitBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  profitLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  studentStats: {
    flexDirection: 'row',
  },
  studentStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  studentStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  occupancyCircleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  occupancyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  occupancyPercent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF6B00',
  },
  occupancyLabel: {
    fontSize: 12,
    color: '#CC5500',
  },
  seatStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  seatStatItem: {
    alignItems: 'center',
  },
  seatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  seatStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  seatStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  lockerSection: {
    marginTop: 4,
  },
  lockerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  lockerStats: {
    flexDirection: 'row',
  },
  lockerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  lockerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  lockerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
