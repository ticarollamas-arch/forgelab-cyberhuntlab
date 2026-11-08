/**
 * HACKMIND — Provider Registry & Fallback Manager
 * Coordinates Groq, NVIDIA NIM, Ollama, Custom and Deterministic AI Providers.
 */

import { IAIProvider, ProviderId, ProviderHealthStatus, CompletionResult, ChatMessage, CompletionOptions } from './types';
import { GroqProvider } from './GroqProvider';
import { NvidiaNimProvider } from './NvidiaNimProvider';
import { OllamaProvider } from './OllamaProvider';
import { CustomOpenAIProvider } from './CustomOpenAIProvider';
import { DeterministicEngineProvider } from './DeterministicEngineProvider';

export class ProviderRegistry {
  private providers: Map<ProviderId, IAIProvider> = new Map();
  private activeProviderId: ProviderId = 'engine';
  private activeModelByProvider: Map<ProviderId, string> = new Map();

  // In-memory runtime overrides (kept strictly in backend memory, never sent to frontend)
  private sessionApiKeys: Map<ProviderId, string> = new Map();
  private sessionEndpoints: Map<ProviderId, string> = new Map();

  constructor() {
    this.registerProvider(new GroqProvider());
    this.registerProvider(new NvidiaNimProvider());
    this.registerProvider(new OllamaProvider());
    this.registerProvider(new CustomOpenAIProvider());
    this.registerProvider(new DeterministicEngineProvider());

    // Choose initial active provider
    const envProvider = (process.env.AI_DEFAULT_PROVIDER || '').toLowerCase() as ProviderId;
    if (this.providers.has(envProvider) && this.providers.get(envProvider)?.isConfigured()) {
      this.activeProviderId = envProvider;
    } else if (this.providers.get('groq')?.isConfigured()) {
      this.activeProviderId = 'groq';
    } else {
      this.activeProviderId = 'engine';
    }
  }

  registerProvider(provider: IAIProvider) {
    this.providers.set(provider.id, provider);
    this.activeModelByProvider.set(provider.id, provider.getDefaultModel());
  }

  getProvider(id: ProviderId): IAIProvider | undefined {
    return this.providers.get(id);
  }

  getActiveProvider(): IAIProvider {
    return this.providers.get(this.activeProviderId) || this.providers.get('engine')!;
  }

  getActiveProviderId(): ProviderId {
    return this.activeProviderId;
  }

  setActiveProvider(id: ProviderId, model?: string): boolean {
    if (!this.providers.has(id)) return false;
    this.activeProviderId = id;
    if (model) {
      this.activeModelByProvider.set(id, model);
    }
    return true;
  }

  getActiveModel(id: ProviderId = this.activeProviderId): string {
    return this.activeModelByProvider.get(id) || this.getProvider(id)?.getDefaultModel() || '';
  }

  setActiveModel(id: ProviderId, model: string) {
    this.activeModelByProvider.set(id, model);
  }

  setSessionCredentials(id: ProviderId, key?: string, endpoint?: string) {
    if (key !== undefined) this.sessionApiKeys.set(id, key);
    if (endpoint !== undefined) this.sessionEndpoints.set(id, endpoint);
  }

  getSessionKey(id: ProviderId): string | undefined {
    return this.sessionApiKeys.get(id);
  }

  getSessionEndpoint(id: ProviderId): string | undefined {
    return this.sessionEndpoints.get(id);
  }

  async getAllHealthStatuses(): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];
    for (const provider of this.providers.values()) {
      const customKey = this.sessionApiKeys.get(provider.id);
      const customEndpoint = this.sessionEndpoints.get(provider.id);
      const status = await provider.checkHealth(customKey, customEndpoint);
      status.activeModel = this.getActiveModel(provider.id);
      results.push(status);
    }
    return results;
  }

  async executeWithFallback(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<{ result: CompletionResult; fallbackTriggered: boolean; message?: string }> {
    const primary = this.getActiveProvider();
    const customKey = this.sessionApiKeys.get(primary.id);
    const customEndpoint = this.sessionEndpoints.get(primary.id);
    const activeModel = this.getActiveModel(primary.id);

    const mergedOptions: CompletionOptions = {
      ...options,
      model: options.model || activeModel
    };

    // If active is already deterministic engine, execute directly
    if (primary.id === 'engine') {
      const res = await primary.generateCompletion(messages, mergedOptions);
      return { result: res, fallbackTriggered: false };
    }

    try {
      const result = await primary.generateCompletion(messages, mergedOptions, customKey, customEndpoint);
      return { result, fallbackTriggered: false };
    } catch (primaryError: any) {
      console.warn(`[HACKMIND] Provedor ${primary.name} falhou: ${primaryError.message}. Ativando Fallback Transparente para Motor Determinístico.`);

      const fallbackProvider = this.providers.get('engine')!;
      const fallbackResult = await fallbackProvider.generateCompletion(messages, mergedOptions);

      return {
        result: fallbackResult,
        fallbackTriggered: true,
        message: `Aviso: Falha no provedor ${primary.name} (${primaryError.message}). Os dados foram processados com segurança pelo Motor Determinístico de Evidências.`
      };
    }
  }
}

export const globalProviderRegistry = new ProviderRegistry();
