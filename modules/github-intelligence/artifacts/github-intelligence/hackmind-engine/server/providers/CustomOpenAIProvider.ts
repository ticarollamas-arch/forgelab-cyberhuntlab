/**
 * HACKMIND — Custom OpenAI-Compatible Provider Implementation
 * Supports any OpenAI-compatible endpoint (OpenRouter, vLLM, LM Studio, DeepSeek API, Together AI, etc.)
 */

import { IAIProvider, ModelInfo, ProviderHealthStatus, CompletionResult, ChatMessage, CompletionOptions } from './types';

export class CustomOpenAIProvider implements IAIProvider {
  readonly id = 'custom';
  readonly name = 'OpenAI-Compatible / Custom';
  readonly requiresKey = false; // Key might be optional for local vLLM / LM Studio

  private models: ModelInfo[] = [
    {
      id: 'default-custom-model',
      name: 'Custom Endpoint Model',
      providerId: 'custom',
      description: 'Modelo fornecido pelo endpoint personalizado configurado pelo usuário.',
      isDefault: true
    }
  ];

  private getEffectiveBaseUrl(customEndpoint?: string): string {
    let url = customEndpoint?.trim() || process.env.CUSTOM_AI_BASE_URL?.trim() || 'http://localhost:1234/v1';
    return url.replace(/\/+$/, '');
  }

  private getEffectiveApiKey(customKey?: string): string {
    return customKey?.trim() || process.env.CUSTOM_AI_API_KEY?.trim() || '';
  }

  getAvailableModels(): ModelInfo[] {
    return this.models;
  }

  getDefaultModel(): string {
    return process.env.CUSTOM_AI_MODEL || 'default-custom-model';
  }

  isConfigured(): boolean {
    return !!process.env.CUSTOM_AI_BASE_URL;
  }

  async checkHealth(customKey?: string, customEndpoint?: string): Promise<ProviderHealthStatus> {
    const baseUrl = this.getEffectiveBaseUrl(customEndpoint);
    const apiKey = this.getEffectiveApiKey(customKey);
    const activeModel = this.getDefaultModel();
    const start = Date.now();

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - start;

      if (!res.ok) {
        return {
          providerId: this.id,
          name: this.name,
          isAvailable: false,
          isConfigured: true,
          latencyMs: latency,
          message: `Endpoint respondeu com status ${res.status}.`,
          requiresKey: false,
          models: this.models,
          activeModel
        };
      }

      const data = await res.json().catch(() => ({ data: [] }));
      const foundModels: ModelInfo[] = Array.isArray(data.data) && data.data.length > 0
        ? data.data.slice(0, 10).map((m: any) => ({
            id: m.id,
            name: m.id,
            providerId: 'custom' as const,
            description: 'Modelo detectado no endpoint customizado.'
          }))
        : this.models;

      return {
        providerId: this.id,
        name: this.name,
        isAvailable: true,
        isConfigured: true,
        latencyMs: latency,
        message: `Endpoint customizado online (${latency}ms).`,
        requiresKey: false,
        models: foundModels,
        activeModel: foundModels[0]?.id || activeModel
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        isAvailable: false,
        isConfigured: false,
        message: `Não foi possível conectar a ${baseUrl}: ${err.message || 'Desconhecido'}`,
        requiresKey: false,
        models: this.models,
        activeModel
      };
    }
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    customKey?: string,
    customEndpoint?: string
  ): Promise<CompletionResult> {
    const baseUrl = this.getEffectiveBaseUrl(customEndpoint);
    const apiKey = this.getEffectiveApiKey(customKey);
    const model = options.model || this.getDefaultModel();
    const start = Date.now();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const bodyPayload: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 3500
    };

    if (options.jsonMode) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(options.timeoutMs || 60000)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Custom Endpoint Error (${res.status}): ${errText.slice(0, 200)}`);
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
