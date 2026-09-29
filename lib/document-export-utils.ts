export type ExportBlock = { id: string; type: string; text?: string; data?: string };
export type ExportableDocument = { title: string; content: string; blocks?: ExportBlock[] };

function plainBlock(block: ExportBlock) {
  if (block.type === 'table') {
    try {
      const rows = (JSON.parse(block.data ?? '{}') as { rows?: string[][] }).rows ?? [];
      return `${block.text || 'Tabela'}\n${rows.map(row => row.join('\t')).join('\n')}`;
    } catch { return block.text || 'Tabela sem dados legíveis'; }
  }
  if (block.type === 'chart') {
    try {
      const chart = JSON.parse(block.data ?? '{}') as { labels?: string[]; values?: number[] };
      return `${block.text || 'Gráfico'}\n${(chart.labels ?? []).map((label, index) => `${label}: ${chart.values?.[index] ?? 0}`).join('\n')}`;
    } catch { return block.text || 'Gráfico sem dados legíveis'; }
  }
  if (block.type === 'image') return `${block.text || 'Imagem de estudo'}\n[Imagem incorporada ao documento]`;
  if (block.type === 'bullet') return `• ${block.text ?? ''}`;
  if (block.type === 'quote') return `“${block.text ?? ''}”`;
  return block.text ?? '';
}

export function buildPlainTextDocument(document: ExportableDocument) {
  const sections = [document.title.trim() || 'Sem título', document.content.trim(), ...(document.blocks ?? []).map(plainBlock).filter(Boolean)];
  return sections.filter(Boolean).join('\n\n');
}

export function documentTextFilename(title: string) {
  const base = (title.trim() || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'documento';
  return `${base}.txt`;
}
