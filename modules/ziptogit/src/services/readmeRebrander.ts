import { ParsedZipFile, ReadmeRebrandResult } from '../types';

/**
 * Service for Documentation Standardization and Project Rebranding.
 * Preserves authorship, copyright, attribution, and license notices; updates project-owned descriptions,
 * and synthesizes a technical README.md via AI or fallback.
 */

export function generateFallbackReadme(
  projectName: string,
  projectType?: string,
  fileList: string[] = [],
  originalReadme?: string
): string {
  const type = (projectType || '').toLowerCase();
  const isPython = type.includes('python') || fileList.some((f) => f.endsWith('.py'));
  const isNode = type.includes('react') || type.includes('node') || fileList.some((f) => f.endsWith('package.json'));
  const isAndroid = type.includes('android') || fileList.some((f) => f.endsWith('.apk') || f.endsWith('AndroidManifest.xml'));

  let installSteps = '';
  let runSteps = '';

  if (isPython) {
    installSteps = `\`\`\`bash
# 1. Crie e ative um ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\\Scripts\\activate

# 2. Instale as dependências
pip install -r requirements.txt
\`\`\``;
    runSteps = `\`\`\`bash
# Inicie a aplicação
python main.py
\`\`\``;
  } else if (isAndroid) {
    installSteps = `\`\`\`bash
# Clone e abra o projeto no Android Studio
git clone <url-do-repositorio>
\`\`\``;
    runSteps = `\`\`\`bash
# Compile via Gradle Wrapper
./gradlew assembleDebug
\`\`\``;
  } else {
    installSteps = `\`\`\`bash
# 1. Instale as dependências
npm install
# ou
yarn install / pnpm install
\`\`\``;
    runSteps = `\`\`\`bash
# 2. Inicie o servidor de desenvolvimento
npm run dev
\`\`\``;
  }

  const topFiles = fileList
    .slice(0, 15)
    .map((f) => `├── ${f}`)
    .join('\n');

  return `# ${projectName}

> Repositório padronizado e documentado via ZipToGit.

## 📌 Visão Geral
Este repositório contém o código-fonte do projeto **${projectName}**, arquitetado com foco em modularidade, legibilidade e padrões modernos de engenharia de software.

## 🚀 Tecnologias Utilizadas
- **Ecossistema:** ${projectType || (isPython ? 'Python 3.12+' : isAndroid ? 'Android SDK / Kotlin' : 'Node.js / TypeScript')}
- **Estrutura:** Separação estrita em camadas de serviços, lógica de negócio e interfaces.
- **Configuração:** Gerenciamento de variáveis desacoplado via arquivos de ambiente (\`.env\`).

## 🛠️ Instalação e Configuração

${installSteps}

## ⚡ Execução

${runSteps}

## 📂 Estrutura Principal do Projeto
\`\`\`text
${projectName}/
${topFiles || '├── src/\n├── public/\n├── package.json\n└── README.md'}
\`\`\`

## 📄 Licença e atribuição
Preserve os avisos de copyright, autoria e licenças já presentes no projeto. Se não houver um arquivo \`LICENSE\`, confirme os direitos de redistribuição e escolha uma licença antes de publicar. Esta ferramenta não altera nem substitui licenças de terceiros.
`;
}

export function sanitizeReadmeLocally(
  content: string,
  oldName?: string,
  newName: string = 'novo-projeto'
): { sanitized: string; metadataRemovedCount: number; oldNameReplacedCount: number } {
  // Preserve all existing attribution, copyright, trademarks, and license notices.
  // Only replace the old project name in ordinary descriptive lines when explicitly requested.
  const protectedAttributionPattern = /(copyright|©|licen[cs]e|licen[çc]a|attribution|author|autoria|cr[eé]dito|credit|trademark|marca registrada)/i;
  let oldNameReplacedCount = 0;
  const lines = (content || '').split(/\r?\n/).map(line => {
    if (!oldName || !oldName.trim() || oldName.toLowerCase() === newName.toLowerCase()) return line;
    if (protectedAttributionPattern.test(line)) return line;
    const escaped = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = line.match(regex);
    if (matches) oldNameReplacedCount += matches.length;
    return line.replace(regex, newName);
  });
  return { sanitized: lines.join('\n'), metadataRemovedCount: 0, oldNameReplacedCount };
}

