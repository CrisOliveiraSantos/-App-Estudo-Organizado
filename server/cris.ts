import { publicProcedure, router } from './_core/trpc';
import { invokeLLM, listLLMModels } from './_core/llm';
import { z } from 'zod';

const crisInput = z.object({
  action: z.enum(['explain', 'ideas', 'tests', 'review', 'chat']),
  message: z.string().max(4000).optional(),
  fileName: z.string().max(160).optional(),
  language: z.string().max(40).optional(),
  code: z.string().max(16000).default(''),
});

const actionInstructions = {
  explain: 'Explique exatamente o arquivo aberto enviado abaixo em linguagem acadêmica simples. Organize em: (1) objetivo do arquivo; (2) variáveis e dados; (3) funções e parâmetros; (4) fluxo linha a linha ou por blocos; (5) saída que o Play seguro consegue produzir; (6) melhorias graduais. Cite nomes reais encontrados no código e diga claramente quando algo não puder ser inferido. Não execute nada e não invente comportamento.',
  ideas: 'Sugira exercícios e melhorias graduais para o código, priorizando aprendizagem e segurança.',
  tests: 'Crie uma proposta de testes unitários, incluindo casos normais, limites e entradas inválidas. Não execute o código.',
  review: 'Faça uma revisão técnica do trecho, apontando riscos, clareza, manutenção e melhorias concretas. Não altere o arquivo automaticamente.',
  chat: 'Responda à mensagem da estudante como uma mentora de programação e estudos. Seja prática, acolhedora e explique seus limites quando necessário.',
} as const;

export const crisRouter = router({
  ask: publicProcedure.input(crisInput).mutation(async ({ input }) => {
    const catalog = await listLLMModels();
    const preferred = catalog.data.find(model => model.id === 'gpt-5-mini') ?? catalog.data.find(model => model.id.startsWith('gpt-5')) ?? catalog.data[0];
    if (!preferred) throw new Error('Nenhum modelo online está disponível no momento.');

    const response = await invokeLLM({
      model: preferred.id,
      messages: [
        {
          role: 'system',
          content: 'Você é a Cris, uma assistente e mentora de programação e estudos do aplicativo Estudo Organizado. Cris é uma mulher e, em português, sempre use linguagem feminina: “sou a Cris”, “posso ajudá-la” e “estou pronta”. Seja clara, acolhedora, objetiva e segura. Explique o arquivo e o código enviados na solicitação, sem responder genericamente quando houver código disponível. Nunca peça senhas, tokens ou dados pessoais. Nunca execute código, acesse arquivos do dispositivo ou prometa ações que não realizou.',
        },
        {
          role: 'user',
          content: `${actionInstructions[input.action]}\n\nMensagem da estudante:\n${input.message ?? '(nenhuma mensagem)'}` + (input.action === 'chat' ? '' : `\n\nArquivo: ${input.fileName ?? 'sem nome'}\nLinguagem: ${input.language ?? 'não informada'}\n\nCódigo:\n${input.code || '(arquivo vazio)'}`),
        },
      ],
      maxTokens: 2400,
    });

    const content = response.choices?.[0]?.message?.content;
    return {
      mode: 'online' as const,
      model: preferred.id,
      text: typeof content === 'string' && content.trim() ? content : 'A Cris online não retornou texto nesta tentativa. Tente novamente.',
    };
  }),
});
