import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth-context';
import { colors } from '../src/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Logo */}
        <Text style={{
          fontSize: 42,
          fontWeight: 'bold',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Orion
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 40 }}>
          Sistema de Gestão de Projetos
        </Text>

        {/* Form */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 20 }}>
            Entrar
          </Text>

          {error ? (
            <View style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}>
              <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 6 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: colors.surfaceLight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 16,
            }}
          />

          <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 6 }}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={{
              backgroundColor: colors.surfaceLight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: colors.text,
              fontSize: 16,
              marginBottom: 24,
            }}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          Orion v1.0 · Gestão inteligente de equipes
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
