import { Stack } from 'expo-router';
import { Colors } from '../../../../src/constants/colors';

export default function EditStudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Edit Student' }} />
    </Stack>
  );
}
