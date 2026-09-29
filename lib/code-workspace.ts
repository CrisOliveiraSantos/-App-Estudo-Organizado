export type CodeLanguage = 'typescript' | 'javascript' | 'python' | 'markdown' | 'json';

export type CodeFile = {
  id: string;
  name: string;
  language: CodeLanguage;
  content: string;
  updatedAt: string;
};

export type CodeProject = {
  id: string;
  name: string;
  description: string;
  files: CodeFile[];
  createdAt: string;
  updatedAt: string;
};

export type SandboxCommand = 'help' | 'pwd' | 'ls' | 'tree' | 'cat' | 'run' | 'check' | 'clear' | 'status';

export const SANDBOX_LIMITS = {
  maxCommandLength: 120,
  maxOutputLength: 4000,
  timeoutMs: 1500,
  maxProjectFiles: 40,
  maxExecutionOutputLength: 12000,
} as const;

export const DEFAULT_CODE_PROJECT: CodeProject = {
  id: 'cris-lab',
  name: 'Meu primeiro laboratório',
  description: 'Um espaço seguro para aprender programação.',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  files: [
    {
      id: 'main-ts',
      name: 'main.ts',
      language: 'typescript',
      content: `const nome = 'Cris';\n\nfunction saudacao(pessoa: string) {\n  return \`Olá, \${pessoa}!\`;\n}\n\nconsole.log(saudacao(nome));\n`,
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: 'readme-md',
      name: 'README.md',
      language: 'markdown',
      content: '# Meu laboratório\n\nEscreva, experimente e aprenda com segurança.',
      updatedAt: new Date(0).toISOString(),
    },
  ],
};

export function normalizeCommand(input: string): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, SANDBOX_LIMITS.maxCommandLength);
}

export function isAllowedCommand(input: string): boolean {
  const command = normalizeCommand(input).split(' ')[0] as SandboxCommand;
  return ['help', 'pwd', 'ls', 'tree', 'cat', 'run', 'check', 'clear', 'status'].includes(command);
}

export function runSandboxCommand(input: string, project: CodeProject): string {
  const command = normalizeCommand(input);
  if (!command) return '';
  if (command.length > SANDBOX_LIMITS.maxCommandLength) return 'Comando bloqueado: limite de tamanho excedido.';
  if (!isAllowedCommand(command)) {
    return 'Comando bloqueado. A Sandbox aceita apenas: help, pwd, ls, tree, cat <arquivo>, run [arquivo], check [arquivo], clear e status.';
  }

  const [name, ...args] = command.split(' ');
  if (name === 'help') return 'Comandos seguros:\nhelp · pwd · ls · tree · cat <arquivo> · run [arquivo] · check [arquivo] · clear · status\n\nrun executa apenas exemplos didáticos suportados; não acessa sistema, rede ou processos.';
  if (name === 'pwd') return `/projetos/${project.id}`;
  if (name === 'ls' || name === 'tree') return project.files.map(file => `${name === 'tree' ? '├─ ' : ''}${file.name} · ${file.language}`).join('\n') || '(projeto vazio)';
  if (name === 'check') {
    const file = findTargetFile(project, args);
    return file ? checkCodeFile(file) : 'Informe o arquivo: check main.ts';
  }
  if (name === 'run') {
    const file = findTargetFile(project, args) ?? project.files.find(item => item.language === 'typescript' || item.language === 'javascript' || item.language === 'python');
    return file ? runEducationalExample(file) : 'Nenhum arquivo executável didático foi encontrado.';
  }
  if (name === 'status') return `Sandbox ativa · ${project.files.length} arquivo(s) · modo educacional seguro · sem acesso ao sistema/rede.`;
  if (name === 'clear') return '';
  if (name === 'cat') {
    const file = project.files.find(item => item.name === args.join(' '));
    return file ? file.content.slice(0, SANDBOX_LIMITS.maxOutputLength) : `Arquivo não encontrado: ${args.join(' ') || '(informe um nome)'}`;
  }
  return 'Comando não disponível.';
}

