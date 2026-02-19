import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
};

const statusColors: Record<string, string> = {
  ACTIVE: colors.success,
  PAUSED: colors.warning,
  COMPLETED: colors.textMuted,
};

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Projetos
      </Text>

      {projects.map(project => (
        <TouchableOpacity
          key={project.id}
          onPress={() => setSelectedProject(project)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 }}>{project.name}</Text>
            <View style={{
              backgroundColor: `${statusColors[project.status]}20`,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}>
              <Text style={{ color: statusColors[project.status], fontSize: 12, fontWeight: '600' }}>
                {statusLabels[project.status]}
              </Text>
            </View>
          </View>

          {project.clientName && (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
              Cliente: {project.clientName}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              👥 {project.members?.length || 0} membros
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              📋 {project._count?.tasks || 0} tarefas
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              💻 {project._count?.gitCommits || 0} commits
            </Text>
          </View>

          {/* Members */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {project.members?.slice(0, 4).map((member: any) => (
              <View key={member.user.id} style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: 'rgba(99,102,241,0.2)',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                  {member.user.name.charAt(0)}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}

      {projects.length === 0 && (
        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 40 }}>
          Nenhum projeto encontrado
        </Text>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function ProjectDetail({ project, onBack }: { project: any; onBack: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api.getTasks({ projectId: project.id }).then(setTasks).catch(() => {});
  }, [project.id]);

  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  const statusConfig = [
    { key: 'TODO', label: 'A Fazer', color: colors.textMuted },
    { key: 'IN_PROGRESS', label: 'Em Progresso', color: colors.primary },
    { key: 'IN_REVIEW', label: 'Em Revisão', color: colors.warning },
    { key: 'DONE', label: 'Concluído', color: colors.success },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.primary, fontSize: 16 }}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>{project.name}</Text>
      {project.description && <Text style={{ color: colors.textMuted, marginBottom: 16 }}>{project.description}</Text>}

      {/* Kanban columns */}
      {statusConfig.map(({ key, label, color }) => (
        <View key={key} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ width: 4, height: 20, backgroundColor: color, borderRadius: 2 }} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              ({tasksByStatus[key as keyof typeof tasksByStatus].length})
            </Text>
          </View>

          {tasksByStatus[key as keyof typeof tasksByStatus].map(task => (
            <TouchableOpacity
              key={task.id}
              onPress={async () => {
                const nextStatus = key === 'TODO' ? 'IN_PROGRESS' : key === 'IN_PROGRESS' ? 'IN_REVIEW' : key === 'IN_REVIEW' ? 'DONE' : null;
                if (nextStatus) {
                  await api.updateTask(task.id, { status: nextStatus });
                  const updated = await api.getTasks({ projectId: project.id });
                  setTasks(updated);
                }
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 6,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '500' }}>{task.title}</Text>
              {task.assignee && (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{task.assignee.name}</Text>
              )}
              {key !== 'DONE' && (
                <Text style={{ color: colors.primaryLight, fontSize: 11, marginTop: 6 }}>
                  Toque para mover →
                </Text>
              )}
            </TouchableOpacity>
          ))}

          {tasksByStatus[key as keyof typeof tasksByStatus].length === 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13, paddingLeft: 12 }}>Nenhuma tarefa</Text>
          )}
        </View>
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
