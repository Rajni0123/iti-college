import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { getAllStudents, getSessions } from '../../../src/services/api';
import { useAuth } from '../../../src/context/AuthContext';
import SearchBar from '../../../src/components/SearchBar';
import EmptyState from '../../../src/components/EmptyState';
import LoadingScreen from '../../../src/components/LoadingScreen';

// Get current academic session
function getCurrentSession() {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

export default function StudentsIndex() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  // Staff sees current session students by default
  const [selectedSession, setSelectedSession] = useState(isStaff ? getCurrentSession() : '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // Both admin and staff get session list, but staff is locked to current
    getSessions().then(res => {
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.sessions || data?.data || []);
      setSessions(list);
    }).catch(() => {});
  }, []);

  const fetchStudents = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let list = [];
      let pages = 1;

      // Both staff and admin use same API, staff is auto-filtered to current session
      const params = { search, page: pageNum };
      if (selectedSession) params.session = selectedSession;

      const res = await getAllStudents(params);
      const data = res.data;

      if (Array.isArray(data)) {
        list = data;
      } else if (data?.students) {
        list = data.students;
        pages = data.totalPages || 1;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
        pages = data.totalPages || 1;
      }

      if (pageNum === 1) {
        setStudents(list);
      } else {
        setStudents(prev => [...prev, ...list]);
      }
      setTotalPages(pages);
      setPage(pageNum);
    } catch (e) {
      console.error('Failed to fetch students:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search, selectedSession, isStaff]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchStudents(1), 400);
    return () => clearTimeout(timeout);
  }, [search, selectedSession]);

  // Refresh on screen focus for real-time sync
  useFocusEffect(
    useCallback(() => {
      fetchStudents(1);
    }, [fetchStudents])
  );

  const handleRefresh = () => fetchStudents(1, true);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchStudents(page + 1);
    }
  };

  const handleCall = (mobile) => {
    if (mobile) {
      Linking.openURL(`tel:${mobile}`);
    }
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/students/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.student_name || item.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.student_name || item.name || 'N/A'}</Text>
          {item.father_name ? (
            <Text style={styles.subText}>S/o {item.father_name}</Text>
          ) : null}
        </View>
        {item.enrollment_number ? (
          <View style={styles.enrollBadge}>
            <Text style={styles.enrollText}>{item.enrollment_number}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          {(item.trade_name || item.trade) ? (
            <View style={styles.tradePill}>
              <Text style={styles.tradeText}>{item.trade_name || item.trade}</Text>
            </View>
          ) : null}
          {item.session_name || item.session ? (
            <Text style={styles.sessionText}>{item.session_name || item.session}</Text>
          ) : null}
        </View>
        {item.mobile ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.mobile)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callText}>{item.mobile}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Staff Notice */}
      {isStaff && (
        <View style={styles.staffNotice}>
          <Ionicons name="information-circle" size={18} color="#0369a1" />
          <Text style={styles.staffNoticeText}>
            Current session students ({getCurrentSession()})
          </Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={isStaff ? "Search dues by name, mobile..." : "Search by name, mobile, enrollment..."}
        />
      </View>

      {/* Session Filter Chips - ADMIN ONLY */}
      {!isStaff && sessions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, !selectedSession && styles.filterChipActive]}
            onPress={() => setSelectedSession('')}
          >
            <Text style={[styles.filterChipText, !selectedSession && styles.filterChipTextActive]}>
              All Sessions
            </Text>
          </TouchableOpacity>
          {sessions.map(s => {
            const sessionName = s.name || s.session_name || s;
            const isActive = selectedSession === sessionName;
            return (
              <TouchableOpacity
                key={s.id || sessionName}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedSession(isActive ? '' : sessionName)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {sessionName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudent}
        contentContainerStyle={students.length === 0 ? { flex: 1 } : { paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState title="No students found" subtitle="Try a different search or filter" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  searchWrap: { paddingHorizontal: 16, paddingTop: 16 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
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
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  enrollBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  enrollText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  subText: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tradePill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tradeText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
  sessionText: { fontSize: 11, color: Colors.textSecondary },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  callText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
