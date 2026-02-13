import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function LibraryIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main dashboard which shows library content when in library mode
    router.replace('/(tabs)');
  }, []);

  return null;
}
