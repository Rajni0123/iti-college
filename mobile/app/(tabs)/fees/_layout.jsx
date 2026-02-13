import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

export default function FeesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Fee Management' }} />
      <Stack.Screen name="collect" options={{ title: 'Collect Fee' }} />
      <Stack.Screen name="[id]" options={{ title: 'Fee Details' }} />
    </Stack>
  );
}
