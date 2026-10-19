import { describe, expect, it } from 'vitest';

import { buildSystemPrompt, buildUserPrompt, type CrisContext } from '../lib/cris-client';
import { buildStudyContext } from '../lib/cris-study-context';

const CONTEXT: CrisContext = { route: '/', screen: '', title: null, selection: null, detail: null, topics: [] };

describe('contexto real do app para a Cris', () => {
  it('resume matérias, tarefas pendentes, progresso e notas', () => {
    const text = buildStudyContext({
      subjects: [
        {
          name: 'Banco de Dados',
          tasks: [
            { title: 'Lista 3', done: false, deadline: '12/03/2026', category: 'Próximas' },
            { title: 'Relatório 1', done: true },
          ],
        },
        { name: 'Cálculo I', tasks: [{ title: 'Prova P1', done: false }] },
      ],
      notes: [
        { title: 'Normalização e formas normais', folder: 'Banco de Dados', kind: 'note' },
        { title: 'Resumo de limites', folder: 'Cálculo I', kind: 'pdf' },
      ],
      events: [
        { title: 'Prova de Cálculo', type: 'Prova', date: '20/03/2026', done: false },
        { title: 'Fórum de dúvidas', type: 'Aviso', date: 'Hoje', done: false },
      ],
    });

    expect(text).toContain('Contexto do usuário');
    expect(text).toContain('Matérias: Banco de Dados, Cálculo I.');
    expect(text).toContain('Lista 3 (Banco de Dados · prazo 12/03/2026)');
    expect(text).toContain('Prova P1 (Cálculo I)');
    expect(text).toContain('Progresso atual: 1 de 3 tarefas concluídas (33%).');
    expect(text).toContain('Normalização e formas normais (nota · Banco de Dados)');
    expect(text).toContain('Resumo de limites (PDF · Cálculo I)');
    expect(text).toContain('Prova de Cálculo (Prova · 20/03/2026)');
  });

  it('não lista tarefas concluídas entre as pendentes', () => {
    const text = buildStudyContext({
      subjects: [{ name: 'História', tasks: [{ title: 'Resumo do capítulo 1', done: true }] }],
    });
    expect(text).not.toContain('Tarefas e prazos pendentes: Resumo');
    expect(text).toContain('Tarefas e prazos pendentes: nenhum registrado.');
    expect(text).toContain('1 de 1 tarefas concluídas (100%)');
  });

  it('nunca inventa dados quando o app está vazio', () => {
    const text = buildStudyContext();
    expect(text).toContain('nenhuma cadastrada');
    expect(text).toContain('nenhum registrado');
    expect(text).toContain('nenhum material salvo');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });
});

describe('injeção do contexto no prompt da Cris', () => {
  it('coloca o bloco [Contexto do usuário] no system prompt', () => {
    const prompt = buildSystemPrompt({ ...CONTEXT, appContext: 'Matérias: Banco de Dados.\nTarefas e prazos pendentes: Lista 3.' });
    expect(prompt).toContain('[Contexto do usuário]');
    expect(prompt).toContain('Matérias: Banco de Dados.');
    expect(prompt.lastIndexOf('[Contexto da tela do app]')).toBeLessThan(prompt.lastIndexOf('[Contexto do usuário]'));
  });

  it('sem dados do app, não cria um bloco vazio', () => {
    expect(buildSystemPrompt(CONTEXT)).not.toContain('[Contexto do usuário]');
    expect(buildSystemPrompt({ ...CONTEXT, appContext: '   ' })).not.toContain('[Contexto do usuário]');
  });

  it('lembra o modelo de usar o contexto na mensagem do usuário', () => {
    const withContext = buildUserPrompt('Monte um plano', { ...CONTEXT, appContext: 'Matérias: Banco de Dados.' });
    expect(withContext).toContain('[Lembrete do contexto do usuário]');
    expect(withContext).toContain('personalizar a resposta');
    expect(withContext.indexOf('[Pergunta do aluno]')).toBeGreaterThan(withContext.indexOf('[Lembrete do contexto do usuário]'));

    const withoutContext = buildUserPrompt('Monte um plano', CONTEXT);
    expect(withoutContext).not.toContain('[Lembrete do contexto do usuário]');
  });
});
