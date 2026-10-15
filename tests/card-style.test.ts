import { describe, expect, it } from 'vitest';
import type { ViewStyle } from 'react-native';
import { splitCardStyle } from '../lib/card-style';

describe('splitCardStyle', () => {
  it('devolve caixas vazias quando não há estilo', () => {
    expect(splitCardStyle()).toEqual({ box: {}, content: {} });
    expect(splitCardStyle(null)).toEqual({ box: {}, content: {} });
  });

  it('manda layout (flex/margem/medidas) para a caixa externa e padding para a interna', () => {
    /* Igual ao `styles.documentCard` do editor. */
    expect(splitCardStyle({ flex: 1, marginBottom: 11, minWidth: 0, padding: 15 })).toEqual({
      box: { flex: 1, marginBottom: 11, minWidth: 0 },
      content: { padding: 15 },
    });
  });

  it('manda o arranjo do conteúdo para a caixa interna', () => {
    /* Igual ao `styles.taskRow` da Home. */
    expect(
      splitCardStyle({ alignItems: 'center', flexDirection: 'row', minHeight: 72, padding: 14 }),
    ).toEqual({
      box: { minHeight: 72 },
      content: { alignItems: 'center', flexDirection: 'row', padding: 14 },
    });
  });

  it('manda pintura e recorte (borda/raio/fundo/overflow) para a caixa interna', () => {
    expect(
      splitCardStyle({
        backgroundColor: '#FFFFFF',
        borderColor: '#E5DDFB',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
      }),
    ).toEqual({
      box: {},
      content: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5DDFB',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
      },
    });
  });

  it('não perde nem duplica chaves', () => {
    const style: ViewStyle = { alignItems: 'center', marginTop: 14, padding: 17, zIndex: 2 };
    const { box, content } = splitCardStyle(style);
    expect([...Object.keys(box), ...Object.keys(content)].sort()).toEqual([
      'alignItems',
      'marginTop',
      'padding',
      'zIndex',
    ]);
  });

  it('ignora chaves com valor indefinido', () => {
    expect(splitCardStyle({ marginTop: undefined, padding: undefined })).toEqual({ box: {}, content: {} });
  });

  it('manda chave desconhecida para a caixa externa', () => {
    expect(splitCardStyle({ aspectRatio: 1 })).toEqual({ box: { aspectRatio: 1 }, content: {} });
  });
});
