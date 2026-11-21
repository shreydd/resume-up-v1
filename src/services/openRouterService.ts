import {
  OpenRouterCompletionPayload,
  OpenRouterModel,
  OpenRouterSettings,
  JobDescriptionAnalysis,
  TailoredExperience,
  TailoredBullet,
  CURATED_MODELS,
  DEFAULT_OPENROUTER_MODEL
} from '../types';
import { maskCareerRecords, rehydrateText, MaskingResult } from './privacyMasker';
import { Experience, Achievement, Profile, CustomSection, CustomSectionItem } from '../types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function normalizeModelId(modelId?: string): string {
  const trimmed = (modelId || '').trim();
  if (!trimmed || trimmed === 'google/gemini-2.0-flash' || trimmed === 'google/gemini-2.0-flash-001') {
    return DEFAULT_OPENROUTER_MODEL;
  }
  if (trimmed === 'meta-llama/llama-3.3-70b-instruct:free') {
    return 'openrouter/free';
  }
  return trimmed;
}

export interface PipelineProgressCallback {
  (stageName: string, step: number, totalSteps: number, streamContent?: string): void;
}

export interface PipelineResult {
  matchScore: number;
  analysis: JobDescriptionAnalysis;
  tailoredExperiences: TailoredExperience[];
  maskingResult: MaskingResult;
  rawResponse?: string;
}

/**
 * Validates the user's OpenRouter API key and checks credit status.
 */
