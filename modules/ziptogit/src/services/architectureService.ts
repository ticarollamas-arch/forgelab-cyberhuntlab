import { ZipMetadata, ArchitectureAnalysis } from '../types';

export async function analyzeProjectArchitecture(
  zipMeta: ZipMetadata
): Promise<ArchitectureAnalysis> {
  const fileTree = zipMeta.files.map((f) => f.path);

  // Extract key descriptive files for architectural analysis
  const keyFiles: Record<string, string> = {};
  const priorityPatterns = [
    /package\.json$/i,
    /requirements\.txt$/i,
    /cargo\.toml$/i,
    /go\.mod$/i,
    /androidmanifest\.xml$/i,
    /readme(\.md|\.txt)?$/i,
    /tsconfig\.json$/i,
    /vite\.config/i,
    /dockerfile/i,
  ];

  for (const f of zipMeta.files) {
    if (!f.isDirectory) {
      const match = priorityPatterns.some((pattern) => pattern.test(f.path));
      if (match) {
        let text = typeof f.content === 'string' ? f.content : '';
        if (!text && f.loadContent) {
          try {
            const loaded = await f.loadContent();
            if (typeof loaded === 'string') text = loaded;
          } catch {
            // ignore
          }
        } else if (!text && f.fileRef) {
          try {
            text = await f.fileRef.text();
          } catch {
            // ignore
          }
        }
        if (text) {
          keyFiles[f.path] = text.slice(0, 3000);
        }
      }
    }
  }

  const payload = {
    projectName: zipMeta.fileName,
    projectType: zipMeta.detectedType,
    fileTree: fileTree.slice(0, 150),
    keyFiles,
    apkAnalysis: zipMeta.apkAnalysis,
  };

  const localProvider = (localStorage.getItem('ai_provider') as any) || 'nvidia';
  const localKey =
    localStorage.getItem('ai_api_key') ||
    localStorage.getItem('nvidia_api_key') ||
    (import.meta as any).env?.NVIDIA_API_KEY ||
    (import.meta as any).env?.VITE_NVIDIA_API_KEY ||
    '';
  const localBaseUrl = localStorage.getItem('ai_base_url') || '';
  const localModel = localStorage.getItem('ai_model') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ai-provider': localProvider,
  };
  if (localKey) {
    headers['x-ai-api-key'] = localKey.trim();
    headers['x-nvidia-api-key'] = localKey.trim();
  }
  if (localBaseUrl) {
    headers['x-ai-base-url'] = localBaseUrl.trim();
  }
  if (localModel) {
    headers['x-ai-model'] = localModel.trim();
  }

  const response = await fetch(`${import.meta.env.BASE_URL}api/analyze-architecture`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `Erro HTTP ${response.status} ao analisar arquitetura.`);
  }

  const data = await response.json();
  return data.analysis;
}
