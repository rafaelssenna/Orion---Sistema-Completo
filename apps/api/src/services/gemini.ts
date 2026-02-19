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
