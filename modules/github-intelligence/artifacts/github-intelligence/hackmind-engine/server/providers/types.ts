/**
 * HACKMIND — Server-Side AI Provider Architecture Types
 */

export type ProviderId = 'groq' | 'nvidia' | 'ollama' | 'custom' | 'engine';

export interface ModelInfo {
  id: string;
  name: string;
  providerId: ProviderId;
  contextWindow?: number;
  description: string;
  recommendedFor?: string[];
  isDefault?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: ProviderId;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
}

export interface ProviderHealthStatus {
  providerId: ProviderId;
  name: string;
  isAvailable: boolean;
  isConfigured: boolean;
  latencyMs?: number;
  message: string;
  requiresKey: boolean;
  models: ModelInfo[];
  activeModel: string;
}

export interface IAIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly requiresKey: boolean;

  getAvailableModels(): ModelInfo[];
  getDefaultModel(): string;
  isConfigured(): boolean;
  checkHealth(customKey?: string, customEndpoint?: string): Promise<ProviderHealthStatus>;
  generateCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions,
    customKey?: string,
    customEndpoint?: string
  ): Promise<CompletionResult>;
}
