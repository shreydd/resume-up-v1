export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCompletionPayload {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' };
}

export interface OpenRouterStreamChunk {
  id: string;
  choices: {
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: OpenRouterModelPricing;
}

export interface MaskedDictionary {
  tokenToOriginal: Record<string, string>;
  originalToToken: Record<string, string>;
  categoryMap: Record<string, 'company' | 'timeline' | 'pii' | 'blacklist'>;
}

export interface TailoredBullet {
  id?: string;
  original: string;
  tailored: string;
  reasoning: string;
  accepted: boolean;
}

export interface TailoredExperience {
  experienceId: string;
  company: string;
  role: string;
  bullets: TailoredBullet[];
}

export interface JobDescriptionAnalysis {
  role?: string;
  seniority?: string;
  primaryStack?: string[];
  mustHaves?: string[];
  niceToHaves?: string[];
  matchedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  summary: string;
}

export interface TailoredSession {
  id?: number;
  timestamp: string;
  jobTitle: string;
  jobDescriptionText: string;
  modelUsed: string;
  matchScore: number;
  analysis: JobDescriptionAnalysis;
  tailoredExperiences: TailoredExperience[];
}
