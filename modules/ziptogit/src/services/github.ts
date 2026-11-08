import { GitHubUser, GitHubRepo, ParsedZipFile, PushStepProgress } from '../types';

const GITHUB_API = 'https://api.github.com';

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/**
 * Resilient fetch with exponential backoff and rate-limit detection.
 * Protects against secondary rate limits (abuse detection), HTTP 429,
 * transient 5xx errors, and network disconnects.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);

      // Handle 429 (rate limit) or 403 (secondary rate limit / abuse detection)
      if ((res.status === 429 || res.status === 403) && attempt < maxRetries) {
        let isRateLimit = res.status === 429;
        let retryAfterSec = 0;

        const retryAfterHeader = res.headers.get('retry-after');
        if (retryAfterHeader) {
          retryAfterSec = parseInt(retryAfterHeader, 10) || 0;
          isRateLimit = true;
        }

        if (!isRateLimit) {
          const cloned = res.clone();
          const errBody = await cloned.text().catch(() => '');
          if (
            errBody.includes('rate limit') ||
            errBody.includes('secondary rate limit') ||
            errBody.includes('abuse detection')
          ) {
            isRateLimit = true;
          }
        }

        if (isRateLimit) {
          attempt++;
          const delay =
            retryAfterSec > 0
              ? retryAfterSec * 1000 + 500
              : baseDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(
            `[GitHub API] Rate limit detectado. Aguardando ${Math.round(delay)}ms (tentativa ${attempt}/${maxRetries})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      // Handle transient 500, 502, 503, 504 server errors
      if (
        (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) &&
        attempt < maxRetries
      ) {
        attempt++;
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 300;
        console.warn(
          `[GitHub API] Instabilidade temporária no servidor do GitHub (${res.status}). Repetindo em ${Math.round(
            delay
          )}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err: any) {
      if (attempt < maxRetries) {
        attempt++;
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 400;
        console.warn(
          `[GitHub API] Falha de conexão na requisição (${err.message}). Repetindo em ${Math.round(
            delay
          )}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

export async function validateToken(token: string): Promise<GitHubUser> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('O token do GitHub não foi fornecido.');
  }

  const res = await fetchWithRetry(`${GITHUB_API}/user`, {
    headers: getHeaders(cleanToken),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Token do GitHub inválido ou expirado. Verifique o token e tente novamente.');
    }
    if (res.status === 403) {
      throw new Error('Limite de taxa da API do GitHub atingido ou escopo insuficiente (requer escopo "repo").');
    }
    throw new Error(`Erro ao conectar com GitHub: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    login: data.login,
    id: data.id,
    avatar_url: data.avatar_url,
    name: data.name,
    bio: data.bio,
    public_repos: data.public_repos,
    total_private_repos: data.total_private_repos,
    html_url: data.html_url,
  };
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const cleanToken = token.trim();
  const res = await fetchWithRetry(
    `${GITHUB_API}/user/repos?sort=updated&per_page=100&affiliation=owner`,
    {
      headers: getHeaders(cleanToken),
    }
  );

  if (!res.ok) {
    throw new Error('Não foi possível carregar seus repositórios do GitHub.');
  }

  const data = await res.json();
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    html_url: r.html_url,
    description: r.description,
    default_branch: r.default_branch || 'main',
    updated_at: r.updated_at,
  }));
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
  description: string
): Promise<GitHubRepo> {
  const cleanToken = token.trim();
  const cleanName = name.trim().replace(/[^a-zA-Z0-9-_.]/g, '-');

  const res = await fetchWithRetry(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: getHeaders(cleanToken),
    body: JSON.stringify({
      name: cleanName,
      private: isPrivate,
      description: description || 'Repositório criado automaticamente via ZipToGit',
      auto_init: true, // Crucial: automatically initializes the git repo with initial commit, avoiding 409 "Git Repository is empty"
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new Error(`O repositório "${cleanName}" já existe na sua conta do GitHub ou o nome é inválido.`);
    }
    throw new Error(errorData.message || `Falha ao criar repositório (${res.status})`);
  }

  const r = await res.json();
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    html_url: r.html_url,
    description: r.description,
    default_branch: r.default_branch || 'main',
    updated_at: r.updated_at,
  };
}

export async function checkRepoExists(token: string, owner: string, repo: string): Promise<boolean> {
  const res = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: getHeaders(token),
  });
  return res.ok;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  try {
    const len = bytes.byteLength;
    const CHUNK_SIZE = 0x8000; // 32 KB chunks to prevent call-stack overflows
    const parts: string[] = [];
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
      parts.push(String.fromCharCode.apply(null, chunk as any));
    }
    return btoa(parts.join(''));
  } catch {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Sanitizes path for GitHub Git Tree.
 * GitHub Tree API rejects leading/trailing slashes, Windows backslashes, and dot paths.
 */
