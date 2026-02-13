import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

// Bhagwa color for library theme
const LibraryColor = Colors.bhagwa || '#FF6B00';

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1e293b',
        },
        headerTintColor: LibraryColor,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="students"
        options={{
          title: 'Library Students',
        }}
      />
      <Stack.Screen
        name="fees"
        options={{
          title: 'Fee Collection',
        }}
      />
      <Stack.Screen
        name="expenses"
        options={{
          title: 'Expenses',
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: 'Reports',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Library Settings',
        }}
      />
    </Stack>
  );
}
