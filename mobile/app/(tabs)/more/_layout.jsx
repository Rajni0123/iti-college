import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="staff" options={{ title: 'Staff Management' }} />
      <Stack.Screen name="notices" options={{ title: 'Notices' }} />
      <Stack.Screen name="results" options={{ title: 'Results' }} />
      <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Stack.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Stack.Screen name="trades" options={{ title: 'Trades' }} />
      <Stack.Screen name="faculty" options={{ title: 'Faculty' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="payslip" options={{ title: 'Staff Payslip' }} />
    </Stack>
  );
}
