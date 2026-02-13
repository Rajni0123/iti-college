import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

export default function AdmissionsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Admissions' }} />
      <Stack.Screen name="[id]" options={{ title: 'Admission Details' }} />
      <Stack.Screen name="create" options={{ title: 'New Admission' }} />
    </Stack>
  );
}
