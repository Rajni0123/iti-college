import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isStaff, appMode } = useAuth();
  const isLibraryMode = appMode === 'library';

  // Use Bhagwa color for library mode
  const activeColor = isLibraryMode ? (Colors.bhagwa || '#FF6B00') : Colors.primary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1e293b',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admissions"
        options={{
          title: 'Admissions',
          headerShown: false,
          // Hide in library mode or for staff
          href: (isStaff || isLibraryMode) ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: isStaff ? 'Home' : (isLibraryMode ? 'Fees' : 'Fees'),
          headerShown: false,
          // Hide in library mode (library has its own fees screen)
          href: isLibraryMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={isStaff ? "home" : "currency-inr"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collect"
        options={{
          title: 'Collect',
          headerTitle: 'Collect Fee',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-plus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          headerShown: false,
          // Hide in library mode
          href: isLibraryMode ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Library screens - only visible in library mode */}
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false,
          // Only show in library mode
          href: isLibraryMode ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookshelf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
