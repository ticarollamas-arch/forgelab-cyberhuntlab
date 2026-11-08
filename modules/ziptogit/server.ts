import express, { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';

dotenv.config();

const app = express();
const publicPathPrefix = (process.env.PUBLIC_PATH_PREFIX || '/ziptogit').replace(/\/$/, '');
app.use((req, _res, next) => {
  if (publicPathPrefix && (req.url === publicPathPrefix || req.url.startsWith(`${publicPathPrefix}/`))) {
    req.url = req.url.slice(publicPathPrefix.length) || '/';
  }
  next();
});
app.use(express.json({ limit: '100mb' }));

function requireForgePremium(req: any, res: any, next: any) {
  if (req.path === '/api/health') return next();
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((v: string) => v.trim()).filter(Boolean).map((v: string) => { const i = v.indexOf('='); return (i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))]) as [string, string]; }));
  const token = cookies.forgelab_user;
  const key = process.env.JWT_SECRET || process.env.ADMIN_SESSION_SECRET || '';
  let payload: any = null;
  try {
    if (token && key.length >= 32) {
      const [data, signature] = token.split('.');
      if (data && signature) {
        const expected = createHmac('sha256', key).update(data).digest('base64url');
        const a = Buffer.from(signature); const b = Buffer.from(expected);
        if (a.length === b.length && timingSafeEqual(a, b)) payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      }
    }
  } catch { payload = null; }
  if (!payload || payload.role !== 'user' || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Faça login no ForgeLab Studio para acessar este módulo.' });
    return res.redirect(302, '/login');
  }
  if (!['monthly', 'lifetime'].includes(payload.plan_type)) {
    if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Este módulo exige uma licença Premium ativa.' });
    return res.redirect(302, '/venda');
  }
  return next();
}

app.use(requireForgePremium);

const port = Number(process.env.PORT) || 3000;

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'ziptogit-engine',
    },
  },
});