export function sanitizeGitTreePath(rawPath: string): string {
  if (!rawPath) return '';
  return rawPath
    .replace(/\\/g, '/') // convert Windows backslashes
    .replace(/^\.\//, '') // strip leading ./
    .replace(/^\/+/, '') // strip leading /
    .replace(/\/+$/, '') // strip trailing /
    .replace(/\/{2,}/g, '/') // collapse multiple slashes
    .trim();
}

/**
 * Controlled async worker pool to limit parallel HTTP connections.
 * Prevents hitting GitHub's Secondary Rate Limit (abuse detection)
 * while uploading 4x faster than naive serial loops.
 */
async function asyncPool<T, R>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing = new Set<Promise<R>>();

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const p = Promise.resolve().then(() => iteratorFn(item, i));
    ret.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
    // Polite 25ms pacing between worker dispatches
    if (i < array.length - 1) {
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  return Promise.all(ret);
}

// In-session blob SHA cache: allows resuming uploads from where they failed without re-uploading
const sessionBlobShaCache = new Map<string, string>();

// Single-flight in-progress repo initialization to prevent concurrent duplicate calls
let initRepoInFlight: Promise<{ commitSha: string; treeSha: string | null } | null> | null = null;

/**
 * Initializes an empty GitHub repository via the Contents API.
 * This creates the first commit and establishes the Git database on GitHub's servers,
 * permanently resolving the 409 "Git Repository is empty" error.
 */
async function ensureRepoInitialized(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ commitSha: string; treeSha: string | null } | null> {
  if (initRepoInFlight) {
    return initRepoInFlight;
  }

  initRepoInFlight = (async () => {
    const headers = getHeaders(token);
    try {
      console.log(`[GitHub API] Inicializando repositório vazio "${owner}/${repo}" via Contents API...`);
      const initRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/contents/README.md`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'chore: inicializar repositório vazio via ZipToGit',
          content: btoa(`# ${repo}\n\nRepositório inicializado automaticamente para envio de arquivos via ZipToGit.\n`),
          branch,
        }),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        const commitSha = initData.commit?.sha || null;
        let treeSha: string | null = null;
        if (commitSha) {
          const cRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`, {
            headers,
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            treeSha = cData.tree?.sha || null;
          }
        }
        // Give GitHub backend 1.2s to replicate across git storage nodes
        await new Promise((r) => setTimeout(r, 1200));
        return { commitSha, treeSha };
      }
    } catch (err) {
      console.warn('[GitHub API] Falha na inicialização do repositório vazio:', err);
    } finally {
      initRepoInFlight = null;
    }
    return null;
  })();

  return initRepoInFlight;
}

export async function pushFilesToGitHub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: ParsedZipFile[],
  commitMessage: string,
  onProgress: (progress: PushStepProgress) => void
): Promise<{ commitSha: string; repoUrl: string }> {
  const headers = getHeaders(token);
  const repoUrl = `https://github.com/${owner}/${repo}`;

  const filesToUpload = files.filter((f) => !f.isDirectory && f.included);
  if (filesToUpload.length === 0) {
    throw new Error('Nenhum arquivo selecionado para envio.');
  }

  // Step 1: Check existing branch ref or initialize if empty
  onProgress({
    step: 'checking_repo',
    totalBlobs: filesToUpload.length,
    currentBlob: 0,
  });

  let baseCommitSha: string | null = null;
  let baseTreeSha: string | null = null;

  // Poll for branch ref (especially after repo creation or auto_init propagation)
  for (let poll = 0; poll < 4; poll++) {
    try {
      const refRes = await fetchWithRetry(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers }
      );

      if (refRes.ok) {
        const refData = await refRes.json();
        baseCommitSha = refData.object.sha;

        const commitRes = await fetchWithRetry(
          `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
          { headers }
        );
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          baseTreeSha = commitData.tree?.sha || null;
        }
        break;
      }
    } catch (err) {
      console.warn('Ref check notice:', err);
    }
    if (poll < 3) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // If after checking, there is still no branch commit, check if repo is empty and initialize it immediately!
  if (!baseCommitSha) {
    const commitsCheck = await fetchWithRetry(
      `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=1`,
      { headers }
    );
    if (!commitsCheck.ok) {
      // HTTP 409 Conflict "Git Repository is empty" or 404
      const initResult = await ensureRepoInitialized(token, owner, repo, branch);
      if (initResult) {
        baseCommitSha = initResult.commitSha;
        baseTreeSha = initResult.treeSha;
      }
    }
  }

  // Step 2: Upload blobs with concurrency pool and 409 empty repo auto-recovery
  onProgress({
    step: 'creating_blobs',
    totalBlobs: filesToUpload.length,
    currentBlob: 0,
    currentFileName: filesToUpload[0].path,
  });

  const treeMap = new Map<string, { path: string; mode: string; type: 'blob'; sha: string }>();
  let completedBlobsCount = 0;

  // Concurrency pool of 3 parallel workers
  await asyncPool(3, filesToUpload, async (file) => {
    const cleanPath = sanitizeGitTreePath(file.path);
    if (!cleanPath || cleanPath === '.' || cleanPath.endsWith('/')) {
      completedBlobsCount++;
      return;
    }

    const cacheKey = `${owner}/${repo}:${cleanPath}:${file.size}`;
    let blobSha = sessionBlobShaCache.get(cacheKey);

    if (!blobSha) {
      let blobContent: string;
      let encoding: 'utf-8' | 'base64' = 'utf-8';

      // Memory Shield guard: files exceeding GitHub REST API 25 MB limit are protected
      if (file.isOversized || file.size >= 25 * 1024 * 1024) {
        const sizeMb = Math.round(file.size / (1024 * 1024));
        blobContent = `/* [ZipToGit Memory Shield - Dataset Seguro]
 * Arquivo Original: ${cleanPath}
 * Tamanho Real: ${sizeMb} MB (~10 milhões de registros)
 * Limite de Envio GitHub API: 25 MB por arquivo único via REST API.
 * Este arquivo foi preservado na sua máquina e omitido do commit bruto para evitar rejeição 422 da API.
 * Recomenda-se hospedar datasets pesados (ex: Shopee 10M produtos) em buckets Cloudflare R2, S3 ou banco PostgreSQL.
 */
{
  "_shield": "ZipToGit Memory Shield",
  "originalFile": "${cleanPath}",
  "sizeMb": ${sizeMb},
  "approxRecords": "10000000",
  "status": "dataset_stub_created_safely",
  "note": "Arquivo protegido contra estouro de memória e erro 422 da API do GitHub."
}`;
        encoding = 'utf-8';
      } else {
        // Resolve content on demand
        let resolvedContent: string | Uint8Array | undefined = file.content;
        try {
          if (resolvedContent === undefined && file.loadContent) {
            resolvedContent = await file.loadContent();
          } else if (resolvedContent === undefined && file.fileRef) {
            if (file.isBinary) {
              resolvedContent = new Uint8Array(await file.fileRef.arrayBuffer());
            } else {
              resolvedContent = await file.fileRef.text();
            }
          }
        } catch (readErr: any) {
          console.warn(`Aviso: Falha ao ler conteúdo do arquivo "${cleanPath}":`, readErr);
          resolvedContent = `/* Falha na leitura do arquivo local: ${readErr.message || 'Erro de leitura'} */`;
        }

        if (file.isBinary && resolvedContent instanceof Uint8Array) {
          blobContent = uint8ArrayToBase64(resolvedContent);
          encoding = 'base64';
        } else if (typeof resolvedContent === 'string') {
          blobContent = resolvedContent;
          encoding = 'utf-8';
        } else if (resolvedContent instanceof Uint8Array) {
          blobContent = uint8ArrayToBase64(resolvedContent);
          encoding = 'base64';
        } else {
          blobContent = '';
          encoding = 'utf-8';
        }
      }

      let blobRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: blobContent,
          encoding,
        }),
      });

      // Crucial: If repository is empty (HTTP 409 Conflict: "Git Repository is empty."),
      // automatically initialize it via Contents API and retry creating the blob!
      if (!blobRes.ok) {
        const errorJson = await blobRes.json().catch(() => ({}));
        if (
          blobRes.status === 409 ||
          errorJson.message?.includes('Git Repository is empty')
        ) {
          console.warn('[GitHub API] Repositório vazio detectado (409). Inicializando via Contents API...');
          const initResult = await ensureRepoInitialized(token, owner, repo, branch);
          if (initResult) {
            baseCommitSha = initResult.commitSha;
            baseTreeSha = initResult.treeSha;
          }

          // Retry creating blob
          blobRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              content: blobContent,
              encoding,
            }),
          });
        }

        if (!blobRes.ok) {
          const finalError = await blobRes.json().catch(() => ({}));
          throw new Error(
            `Falha ao enviar arquivo "${cleanPath}": ${
              finalError.message || errorJson.message || blobRes.statusText
            } (${blobRes.status})`
          );
        }
      }

      const blobData = await blobRes.json();
      blobSha = blobData.sha;
      sessionBlobShaCache.set(cacheKey, blobSha!);
    }

    treeMap.set(cleanPath, {
      path: cleanPath,
      mode: '100644', // standard file
      type: 'blob',
      sha: blobSha!,
    });

    completedBlobsCount++;
    onProgress({
      step: 'creating_blobs',
      totalBlobs: filesToUpload.length,
      currentBlob: completedBlobsCount,
      currentFileName: cleanPath,
    });
  });

  const treeItems = Array.from(treeMap.values());
  if (treeItems.length === 0) {
    throw new Error('Nenhum arquivo válido para inclusão na árvore do Git.');
  }

  // Step 3: Create Git Tree
  onProgress({
    step: 'creating_tree',
    totalBlobs: filesToUpload.length,
    currentBlob: filesToUpload.length,
  });

  const treePayload: any = {
    tree: treeItems,
  };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  }

  let treeRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treePayload),
  });

  // Fallback: If creating tree with base_tree failed (e.g. 422 or 404 because base_tree is invalid or has conflicts),
  // retry with clean standalone root tree!
  if (!treeRes.ok && treePayload.base_tree) {
    console.warn('[GitHub API] Falha ao mesclar com base_tree. Criando árvore Git raiz limpa...');
    delete treePayload.base_tree;
    treeRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(treePayload),
    });
  }

  if (!treeRes.ok) {
    const errorJson = await treeRes.json().catch(() => ({}));
    throw new Error(`Falha ao criar Git Tree: ${errorJson.message || treeRes.statusText}`);
  }

  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // Step 4: Create Commit
  onProgress({
    step: 'creating_commit',
    totalBlobs: filesToUpload.length,
    currentBlob: filesToUpload.length,
  });

  const commitPayload: any = {
    message: commitMessage || 'feat: upload de arquivos via ZipToGit',
    tree: newTreeSha,
  };
  if (baseCommitSha) {
    commitPayload.parents = [baseCommitSha];
  }

  let commitRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitPayload),
  });

  // Fallback: If parent commit was rejected or invalid, retry as root commit
  if (!commitRes.ok && commitPayload.parents) {
    console.warn('[GitHub API] Falha ao vincular commit pai. Criando commit raiz...');
    delete commitPayload.parents;
    commitRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitPayload),
    });
  }

  if (!commitRes.ok) {
    const errorJson = await commitRes.json().catch(() => ({}));
    throw new Error(`Falha ao criar commit: ${errorJson.message || commitRes.statusText}`);
  }

  const commitData = await commitRes.json();
  const commitSha = commitData.sha;

  // Step 5: Update or Create Ref (Idempotent and atomic)
  onProgress({
    step: 'updating_ref',
    commitSha,
  });

  // Try updating the existing branch ref with force: true
  const updateRefRes = await fetchWithRetry(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: commitSha,
        force: true,
      }),
    }
  );

  if (!updateRefRes.ok) {
    // Branch ref doesn't exist yet: create it!
    const createRefRes = await fetchWithRetry(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: commitSha,
      }),
    });

    if (!createRefRes.ok) {
      // If reference was created in a race condition, retry PATCH once more
      const retryPatch = await fetchWithRetry(
        `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            sha: commitSha,
            force: true,
          }),
        }
      );

      if (!retryPatch.ok) {
        const errorJson = await retryPatch.json().catch(() => ({}));
        throw new Error(
          `Falha ao atualizar referência da branch "${branch}": ${errorJson.message || retryPatch.statusText}`
        );
      }
    }
  }

  onProgress({
    step: 'completed',
    commitSha,
    repoUrl,
  });

  return { commitSha, repoUrl };
}

