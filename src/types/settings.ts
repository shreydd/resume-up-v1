export interface MaskingPreferences {
  maskCompanies: boolean;
  maskDates: boolean;
  maskPersonalPII: boolean;
  customBlacklist: string[];
}

export interface CachedModel {
  id: string;
  name: string;
  contextLength: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export interface OpenRouterSettings {
  id?: string;
  apiKey: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  maskingPreferences: MaskingPreferences;
  cachedModels?: CachedModel[];
  lastModelFetchTime?: number;
}

export type UserSettings = OpenRouterSettings;

export const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

export const CURATED_MODELS: Array<{
  id: string;
  name: string;
  tier: string;
  costDesc: string;
  description: string;
  isFree?: boolean;
}> = [
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B',
    tier: 'Free Frontier',
    costDesc: '$0.00 / $0.00',
    description: 'Massive 550B-parameter frontier model from Nvidia with deep reasoning and structured JSON output.',
    isFree: true,
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    tier: 'Free Auto-Router',
    costDesc: '$0.00 / $0.00',
    description: 'Dynamic free router: automatically routes across all currently available zero-cost models.',
    isFree: true,
  },
];

export const DEFAULT_SETTINGS: OpenRouterSettings = {
  id: 'settings',
  apiKey: '',
  defaultModel: DEFAULT_OPENROUTER_MODEL,
  temperature: 0.3,
  maxTokens: 6144,
  maskingPreferences: {
    maskCompanies: true,
    maskDates: true,
    maskPersonalPII: true,
    customBlacklist: [],
  },
};
