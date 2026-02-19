import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../src/lib/auth-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const roleLabels: Record<string, string> = {
    HEAD: 'Head',
    ADMIN: 'Administrativo',
    DEV: 'Desenvolvedor',
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ alignItems: 'center', paddingVertical: 30 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(99,102,241,0.2)',
          justifyContent: 'center', alignItems: 'center',
          marginBottom: 12,
        }}>
          <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>{user?.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{user?.email}</Text>
        <View style={{
          backgroundColor: 'rgba(99,102,241,0.2)',
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 20,
          marginTop: 8,
        }}>
          <Text style={{ color: colors.primaryLight, fontWeight: '600' }}>
            {roleLabels[user?.role || 'DEV']}
          </Text>
        </View>
      </View>

      {/* Info cards */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
      }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Informações</Text>

        <InfoRow label="Nome" value={user?.name || ''} />
        <InfoRow label="Email" value={user?.email || ''} />
        <InfoRow label="Cargo" value={roleLabels[user?.role || 'DEV']} />
      </View>

      {/* About */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
      }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Sobre o Orion</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          Sistema de gestão de projetos com tracking automático via GitHub e análise de IA.
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Versão 1.0.0</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: 'rgba(239,68,68,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(239,68,68,0.3)',
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}