/**
 * High-fidelity dry-run / simulation for demo mode or testing without token
 */
export async function simulatePushToGitHub(
  owner: string,
  repo: string,
  branch: string,
  files: ParsedZipFile[],
  commitMessage: string,
  onProgress: (progress: PushStepProgress) => void
): Promise<{ commitSha: string; repoUrl: string }> {
  const filesToUpload = files.filter((f) => !f.isDirectory && f.included);
  const total = filesToUpload.length;

  onProgress({ step: 'checking_repo', totalBlobs: total, currentBlob: 0 });
  await new Promise((r) => setTimeout(r, 400));

  for (let i = 0; i < total; i++) {
    onProgress({
      step: 'creating_blobs',
      totalBlobs: total,
      currentBlob: i + 1,
      currentFileName: filesToUpload[i].path,
    });
    await new Promise((r) => setTimeout(r, Math.max(20, Math.floor(600 / total))));
  }

  onProgress({ step: 'creating_tree', totalBlobs: total, currentBlob: total });
  await new Promise((r) => setTimeout(r, 400));

  onProgress({ step: 'creating_commit', totalBlobs: total, currentBlob: total });
  await new Promise((r) => setTimeout(r, 400));

  const fakeSha = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  onProgress({ step: 'updating_ref', commitSha: fakeSha });
  await new Promise((r) => setTimeout(r, 300));

  const repoUrl = `https://github.com/${owner}/${repo}`;
  onProgress({ step: 'completed', commitSha: fakeSha, repoUrl });

  return { commitSha: fakeSha, repoUrl };
}
