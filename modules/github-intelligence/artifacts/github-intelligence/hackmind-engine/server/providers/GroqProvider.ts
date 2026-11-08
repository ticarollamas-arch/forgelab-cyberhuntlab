/**
 * HACKMIND — Groq Provider Implementation
 * High-speed inference using Meta Llama 3 models on Groq LPUs.
 */

import { IAIProvider, ModelInfo, ProviderHealthStatus, CompletionResult, ChatMessage, CompletionOptions } from './types';

export class GroqProvider implements IAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq (LPU Acceleration)';
  readonly requiresKey = true;

  private defaultEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

  private models: ModelInfo[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Meta Llama 3.3 70B Versatile',
      providerId: 'groq',
      contextWindow: 128000,
      description: 'Modelo topo de linha da Meta para raciocínio profundo, hipóteses e síntese estratégica.',
      isDefault: true,
      recommendedFor: ['discovery', 'adversarial', 'execution_plan']
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Meta Llama 3.1 8B Instant',
      providerId: 'groq',
      contextWindow: 128000,
      description: 'Ultra-rápido (<300ms) para triagem rápida e ranking de candidatas.',
      recommendedFor: ['scoring', 'filtering']
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B MoE',
      providerId: 'groq',
      contextWindow: 32768,
      description: 'Mistral Mixture of Experts com alta capacidade analítica de código e arquitetura.',
      recommendedFor: ['engineering_audit']
    }
  ];

  getAvailableModels(): ModelInfo[] {
    return this.models;
  }

  getDefaultModel(): string {
    return process.env.AI_DEFAULT_MODEL || 'llama-3.3-70b-versatile';
  }

  private getEffectiveApiKey(customKey?: string): string {
    return customKey?.trim() || process.env.GROQ_API_KEY?.trim() || '';
  }

  isConfigured(): boolean {
    const key = this.getEffectiveApiKey();
    return !!key && key.length > 8 && !key.includes('your_groq_api_key');
  }

  async checkHealth(customKey?: string): Promise<ProviderHealthStatus> {
    const apiKey = this.getEffectiveApiKey(customKey);
    const activeModel = this.getDefaultModel();

    if (!apiKey || apiKey.includes('your_groq_api_key')) {
      return {
        providerId: this.id,
        name: this.name,
        isAvailable: false,
        isConfigured: false,
        message: 'GROQ_API_KEY não configurada no servidor ou sessão.',
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
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Ping. Responda apenas "PONG".' }],
          max_tokens: 5,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(6000)
      });

      const latency = Date.now() - start;

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errMsg = `Erro HTTP ${res.status}`;
        if (res.status === 401) errMsg = 'Chave Groq inválida ou expirada.';
        if (res.status === 429) errMsg = 'Limite de taxa (rate limit) excedido na API da Groq.';

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
        message: `Conexão bem-sucedida (${latency}ms). Pronto para inferência.`,
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
        message: `Falha de rede ou timeout: ${err.message || 'Desconhecido'}`,
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
      throw new Error('Chave da API Groq não informada.');
    }

    const model = options.model || this.getDefaultModel();
    const start = Date.now();

    const bodyPayload: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 3500,
    };

    if (options.jsonMode) {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch(this.defaultEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(options.timeoutMs || 45000)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Groq API Error (${res.status}): ${errBody.slice(0, 200)}`);
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