export async function rebrandReadmeFile(
  files: ParsedZipFile[],
  projectName: string,
  projectType: string,
  options: {
    oldProjectName?: string;
  } = {}
): Promise<{ updatedFiles: ParsedZipFile[]; result: ReadmeRebrandResult }> {
  const newName = (projectName || 'novo-projeto').trim();
  const fileList = files.map((f) => f.path);

  // Find existing README.md
  let existingReadmeFile = files.find(
    (f) => !f.isDirectory && f.path.toLowerCase().replace(/^\/+/, '') === 'readme.md'
  );

  let existingReadmeContent = '';
  if (existingReadmeFile) {
    if (typeof existingReadmeFile.content === 'string') {
      existingReadmeContent = existingReadmeFile.content;
    } else if (existingReadmeFile.loadContent) {
      const loaded = await existingReadmeFile.loadContent();
      existingReadmeContent = typeof loaded === 'string' ? loaded : new TextDecoder().decode(loaded);
    } else if (existingReadmeFile.fileRef) {
      existingReadmeContent = await existingReadmeFile.fileRef.text();
    }
  }

  // Get AI Provider preferences from localStorage
  const provider = localStorage.getItem('ai_provider') || 'nvidia';
  const apiKey = localStorage.getItem('ai_api_key') || localStorage.getItem('nvidia_api_key') || '';
  const baseUrl = localStorage.getItem('ai_base_url') || '';
  const model = localStorage.getItem('ai_model') || '';

  // Attempt server call to /api/rebrand-readme
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (provider) headers['x-ai-provider'] = provider;
    if (apiKey) headers['x-ai-api-key'] = apiKey;
    if (baseUrl) headers['x-ai-base-url'] = baseUrl;
    if (model) headers['x-ai-model'] = model;

    const res = await fetch(`${import.meta.env.BASE_URL}api/rebrand-readme`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectName: newName,
        oldProjectName: options.oldProjectName,
        existingReadme: existingReadmeContent,
        projectType,
        fileList,
      }),
    });

    if (res.ok) {
      const data: ReadmeRebrandResult = await res.json();
      const updatedFiles = updateFilesWithReadme(files, data.refactoredContent);
      return { updatedFiles, result: data };
    }
  } catch (err) {
    console.warn('[Rebrand Service] Server API unavailable, executing client fallback...', err);
  }

  // Client-Side Fallback
  const isCreated = !existingReadmeContent || existingReadmeContent.trim().length === 0;
  const { sanitized, metadataRemovedCount, oldNameReplacedCount } = sanitizeReadmeLocally(
    existingReadmeContent,
    options.oldProjectName,
    newName
  );

  const finalContent = isCreated
    ? generateFallbackReadme(newName, projectType, fileList)
    : sanitized;

  const clientResult: ReadmeRebrandResult = {
    isCreated,
    oldNameOccurrencesReplaced: oldNameReplacedCount,
    metadataRemovedCount,
    originalContent: existingReadmeContent,
    refactoredContent: finalContent,
    generationSource: 'template-fallback',
    notice: 'Nenhum provedor de IA conectado. README gerado com template técnico padronizado.',
  };

  const updatedFiles = updateFilesWithReadme(files, finalContent);
  return { updatedFiles, result: clientResult };
}

function updateFilesWithReadme(files: ParsedZipFile[], newReadmeText: string): ParsedZipFile[] {
  const readmePath = 'README.md';
  const existingIndex = files.findIndex(
    (f) => !f.isDirectory && f.path.toLowerCase().replace(/^\/+/, '') === 'readme.md'
  );

  const newFile: ParsedZipFile = {
    path: readmePath,
    name: readmePath,
    size: new TextEncoder().encode(newReadmeText).length,
    isDirectory: false,
    content: newReadmeText,
    isBinary: false,
    included: true,
    extension: 'md',
  };

  if (existingIndex >= 0) {
    const copy = [...files];
    copy[existingIndex] = {
      ...copy[existingIndex],
      path: readmePath,
      name: readmePath,
      content: newReadmeText,
      size: newFile.size,
      included: true,
    };
    return copy;
  } else {
    return [newFile, ...files];
  }
}