app.post('/api/analyze-architecture', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectName, projectType, fileTree, keyFiles, apkAnalysis } = req.body;

    if (!projectName || !fileTree) {
      res.status(400).json({ error: 'Dados insuficientes para análise de arquitetura.' });
      return;
    }

    const systemInstruction = `Você é um Arquiteto de Software Principal especializado em engenharia reversa limpa ("Clean-Room Reverse Engineering") e especificação de software.
O usuário NÃO deseja copiar códigos, logotipos, estilos ou marcas de terceiros.
Seu objetivo é analisar a estrutura técnica e inventário de dependências do projeto anexado e produzir:
1. Uma explicação profunda de como o projeto foi planejado e concebido do zero.
2. Qual a arquitetura recomendada e o fluxo de dados.
3. Quais bibliotecas e ferramentas são estritamente necessárias para funcionar.
4. O passo a passo da lógica técnica para o usuário recriar um projeto similar com código 100% autoral e identidade visual própria.
5. Um PROMPT MESTRE pronto para ser colado em uma IA de desenvolvimento para construir o sistema do zero sem plagiar ou usar código legado.

Responda em formato JSON estruturado com os seguintes campos:
- overview: Resumo de alto nível do problema que a aplicação resolve e seu modelo de funcionamento.
- techStack: Array de objetos com { name: string, category: string, role: string, necessity: string } descrevendo as tecnologias necessárias.
- architectureBreakdown: { pattern: string, dataFlow: string, modules: Array<{ name: string, purpose: string, responsibility: string }> }
- stepByStepLogic: Array de objetos com { stepNumber: number, title: string, objective: string, keyTasks: string[], pitfallsToAvoid: string }
- masterPrompt: Texto completo, rico e detalhado do Prompt Mestre em Markdown pronto para ser copiado. Deve instruir uma IA a construir o sistema do zero com identidade visual original e código limpo.
- visualDifferentiationTips: Dicas para criar uma identidade visual e UX completamente novas e autênticas.`;

    const prompt = `Analise o seguinte projeto:
Nome: ${projectName}
Tipo detectado: ${projectType || 'Geral'}
${apkAnalysis ? `Informações do APK: ${JSON.stringify(apkAnalysis)}` : ''}

Estrutura de arquivos (amostra dos principais arquivos):
${fileTree.slice(0, 100).join('\n')}

Trechos e manifestos essenciais encontrados:
${JSON.stringify(keyFiles || {}).slice(0, 8000)}

Gere a análise completa de engenharia reversa limpa e o prompt mestre para criação do zero.`;

    // 1. Resolve Universal AI Provider / OpenAI-Compatible Endpoint
    const rawProvider = ((req.headers['x-ai-provider'] as string) || '').trim().toLowerCase();
    const customBaseUrl = ((req.headers['x-ai-base-url'] as string) || '').trim();
    const customModel = ((req.headers['x-ai-model'] as string) || '').trim();
    const userApiKey =
      ((req.headers['x-ai-api-key'] as string) || '').trim() ||
      ((req.headers['x-nvidia-api-key'] as string) || '').trim();

    // Map provider to endpoint and default models
    let provider = rawProvider || 'nvidia';
    let targetBaseUrl = '';
    let targetModel = '';
    let targetApiKey = userApiKey;

    switch (provider) {
      case 'openai':
        targetBaseUrl = customBaseUrl || 'https://api.openai.com/v1';
        targetModel = customModel || 'gpt-4o-mini';
        targetApiKey = targetApiKey || (process.env.OPENAI_API_KEY || '').trim();
        break;
      case 'deepseek':
        targetBaseUrl = customBaseUrl || 'https://api.deepseek.com/v1';
        targetModel = customModel || 'deepseek-chat';
        targetApiKey = targetApiKey || (process.env.DEEPSEEK_API_KEY || '').trim();
        break;
      case 'groq':
        targetBaseUrl = customBaseUrl || 'https://api.groq.com/openai/v1';
        targetModel = customModel || 'llama-3.3-70b-versatile';
        targetApiKey = targetApiKey || (process.env.GROQ_API_KEY || '').trim();
        break;
      case 'ollama':
        targetBaseUrl = customBaseUrl || (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').trim();
        targetModel = customModel || 'llama3.3';
        // Ollama does not strictly require an API key
        if (!targetApiKey) targetApiKey = 'ollama';
        break;
      case 'custom':
        targetBaseUrl = customBaseUrl || 'http://localhost:11434/v1';
        targetModel = customModel || 'llama-3.3-70b-instruct';
        break;
      case 'nvidia':
      default:
        provider = 'nvidia';
        targetBaseUrl = customBaseUrl || 'https://integrate.api.nvidia.com/v1';
        targetModel = customModel || 'meta/llama-3.3-70b-instruct';
        targetApiKey = targetApiKey || (process.env.NVIDIA_API_KEY || '').trim();
        break;
    }

    // If an API key or local Ollama endpoint is available, try the OpenAI-compatible API
    const canAttemptOpenAICompatible =
      targetApiKey || provider === 'ollama' || customBaseUrl.includes('localhost') || customBaseUrl.includes('127.0.0.1');

    if (canAttemptOpenAICompatible && targetBaseUrl) {
      try {
        const completionsUrl = `${targetBaseUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (targetApiKey) {
          headers.Authorization = `Bearer ${targetApiKey}`;
        }

        const llmRes = await fetch(completionsUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: targetModel,
            messages: [
              {
                role: 'system',
                content: `${systemInstruction}\nIMPORTANTE: Responda estritamente em formato JSON válido sem texto fora do bloco JSON.`,
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 3500,
          }),
        });

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          let rawContent = llmData.choices?.[0]?.message?.content || '';
          // Strip possible markdown ```json ... ``` wrapper
          if (rawContent.includes('```json')) {
            rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
          } else if (rawContent.includes('```')) {
            rawContent = rawContent.replace(/```\s*/g, '');
          }
          const parsed = JSON.parse(rawContent.trim());
          res.json({ success: true, analysis: parsed, source: `${provider}:${targetModel}` });
          return;
        } else {
          const errText = await llmRes.text().catch(() => '');
          console.warn(`LLM Provider ${provider} (${targetBaseUrl}) returned status ${llmRes.status}: ${errText.slice(0, 150)}`);
        }
      } catch (providerErr: any) {
        console.warn(`LLM Provider ${provider} request failed: ${providerErr.message || providerErr}`);
      }
    }

    // 2. Try calling Gemini API
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const textOutput = response.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          res.json({ success: true, analysis: parsed, source: 'gemini' });
          return;
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, generating deterministic architectural specification');
      }
    }

    // Fallback deterministic clean-room architecture generator
    const fallback = generateDeterministicArchitecture(projectName, projectType, fileTree, keyFiles, apkAnalysis);
    res.json({ success: true, analysis: fallback, source: 'local-architect' });
  } catch (error: any) {
    console.error('Error analyzing architecture:', error);
    res.status(500).json({ error: error.message || 'Falha ao analisar arquitetura do projeto.' });
  }
});

/**
 * Endpoint for Documentation Standardization and Project Rebranding.
 * - Preserves copyright, author, attribution, trademark, and license notices
 * - Replaces the old project name only in descriptive lines owned by the project
 * - Uses configured AI LLM (OpenAI, Ollama, DeepSeek, Groq, NVIDIA) or Gemini fallback to synthesize professional README
 * - Provides structured fallback when no LLM is configured
 */
app.post('/api/rebrand-readme', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      projectName,
      oldProjectName,
      existingReadme,
      projectType,
      fileList,
    } = req.body;

    const newName = (projectName || 'novo-projeto').trim();
    const oldName = (oldProjectName || '').trim();

    // 1. Preserve all copyright, author, attribution, trademark, and license notices.
    // Only replace the explicitly supplied old project name in descriptive lines.
    let sanitizedOriginal = existingReadme || '';
    let metadataRemovedCount = 0;
    let oldNameOccurrencesReplaced = 0;

    // Replace old project name if provided or detected
    if (sanitizedOriginal && oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(escapeRegExp(oldName), 'gi');
      const protectedAttributionPattern = /(copyright|©|licen[cs]e|licen[çc]a|attribution|author|autoria|cr[eé]dito|credit|trademark|marca registrada)/i;
      sanitizedOriginal = sanitizedOriginal.split(/\r?\n/).map((line: string) => {
        if (protectedAttributionPattern.test(line)) return line;
        const matches = line.match(nameRegex);
        if (matches) oldNameOccurrencesReplaced += matches.length;
        return line.replace(nameRegex, newName);
      }).join('\n');
    }

    // 2. Resolve AI Provider from Headers / Env
    const rawProvider = ((req.headers['x-ai-provider'] as string) || '').trim().toLowerCase();
    const customBaseUrl = ((req.headers['x-ai-base-url'] as string) || '').trim();
    const customModel = ((req.headers['x-ai-model'] as string) || '').trim();
    const userApiKey =
      ((req.headers['x-ai-api-key'] as string) || '').trim() ||
      ((req.headers['x-nvidia-api-key'] as string) || '').trim();

    let provider = rawProvider || 'nvidia';
    let targetBaseUrl = '';
    let targetModel = '';
    let targetApiKey = userApiKey;

    switch (provider) {
      case 'openai':
        targetBaseUrl = customBaseUrl || 'https://api.openai.com/v1';
        targetModel = customModel || 'gpt-4o-mini';
        targetApiKey = targetApiKey || (process.env.OPENAI_API_KEY || '').trim();
        break;
      case 'deepseek':
        targetBaseUrl = customBaseUrl || 'https://api.deepseek.com/v1';
        targetModel = customModel || 'deepseek-chat';
        targetApiKey = targetApiKey || (process.env.DEEPSEEK_API_KEY || '').trim();
        break;
      case 'groq':
        targetBaseUrl = customBaseUrl || 'https://api.groq.com/openai/v1';
        targetModel = customModel || 'llama-3.3-70b-versatile';
        targetApiKey = targetApiKey || (process.env.GROQ_API_KEY || '').trim();
        break;
      case 'ollama':
        targetBaseUrl = customBaseUrl || (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').trim();
        targetModel = customModel || 'llama3.3';
        if (!targetApiKey) targetApiKey = 'ollama';
        break;
      case 'custom':
        targetBaseUrl = customBaseUrl || 'http://localhost:11434/v1';
        targetModel = customModel || 'llama-3.3-70b-instruct';
        break;
      case 'nvidia':
      default:
        provider = 'nvidia';
        targetBaseUrl = customBaseUrl || 'https://integrate.api.nvidia.com/v1';
        targetModel = customModel || 'meta/llama-3.3-70b-instruct';
        targetApiKey = targetApiKey || (process.env.NVIDIA_API_KEY || '').trim();
        break;
    }

    const canAttemptOpenAI =
      targetApiKey || provider === 'ollama' || customBaseUrl.includes('localhost') || customBaseUrl.includes('127.0.0.1');

    const isNew = !existingReadme || existingReadme.trim().length === 0;
    const systemPrompt = isNew
      ? `Você é um Engenheiro de Software Sênior e Especialista em Documentação Técnica.
Gere um README.md completo, profissional, moderno e detalhado para o repositório "${newName}".
O projeto é do tipo "${projectType || 'Full-Stack'}".
Estrutura de arquivos:
${(fileList || []).slice(0, 40).join('\n')}

Seções obrigatórias:
# ${newName}
- Badges e resumo executivo
- Visão Geral & Funcionalidades Principais
- Arquitetura & Stack Tecnológica
- Pré-requisitos & Instalação
- Execução & Comandos (scripts de dev, build, teste)
- Estrutura de Pastas
- Licença e atribuição (somente declarar o que foi verificado)

Preserve integralmente avisos de copyright, autoria, créditos, marcas e licenças de terceiros.
Não remova créditos de ferramentas ou autores. Não invente uma licença (incluindo MIT).
Se não existir LICENSE, declare que a licença não foi especificada e que os direitos devem ser confirmados antes da redistribuição.
Gere estritamente o código Markdown pronto, sem conversas extras.`
      : `Você é um Engenheiro de Software Sênior e Especialista em Documentação Técnica.
Reescreva este README.md usando paráfrase técnica e profissional, mantendo todo o significado técnico e comandos, mas alterando a estrutura, o tom e a apresentação.
Substitua todas as ocorrências do nome antigo do projeto pelo novo nome: "${newName}".
Corrija somente referências descritivas comprovadamente pertencentes ao projeto. Preserve avisos de copyright, autoria, atribuição, marcas, licenças e créditos de terceiros exatamente como estão. Não invente licença, não substitua arquivos LICENSE e não remova avisos legais.

README Original:
${sanitizedOriginal}

Gere estritamente o código Markdown pronto, sem conversas extras.`;

    let generatedReadme = '';
    let generationSource: 'ai-llm' | 'template-fallback' = 'template-fallback';
    let providerUsed = '';
    let notice = '';

    // Attempt OpenAI / Ollama compatible call
    if (canAttemptOpenAI && targetBaseUrl) {
      try {
        const completionsUrl = `${targetBaseUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (targetApiKey) headers.Authorization = `Bearer ${targetApiKey}`;

        const llmRes = await fetch(completionsUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Gere a versão final do README.md para o projeto "${newName}".` },
            ],
            temperature: 0.3,
            max_tokens: 3000,
          }),
        });

        if (llmRes.ok) {
          const data = await llmRes.json();
          let rawText = data.choices?.[0]?.message?.content || '';
          if (rawText.startsWith('```markdown')) {
            rawText = rawText.replace(/^```markdown\s*/, '').replace(/```\s*$/, '');
          } else if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
          if (rawText.trim().length > 50) {
            generatedReadme = rawText.trim();
            generationSource = 'ai-llm';
            providerUsed = `${provider}:${targetModel}`;
          }
        } else {
          console.warn(`[Rebrand README] LLM returned ${llmRes.status}`);
        }
      } catch (err: any) {
        console.warn(`[Rebrand README] LLM error: ${err.message}`);
      }
    }

    // Fallback: If no LLM configured or LLM failed
    if (!generatedReadme) {
      notice = 'Nenhum provedor de IA configurado ou conectado para gerar o README. Usando template técnico padronizado.';
      generatedReadme = `# ${newName}\n\n> Repositório padronizado e documentado via ZipToGit.\n\n## 📌 Visão Geral\nEste repositório contém o código-fonte do projeto **${newName}**, estruturado com boas práticas de engenharia de software e separação modular.\n\n## 🚀 Stack Tecnológica\n- **Ecossistema:** ${projectType || 'Full-Stack'}\n- **Configurações:** Variáveis desacopladas via arquivos \`.env\`\n\n## 🛠️ Instalação e Execução\n\`\`\`bash\n# Instale as dependências e inicie o projeto\nnpm install && npm run dev\n\`\`\`\n\n## 📂 Estrutura do Projeto\n\`\`\`text\n${(fileList || []).slice(0, 15).join('\n') || '├── src/\n└── README.md'}\n\`\`\`\n\n## 📄 Licença e atribuição\nPreserve os avisos e arquivos de licença existentes. Se não houver LICENSE, a licença não está especificada; confirme os direitos antes de redistribuir. Nenhuma licença é atribuída automaticamente.`;
      generationSource = 'template-fallback';
    }

    res.json({
      success: true,
      isCreated: isNew,
      oldNameOccurrencesReplaced,
      metadataRemovedCount,
      originalContent: existingReadme || '',
      refactoredContent: generatedReadme,
      generationSource,
      providerUsed: providerUsed || undefined,
      notice: notice || undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao processar rebrand do README.' });
  }
});

/**
 * Server-side package validation and Zip Slip sanitization endpoint.
 * - Validates real file type by magic bytes
 * - Rejects absolute paths and traversal segments ("..")
 * - Enforces extraction inside isolated temp directory: os.tmpdir()
 * - Protects against Zip Bombs (500 MB limit)
 */
app.post('/api/validate-package', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, filePaths, totalUncompressedSize, base64Sample } = req.body;

    // Check paths for Zip Slip
    if (Array.isArray(filePaths)) {
      for (const entry of filePaths) {
        if (typeof entry !== 'string') continue;
        if (entry.includes('\0')) {
          res.status(400).json({ error: 'Violação de segurança: caractere nulo detectado no caminho.' });
          return;
        }
        const normalized = entry.replace(/\\/g, '/');
        if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
          res.status(400).json({ error: `Violação de segurança (Zip Slip): caminho absoluto proibido: "${entry}"` });
          return;
        }
        const segments = normalized.split('/');
        if (segments.includes('..')) {
          res.status(400).json({ error: `Violação de segurança (Zip Slip): tentativa de path traversal detectada ("..") em: "${entry}"` });
          return;
        }
      }
    }

    // DoS / Zip Bomb protection check (supports 700 MB+ folders and packages)
    const MAX_SAFE_SIZE = 2048 * 1024 * 1024; // 2 GB (2048 MB)
    if (typeof totalUncompressedSize === 'number' && totalUncompressedSize > MAX_SAFE_SIZE) {
      res.status(400).json({ error: 'Arquivo rejeitado: tamanho total descompactado excede o limite seguro de 2 GB.' });
      return;
    }

    // Magic bytes verification
    let magicDetected = 'unknown';
    if (base64Sample) {
      const buffer = Buffer.from(base64Sample.slice(0, 32), 'base64');
      if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        magicDetected = filename?.endsWith('.apk') ? 'APK (Android Package)' : 'ZIP (PKZip Archive)';
      } else if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        magicDetected = 'GZIP Archive';
      } else if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
        magicDetected = 'Windows PE Executable (.exe)';
      } else if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
        magicDetected = 'ELF Binary (.so/Linux)';
      } else if (buffer.length >= 4 && buffer[0] === 0x64 && buffer[1] === 0x65 && buffer[2] === 0x78) {
        magicDetected = 'Dalvik Executable (.dex)';
      } else if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72) {
        magicDetected = 'WinRAR Archive (.rar)';
      } else if (buffer.length >= 6 && buffer[0] === 0x37 && buffer[1] === 0x7a) {
        magicDetected = '7-Zip Archive (.7z)';
      }
    }

    // Setup an isolated temporary directory
    const sandboxDir = path.join(os.tmpdir(), 'ziptogit-sandbox');
    if (!fs.existsSync(sandboxDir)) {
      try {
        fs.mkdirSync(sandboxDir, { recursive: true });
      } catch {
        // ignore if already created
      }
    }

    res.json({
      success: true,
      valid: true,
      magicDetected,
      maxDepthLimit: 3,
      maxSizeLimitMB: 2048,
      isolatedTempBase: sandboxDir,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao validar pacote no servidor.' });
  }
});

