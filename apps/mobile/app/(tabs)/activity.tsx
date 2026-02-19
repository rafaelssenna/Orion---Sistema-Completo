import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { api } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function ActivityScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    api.getActivities({ limit: '20' }).then(setActivities).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedProject) {
      Alert.alert('Erro', 'Selecione um projeto');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erro', 'Descreva o que você fez');
      return;
    }

    setSubmitting(true);
    try {
      await api.createActivity({
        projectId: selectedProject,
        description: description.trim(),
        type: 'UPDATE',
        hoursSpent: hours ? parseFloat(hours) : undefined,
      });

      setDescription('');
      setHours('');
      Alert.alert('Sucesso!', 'Atividade registrada');

      // Refresh
      const acts = await api.getActivities({ limit: '20' });
      setActivities(acts);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Registrar Atividade
      </Text>

      {/* Quick Activity Form */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
      }}>
        {/* Project selector */}
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 8 }}>Projeto</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProject(p.id)}
                style={{
                  backgroundColor: selectedProject === p.id ? colors.primary : colors.surfaceLight,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedProject === p.id ? colors.primary : colors.border,
                }}
              >
                <Text style={{
                  color: selectedProject === p.id ? 'white' : colors.textMuted,
                  fontWeight: '600',
                  fontSize: 14,
                }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Description */}
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 8 }}>O que você fez?</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Implementei a tela de login..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: colors.surfaceLight,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: colors.text,
            fontSize: 15,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 12,
          }}
        />

        {/* Hours */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Horas gastas:</Text>
          <TextInput
            value={hours}
            onChangeText={setHours}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.surfaceLight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: colors.text,
              fontSize: 15,
              width: 80,
              textAlign: 'center',
            }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>h</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {submitting ? 'Enviando...' : '📝 Registrar Atividade'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activities */}
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
        Atividades Recentes
      </Text>

      {activities.map(activity => (
        <View key={activity.id} style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: '600' }}>
              {activity.project?.name}
            </Text>
            {activity.hoursSpent && (
              <Text style={{ color: colors.accent, fontSize: 12 }}>{activity.hoursSpent}h</Text>
            )}
          </View>
          <Text style={{ color: colors.text, fontSize: 14 }}>{activity.description}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            {activity.user?.name} · {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
          {activity.type === 'AI_SUMMARY' && (
            <Text style={{ color: colors.accent, fontSize: 11, marginTop: 2 }}>🤖 Resumo IA</Text>
          )}
        </View>
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