function findTargetFile(project: CodeProject, args: string[]) {
  const targetName = args.join(' ').trim();
  return targetName ? project.files.find(item => item.name === targetName) : undefined;
}

export function checkCodeFile(file: CodeFile): string {
  const openBraces = [...file.content].filter(char => '({['.includes(char)).length;
  const closeBraces = [...file.content].filter(char => ')}]'.includes(char)).length;
  if (openBraces !== closeBraces) return `Verificação: possível erro de delimitadores em ${file.name}. Revise parênteses, colchetes e chaves.`;
  if (!file.content.trim()) return `Verificação: ${file.name} está vazio.`;
  return `Verificação concluída: ${file.name} não apresenta problemas básicos de estrutura.`;
}

export function runEducationalExample(file: CodeFile): string {
  if (file.language === 'markdown' || file.language === 'json') return `Execução indisponível para ${file.language}. Use um arquivo TypeScript, JavaScript ou Python.`;
  const normalizedContent = file.content.replace(/\\n/g, '\n');
  const blockedTokens = ['fetch(', 'XMLHttpRequest', 'child_process', 'spawn(', 'exec(', 'process.env', 'require('];
  if (blockedTokens.some(token => normalizedContent.includes(token))) return 'Execução bloqueada: o exemplo contém acesso de rede, processo ou ambiente não permitido na Sandbox.';

  const variables = new Map<string, string>();
  for (const match of normalizedContent.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['\"]([^'\"]*)['\"]/g)) {
    variables.set(match[1], match[2]);
  }
  const templates = new Map<string, { parameter: string; template: string }>();
  for (const match of normalizedContent.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*\{[\s\S]*?return\s+`([^`]*)`[;\s]*\}/g)) {
    templates.set(match[1], { parameter: match[2], template: match[3] });
  }
  const output: string[] = [];
  for (const line of normalizedContent.split('\n')) {
    const consoleMatch = line.match(/console\.log\((.*)\)\s*;?\s*$/);
    const printMatch = line.match(/print\((.*)\)\s*;?\s*$/);
    const expression = consoleMatch?.[1]?.trim() ?? printMatch?.[1]?.trim();
    if (!expression) continue;
    const literal = expression.match(/^['\"](.*)['\"]$/)?.[1];
    if (literal !== undefined) { output.push(literal); continue; }
    const call = expression.match(/^([A-Za-z_$][\w$]*)\(([^)]*)\)$/);
    if (call && templates.has(call[1])) {
      const fn = templates.get(call[1])!;
      const argument = call[2].trim();
      const value = variables.get(argument) ?? argument.replace(/^['\"]|['\"]$/g, '');
      output.push(fn.template.replace(new RegExp(`\\$\\{\\s*${fn.parameter}\\s*\\}`, 'g'), value));
      continue;
    }
    if (variables.has(expression)) { output.push(variables.get(expression)!); continue; }
    return `Execução interrompida: a expressão “${expression}” ainda não faz parte do conjunto seguro suportado. Use console.log com textos, variáveis string ou funções simples de template.`;
  }
  if (!output.length) return `Execução concluída para ${file.name}, mas não encontrei uma instrução console.log/print suportada.`;
  return [`▶ ${file.name}`, ...output.map(line => `> ${line}`), 'Execução didática concluída · interpretador educacional seguro · sem acesso ao sistema ou à rede.'].join('\n').slice(0, SANDBOX_LIMITS.maxExecutionOutputLength);
}

export function createCodeFile(name: string, language: CodeLanguage = 'typescript'): CodeFile {
  const now = new Date().toISOString();
  return { id: `file-${Date.now()}`, name: name.trim() || 'sem-nome.ts', language, content: '', updatedAt: now };
}

export function updateProjectFile(project: CodeProject, fileId: string, content: string): CodeProject {
  const now = new Date().toISOString();
  return { ...project, updatedAt: now, files: project.files.map(file => file.id === fileId ? { ...file, content, updatedAt: now } : file) };
}