function generateDeterministicArchitecture(
  projectName: string,
  projectType: string,
  fileTree: string[],
  keyFiles: Record<string, string>,
  apkAnalysis?: any
) {
  const isAndroid = projectType.includes('APK') || fileTree.some((f) => f.includes('AndroidManifest') || f.includes('.dex'));
  const isReact = fileTree.some((f) => f.includes('react') || f.includes('vite.config') || f.includes('App.tsx'));
  const isPython = fileTree.some((f) => f.includes('requirements.txt') || f.includes('.py'));

  return {
    overview: `Este projeto (${projectName}) é concebido como ${
      isAndroid
        ? 'um aplicativo móvel Android com processamento nativo e renderização de interface'
        : isReact
        ? 'uma aplicação web moderna e reativa baseada em componentes com ciclo de vida desacoplado'
        : isPython
        ? 'um sistema de automação ou backend em Python estruturado em módulos independentes'
        : 'um ecossistema de software modularizado com separação estrita de camadas'
    }. Sua lógica central reside na orquestração entre entrada de dados do usuário, validação em tempo de execução e manipulação eficiente de estado.`,
    techStack: [
      {
        name: isAndroid ? 'Android SDK / Kotlin' : isReact ? 'React 19 + TypeScript' : isPython ? 'Python 3.12+' : 'TypeScript / Node.js',
        category: 'Linguagem e Runtime Central',
        role: 'Execução primária de toda a lógica de negócios e orquestração de chamadas.',
        necessity: 'Essencial',
      },
      {
        name: isAndroid ? 'Jetpack Compose / Material 3' : isReact ? 'Tailwind CSS' : 'Design Tokens / Sistema Estilizado',
        category: 'Camada de Interface & Experiência',
        role: 'Renderização visual adaptativa com suporte a layouts responsivos e acessibilidade.',
        necessity: 'Essencial',
      },
      {
        name: isAndroid ? 'Coroutines / Flow' : isReact ? 'Hooks Customizados / Context API' : 'State Engine',
        category: 'Gerenciamento de Estado',
        role: 'Controle de estados reativos assíncronos e desacoplamento do ciclo de vida da interface.',
        necessity: 'Recomendado',
      },
      {
        name: isAndroid ? 'OkHttp / Retrofit' : 'Fetch API Nativo / REST Client',
        category: 'Comunicação de Dados',
        role: 'Sincronização com serviços remotos, tratamento de erros e serialização de payload.',
        necessity: 'Opcional / Conforme endpoints',
      },
    ],
    architectureBreakdown: {
      pattern: isAndroid ? 'MVVM (Model-View-ViewModel) com Clean Architecture' : 'Component-Driven Architecture com Services Layer',
      dataFlow: 'Entrada do Usuário -> Hook/ViewModel -> Camada de Serviço/Casos de Uso -> Storage/API -> Atualização de Estado Reativo -> Re-renderização da Interface',
      modules: [
        {
          name: 'Core & Models',
          purpose: 'Definição estrita das estruturas de dados, contratos TypeScript/Data Classes e validações.',
          responsibility: 'Garantir integridade dos tipos e regras invariantes de negócio.',
        },
        {
          name: 'Services & Integrations',
          purpose: 'Abstração das chamadas de API, leitura de dados e comunicação externa.',
          responsibility: 'Isolar a interface de detalhes técnicos de transporte e persistência.',
        },
        {
          name: 'UI Components',
          purpose: 'Elementos visuais modulares focados estritamente em apresentação e interação.',
          responsibility: 'Capturar eventos e refletir o estado de maneira acessível e fluida.',
        },
      ],
    },
    stepByStepLogic: [
      {
        stepNumber: 1,
        title: 'Inicialização do Ambiente & Contratos de Dados',
        objective: 'Configurar o scaffolding inicial sem dependências de legado.',
        keyTasks: [
          'Inicializar o repositório limpo com TypeScript e linter estrito',
          'Criar as interfaces/tipos base que modelam o domínio do problema',
          'Definir as variáveis de ambiente necessárias',
        ],
        pitfallsToAvoid: 'Não reutilizar bibliotecas desnecessárias ou estruturas legadas do projeto original.',
      },
      {
        stepNumber: 2,
        title: 'Implementação da Camada de Serviços & Lógica de Negócios',
        objective: 'Construir a lógica pura independente da parte visual.',
        keyTasks: [
          'Desenvolver utilitários de processamento e parsing de dados',
          'Implementar adaptadores de comunicação com APIs ou armazenamento local',
          'Cobrir regras críticas com validação rigorosa de entrada',
        ],
        pitfallsToAvoid: 'Não misturar lógica de negócios diretamente dentro dos manipuladores de clique da interface.',
      },
      {
        stepNumber: 3,
        title: 'Desenvolvimento de Interface Original e Estados Reativos',
        objective: 'Criar uma identidade visual nova, limpa e autêntica.',
        keyTasks: [
          'Definir paleta de cores própria e hierarquia tipográfica exclusiva',
          'Conectar os estados de loading, sucesso e erro com tratamento resiliente',
          'Adicionar microinterações fluidas e responsividade para todos os tamanhos de tela',
        ],
        pitfallsToAvoid: 'Não copiar elementos de marca, logotipos, fontes específicas ou cores registradas de terceiros.',
      },
    ],
    masterPrompt: `Você é um engenheiro de software sênior. Crie uma aplicação completa do zero com base nas seguintes especificações arquiteturais:

### 1. OBJETIVO DO PROJETO
Construir uma solução original inspirada na lógica funcional de "${projectName}", porém com código 100% novo, arquitetura limpa e identidade visual própria e única.

### 2. PILHA TECNOLÓGICA
- Framework: ${isAndroid ? 'Kotlin + Jetpack Compose' : isReact ? 'React 19 + Vite + TypeScript' : 'TypeScript + Node.js'}
- Estilização: ${isAndroid ? 'Material 3 / Tema Autoral' : 'Tailwind CSS com paleta de neutros sofisticados'}
- Gerenciamento de Estado: Reativo, modular e desacoplado

### 3. DIRETRIZES DE DESIGN E IDENTIDADE VISUAL
- Crie uma identidade visual AUTORAL e MODERNA. NÃO use cores, logotipos ou nomes do projeto original.
- Adote contrastes acessíveis (WCAG AA) e tipografia clara.
- Estados de erro, carregamento e sucesso claramente sinalizados.

### 4. REQUISITOS TÉCNICOS
- Separe estritamente em camadas: Models -> Services -> UI Components.
- Não deixe nenhuma ação ou botão com comportamento quebrado.
- Valide todas as entradas de dados e trate falhas de rede com mensagens claras ao usuário.

Gere o código completo, funcional e pronto para execução.`,
    visualDifferentiationTips:
      'Para garantir originalidade total: mude a paleta primária (ex: se o original usa azul, adote tons esmeralda ou grafite profundo), redesenhe o fluxo de onboarding, use outra família tipográfica (como Plus Jakarta Sans ou Manrope) e altere a disposição dos cards para um grid assimétrico moderno.',
  };
}

// Development with Vite middlewares or Production static serving
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ZipToGit server ready at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
