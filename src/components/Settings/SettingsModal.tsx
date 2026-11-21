import React, { useState, useEffect } from 'react';
import { Modal } from '../Shared/Modal';
import { 
  OpenRouterSettings, 
  CURATED_MODELS, 
  DEFAULT_OPENROUTER_MODEL, 
  DEFAULT_SETTINGS 
} from '../../types';
import { getSettings, saveSettings, clearApiKey } from '../../db';
import { testConnection } from '../../services/openRouterService';
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sliders, 
  Trash2, 
  Sparkles, 
  Zap, 
  HelpCircle,
  ExternalLink,
  Plus,
  X
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: OpenRouterSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [settings, setSettings] = useState<OpenRouterSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [blacklistInput, setBlacklistInput] = useState<string>('');

  // Test connection states
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    valid?: boolean;
    balance?: number;
    usage?: number;
    limit?: number;
    label?: string;
    isFreeTier?: boolean;
    error?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      getSettings().then((loaded) => {
        setSettings(loaded);
        const isCurated = CURATED_MODELS.some(m => m.id === loaded.defaultModel);
        if (!isCurated && loaded.defaultModel) {
          setIsCustomModel(true);
          setCustomModelInput(loaded.defaultModel);
        } else {
          setIsCustomModel(false);
          setCustomModelInput('');
        }
        setTestResult(null);
        setSaveSuccess(false);
      });
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!settings.apiKey.trim()) {
      setTestResult({ valid: false, error: 'Please enter an API key first.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(settings.apiKey.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ valid: false, error: err.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddBlacklistTerm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = blacklistInput.trim();
    if (!term) return;

    const currentList = settings.maskingPreferences?.customBlacklist || [];
    if (!currentList.includes(term)) {
      setSettings(prev => ({
        ...prev,
        maskingPreferences: {
          ...prev.maskingPreferences,
          customBlacklist: [...currentList, term]
        }
      }));
    }
    setBlacklistInput('');
  };

  const handleRemoveBlacklistTerm = (termToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      maskingPreferences: {
        ...prev.maskingPreferences,
        customBlacklist: (prev.maskingPreferences?.customBlacklist || []).filter(t => t !== termToRemove)
      }
    }));
  };

  const handleClearKey = async () => {
    if (confirm('Are you sure you want to remove your OpenRouter API key from IndexedDB?')) {
      await clearApiKey();
      setSettings(prev => ({ ...prev, apiKey: '' }));
      setTestResult(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const modelToSave = isCustomModel && customModelInput.trim()
        ? customModelInput.trim()
        : settings.defaultModel || DEFAULT_OPENROUTER_MODEL;

      const updated = await saveSettings({
        ...settings,
        apiKey: settings.apiKey.trim(),
        defaultModel: modelToSave
      });

      setSaveSuccess(true);
      if (onSaved) onSaved(updated);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="OpenRouter AI & Privacy Settings"
      description="Configure your personal OpenRouter API key, frontier models, and client-side PII privacy masking preferences."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Privacy Guarantee Banner */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 space-y-1">
            <span className="font-semibold block">100% Client-Side Direct & Zero-Telemetry</span>
            <p className="text-emerald-800 leading-relaxed">
              Your API key is saved exclusively in your browser's local IndexedDB. It is dispatched directly to OpenRouter's official API over encrypted HTTPS. Sensitive entities are masked before transmission and rehydrated locally.
            </p>
          </div>
        </div>

        {/* SECTION 1: API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-zinc-500" />
              <span>OpenRouter API Key *</span>
            </label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              <span>Get API Key</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => {
                setSettings({ ...settings, apiKey: e.target.value });
                setTestResult(null);
              }}
              placeholder="sk-or-v1-..."
              className="w-full rounded-xl border border-zinc-200 pl-3.5 pr-20 py-2.5 text-xs font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              {settings.apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  title="Clear key from browser"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={isTesting || !settings.apiKey}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isTesting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {testResult && (
              <div className="text-xs">
                {testResult.valid ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      Valid Key {testResult.balance !== undefined ? `(Balance: $${testResult.balance.toFixed(2)})` : ''}
                      {testResult.isFreeTier ? ' • Free Tier' : ''}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{testResult.error || 'Invalid API Key'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Model Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Inference Model</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CURATED_MODELS.map((model) => {
              const isSelected = !isCustomModel && settings.defaultModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    setIsCustomModel(false);
                    setSettings({ ...settings, defaultModel: model.id });
                  }}
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-900">{model.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      model.isFree 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {model.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-tight mb-2 line-clamp-2">
                    {model.description}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    {model.costDesc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Free Models Collection Link & Custom Slug Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <a
              href="https://openrouter.ai/collections/free-models"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <span>Discover more free models on OpenRouter</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={() => setIsCustomModel(!isCustomModel)}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 underline"
            >
              {isCustomModel ? '← Select from recommended models' : '+ Use custom OpenRouter model slug'}
            </button>
          </div>

          {isCustomModel && (
            <div className="space-y-1 rounded-xl bg-zinc-50 p-3 border border-zinc-200/70">
              <label className="text-[11px] font-semibold text-zinc-700 block">Custom Model Slug</label>
              <input
                type="text"
                value={customModelInput}
                onChange={e => setCustomModelInput(e.target.value)}
                placeholder="e.g. meta-llama/llama-3.3-70b-instruct, qwen/qwen-2.5-72b-instruct"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-mono focus:border-zinc-900 focus:outline-none bg-white"
              />
              <span className="text-[10px] text-zinc-400 block">
                Paste any model slug from the OpenRouter collection link above.
              </span>
            </div>
          )}
        </div>

        {/* SECTION 3: Privacy Masking Preferences */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Client-Side Privacy Masking</span>
            </span>
            <span className="text-[11px] text-zinc-400">Rehydrated locally in browser</span>
          </div>

          <div className="space-y-2 bg-zinc-50/80 rounded-xl p-3 border border-zinc-200/70">
            {/* Mask Companies */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maskingPreferences?.maskCompanies ?? true}
                onChange={e => setSettings({
                  ...settings,
                  maskingPreferences: {
                    ...settings.maskingPreferences,
                    maskCompanies: e.target.checked
                  }
                })}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-900">Mask Company Names</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Replaces employer names with tokens enriched by user-defined industry domain context (e.g. <code className="text-indigo-600 font-mono">__COMPANY_1__ [Industry: B2B Enterprise SaaS]</code>).
                </p>
              </div>
            </label>

            {/* Mask Dates */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-zinc-200/50">
              <input
                type="checkbox"
                checked={settings.maskingPreferences?.maskDates ?? true}
                onChange={e => setSettings({
                  ...settings,
                  maskingPreferences: {
                    ...settings.maskingPreferences,
                    maskDates: e.target.checked
                  }
                })}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-900">Mask Dates & Timelines</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Replaces exact calendar dates with relative durations (e.g. <code className="text-indigo-600 font-mono">__TIMELINE_1__ [Recent: 2+ Years]</code>) to prevent age discrimination while signaling seniority.
                </p>
              </div>
            </label>

            {/* Mask Personal PII */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-zinc-200/50">
              <input
                type="checkbox"
                checked={settings.maskingPreferences?.maskPersonalPII ?? true}
                onChange={e => setSettings({
                  ...settings,
                  maskingPreferences: {
                    ...settings.maskingPreferences,
                    maskPersonalPII: e.target.checked
                  }
                })}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-900">Redact Personal PII</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Automatically redacts candidate name, email, phone, location, LinkedIn, GitHub, and personal portfolio links.
                </p>
              </div>
            </label>
          </div>

          {/* Custom Blacklist Keywords */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-zinc-800">
              Custom Proprietary Blacklist Keywords
            </label>
            <p className="text-[11px] text-zinc-500">
              Add internal project codenames or confidential trademarks you wish to redact into <code className="text-indigo-600 font-mono">__INTERNAL_PROJECT_X__</code>.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={blacklistInput}
                onChange={e => setBlacklistInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBlacklistTerm();
                  }
                }}
                placeholder="e.g. Project Apollo, SecretAlgo"
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs focus:border-zinc-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddBlacklistTerm()}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>

            {/* Blacklist Chips */}
            {settings.maskingPreferences?.customBlacklist?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.maskingPreferences.customBlacklist.map((term) => (
                  <span
                    key={term}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-xs font-mono text-zinc-800"
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlacklistTerm(term)}
                      className="text-zinc-500 hover:text-zinc-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Advanced Parameters (Collapsible) */}
        <div className="pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Hide Advanced Parameters' : 'Show Advanced Parameters (Temperature, Max Tokens)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200/70">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700">Temperature</span>
                  <span className="font-mono text-zinc-900">{settings.temperature ?? 0.3}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.temperature ?? 0.3}
                  onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 block mt-1">
                  Lower values (0.2–0.4) enforce higher factual consistency and tighter schema compliance.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700">Max Tokens</span>
                  <span className="font-mono text-zinc-900">{settings.maxTokens ?? 6144}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="12288"
                  step="256"
                  value={settings.maxTokens ?? 6144}
                  onChange={e => setSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 block mt-1">
                  Maximum output tokens for deep multi-experience tailoring pipelines.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <div className="text-xs">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>Settings Saved Locally!</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

      </form>
    </Modal>
  );
};