export async function testConnection(apiKey: string): Promise<{
  valid: boolean;
  balance?: number;
  label?: string;
  limit?: number;
  usage?: number;
  isFreeTier?: boolean;
  error?: string;
}> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://resume-up.local',
        'X-Title': 'resume-up'
      }
    });

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key (401 Unauthorized).' };
    }

    if (!response.ok) {
      return { valid: false, error: `Connection failed with HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    const keyInfo = data.data || {};
    const limit = keyInfo.limit !== null ? Number(keyInfo.limit) : undefined;
    const usage = keyInfo.usage !== null ? Number(keyInfo.usage) : undefined;
    const balance = limit !== undefined && usage !== undefined ? Math.max(0, limit - usage) : undefined;

    return {
      valid: true,
      label: keyInfo.label,
      limit,
      usage,
      balance,
      isFreeTier: Boolean(keyInfo.is_free_tier)
    };
  } catch (err: any) {
    // If auth/key fails due to CORS or network, attempt a minimal 1-token ping
    try {
      const pingRes = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://resume-up.local',
          'X-Title': 'resume-up'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      if (pingRes.ok) {
        return { valid: true };
      }
      if (pingRes.status === 401) {
        return { valid: false, error: 'Invalid API key (401 Unauthorized).' };
      }
      return { valid: false, error: `OpenRouter returned HTTP ${pingRes.status}` };
    } catch (fallbackErr: any) {
      return { valid: false, error: err.message || 'Network error connecting to OpenRouter.' };
    }
  }
}

/**
 * Fetches the active model catalog from OpenRouter, prioritizing curated models.
 */
export async function fetchModels(apiKey?: string): Promise<OpenRouterModel[]> {
  try {
    const headers: Record<string, string> = {
      'HTTP-Referer': 'https://resume-up.local',
      'X-Title': 'resume-up'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const res = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      return CURATED_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        context_length: 128000,
        pricing: { prompt: '0', completion: '0' }
      }));
    }

    const data = await res.json();
    const list: OpenRouterModel[] = Array.isArray(data.data) ? data.data : [];
    return list;
  } catch (err) {
    console.warn('Failed to fetch OpenRouter model catalog, using fallback list:', err);
    return CURATED_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      context_length: 128000,
      pricing: { prompt: '0', completion: '0' }
    }));
  }
}

/**
 * Streams chat completions via SSE reader.
 */
export async function streamChatCompletion(
  payload: OpenRouterCompletionPayload,
  apiKey: string,
  onChunk: (chunk: string) => void,
  retryCount: number = 0
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OpenRouter API key is missing. Please configure your key in Settings ⚙️.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are currently offline. Please reconnect to the internet or switch to the offline In-Browser WASM matcher.');
  }

  const effectiveModel = normalizeModelId(payload.model);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://resume-up.local',
      'X-Title': 'resume-up'
    },
    body: JSON.stringify({
      ...payload,
      model: effectiveModel,
      stream: true
    })
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.error?.metadata?.raw || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 401) {
      throw new Error(`OpenRouter 401 Unauthorized: Invalid API key. Please check your key in Settings ⚙️. (${errorDetail})`);
    }
    if (response.status === 402) {
      throw new Error(`OpenRouter 402 Payment Required: Insufficient credits. Add credits at https://openrouter.ai/credits or select a free model like 'openrouter/free' in Settings. (${errorDetail})`);
    }
    if (response.status === 404 && (errorDetail.includes('guardrail') || errorDetail.includes('ZDR') || errorDetail.includes('Free model training') || errorDetail.includes('policy'))) {
      throw new Error(`OpenRouter Guardrail Restriction: 0 endpoints available matching your workspace guardrails (ZDR or Free model training policy). Please relax the restriction at https://openrouter.ai/workspaces/default/guardrails, or select 'openrouter/free' or another model from https://openrouter.ai/collections/free-models in Settings ⚙️.`);
    }
    if (response.status === 404) {
      throw new Error(`OpenRouter 404: The model '${effectiveModel}' was not found or has no available endpoints. Please select 'nvidia/nemotron-3-ultra-550b-a55b:free' or 'openrouter/free' in Settings ⚙️. (${errorDetail})`);
    }
    if (response.status === 429) {
      // Automatic exponential backoff for public shared pool rate limits
      if (retryCount < 2) {
        const waitMs = (retryCount + 1) * 2500;
        await new Promise(res => setTimeout(res, waitMs));
        return streamChatCompletion(payload, apiKey, onChunk, retryCount + 1);
      }
      throw new Error(`OpenRouter 429 Rate Limit: The free upstream provider pool is currently congested. Please retry in a few seconds, or switch to 'openrouter/free' in Settings. (${errorDetail})`);
    }
    throw new Error(`OpenRouter request failed (HTTP ${response.status}): ${errorDetail}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // Skip keep-alives

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedText += delta;
              onChunk(delta);
            }
          } catch {
            // Partial JSON chunk line, ignore or continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulatedText;
}

/**
 * Sanitizes unescaped control characters inside JSON strings (e.g., literal newlines or tabs)
 * while preserving valid whitespace outside strings.
 */
export function sanitizeControlCharacters(str: string): string {
  let inString = false;
  let escape = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      result += char;
      continue;
    }
    if (char === '\\') {
      escape = true;
      result += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString) {
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        result += '\\r';
        continue;
      }
      if (char === '\t') {
        result += '\\t';
        continue;
      }
      const code = char.charCodeAt(0);
      if (code < 32) {
        // Strip out non-printable control characters
        continue;
      }
    }
    result += char;
  }
  return result;
}

/**
 * Resilient JSON repair utility that heals truncated streams, closes open strings,
 * strips dangling keys/commas, and rebalances unclosed brackets and braces.
 */
export function repairTruncatedJson(raw: string): string {
  let cleaned = sanitizeControlCharacters(raw.trim());

  // Strip markdown code fences if present (even unclosed ones)
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    }
  }

  // Find first {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.slice(firstBrace);
  }

  // Clean internal trailing commas (e.g. [1, 2, ], or {"a": 1, })
  while (/,\s*([}\]])/.test(cleaned)) {
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  }

  // Detect if we ended inside an open string
  let inString = false;
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
  }

  if (inString) {
    // Terminate cut-off unclosed string
    cleaned += '"';
  }

  // Remove trailing invalid syntax at the cut point
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/,\s*$/, '')
      .replace(/:\s*"?[^"]*$/, '') // incomplete value after colon
      .replace(/,\s*$/, '')
      .replace(/"[^"]*"\s*:\s*$/, '') // dangling key with colon but no value
      .replace(/,\s*$/, '')
      .replace(/([{,]\s*)"[^"]*"\s*$/, '$1') // dangling key without colon inside object
      .replace(/,\s*$/, '');
  }

  // Clean trailing commas that might have been revealed
  while (/,\s*([}\]])/.test(cleaned)) {
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  }

  // Stack of unclosed brackets and braces
  inString = false;
  escape = false;
  const stack: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{' || char === '[') {
      stack.push(char === '{' ? '}' : ']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  // Append necessary closing braces/brackets
  while (stack.length > 0) {
    cleaned += stack.pop();
  }

  return cleaned;
}

/**
 * Fallback regex extractor for deep tailoring pipeline results.
 * Recovers all parsed match scores, gap analysis, and completed experiences even from heavily corrupted strings.
 */
export function fallbackExtractPipelineResult(raw: string): {
  matchScore: number;
  analysis: JobDescriptionAnalysis;
  tailoredExperiences: Array<{
    experienceId: string;
    company: string;
    role: string;
    bullets: Array<{
      original: string;
      tailored: string;
      reasoning: string;
      accepted?: boolean;
    }>;
  }>;
} {
  // Extract matchScore
  const scoreMatch = raw.match(/"matchScore"\s*:\s*(\d+)/);
  const matchScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 80;

  // Helper to extract string array
  function extractArray(fieldName: string): string[] {
    const arrayRegex = new RegExp('"' + fieldName + '"\\s*:\\s*\\[([^\\]]*)\\]');
    const match = raw.match(arrayRegex);
    if (!match || !match[1]) return [];
    const items: string[] = [];
    const itemRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let m;
    while ((m = itemRegex.exec(match[1])) !== null) {
      items.push(m[1].replace(/\\"/g, '"'));
    }
    return items;
  }

  // Helper to extract string field
  function extractString(fieldName: string, fallback = ''): string {
    const strRegex = new RegExp('"' + fieldName + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"');
    const match = raw.match(strRegex);
    return match ? match[1].replace(/\\"/g, '"') : fallback;
  }

  const analysis: JobDescriptionAnalysis = {
    role: extractString('role', 'Target Role'),
    seniority: extractString('seniority', 'Mid-Senior'),
    primaryStack: extractArray('primaryStack'),
    mustHaves: extractArray('mustHaves'),
    niceToHaves: extractArray('niceToHaves'),
    matchedSkills: extractArray('matchedSkills'),
    transferableSkills: extractArray('transferableSkills'),
    missingSkills: extractArray('missingSkills'),
    summary: extractString('summary', 'Alignment analysis synthesized from career vault records.')
  };

  const experiences: Array<{
    experienceId: string;
    company: string;
    role: string;
    bullets: Array<{
      original: string;
      tailored: string;
      reasoning: string;
      accepted?: boolean;
    }>;
  }> = [];

  // Match each experience block: e.g. { "experienceId": "...", "company": "...", "role": "...", "bullets": [...] }
  const expRegex = /\{\s*"experienceId"\s*:\s*"([^"]*)"[\s\S]*?"company"\s*:\s*"([^"]*)"[\s\S]*?"role"\s*:\s*"([^"]*)"[\s\S]*?"bullets"\s*:\s*\[([\s\S]*?)(?:\]\s*\}|(?=\{\s*"experienceId")|$)/g;
  let expMatch;
  while ((expMatch = expRegex.exec(raw)) !== null) {
    const experienceId = expMatch[1];
    const company = expMatch[2];
    const role = expMatch[3];
    const bulletsChunk = expMatch[4];

    const bullets: Array<{
      original: string;
      tailored: string;
      reasoning: string;
      accepted?: boolean;
    }> = [];

    const bulletRegex = /\{\s*"original"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[\s\S]*?"tailored"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"(?:[\s\S]*?"reasoning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)")?[\s\S]*?\}/g;
    let bMatch;
    while ((bMatch = bulletRegex.exec(bulletsChunk)) !== null) {
      bullets.push({
        original: bMatch[1].replace(/\\"/g, '"'),
        tailored: bMatch[2].replace(/\\"/g, '"'),
        reasoning: (bMatch[3] || 'Tailored for target role alignment.').replace(/\\"/g, '"'),
        accepted: true
      });
    }

    if (bullets.length > 0) {
      experiences.push({
        experienceId,
        company,
        role,
        bullets
      });
    }
  }

  return {
    matchScore,
    analysis,
    tailoredExperiences: experiences
  };
}

/**
 * Robust JSON extraction helper handling markdown codeblocks, unescaped characters,
 * truncated streams, and structural repairs.
 */
export function extractStructuredJson<T>(raw: string, fallbackFn?: (raw: string) => T): T {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    }
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const potentialDirect = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(potentialDirect) as T;
    } catch {
      // Direct parse failed, continue through repair engine
    }
  }

  // Step 2: Auto-repair truncated or malformed JSON
  try {
    const repaired = repairTruncatedJson(raw);
    return JSON.parse(repaired) as T;
  } catch (repairErr) {
    // Step 3: Invoke fallback function if provided
    if (fallbackFn) {
      try {
        return fallbackFn(raw);
      } catch (fbErr) {
        console.warn('Fallback extractor error:', fbErr);
      }
    }
    throw new Error(`Failed to parse AI structured response: ${repairErr instanceof Error ? repairErr.message : String(repairErr)}`);
  }
}

/**
 * Runs the 4-Stage Cognitive Pipeline on masked career vault records and target JD.
 */
export async function runTailoringPipeline(
  jobDescription: string,
  experiences: Experience[],
  achievements: Achievement[],
  profile: Profile | null,
  skills: Array<{ category: string; name: string }>,
  customSections: CustomSection[],
  customItems: CustomSectionItem[],
  settings: OpenRouterSettings,
  onProgress?: PipelineProgressCallback
): Promise<PipelineResult> {
  // Step 1: Client-Side Privacy Masking
  if (onProgress) onProgress('Masking sensitive entities & PII...', 1, 4);

  const masking = maskCareerRecords(
    experiences,
    achievements,
    profile,
    skills,
    customSections,
    customItems,
    settings.maskingPreferences
  );

  // Step 2: Assemble System Prompt & 4-Stage Cognitive Pipeline
  const systemPrompt = `You are a Principal Technical Recruiter and Executive Resume Architect at a top-tier tech company.
Your mission is to perform a deep 4-stage cognitive analysis of a candidate's authentic career achievements against a target Job Description (JD).

Strict Execution Rules:
1. STRICT ANTI-HALLUCINATION CONTRACT:
   - NEVER invent metrics, percentages, numbers, or team sizes not present in original bullets.
   - NEVER add technologies, tools, or frameworks the candidate never used.
   - Preserve authentic technical causality and truth.
2. REWRITE BULLETS USING GOOGLE'S XYZ FORMULA:
   - "Accomplished [X] as measured by [Y] by doing [Z]"
   - Start with punchy, high-impact active engineering verbs (e.g., "Architected", "Engineered", "Instrumented", "Optimized", "Consolidated", "Spearheaded").
   - Frame accomplishments to directly resonate with the target JD's requirements and seniority level.
3. PRESERVE PRIVACY TOKENS VERBATIM:
   - The candidate's history contains privacy-masked placeholders: e.g. __COMPANY_1__, __TIMELINE_1__, __CANDIDATE_NAME__, etc.
   - Keep all __COMPANY_X__ and __TIMELINE_X__ tokens verbatim in your output without altering their spelling or numbers.
4. JSON OUTPUT FORMAT & TOKEN EFFICIENCY:
   - Return STRICTLY valid JSON conforming to the schema below. No intro, no markdown explanation outside the JSON.
   - Keep "reasoning" strictly concise: 1 short sentence (under 15 words) explaining the technical verb, metric emphasis, or alignment rationale.
   - Tailor up to 4 of the most relevant achievements per experience to ensure highest strategic quality and prevent token overflow.
   - Output compact JSON without redundant indentation or trailing commentary.

SCHEMA:
{
  "matchScore": <number 0-100 reflecting overall alignment>,
  "analysis": {
    "role": "<Detected target role title>",
    "seniority": "<Detected target seniority: Junior | Mid | Senior | Staff | Principal | Lead>",
    "primaryStack": ["<Tech 1>", "<Tech 2>", ...],
    "mustHaves": ["<Requirement 1>", "<Requirement 2>", ...],
    "niceToHaves": ["<Optional 1>", ...],
    "matchedSkills": ["<Skills candidate demonstrates with evidence>", ...],
    "transferableSkills": ["<Adjacent or transferable competencies>", ...],
    "missingSkills": ["<JD requirements missing in candidate vault>", ...],
    "summary": "<2-3 sentence strategic executive assessment of alignment and strengths>"
  },
  "tailoredExperiences": [
    {
      "experienceId": "<id of experience from input>",
      "company": "<company token from input>",
      "role": "<role title from input>",
      "bullets": [
        {
          "original": "<original authentic bullet text>",
          "tailored": "<Google XYZ optimized bullet>",
          "reasoning": "<1 concise sentence under 15 words>",
          "accepted": true
        }
      ]
    }
  ]
}`;

  const userPrompt = `TARGET JOB DESCRIPTION:
"""
${jobDescription.trim()}
"""

CANDIDATE AUTHENTIC CAREER VAULT (PRIVACY MASKED):
${JSON.stringify(masking.maskedPayload, null, 2)}

Perform the 4-Stage Cognitive Pipeline:
1. Deconstruct the JD requirements.
2. Profile the candidate's achievements.
3. Compute the semantic alignment and skill gap matrix.
4. Rewrite the candidate's achievements into Google XYZ formula tailored to the target role.

Output ONLY valid compact JSON.`;

  if (onProgress) onProgress('Connecting to OpenRouter & Deconstructing JD...', 2, 4);

  const payload: OpenRouterCompletionPayload = {
    model: settings.defaultModel || DEFAULT_OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: settings.temperature ?? 0.3,
    max_tokens: Math.max(settings.maxTokens ?? 4096, 6144),
    stream: true
  };

  let streamedChunks = '';
  const rawResponse = await streamChatCompletion(payload, settings.apiKey, (chunk) => {
    streamedChunks += chunk;
    if (onProgress) {
      onProgress('Analyzing Vault & Optimizing Google XYZ Bullets...', 3, 4, streamedChunks);
    }
  });

  if (onProgress) onProgress('Rehydrating authentic entities & compiling...', 4, 4);

  // Step 3: Parse Structured Output with Fault-Tolerant Repair & Fallback
  interface RawAIResponse {
    matchScore: number;
    analysis: JobDescriptionAnalysis;
    tailoredExperiences: Array<{
      experienceId: string;
      company: string;
      role: string;
      bullets: Array<{
        original: string;
        tailored: string;
        reasoning: string;
        accepted?: boolean;
      }>;
    }>;
  }

  const parsed = extractStructuredJson<RawAIResponse>(rawResponse, (raw) => {
    return fallbackExtractPipelineResult(raw) as RawAIResponse;
  });

  // Step 4: Rehydrate Tokens Back to Authentic Entities
  const rehydratedExperiences: TailoredExperience[] = (parsed.tailoredExperiences || []).map((exp) => {
    const authenticCompany = rehydrateText(exp.company || '', masking.tokenMap);
    const authenticRole = rehydrateText(exp.role || '', masking.tokenMap);

    const rehydratedBullets: TailoredBullet[] = (exp.bullets || []).map((b, idx) => ({
      id: `tailored-b-${exp.experienceId}-${idx}`,
      original: rehydrateText(b.original || '', masking.tokenMap),
      tailored: rehydrateText(b.tailored || '', masking.tokenMap),
      reasoning: rehydrateText(b.reasoning || '', masking.tokenMap),
      accepted: b.accepted !== false // Default to accepted
    }));

    return {
      experienceId: exp.experienceId,
      company: authenticCompany,
      role: authenticRole,
      bullets: rehydratedBullets
    };
  });

  // Ensure all candidate experiences from input are represented even if stream was partially truncated
  const existingExpIds = new Set(rehydratedExperiences.map(e => e.experienceId));
  for (const origExp of experiences) {
    if (!existingExpIds.has(origExp.id)) {
      const expAchievements = achievements.filter(a => a.experienceId === origExp.id);
      if (expAchievements.length > 0) {
        rehydratedExperiences.push({
          experienceId: origExp.id,
          company: origExp.company,
          role: origExp.role,
          bullets: expAchievements.map((ach, idx) => ({
            id: `tailored-b-${origExp.id}-${idx}`,
            original: ach.originalText,
            tailored: ach.originalText,
            reasoning: 'Authentic vault bullet preserved.',
            accepted: true
          }))
        });
      }
    }
  }

  const rehydratedAnalysis: JobDescriptionAnalysis = {
    role: parsed.analysis?.role ? rehydrateText(parsed.analysis.role, masking.tokenMap) : undefined,
    seniority: parsed.analysis?.seniority,
    primaryStack: parsed.analysis?.primaryStack || [],
    mustHaves: parsed.analysis?.mustHaves || [],
    niceToHaves: parsed.analysis?.niceToHaves || [],
    matchedSkills: parsed.analysis?.matchedSkills || [],
    transferableSkills: parsed.analysis?.transferableSkills || [],
    missingSkills: parsed.analysis?.missingSkills || [],
    summary: parsed.analysis?.summary ? rehydrateText(parsed.analysis.summary, masking.tokenMap) : ''
  };

  return {
    matchScore: typeof parsed.matchScore === 'number' ? Math.min(100, Math.max(0, parsed.matchScore)) : 85,
    analysis: rehydratedAnalysis,
    tailoredExperiences: rehydratedExperiences,
    maskingResult: masking,
    rawResponse
  };
}

/**
 * Regenerates an individual bullet point via OpenRouter.
 */
export async function regenerateBullet(
  jobDescription: string,
  originalBullet: string,
  role: string,
  company: string,
  settings: OpenRouterSettings,
  tokenMap: Record<string, string> = {}
): Promise<{ tailored: string; reasoning: string }> {
  const prompt = `Rewrite this specific resume bullet using the Google XYZ Formula ("Accomplished [X] as measured by [Y] by doing [Z]") to best align with the target job description.

TARGET JOB DESCRIPTION:
"""
${jobDescription.slice(0, 1500)}
"""

ROLE: ${role} @ ${company}
ORIGINAL BULLET: "${originalBullet}"

RULES:
1. Do not invent metrics or technologies not present in the original bullet.
2. Use a strong active technical verb.
3. Return STRICTLY valid JSON:
{
  "tailored": "Accomplished [X] as measured by [Y] by doing [Z]",
  "reasoning": "1 sentence explanation of improvement"
}`;

  const payload: OpenRouterCompletionPayload = {
    model: settings.defaultModel || DEFAULT_OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: 'You are an executive resume rewriter adhering strictly to Google XYZ formula and zero hallucination.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 500,
    stream: false
  };

  let raw = '';
  await streamChatCompletion(payload, settings.apiKey, (c) => { raw += c; });

  const result = extractStructuredJson<{ tailored: string; reasoning: string }>(raw);
  return {
    tailored: rehydrateText(result.tailored, tokenMap),
    reasoning: rehydrateText(result.reasoning, tokenMap)
  };
}
