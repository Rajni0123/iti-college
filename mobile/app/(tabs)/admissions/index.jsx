import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import SearchBar from '../../../src/components/SearchBar';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import LoadingScreen from '../../../src/components/LoadingScreen';
import { getAdmissions } from '../../../src/services/api';
import { formatDate } from '../../../src/utils/formatters';

const FILTER_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function AdmissionsListScreen() {
  const router = useRouter();
  const { status } = useLocalSearchParams();
  const [admissions, setAdmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    // Set initial filter from URL param (capitalize first letter)
    if (status) {
      const formatted = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (FILTER_OPTIONS.includes(formatted)) return formatted;
    }
    return 'All';
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAdmissions = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (statusFilter !== 'All') filters.status = statusFilter;

      const res = await getAdmissions(pageNum, filters);
      const data = res.data;

      if (pageNum === 1) {
        setAdmissions(data.admissions || []);
      } else {
        setAdmissions((prev) => [...prev, ...(data.admissions || [])]);
      }
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch admissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search, statusFilter]);

  // Update filter when URL param changes
  useEffect(() => {
    if (status) {
      const formatted = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (FILTER_OPTIONS.includes(formatted) && formatted !== statusFilter) {
        setStatusFilter(formatted);
      }
    }
  }, [status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAdmissions(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter]);

  // Refresh on screen focus for real-time sync
  useFocusEffect(
    useCallback(() => {
      fetchAdmissions(1);
    }, [fetchAdmissions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAdmissions(1, true);
  }, [fetchAdmissions]);

  const loadMore = useCallback(() => {
    if (!loadingMore && page < totalPages) {
      fetchAdmissions(page + 1);
    }
  }, [loadingMore, page, totalPages, fetchAdmissions]);

  const handleItemPress = (item) => {
    router.push({
      pathname: '/(tabs)/admissions/[id]',
      params: { id: item.id, admission: JSON.stringify(item) },
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.subText}>S/o {item.father_name}</Text>
      {item.trade && <Text style={styles.subText}>Trade: {item.trade}</Text>}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="call-outline" size={13} color={Colors.textLight} />
          <Text style={styles.footerText}>{item.mobile || '-'}</Text>
        </View>
        <Text style={styles.footerText}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, mobile..."
        />
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          {FILTER_OPTIONS.map((filter) => {
            const isActive = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={admissions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={admissions.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<EmptyState title="No admissions found" subtitle="Try adjusting your search or filters" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/admissions/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filtersWrapper: {
    paddingBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  subText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
