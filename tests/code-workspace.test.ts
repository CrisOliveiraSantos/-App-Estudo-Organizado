import { describe, expect, it } from 'vitest';
import { DEFAULT_CODE_PROJECT, isAllowedCommand, runEducationalExample, runSandboxCommand, updateProjectFile } from '../lib/code-workspace';

describe('code workspace sandbox', () => {
  it('allows only educational commands', () => {
    expect(isAllowedCommand('help')).toBe(true);
    expect(isAllowedCommand('cat main.ts')).toBe(true);
    expect(isAllowedCommand('rm -rf /')).toBe(false);
    expect(isAllowedCommand('curl https://example.com')).toBe(false);
  });

  it('lists and reads only files from the active project', () => {
    expect(runSandboxCommand('ls', DEFAULT_CODE_PROJECT)).toContain('main.ts');
    expect(runSandboxCommand('cat main.ts', DEFAULT_CODE_PROJECT)).toContain("const nome");
    expect(runSandboxCommand('cat secrets.env', DEFAULT_CODE_PROJECT)).toContain('Arquivo não encontrado');
  });

  it('returns a clear safety message for blocked commands', () => {
    expect(runSandboxCommand('sudo whoami', DEFAULT_CODE_PROJECT)).toContain('Comando bloqueado');
    expect(runSandboxCommand('npm install pacote', DEFAULT_CODE_PROJECT)).toContain('Comando bloqueado');
  });

  it('supports the expanded educational terminal and safe Play output', () => {
    expect(isAllowedCommand('run main.ts')).toBe(true);
    expect(isAllowedCommand('tree')).toBe(true);
    expect(isAllowedCommand('check main.ts')).toBe(true);
    expect(runSandboxCommand('tree', DEFAULT_CODE_PROJECT)).toContain('main.ts');
    const demoOutput = runSandboxCommand('run main.ts', DEFAULT_CODE_PROJECT);
    expect(demoOutput).toContain('Execução didática concluída');
    expect(demoOutput).not.toContain('\\n');
    expect(runEducationalExample({ ...DEFAULT_CODE_PROJECT.files[0], content: "console.log('Olá')" })).toContain('Olá');
    expect(runEducationalExample({ ...DEFAULT_CODE_PROJECT.files[0], content: "fetch('https://example.com')" })).toContain('Execução bloqueada');
  });

  it('updates one file without mutating the previous project', () => {
    const next = updateProjectFile(DEFAULT_CODE_PROJECT, 'main-ts', 'console.log(1)');
    expect(next).not.toBe(DEFAULT_CODE_PROJECT);
    expect(next.files.find(file => file.id === 'main-ts')?.content).toBe('console.log(1)');
    expect(DEFAULT_CODE_PROJECT.files.find(file => file.id === 'main-ts')?.content).toContain('const nome');
  });
});
