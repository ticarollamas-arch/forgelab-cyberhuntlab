/**
 * HACKMIND — Ollama Provider Implementation
 * Local & On-Premise LLM inference with zero external network dependencies.
 */

import { IAIProvider, ModelInfo, ProviderHealthStatus, CompletionResult, ChatMessage, CompletionOptions } from './types';

export class OllamaProvider implements IAIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local / On-Prem)';
  readonly requiresKey = false;

  private defaultModels: ModelInfo[] = [
    {
      id: 'llama3.2',
      name: 'Ollama: Llama 3.2 (3B / 1B)',
      providerId: 'ollama',
      description: 'Modelo local ultra-leve para computadores pessoais e laptops com consumo mínimo de memória RAM.',
      isDefault: true
    },
    {
      id: 'llama3.1:8b',
      name: 'Ollama: Llama 3.1 8B',
      providerId: 'ollama',
      description: 'Modelo equilibrado para raciocínio analítico local.'
    },
    {
      id: 'mistral:latest',
      name: 'Ollama: Mistral 7B',
      providerId: 'ollama',
      description: 'Excelente para síntese técnica e estruturação de dados.'
    },
    {
      id: 'qwen2.5:7b',
      name: 'Ollama: Qwen 2.5 7B',
      providerId: 'ollama',
      description: 'Alta precisão em saídas estruturadas JSON e código.'
    }
  ];

  private getEffectiveBaseUrl(customEndpoint?: string): string {
    let url = customEndpoint?.trim() || process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434';
    return url.replace(/\/+$/, '');
  }

  getAvailableModels(): ModelInfo[] {
    return this.defaultModels;
  }

  getDefaultModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3.2';
  }

  isConfigured(): boolean {
    return true; // Local installation does not require mandatory registration
  }

  async checkHealth(_customKey?: string, customEndpoint?: string): Promise<ProviderHealthStatus> {
    const baseUrl = this.getEffectiveBaseUrl(customEndpoint);
    const activeModel = this.getDefaultModel();
    const start = Date.now();

    try {
      // Check Ollama tags endpoint
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000)
      });

      const latency = Date.now() - start;

      if (!res.ok) {
        return {
          providerId: this.id,
          name: this.name,
          isAvailable: false,
          isConfigured: true,
          latencyMs: latency,
          message: `Servidor Ollama respondeu com status ${res.status}.`,
          requiresKey: false,
          models: this.defaultModels,
          activeModel
        };
      }

      const data = await res.json().catch(() => ({ models: [] }));
      const installedModels: ModelInfo[] = Array.isArray(data.models) && data.models.length > 0
        ? data.models.map((m: any) => ({
            id: m.name,
            name: `Ollama Local: ${m.name}`,
            providerId: 'ollama' as const,
            description: `Modelo instalado localmente (${Math.round((m.size || 0) / (1024 * 1024 * 1024) * 10) / 10} GB).`,
            isDefault: m.name === activeModel
          }))
        : this.defaultModels;

      return {
        providerId: this.id,
        name: this.name,
        isAvailable: true,
        isConfigured: true,
        latencyMs: latency,
        message: `Servidor Ollama local online (${latency}ms). ${installedModels.length} modelos detectados.`,
        requiresKey: false,
        models: installedModels,
        activeModel: installedModels[0]?.id || activeModel
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        isAvailable: false,
        isConfigured: true,
        message: `Servidor Ollama não detectado em ${baseUrl}. Inicie com 'ollama serve'.`,
        requiresKey: false,
        models: this.defaultModels,
        activeModel
      };
    }
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    _customKey?: string,
    customEndpoint?: string
  ): Promise<CompletionResult> {
    const baseUrl = this.getEffectiveBaseUrl(customEndpoint);
    const model = options.model || this.getDefaultModel();
    const start = Date.now();

    const bodyPayload: any = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 3000
      }
    };

    if (options.jsonMode) {
      bodyPayload.format = 'json';
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(options.timeoutMs || 90000)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama Error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.message?.content || '';

    return {
      text,
      model,
      provider: this.id,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      latencyMs
    };
  }
}
