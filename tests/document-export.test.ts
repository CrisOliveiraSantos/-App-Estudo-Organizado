import { describe, expect, it } from 'vitest';
import { buildPlainTextDocument, documentTextFilename } from '../lib/document-export-utils';

describe('exportação de documento', () => {
  it('cria um texto legível com conteúdo, tabela e gráfico', () => {
    expect(buildPlainTextDocument({
      title: 'Resumo de POO',
      content: 'Classes organizam dados e comportamentos.',
      blocks: [
        { id: 'table', type: 'table', text: 'Revisão', data: JSON.stringify({ rows: [['Tema', 'Status'], ['Herança', 'Revisar']] }) },
        { id: 'chart', type: 'chart', text: 'Progresso', data: JSON.stringify({ labels: ['Teoria'], values: [80] }) },
      ],
    })).toContain('Herança\tRevisar');
    expect(buildPlainTextDocument({ title: 'Resumo', content: '', blocks: [{ id: 'chart', type: 'chart', text: 'Progresso', data: JSON.stringify({ labels: ['Teoria'], values: [80] }) }] })).toContain('Teoria: 80');
  });

  it('gera um nome de arquivo seguro com extensão de texto', () => {
    expect(documentTextFilename('Trabalho: Banco de Dados!')).toBe('trabalho-banco-de-dados.txt');
  });
});
