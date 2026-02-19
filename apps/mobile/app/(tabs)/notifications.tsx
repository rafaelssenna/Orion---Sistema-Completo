import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

const typeIcons: Record<string, string> = {
  IMBALANCE: '⚖️',
  TASK_ASSIGNED: '📋',
  PROJECT_INACTIVE: '💤',
  COMMIT: '💻',
  GENERAL: '📢',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadNotifications(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Notificações
      </Text>

      {notifications.map(notif => (
        <TouchableOpacity
          key={notif.id}
          onPress={async () => {
            if (!notif.isRead) {
              await api.markAsRead(notif.id);
              loadNotifications();
            }
          }}
          style={{
            backgroundColor: notif.isRead ? colors.surface : colors.surfaceLight,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: notif.isRead ? colors.border : colors.primary,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 16 }}>{typeIcons[notif.type] || '📢'}</Text>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, flex: 1 }}>{notif.title}</Text>
            {!notif.isRead && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
            )}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>{notif.body}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
            {new Date(notif.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      ))}

      {notifications.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>Nenhuma notificação</Text>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
