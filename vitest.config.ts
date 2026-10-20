import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Configuração mínima do vitest.
 *
 * O alias `@/*` é o do `tsconfig.json` (raiz do projeto). Sem ele, qualquer
 * módulo testado que importe `@/lib/...` (padrão de todo o app) falha no
 * resolve do Node — foi o caso de `components/neon/nav-items.ts`.
 */
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    environment: 'node',
  },
});
