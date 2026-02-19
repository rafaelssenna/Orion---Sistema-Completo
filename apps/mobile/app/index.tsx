import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/lib/auth-context';
import { colors } from '../src/lib/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 16 }}>
        Orion
      </Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
