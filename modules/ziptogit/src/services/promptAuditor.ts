import { ParsedZipFile, RefactoringAuditResult } from '../types';

/**
 * Service for Code Auditing & Prompt Parameterization.
 * Transforms hardcoded prompts into environment variables (os.getenv / process.env)
 * and generates mock stubs for moderation APIs so projects can be tested offline
 * with local LLMs (such as Ollama) without breaking on network calls.
 */

interface ScanContext {
  hasCloudApiKey: boolean;
  hasLocalModel: boolean;
  detectedProviders: Set<string>;
}

export async function resolveFileTextContent(file: ParsedZipFile): Promise<string | null> {
  if (file.isBinary) return null;
  if (typeof file.content === 'string') return file.content;
  if (file.loadContent) {
    const res = await file.loadContent();
    if (typeof res === 'string') return res;
    return new TextDecoder().decode(res);
  }
  if (file.fileRef) {
    return await file.fileRef.text();
  }
  return null;
}

export async function auditAndRefactorProjectFiles(
  files: ParsedZipFile[]
): Promise<{ refactoredFiles: ParsedZipFile[]; result: RefactoringAuditResult }> {
  const context: ScanContext = {
    hasCloudApiKey: false,
    hasLocalModel: false,
    detectedProviders: new Set(),
  };

  // Phase 1: Environment awareness scan
  for (const file of files) {
    if (file.isDirectory) continue;
    const lowerPath = file.path.toLowerCase();
    const isEnvOrConfig =
      lowerPath.includes('.env') ||
      lowerPath.endsWith('config.json') ||
      lowerPath.endsWith('settings.py') ||
      lowerPath.endsWith('modelfile');

    if (isEnvOrConfig) {
      const text = await resolveFileTextContent(file);
      if (text) {
        if (/OPENAI_API_KEY/i.test(text)) {
          context.hasCloudApiKey = true;
          context.detectedProviders.add('OpenAI API');
        }
        if (/ANTHROPIC_API_KEY/i.test(text)) {
          context.hasCloudApiKey = true;
          context.detectedProviders.add('Anthropic API');
        }
        if (/GEMINI_API_KEY|GOOGLE_API_KEY/i.test(text)) {
          context.hasCloudApiKey = true;
          context.detectedProviders.add('Google Gemini');
        }
        if (/OLLAMA_BASE_URL|localhost:11434|127\.0\.0\.1:11434/i.test(text)) {
          context.hasLocalModel = true;
          context.detectedProviders.add('Ollama (Local)');
        }
      }
    }
  }

  // Phase 2: Refactoring code files
  let totalAbstractedPrompts = 0;
  let totalMockedModerations = 0;
  const fileDiffs: RefactoringAuditResult['fileDiffs'] = [];
  const refactoredFiles: ParsedZipFile[] = [];

  for (const file of files) {
    if (file.isDirectory || file.isBinary) {
      refactoredFiles.push(file);
      continue;
    }

    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const isPython = ext === 'py';
    const isJsTs = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext);
    const isYamlJson = ['json', 'yaml', 'yml'].includes(ext);
    const isModelfile = file.path.toLowerCase().endsWith('modelfile');

    if (!isPython && !isJsTs && !isYamlJson && !isModelfile) {
      refactoredFiles.push(file);
      continue;
    }

    const originalContent = await resolveFileTextContent(file);
    if (!originalContent) {
      refactoredFiles.push(file);
      continue;
    }

    let modified = originalContent;
    let filePrompts = 0;
    let fileMocks = 0;

    // Refactor Python
    if (isPython) {
      // 1. Abstract system prompts
      // system_prompt = "..."
      modified = modified.replace(
        /(system_prompt|system_instruction)\s*=\s*(["'])(.+?)\2/g,
        (_, key, quote, val) => {
          filePrompts++;
          return `${key} = os.getenv("CUSTOM_TEST_PROMPT", ${quote}${val}${quote})`;
        }
      );

      // {"role": "system", "content": "..."}
      modified = modified.replace(
        /(["']role["']\s*:\s*["']system["']\s*,\s*["']content["']\s*:\s*)(["'])(.+?)\2/g,
        (_, prefix, quote, val) => {
          filePrompts++;
          return `${prefix}os.getenv("CUSTOM_TEST_PROMPT", ${quote}${val}${quote})`;
        }
      );

      // 2. Mock moderation API calls for offline/local testing
      // openai.Moderation.create(...) or client.moderations.create(...)
      const modRegexPy = /(?:openai\.Moderation\.create|client\.moderations\.create)\s*\([^)]*\)/g;
      if (modRegexPy.test(modified)) {
        modified = modified.replace(
          modRegexPy,
          `# [AUDIT_MOCK: Moderation call stubbed for offline testing]\n{"results": [{"flagged": False, "categories": {}}]}`
        );
        fileMocks++;
      }

      // Ensure 'import os' exists if os.getenv was introduced and not present
      if (filePrompts > 0 && !/\bimport\s+os\b/.test(modified)) {
        modified = `import os  # [AUDIT: Required for CUSTOM_TEST_PROMPT]\n` + modified;
      }
    }

    // Refactor JavaScript / TypeScript
    if (isJsTs) {
      // 1. Abstract system prompts
      modified = modified.replace(
        /(systemPrompt|system_prompt|systemInstruction|system_instruction)\s*[:=]\s*(["'`])(.+?)\2/g,
        (_, key, quote, val) => {
          filePrompts++;
          return `${key}: process.env.CUSTOM_TEST_PROMPT || ${quote}${val}${quote}`;
        }
      );

      // { role: 'system', content: '...' }
      modified = modified.replace(
        /(role\s*:\s*['"]system['"]\s*,\s*content\s*:\s*)(['"`])(.+?)\2/g,
        (_, prefix, quote, val) => {
          filePrompts++;
          return `${prefix}process.env.CUSTOM_TEST_PROMPT || ${quote}${val}${quote}`;
        }
      );

      // 2. Mock moderation API calls
      const modRegexJs = /(?:openai\.moderations\.create|client\.moderations\.create)\s*\([^)]*\)/g;
      if (modRegexJs.test(modified)) {
        modified = modified.replace(
          modRegexJs,
          `/* [AUDIT_MOCK: Moderation stubbed for offline testing] */ Promise.resolve({ results: [{ flagged: false, categories: {} }] })`
        );
        fileMocks++;
      }
    }

    // Refactor Modelfile
    if (isModelfile) {
      modified = modified.replace(/SYSTEM\s+"""([\s\S]+?)"""/g, (_, body) => {
        filePrompts++;
        return `SYSTEM """\${CUSTOM_TEST_PROMPT:-${body.trim()}}"""`;
      });
    }

    // Refactor JSON / YAML
    if (isYamlJson) {
      modified = modified.replace(
        /(["']system_prompt["']\s*:\s*)(["'])(.+?)\2/g,
        (_, prefix, quote, val) => {
          filePrompts++;
          return `${prefix}${quote}\${CUSTOM_TEST_PROMPT:-${val}}${quote}`;
        }
      );
    }

    if (filePrompts > 0 || fileMocks > 0) {
      totalAbstractedPrompts += filePrompts;
      totalMockedModerations += fileMocks;

      fileDiffs.push({
        path: file.path,
        originalContent,
        refactoredContent: modified,
        abstractedPrompts: filePrompts,
        mockedCalls: fileMocks,
      });

      refactoredFiles.push({
        ...file,
        content: modified,
        size: new TextEncoder().encode(modified).length,
      });
    } else {
      refactoredFiles.push(file);
    }
  }

  // Phase 3: Create or update .env.example with parameterized variables
  const envExampleName = '.env.example';
  const existingEnv = refactoredFiles.find((f) => f.path.toLowerCase().endsWith('.env.example'));
  const envAuditBlock = `\n# [ZipToGit Auditoria] Variaveis parametrizadas para testes locais\nCUSTOM_TEST_PROMPT="You are a helpful AI assistant being tested."\nOLLAMA_BASE_URL="http://localhost:11434"\n`;

  if (existingEnv) {
    const prevText = (await resolveFileTextContent(existingEnv)) || '';
    if (!prevText.includes('CUSTOM_TEST_PROMPT')) {
      const updated = prevText + envAuditBlock;
      existingEnv.content = updated;
      existingEnv.size = new TextEncoder().encode(updated).length;
    }
  } else if (totalAbstractedPrompts > 0) {
    refactoredFiles.push({
      path: envExampleName,
      name: envExampleName,
      size: new TextEncoder().encode(envAuditBlock).length,
      isDirectory: false,
      isBinary: false,
      included: true,
      extension: 'example',
      content: envAuditBlock,
    });
  }

  // Construct environment finding notice
  let envNotice = '';
  if (context.hasLocalModel && context.hasCloudApiKey) {
    envNotice =
      'Ambiente misto detectado (Ollama local e Chaves de API em nuvem). Prompts foram abstraídos para testes locais, mas chamadas a APIs externas continuarão sujeitas às políticas do servidor.';
  } else if (context.hasLocalModel) {
    envNotice =
      'Ambiente local (Ollama) detectado. Prompts e chamadas foram abstraídos para execução autônoma em testes unitários locais.';
  } else if (context.hasCloudApiKey) {
    envNotice =
      'Chaves de API em nuvem detectadas. Nota: Modificações no código local facilitam testes, mas requisições enviadas aos provedores em nuvem continuarão sujeitas aos filtros de servidor deles.';
  } else {
    envNotice =
      'Estrutura pronta para execução local. As variáveis foram parametrizadas no arquivo .env.example para facilitar testes com Ollama ou outros runners.';
  }

  const result: RefactoringAuditResult = {
    modifiedFilesCount: fileDiffs.length,
    abstractedPromptsCount: totalAbstractedPrompts,
    mockedModerationsCount: totalMockedModerations,
    environmentFindings: {
      hasCloudApiKey: context.hasCloudApiKey,
      hasLocalModel: context.hasLocalModel,
      detectedProviders: Array.from(context.detectedProviders),
      notice: envNotice,
    },
    fileDiffs,
  };

  return { refactoredFiles, result };
}
