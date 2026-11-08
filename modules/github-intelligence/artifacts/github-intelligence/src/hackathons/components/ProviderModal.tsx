/**
 * HACKMIND — AI Provider Configuration & Health Check Modal
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Cpu, Key, Globe, ShieldCheck } from 'lucide-react';
import { AIProviderConfig } from '../engine/types';
import { api } from '../../services/api';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onProviderChanged: (providerId: string, model: string) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onProviderChanged
}) => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>('engine');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: 'testing' | 'ok' | 'error'; message: string; latency?: number }>>({});
  
  // Custom input states for each provider
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [endpoints, setEndpoints] = useState<Record<string, string>>({
    ollama: 'http://localhost:11434',
    custom: 'http://localhost:1234/v1'
  });
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getAiProviders();
      setProviders(data.providers || []);
      setActiveProviderId(data.activeProviderId || 'engine');
      const modelsMap: Record<string, string> = {};
      (data.providers || []).forEach((p: any) => {
        modelsMap[p.providerId] = p.activeModel;
      });
      setSelectedModels(modelsMap);
    } catch (e) {
      console.error('Failed to load providers', e);
      setLoadError(e instanceof Error ? e.message : 'Falha ao carregar provedores.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestResults(prev => ({
      ...prev,
      [providerId]: { status: 'testing', message: 'Testando conexão...' }
    }));

    try {
      const data = await api.testAiProvider({
        providerId,
        apiKey: apiKeys[providerId],
        endpoint: endpoints[providerId]
      });

      if (data.isAvailable) {
        setTestResults(prev => ({
          ...prev,
          [providerId]: {
            status: 'ok',
            message: data.message,
            latency: data.latencyMs
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [providerId]: {
            status: 'error',
            message: data.message || 'Falha de conexão com o provedor.'
          }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          status: 'error',
          message: err.message || 'Erro de rede ao testar.'
        }
      }));
    }
  };

  const handleActivateProvider = async (providerId: string) => {
    setActivationError(null);
    try {
      const model = selectedModels[providerId];
      await api.activateAiProvider({
        providerId,
        model,
        apiKey: apiKeys[providerId],
        endpoint: endpoints[providerId]
      });

      setActiveProviderId(providerId);
      onProviderChanged(providerId, model);
      onClose();
    } catch (e) {
      console.error('Failed to activate provider', e);
      setActivationError(e instanceof Error ? e.message : 'Falha ao ativar o provedor.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-sm tracking-tight">Configuração de Provedores de IA</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b ${
          isDark ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>
            Arquitetura segura: chaves e endpoints são processados exclusivamente no backend Node.js e nunca expostos no frontend.
          </span>
        </div>

        {/* Body list of providers */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {(loadError || activationError) && (
            <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-rose-200">
              {loadError || activationError}
              {loadError && <button type="button" onClick={loadProviders} className="ml-3 underline underline-offset-2">Tentar novamente</button>}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Consultando status dos provedores...</span>
            </div>
          ) : (
            providers.map((p: any) => {
              const isSelected = activeProviderId === p.providerId;
              const testState = testResults[p.providerId];

              return (
                <div
                  key={p.providerId}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isSelected
                      ? isDark
                        ? 'border-emerald-500/60 bg-emerald-950/15 ring-1 ring-emerald-500/30'
                        : 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400'
                      : isDark
                      ? 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                      : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            ATIVO
                          </span>
                        )}
                        {p.requiresKey ? (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-500" /> Requer Chave
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sem Chave Obrigatória
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-0.5">
                        {p.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleTestProvider(p.providerId)}
                        disabled={testState?.status === 'testing'}
                        className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                            : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${testState?.status === 'testing' ? 'animate-spin' : ''}`} />
                        <span>Testar</span>
                      </button>

                      {!isSelected && (
                        <button
                          onClick={() => handleActivateProvider(p.providerId)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Input configuration fields */}
                  <div className="mt-3 pt-2.5 border-t border-inherit grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Key input if required */}
                    {p.requiresKey && (
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-mono mb-1">
                          Chave da API ({p.providerId.toUpperCase()}_API_KEY)
                        </label>
                        <input
                          type="password"
                          placeholder={p.isConfigured ? '•••••••••••••••• (Configurada no servidor)' : 'Informe sua chave'}
                          value={apiKeys[p.providerId] || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, [p.providerId]: e.target.value })}
                          className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                          }`}
                        />
                      </div>
                    )}

                    {/* Endpoint URL if Ollama or Custom */}
                    {(p.providerId === 'ollama' || p.providerId === 'custom') && (
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-mono mb-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Endereço do Servidor (Base URL)
                        </label>
                        <input
                          type="text"
                          value={endpoints[p.providerId] || ''}
                          onChange={(e) => setEndpoints({ ...endpoints, [p.providerId]: e.target.value })}
                          placeholder={p.providerId === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1'}
                          className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                          }`}
                        />
                      </div>
                    )}

                    {/* Model selection */}
                    <div className={!p.requiresKey && p.providerId !== 'ollama' && p.providerId !== 'custom' ? 'col-span-2' : ''}>
                      <label className="block text-[10px] text-zinc-400 font-mono mb-1">
                        Modelo Ativo
                      </label>
                      <select
                        value={selectedModels[p.providerId] || p.activeModel || ''}
                        onChange={(e) => setSelectedModels({ ...selectedModels, [p.providerId]: e.target.value })}
                        className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                        }`}
                      >
                        {(p.models || []).map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Test Feedback */}
                  {testState && (
                    <div className={`mt-2 text-[11px] p-2 rounded flex items-center gap-1.5 ${
                      testState.status === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : testState.status === 'error'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-zinc-800/50 text-zinc-300'
                    }`}>
                      {testState.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {testState.status === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testState.message}</span>
                      {testState.latency && (
                        <span className="font-mono text-[10px] ml-auto font-bold opacity-80">
                          {testState.latency}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {!loading && !loadError && providers.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-400">
              Nenhum provedor foi retornado pelo serviço.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-inherit flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Dica: O motor determinístico garante 100% de disponibilidade mesmo sem internet.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
