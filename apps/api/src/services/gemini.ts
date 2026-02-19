import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeCommitDiff(commitMessage: string, diff: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um assistente de gestão de projetos de software. Analise o seguinte commit e gere um resumo CURTO (2-3 frases) em português brasileiro, explicando o que foi feito de forma clara para um gestor que não é técnico.

Mensagem do commit: ${commitMessage}

Diff (mudanças no código):
${diff.substring(0, 4000)}

Gere um resumo claro e objetivo. Foque no "o que foi feito" e "por que importa", não em detalhes técnicos de código. Exemplo: "Criou a tela de login com validação de email e senha, permitindo que usuários acessem o sistema de forma segura."`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return commitMessage; // Fallback to original commit message
  }
}

export async function analyzeProjectState(data: {
  projectName: string;
  commits: { message: string; authorName: string; date: string; aiSummary?: string | null }[];
  activities: { description: string; type: string; userName: string; date: string }[];
  members: { name: string; role: string }[];
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const commitsList = data.commits.slice(0, 100).map(
      c => `- [${c.date}] ${c.authorName}: ${c.aiSummary || c.message}`
    ).join('\n');

    const activitiesList = data.activities.slice(0, 50).map(
      a => `- [${a.date}] ${a.userName} (${a.type}): ${a.description}`
    ).join('\n');

    const membersList = data.members.map(m => `- ${m.name} (${m.role})`).join('\n');

    const prompt = `Você é um assistente de gestão de projetos de software. Analise TODOS os dados do projeto "${data.projectName}" e gere um RELATÓRIO COMPLETO em português brasileiro.

## Equipe:
${membersList || 'Nenhum membro atribuído'}

## Progresso de Tarefas:
- Total: ${data.tasksTotal}
- Concluídas: ${data.tasksDone}
- Em progresso: ${data.tasksInProgress}

## Histórico de Commits (do mais antigo ao mais recente):
${commitsList || 'Nenhum commit encontrado'}

## Histórico de Atividades:
${activitiesList || 'Nenhuma atividade registrada'}

---

Gere um relatório estruturado com estas seções:

1. **Estado Atual do Projeto**: O que o app faz hoje, quais funcionalidades já estão prontas
2. **O que está sendo desenvolvido**: Baseado nos commits e atividades recentes, o que está em andamento
3. **Evolução**: Como o projeto evoluiu ao longo do tempo (do início até agora)
4. **Contribuição da Equipe**: Quem fez o quê, como está a distribuição de trabalho
5. **Observações**: Possíveis riscos, gargalos ou sugestões

Seja claro e objetivo. Foque em dar uma visão completa para um gestor. Use linguagem acessível, não técnica demais.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini project analysis error:', error);
    return 'Não foi possível gerar a análise do projeto. Verifique se a chave da API Gemini está configurada.';
  }
}

export async function analyzeWorkloadImbalance(data: {
  devs: { name: string; hours: number; projects: string[] }[];
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um assistente de gestão. Analise a distribuição de trabalho da equipe esta semana e gere um relatório curto em português:

${data.devs.map(d => `- ${d.name}: ${d.hours}h trabalhadas, projetos: ${d.projects.join(', ')}`).join('\n')}

Identifique se há desequilíbrio e sugira ajustes. Seja breve (3-4 frases).`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return 'Não foi possível gerar a análise automática.';
  }
}
