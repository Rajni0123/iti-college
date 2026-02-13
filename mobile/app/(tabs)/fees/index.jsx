import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { formatCurrency } from '../../../src/utils/formatters';
import { getFees, getFeeSummary, getSessions, getAllStudents, getTrades } from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';
import StatCard from '../../../src/components/StatCard';
import SearchBar from '../../../src/components/SearchBar';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import LoadingScreen from '../../../src/components/LoadingScreen';
import { useDebounce } from '../../../src/hooks/useDebounce';

const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Partially Paid'];
const TRADE_FILTERS = ['All Trades', 'Electrician', 'Fitter'];

const currentYear = new Date().getFullYear();
const YEAR_FILTERS = ['All Years', String(currentYear), String(currentYear - 1)];
const MONTH_FILTERS = [
  'All Months', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Get current academic session
function getCurrentSession() {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

// Main tabs for the fee management screen
const MAIN_TABS = [
  { key: 'dues', label: 'Pending Dues', icon: 'clock-alert-outline' },
  { key: 'students', label: 'All Students', icon: 'account-group-outline' },
];

export default function FeesListScreen() {
  const router = useRouter();
  const { isStaff } = useAuth();

  // Main tab state
  const [activeTab, setActiveTab] = useState('dues');

  // Common states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState([]);
  const [trades, setTrades] = useState([]);

  // DUES TAB states
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState(isStaff ? 'Pending' : 'All');
  const [tradeFilter, setTradeFilter] = useState('All Trades');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [sessionFilter, setSessionFilter] = useState('All Sessions');

  // ALL STUDENTS TAB states
  const [students, setStudents] = useState([]);
  const [studentSessionFilter, setStudentSessionFilter] = useState(isStaff ? getCurrentSession() : '');
  const [studentTradeFilter, setStudentTradeFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all'); // 'all', 'dues', 'paid'

  const debouncedSearch = useDebounce(search, 300);

  // Staff status filter options (restricted)
  const STAFF_STATUS_FILTERS = ['Pending', 'Partially Paid'];

  // Fetch sessions and trades list
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [sessionsRes, tradesRes] = await Promise.all([
          getSessions(),
          getTrades().catch(() => ({ data: [] })),
        ]);
        const sessionList = sessionsRes.data?.sessions || sessionsRes.data || [];
        setSessions(Array.isArray(sessionList) ? sessionList : []);

        const tradeList = tradesRes.data?.trades || tradesRes.data || [];
        setTrades(Array.isArray(tradeList) ? tradeList : []);
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  const sessionOptions = ['All Sessions', ...sessions.map((s) => s.session_name || s.name || s)];

  // Fetch DUES data
  const fetchDuesData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const filters = {};
      if (debouncedSearch) filters.search = debouncedSearch;
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (tradeFilter !== 'All Trades') filters.trade = tradeFilter;
      if (sessionFilter !== 'All Sessions') filters.session = sessionFilter;
      if (yearFilter !== 'All Years') filters.year = yearFilter;
      if (monthFilter !== 'All Months') {
        const monthIndex = MONTH_FILTERS.indexOf(monthFilter);
        if (monthIndex > 0) filters.month = monthIndex;
      }

      const [feesRes, summaryRes] = await Promise.all([
        getFees(filters),
        getFeeSummary(filters),
      ]);

      const feeData = feesRes.data?.fees || feesRes.data || [];
      setFees(Array.isArray(feeData) ? feeData : []);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, tradeFilter, sessionFilter, yearFilter, monthFilter]);

  // Fetch ALL STUDENTS data with fee status
  const fetchStudentsData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const params = { search: debouncedSearch };
      if (studentSessionFilter) params.session = studentSessionFilter;
      if (studentTradeFilter) params.trade = studentTradeFilter;
      // Include fee_status to get collected and dues info
      params.include_fees = true;

      const res = await getAllStudents(params);
      const data = res.data;

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.students) {
        list = data.students;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      }

      setStudents(list);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, studentSessionFilter, studentTradeFilter]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'dues') {
      fetchDuesData();
    } else {
      fetchStudentsData();
    }
  }, [activeTab, fetchDuesData, fetchStudentsData]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'dues') {
        fetchDuesData();
      } else {
        fetchStudentsData();
      }
    }, [activeTab, fetchDuesData, fetchStudentsData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'dues') {
      fetchDuesData(true);
    } else {
      fetchStudentsData(true);
    }
  };

  const collectionRate = summary
    ? summary.total_fees > 0
      ? Math.round((summary.total_collected / summary.total_fees) * 100)
      : 0
    : 0;

  // Filter fees for dues tab
  const filteredFees = fees.filter((item) => {
    if (isStaff) {
      const totalAmount = parseFloat(item.total_amount || item.amount) || 0;
      const paidAmount = parseFloat(item.paid_amount) || 0;
      const remaining = totalAmount - paidAmount;
      if (remaining <= 0) return false;
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch =
        (item.student_name || '').toLowerCase().includes(q) ||
        (item.trade || '').toLowerCase().includes(q) ||
        (item.invoice_number || '').toLowerCase().includes(q) ||
        (item.mobile || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (!isStaff && (yearFilter !== 'All Years' || monthFilter !== 'All Months')) {
      const dateStr = item.payment_date || item.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        if (yearFilter !== 'All Years' && d.getFullYear() !== parseInt(yearFilter)) {
          return false;
        }
        if (monthFilter !== 'All Months') {
          const monthIdx = MONTH_FILTERS.indexOf(monthFilter) - 1;
          if (d.getMonth() !== monthIdx) return false;
        }
      } else {
        if (yearFilter !== 'All Years' || monthFilter !== 'All Months') return false;
      }
    }

    return true;
  });

  // Filter students based on fee status
  const filteredStudents = students.filter((item) => {
    // Client-side search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch =
        (item.student_name || item.name || '').toLowerCase().includes(q) ||
        (item.father_name || '').toLowerCase().includes(q) ||
        (item.mobile || '').toLowerCase().includes(q) ||
        (item.enrollment_number || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Fee status filter
    const totalFees = parseFloat(item.total_fees) || 0;
    const paidAmount = parseFloat(item.total_paid || item.paid_amount) || 0;
    const dueBalance = parseFloat(item.due_balance || item.total_due) || (totalFees - paidAmount);

    if (studentStatusFilter === 'dues' && dueBalance <= 0) return false;
    if (studentStatusFilter === 'paid' && dueBalance > 0) return false;

    return true;
  });

  const handleCall = (mobile) => {
    if (mobile) {
      Linking.openURL(`tel:${mobile}`);
    }
  };

  // Render fee item (Dues tab)
  const renderFeeItem = ({ item }) => {
    const totalAmount = parseFloat(item.total_amount || item.amount) || 0;
    const paidAmount = parseFloat(item.paid_amount) || 0;
    const remaining = totalAmount - paidAmount;

    return (
      <TouchableOpacity
        style={styles.feeCard}
        onPress={() => router.push(`/fees/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.feeCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName} numberOfLines={1}>{item.student_name}</Text>
            <Text style={styles.fatherName}>S/O {item.father_name}</Text>
            {item.invoice_number ? (
              <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
            ) : null}
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.feeCardBody}>
          <View style={styles.feeInfoCol}>
            <Text style={styles.feeLabel}>Trade</Text>
            <Text style={styles.feeValue}>{item.trade || '-'}</Text>
          </View>
          <View style={styles.feeInfoCol}>
            <Text style={styles.feeLabel}>Fee Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.feeValue}>{item.fee_type}</Text>
              {item.installment_enabled === 1 && (
                <View style={styles.emiBadge}>
                  <Text style={styles.emiText}>{item.total_installments} EMI</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.feeCardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: Colors.success }]}>
              {formatCurrency(paidAmount)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={[styles.amountValue, { color: remaining > 0 ? Colors.error : Colors.success }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Call button for staff */}
        {isStaff && item.mobile && (
          <TouchableOpacity
            style={styles.callBar}
            onPress={() => handleCall(item.mobile)}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBarText}>Call {item.mobile}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render student item (All Students tab)
  const renderStudentItem = ({ item }) => {
    const totalFees = parseFloat(item.total_fees) || 0;
    const paidAmount = parseFloat(item.total_paid || item.paid_amount) || 0;
    const dueBalance = parseFloat(item.due_balance || item.total_due) || (totalFees - paidAmount);
    const hasDues = dueBalance > 0;

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => router.push(`/(tabs)/students/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.studentCardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.student_name || item.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentCardName} numberOfLines={1}>
              {item.student_name || item.name || 'N/A'}
            </Text>
            {item.father_name ? (
              <Text style={styles.studentSubText}>S/o {item.father_name}</Text>
            ) : null}
          </View>
          {/* Fee status badge */}
          <View style={[styles.feeStatusBadge, hasDues ? styles.feeStatusDue : styles.feeStatusPaid]}>
            <MaterialCommunityIcons
              name={hasDues ? "alert-circle" : "check-circle"}
              size={14}
              color={hasDues ? "#dc2626" : "#16a34a"}
            />
            <Text style={[styles.feeStatusText, hasDues ? styles.feeStatusDueText : styles.feeStatusPaidText]}>
              {hasDues ? 'Dues' : 'Paid'}
            </Text>
          </View>
        </View>

        {/* Trade and Session */}
        <View style={styles.studentCardMeta}>
          {(item.trade_name || item.trade) && (
            <View style={styles.tradePill}>
              <Text style={styles.tradeText}>{item.trade_name || item.trade}</Text>
            </View>
          )}
          {(item.session_name || item.session) && (
            <Text style={styles.sessionText}>{item.session_name || item.session}</Text>
          )}
        </View>

        {/* Fee Summary */}
        <View style={styles.studentFeeRow}>
          <View style={styles.studentFeeCol}>
            <Text style={styles.studentFeeLabel}>Total Fees</Text>
            <Text style={styles.studentFeeValue}>{formatCurrency(totalFees)}</Text>
          </View>
          <View style={styles.studentFeeCol}>
            <Text style={styles.studentFeeLabel}>Collected</Text>
            <Text style={[styles.studentFeeValue, { color: Colors.success }]}>
              {formatCurrency(paidAmount)}
            </Text>
          </View>
          <View style={styles.studentFeeCol}>
            <Text style={styles.studentFeeLabel}>Due</Text>
            <Text style={[styles.studentFeeValue, { color: hasDues ? Colors.error : Colors.success }]}>
              {formatCurrency(dueBalance)}
            </Text>
          </View>
        </View>

        {/* Call button */}
        {item.mobile && (
          <TouchableOpacity
            style={[styles.callBar, !hasDues && styles.callBarDisabled]}
            onPress={() => handleCall(item.mobile)}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBarText}>{item.mobile}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Dues tab header
  const DuesListHeader = () => (
    <View>
      {/* Staff Header */}
      {isStaff && (
        <View style={styles.staffNotice}>
          <Ionicons name="information-circle" size={18} color="#0369a1" />
          <Text style={styles.staffNoticeText}>
            Showing students with pending dues (all sessions) - Call and collect!
          </Text>
        </View>
      )}

      {/* Summary Cards - ADMIN ONLY */}
      {!isStaff && summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <StatCard
              title="Total Fees"
              value={formatCurrency(summary.total_fees)}
              subtitle={`${summary.total_records || 0} records`}
              color={Colors.primary}
              icon="currency-inr"
            />
            <StatCard
              title="Collected"
              value={formatCurrency(summary.total_collected)}
              subtitle={`${summary.paid_count || 0} fully paid`}
              color={Colors.success}
              icon="cash-check"
            />
          </View>
          <View style={[styles.summaryRow, { marginTop: 12 }]}>
            <StatCard
              title="Pending"
              value={formatCurrency(summary.total_pending)}
              subtitle={`${(summary.pending_count || 0) + (summary.partial_count || 0)} pending`}
              color={Colors.error}
              icon="clock-alert-outline"
            />
            <StatCard
              title="Collection Rate"
              value={`${collectionRate}%`}
              subtitle="of total fees"
              color={Colors.warning}
              icon="chart-arc"
            />
          </View>
        </View>
      )}

      {/* Staff sees only pending amount card */}
      {isStaff && summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <StatCard
              title="Pending Dues"
              value={formatCurrency(summary.total_pending)}
              subtitle={`${(summary.pending_count || 0) + (summary.partial_count || 0)} students`}
              color={Colors.error}
              icon="clock-alert-outline"
            />
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, trade, mobile..."
        />
      </View>

      {/* Year / Month / Session Filter Chips - ADMIN ONLY */}
      {!isStaff && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {YEAR_FILTERS.map((yr) => {
            const isActive = yearFilter === yr;
            return (
              <TouchableOpacity
                key={`yr-${yr}`}
                onPress={() => setYearFilter(yr)}
                style={[styles.filterChip, isActive && styles.yearChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.yearChipTextActive]}>
                  {yr}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.filterDivider} />
          {MONTH_FILTERS.map((m) => {
            const isActive = monthFilter === m;
            return (
              <TouchableOpacity
                key={`mo-${m}`}
                onPress={() => setMonthFilter(m)}
                style={[styles.filterChip, isActive && styles.monthChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.monthChipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
          {sessionOptions.length > 1 && (
            <>
              <View style={styles.filterDivider} />
              {sessionOptions.map((s) => {
                const isActive = sessionFilter === s;
                return (
                  <TouchableOpacity
                    key={`ses-${s}`}
                    onPress={() => setSessionFilter(s)}
                    style={[styles.filterChip, isActive && styles.sessionChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.sessionChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Status / Trade Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(isStaff ? STAFF_STATUS_FILTERS : STATUS_FILTERS).map((status) => {
          const isActive = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {status}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.filterDivider} />
        {TRADE_FILTERS.map((t) => {
          const isActive = tradeFilter === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTradeFilter(t)}
              style={[styles.filterChip, isActive && styles.tradeChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.tradeChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Students tab header
  const StudentsListHeader = () => (
    <View>
      {/* Staff Notice */}
      {isStaff && (
        <View style={styles.staffNotice}>
          <Ionicons name="information-circle" size={18} color="#0369a1" />
          <Text style={styles.staffNoticeText}>
            All students with fee status ({studentSessionFilter || 'All Sessions'})
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, mobile, enrollment..."
        />
      </View>

      {/* Session Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !studentSessionFilter && styles.sessionChipActive]}
          onPress={() => setStudentSessionFilter('')}
        >
          <Text style={[styles.filterChipText, !studentSessionFilter && styles.sessionChipTextActive]}>
            All Sessions
          </Text>
        </TouchableOpacity>
        {sessions.map(s => {
          const sessionName = s.name || s.session_name || s;
          const isActive = studentSessionFilter === sessionName;
          return (
            <TouchableOpacity
              key={s.id || sessionName}
              style={[styles.filterChip, isActive && styles.sessionChipActive]}
              onPress={() => setStudentSessionFilter(isActive ? '' : sessionName)}
            >
              <Text style={[styles.filterChipText, isActive && styles.sessionChipTextActive]}>
                {sessionName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fee Status / Trade Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {/* Fee status filters */}
        {[
          { key: 'all', label: 'All Students' },
          { key: 'dues', label: 'With Dues' },
          { key: 'paid', label: 'Fully Paid' },
        ].map(({ key, label }) => {
          const isActive = studentStatusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStudentStatusFilter(key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.filterDivider} />
        {/* Trade filters */}
        <TouchableOpacity
          style={[styles.filterChip, !studentTradeFilter && styles.tradeChipActive]}
          onPress={() => setStudentTradeFilter('')}
        >
          <Text style={[styles.filterChipText, !studentTradeFilter && styles.tradeChipTextActive]}>
            All Trades
          </Text>
        </TouchableOpacity>
        {['Electrician', 'Fitter'].map((t) => {
          const isActive = studentTradeFilter === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setStudentTradeFilter(isActive ? '' : t)}
              style={[styles.filterChip, isActive && styles.tradeChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.tradeChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary stats */}
      <View style={styles.studentSummary}>
        <View style={styles.studentSummaryItem}>
          <Text style={styles.studentSummaryValue}>{filteredStudents.length}</Text>
          <Text style={styles.studentSummaryLabel}>Total</Text>
        </View>
        <View style={styles.studentSummaryDivider} />
        <View style={styles.studentSummaryItem}>
          <Text style={[styles.studentSummaryValue, { color: Colors.error }]}>
            {filteredStudents.filter(s => {
              const due = parseFloat(s.due_balance || s.total_due) || (parseFloat(s.total_fees || 0) - parseFloat(s.total_paid || 0));
              return due > 0;
            }).length}
          </Text>
          <Text style={styles.studentSummaryLabel}>With Dues</Text>
        </View>
        <View style={styles.studentSummaryDivider} />
        <View style={styles.studentSummaryItem}>
          <Text style={[styles.studentSummaryValue, { color: Colors.success }]}>
            {filteredStudents.filter(s => {
              const due = parseFloat(s.due_balance || s.total_due) || (parseFloat(s.total_fees || 0) - parseFloat(s.total_paid || 0));
              return due <= 0;
            }).length}
          </Text>
          <Text style={styles.studentSummaryLabel}>Fully Paid</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Main Tab Bar */}
      <View style={styles.tabBar}>
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                setSearch(''); // Reset search on tab change
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={isActive ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dues Tab */}
      {activeTab === 'dues' && (
        <FlatList
          data={filteredFees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFeeItem}
          ListHeaderComponent={DuesListHeader}
          ListEmptyComponent={
            <EmptyState
              title="No fees found"
              subtitle="Try adjusting your search or filters"
              icon="cash-off"
            />
          }
          contentContainerStyle={filteredFees.length === 0 ? { flex: 1 } : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* All Students Tab */}
      {activeTab === 'students' && (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudentItem}
          ListHeaderComponent={StudentsListHeader}
          ListEmptyComponent={
            <EmptyState
              title="No students found"
              subtitle="Try adjusting your search or filters"
              icon="account-off"
            />
          }
          contentContainerStyle={filteredStudents.length === 0 ? { flex: 1 } : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/collect')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabText}>Collect Fee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  // Tab Bar
  tabBar: {
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
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  // Staff Notice
  staffNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  staffNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  // Summary
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Filters
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  tradeChipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  tradeChipTextActive: {
    color: '#fff',
  },
  yearChipActive: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  yearChipTextActive: {
    color: '#fff',
  },
  monthChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  monthChipTextActive: {
    color: '#fff',
  },
  sessionChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  sessionChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  // Fee Card (Dues tab)
  feeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  feeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  fatherName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  invoiceNum: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 3,
  },
  feeCardBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  feeInfoCol: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  feeValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  emiBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emiText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  feeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  callBar: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 10,
  },
  callBarDisabled: {
    backgroundColor: '#94a3b8',
  },
  callBarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Student Card (All Students tab)
  studentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  studentCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  studentSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  feeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feeStatusDue: {
    backgroundColor: '#fef2f2',
  },
  feeStatusPaid: {
    backgroundColor: '#f0fdf4',
  },
  feeStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feeStatusDueText: {
    color: '#dc2626',
  },
  feeStatusPaidText: {
    color: '#16a34a',
  },
  studentCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tradePill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tradeText: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '600',
  },
  sessionText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  studentFeeRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  studentFeeCol: {
    flex: 1,
    alignItems: 'center',
  },
  studentFeeLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 2,
  },
  studentFeeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  // Student summary
  studentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  studentSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  studentSummaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  studentSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
