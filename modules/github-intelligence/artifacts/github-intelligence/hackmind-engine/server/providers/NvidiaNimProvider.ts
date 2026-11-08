/**
 * HACKMIND — NVIDIA NIM Provider Implementation
 * Enterprise AI microservices hosted on NVIDIA Cloud / NIM APIs.
 */

import { IAIProvider, ModelInfo, ProviderHealthStatus, CompletionResult, ChatMessage, CompletionOptions } from './types';

export class NvidiaNimProvider implements IAIProvider {
  readonly id = 'nvidia';
  readonly name = 'NVIDIA NIM';
  readonly requiresKey = true;

  private defaultEndpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  private models: ModelInfo[] = [
    {
      id: 'meta/llama-3.3-70b-instruct',
      name: 'NVIDIA NIM: Meta Llama 3.3 70B Instruct',
      providerId: 'nvidia',
      contextWindow: 128000,
      description: 'Otimizado pela arquitetura TensorRT-LLM da NVIDIA para raciocínio analítico de alto rendimento.',
      isDefault: true
    },
    {
      id: 'meta/llama-3.1-70b-instruct',
      name: 'NVIDIA NIM: Meta Llama 3.1 70B Instruct',
      providerId: 'nvidia',
      contextWindow: 128000,
      description: 'Modelo de 70B com alta fidelidade para comitê adversarial e avaliação de código.'
    },
    {
      id: 'meta/llama-3.1-8b-instruct',
      name: 'NVIDIA NIM: Meta Llama 3.1 8B Instruct',
      providerId: 'nvidia',
      contextWindow: 128000,
      description: 'Modelo leve de baixa latência.'
    }
  ];

  getAvailableModels(): ModelInfo[] {
    return this.models;
  }

  getDefaultModel(): string {
    return 'meta/llama-3.3-70b-instruct';
  }

  private getEffectiveApiKey(customKey?: string): string {
    return customKey?.trim() || process.env.NVIDIA_NIM_API_KEY?.trim() || '';
  }

  isConfigured(): boolean {
    const key = this.getEffectiveApiKey();
    return !!key && key.length > 8 && !key.includes('your_nvidia_nim_key');
  }

  async checkHealth(customKey?: string): Promise<ProviderHealthStatus> {
    const apiKey = this.getEffectiveApiKey(customKey);
    const activeModel = this.getDefaultModel();

    if (!apiKey || apiKey.includes('your_nvidia_nim_key')) {
      return {
        providerId: this.id,
        name: this.name,
        isAvailable: false,
        isConfigured: false,
        message: 'NVIDIA_NIM_API_KEY não configurada no servidor ou sessão.',
        requiresKey: true,
        models: this.models,
        activeModel
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(this.defaultEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(6000)
      });

      const latency = Date.now() - start;

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errMsg = `Erro HTTP ${res.status}`;
        if (res.status === 401) errMsg = 'Chave NVIDIA NIM inválida ou sem permissão.';
        if (res.status === 402 || res.status === 403) errMsg = 'Cotas ou créditos do NVIDIA NIM esgotados.';

        return {
          providerId: this.id,
          name: this.name,
          isAvailable: false,
          isConfigured: true,
          latencyMs: latency,
          message: `${errMsg} Detalhes: ${errorText.slice(0, 100)}`,
          requiresKey: true,
          models: this.models,
          activeModel
        };
      }

      return {
        providerId: this.id,
        name: this.name,
        isAvailable: true,
        isConfigured: true,
        latencyMs: latency,
        message: `Conexão ativa com cluster NVIDIA NIM (${latency}ms).`,
        requiresKey: true,
        models: this.models,
        activeModel
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        isAvailable: false,
        isConfigured: true,
        message: `Falha de conexão com endpoint NVIDIA NIM: ${err.message || 'Desconhecido'}`,
        requiresKey: true,
        models: this.models,
        activeModel
      };
    }
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    customKey?: string
  ): Promise<CompletionResult> {
    const apiKey = this.getEffectiveApiKey(customKey);
    if (!apiKey) {
      throw new Error('Chave da API NVIDIA NIM não informada.');
    }

    const model = options.model || this.getDefaultModel();
    const start = Date.now();

    const res = await fetch(this.defaultEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 3500
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 45000)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`NVIDIA NIM API Error (${res.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      model,
      provider: this.id,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      },
      latencyMs
    };
  }
}
