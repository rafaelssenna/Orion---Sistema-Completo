import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../src/lib/auth-context';
import { api } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      if (user?.role === 'HEAD' || user?.role === 'ADMIN') {
        setData(await api.getDashboardOverview());
      } else {
        setData(await api.getDashboardPersonal());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isHead = user?.role === 'HEAD' || user?.role === 'ADMIN';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Bem-vindo,</Text>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        {user?.name}
      </Text>

      {/* Alerts (HEAD) */}
      {isHead && data?.alerts?.map((alert: any, i: number) => (
        <View key={i} style={{
          backgroundColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          borderWidth: 1,
          borderColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
        }}>
          <Text style={{ color: alert.severity === 'critical' ? colors.danger : colors.warning, fontSize: 14 }}>
            ⚠️ {alert.message}
          </Text>
        </View>
      ))}

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <StatCard
          label={isHead ? 'Projetos Ativos' : 'Meus Projetos'}
          value={isHead ? data?.summary?.totalActiveProjects : data?.projects?.length}
          color={colors.primary}
        />
        <StatCard
          label="Horas (Semana)"
          value={`${isHead ? data?.summary?.totalHoursThisWeek : data?.hoursThisWeek || 0}h`}
          color={colors.accent}
        />
      </View>

      {/* Projects / Tasks */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
      }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          {isHead ? 'Projetos Ativos' : 'Minhas Tarefas'}
        </Text>

        {isHead ? (
          data?.projects?.map((project: any) => (
            <View key={project.id} style={{
              backgroundColor: colors.surfaceLight,
              borderRadius: 12,
              padding: 14,
              marginBottom: 8,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, flex: 1 }}>{project.name}</Text>
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{project.progress}%</Text>
              </View>
              <View style={{ height: 4, backgroundColor: colors.bg, borderRadius: 2, marginTop: 8 }}>
                <View style={{ height: 4, backgroundColor: colors.primary, borderRadius: 2, width: `${project.progress}%` }} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                {project.tasksDone}/{project.tasksTotal} tarefas · {project.members?.map((m: any) => m.name).join(', ')}
              </Text>
            </View>
          ))
        ) : (
          data?.tasks?.map((task: any) => (
            <View key={task.id} style={{
              backgroundColor: colors.surfaceLight,
              borderRadius: 12,
              padding: 14,
              marginBottom: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '500', fontSize: 14 }}>{task.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{task.project?.name}</Text>
              </View>
              <View style={{
                backgroundColor: task.status === 'IN_PROGRESS' ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.2)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
              }}>
                <Text style={{
                  color: task.status === 'IN_PROGRESS' ? colors.primaryLight : colors.textMuted,
                  fontSize: 11,
                  fontWeight: '600',
                }}>
                  {task.status === 'TODO' ? 'A Fazer' : task.status === 'IN_PROGRESS' ? 'Em Progresso' : task.status === 'IN_REVIEW' ? 'Revisão' : 'Feito'}
                </Text>
              </View>
            </View>
          ))
        )}

        {((isHead && (!data?.projects || data.projects.length === 0)) ||
          (!isHead && (!data?.tasks || data.tasks.length === 0))) && (
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>
            Nenhum item para exibir
          </Text>
        )}
      </View>

      {/* Recent Activity */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Atividades Recentes
        </Text>

        {(isHead ? data?.recentActivities : data?.recentActivities)?.slice(0, 8).map((activity: any) => (
          <View key={activity.id} style={{
            flexDirection: 'row',
            gap: 10,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(99,102,241,0.2)',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                {activity.user?.name?.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13 }}>
                <Text style={{ fontWeight: '600' }}>{activity.user?.name}</Text>
                <Text style={{ color: colors.textMuted }}> em </Text>
                <Text style={{ color: colors.primaryLight }}>{activity.project?.name}</Text>
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{activity.description}</Text>
              {activity.type === 'AI_SUMMARY' && (
                <Text style={{ color: colors.accent, fontSize: 11, marginTop: 2 }}>🤖 Resumo IA</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Text style={{ color, fontSize: 28, fontWeight: 'bold' }}>{value ?? 0}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{label}</Text>
    </View>
  );
}
