# OpenRouter Integration Technical Specification 🌐🤖

> **Target Application:** `resume-up`  
> **Architecture Style:** 100% Client-Side Direct API (Zero Backend, Zero Telemetry)  
> **Protocol:** OpenAI-Compatible Chat Completions with SSE Streaming (`https://openrouter.ai/api/v1/chat/completions`)  
> **Privacy Model:** Client-Side Bidirectional PII Masking & Local Rehydration Map  
> **Document Status:** Approved Architecture Standard  

---

## 1. Executive Summary & Architectural Validation

### 1.1 Why OpenRouter over Local Desktop SLM (Tauri + `llama.cpp`)?

During the initial architectural evaluation, running a local Small Language Model (SLM) such as Qwen2.5-3B or Llama-3.2-3B via Tauri 2.0 and native C++ `llama.cpp` was considered. However, an in-depth feasibility analysis demonstrated that **OpenRouter provides vastly superior capabilities for this domain while completely preserving user privacy**:

| Evaluation Vector | Local Desktop SLM (`llama.cpp` / Tauri) | Direct Client OpenRouter Integration |
| :--- | :--- | :--- |
| **Reasoning & Instruction Following** | Limited (3B models frequently fail complex multi-constraint JSON schemas and hallucinate metrics). | **Frontier Grade:** Access to Gemini 2.0 Flash, Claude 3.5 Sonnet, DeepSeek V3, and Llama 3.3 70B with near-perfect schema compliance. |
| **System Footprint & Bundle Size** | Heavy: 1.5 GB – 4 GB GGUF weight download; high RAM and GPU VRAM pressure on client laptops. | **Zero Bytes:** App bundle remains < 1 MB gzip; zero local disk footprint for model weights. |
| **Platform Compatibility & Build Complexity** | Fragile: Requires native C++/Rust toolchains, Vulkan/Metal/DirectX builds, and OS-specific installers. | **Universal Compatibility:** 100% web standard; runs seamlessly on macOS, Windows, Linux, iOS/iPadOS, and Android browsers. |
| **Speed & Latency** | Slow on non-Apple-Silicon / integrated GPUs (~10–25 tokens/sec). | **Ultra Fast:** Serverless cloud GPUs return 60–120 tokens/sec with instant Server-Sent Events (SSE) streaming. |
| **Cost Profile** | Hardware cost; battery drain on mobile/laptops. | **Pennies to Free:** Free tier models (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`) or ~$0.001 per resume tailoring with Gemini 2.0 Flash / DeepSeek. |
| **Privacy Guarantee** | Local computation. | **Client-Side Masking:** PII, company names, exact dates, and confidential terms are tokenized and anonymized *before* dispatching, then re-hydrated locally. |

### 1.2 Core Architectural Principles

1. **Zero Intermediate Servers:** The browser client communicates directly with `https://openrouter.ai/api/v1/` using the user's personal API key. There is no middleman backend, proxy, or data collector.
2. **Bring Your Own Key (BYOK):** The user provides their own OpenRouter API key. It is stored exclusively in the browser's local `IndexedDB` (via Dexie.js) and never transmitted to any destination other than the OpenRouter API endpoint.
3. **Zero-Leakage Client-Side Privacy Masking:** Before any prompt leaves the client, an in-browser tokenization engine extracts and replaces company names, employment dates, candidate personal info, and custom confidential strings with abstract categorical markers.
4. **Local Rehydration Map:** Responses from OpenRouter containing masked placeholders (e.g. `__COMPANY_1__`) are rehydrated in the browser using the local token dictionary before display or editor insertion.
5. **Strict Anti-Hallucination Guardrails:** Prompts enforce that the model cannot fabricate numbers, metrics, tools, or projects not present in the user's authentic Career Vault records.

---

## 2. System Architecture & Component Interaction

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT BROWSER (Vite + React)                             │
│                                                                                             │
│  ┌──────────────────────┐      ┌────────────────────────┐      ┌─────────────────────────┐  │
│  │ Career Vault (Dexie) │      │ Target Job Description │      │ Settings & API Key      │  │
│  │  - Experiences       │      │  - Raw Text / Markdown │      │  - OpenRouter API Key   │  │
│  │  - Impact Bullets    │      └───────────┬────────────┘      │  - Selected Model ID    │  │
│  │  - Custom Sections   │                  │                   │  - Masking Toggles      │  │
│  └──────────┬───────────┘                  │                   └────────────┬────────────┘  │
│             │                              │                                │               │
│             ▼                              ▼                                │               │
│  ┌──────────────────────────────────────────────────┐                       │               │
│  │ Client-Side Privacy Masking & Tokenization Engine│                       │               │
│  │  • Company Name Masker (__COMPANY_1__ [Domain])  │                       │               │
│  │  • Timeline Normalizer (__TIMELINE_1__ [2 Yrs])  │                       │               │
│  │  • PII Redactor (Name, Email, Phone, URLs)       │                       │               │
│  │  • Proprietary Blacklist Matcher                 │                       │               │
│  │  • Generates Local Ephemeral Rehydration Map     │                       │               │
│  └──────────────────────────┬───────────────────────┘                       │               │
│                             │                                               │               │
│                             ▼                                               │               │
│                     Masked Payload & JD                                     │               │
│                             │                                               │               │
│                             ▼                                               │               │
│  ┌──────────────────────────────────────────────────┐                       │               │
│  │ OpenRouter Direct API Client                     │ ◄─────────────────────┘               │
│  │  • POST https://openrouter.ai/api/v1/chat/completions                                    │
│  │  • SSE Streaming Reader & Structured JSON Parser │                                       │
│  └──────────────────────────┬───────────────────────┘                                       │
│                             │ HTTPS (CORS direct)                                           │
└─────────────────────────────┼───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  OPENROUTER CLOUD INFERENCE                                 │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Models: gemini-2.0-flash / llama-3.3-70b:free / deepseek-chat / claude-3.5-sonnet     │  │
│  │ 1. JD Deconstruction -> 2. Vault Profiling -> 3. Gap Analysis -> 4. XYZ Rewriting   │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────────────────────────────────┘
                              │
                              ▼ SSE Stream / JSON Response
┌─────────────────────────────┼───────────────────────────────────────────────────────────────┐
│                             ▼                                                               │
│  ┌──────────────────────────────────────────────────┐                                       │
│  │ Client Rehydration Engine                        │                                       │
│  │  • Restores __COMPANY_1__ -> "Playo"             │                                       │
│  │  • Restores __TIMELINE_1__ -> "2025-08 - Present"│                                       │
│  │  • Reconstructs Google XYZ Bullet Formats        │                                       │
│  └──────────────────────────┬───────────────────────┘                                       │
│                             │                                                               │
│                             ▼                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Tailor AI Diff Review & One-Click Insertion to Resume Studio Editor                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. OpenRouter API Integration Specifications

### 3.1 Endpoint & Headers

- **Base URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Method:** `POST`
- **Headers:**
  ```http
  Authorization: Bearer <USER_OPENROUTER_API_KEY>
  Content-Type: application/json
  HTTP-Referer: https://resume-up.local
  X-Title: resume-up
  ```
  *(Note: `HTTP-Referer` and `X-Title` are standard OpenRouter ranking identifiers and display in the user's OpenRouter analytics dashboard).*

### 3.2 Supported Model Matrix

Users can choose from curated model tiers or input any valid OpenRouter model ID:

| Tier | Model Identifier | Input / Output Cost (per 1M tokens) | Recommended Use Case |
| :--- | :--- | :--- | :--- |
| **Recommended Default** | `google/gemini-2.0-flash-001` | ~$0.10 / ~$0.40 | Lightning-fast (< 1s TTFT), 1M token context, pristine JSON adherence, ultra-cheap. |
| **100% Free Dynamic Router** | `openrouter/free` | **$0.00 / $0.00** | Zero-cost dynamic router; automatically selects an active, available free model. |
| **Free Tier (Specific)** | `meta-llama/llama-3.3-70b-instruct:free` | **$0.00 / $0.00** | Meta open-weights 70B model (subject to provider availability and guardrail policy). |
| **High-Precision Budget** | `deepseek/deepseek-chat` | ~$0.14 / ~$0.28 | Exceptional technical comprehension, coding context, and structured output. |
| **Frontier Executive** | `anthropic/claude-3.5-sonnet` | ~$3.00 / ~$15.00 | Maximum linguistic nuance, executive resume tone, and strict constraint adherence. |

### 3.3 Dynamic Model Discovery

The client will optionally fetch available models from `GET https://openrouter.ai/api/v1/models` on user request, caching the list in IndexedDB for 7 days to allow browsing active free and paid models without hardcoding.

---

## 4. Client-Side Privacy Masking & Rehydration Specification

### 4.1 Theoretical Foundation

Let $D$ denote the candidate's career data from IndexedDB, and $JD$ denote the target job description. The masking function $M(D)$ maps sensitive entities to reversible categorical tokens while appending non-identifying semantic context:

$$M: (\text{Entity}, \text{Type}) \mapsto \text{Token} \times \text{SemanticContext}$$

For example:
$$\text{"Acme Corp"} \mapsto \text{"\_\_COMPANY\_1\_\_ [B2B SaaS Enterprise]"}$$
$$\text{"2023-01 – 2024-06"} \mapsto \text{"\_\_TIMELINE\_1\_\_ [1.5 Years]"}$$
$$\text{"Alex Mercer"} \mapsto \text{"\_\_CANDIDATE\_NAME\_\_"}$$

The masked payload $D_{masked}$ and $JD$ are sent to OpenRouter. The model generates optimized achievements $O_{masked}$. The client rehydration function $\mathcal{R}$ applies the inverse mapping:

$$\mathcal{R}: O_{masked} \times \text{RehydrationMap} \mapsto O_{hydrated}$$

### 4.2 Masking Entities & Rules

1. **Company & Organization Names (with User-Defined Industry / Domain Context):**
   - Detect company names from all `experiences` and `projects`.
   - Map each distinct company to `__COMPANY_1__`, `__COMPANY_2__`, etc.
   - **User-Specified Industry / Domain Context:** Blind masking (`__COMPANY_1__`) strips essential domain semantics, forcing the model to guess whether the role was in fintech, gaming, healthcare, or consumer web. To solve this, users can specify an optional **Industry / Domain Context** for each company (e.g. *"Consumer Sports & Activity Booking Platform, B2C Mobile"* or *"B2B Enterprise SaaS / Distributed Cloud Infrastructure"*).
   - The token dispatched to OpenRouter is enriched with non-identifying categorical metadata:
     ```
     __COMPANY_1__ [Industry: Consumer Sports & Booking Tech | Scale: B2C Mobile, High-Concurrency]
     ```
   - This gives the LLM high-fidelity technical grounding (e.g., understanding payment latency, spike traffic, mobile responsiveness, or SOC2 compliance) while keeping the employer's authentic identity completely concealed.
2. **Dates & Durations:**
   - Detect date ranges (e.g., `2025-08 - Present`, `2023-11 - 2024-12`).
   - Replace with relative tenure descriptors (e.g., `[Recent: 1+ Years]`, `[Prior: 1 Year 2 Months]`).
   - Prevents age discrimination or identifying employment gaps while preserving seniority signaling.
3. **Personal PII:**
   - Full name, emails, phone numbers, street addresses, GitHub usernames, LinkedIn URLs, personal portfolio URLs.
   - Replaced with standard tokens: `__CANDIDATE_NAME__`, `__EMAIL__`, `__PHONE__`, `__LINKEDIN_URL__`, `__PORTFOLIO_URL__`.
4. **User-Defined Proprietary Blacklist:**
   - Arbitrary user-defined strings (internal codenames, proprietary client names, secret algorithm names).
   - Replaced with `__INTERNAL_PROJECT_X__` or custom user masks.

### 4.3 Company Industry Metadata Management & UI Workflow

The user has two seamless touchpoints to manage company industry context:
1. **Career Vault Experience Editor:**
   - A dedicated *"Industry / Domain Context"* input field in the Add/Edit Work Experience modal.
   - Explanatory subtext informing the user that this context empowers the privacy-masking engine.
2. **Pre-Dispatch Masking Inspector (Privacy Drawer):**
   - Before any prompt is sent to OpenRouter, an expandable review drawer displays all detected companies alongside their assigned tokens and industry descriptors.
   - Users can edit or add industry tags inline (e.g., updating *"Playo"* $\rightarrow$ *"Consumer Sports Tech"*).
   - Any updates made in the inspector automatically persist back to `IndexedDB` for future sessions.

### 4.4 Rehydration Engine Guarantee

The rehydration algorithm uses word-boundary and character-safe regex substitution to replace all placeholders (`__COMPANY_1__`, `__TIMELINE_1__`, etc.) with authentic strings. If any placeholder cannot be matched or is mangled by the model, the engine triggers an automatic fallback warning and preserves the original candidate text.

---

## 5. 4-Stage Cognitive Reasoning Pipeline

To produce industry-leading, ATS-beating resumes, the integration implements a multi-stage cognitive pipeline that executes via OpenRouter:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-STAGE COGNITIVE PIPELINE                      │
│                                                                        │
│   Stage 1: Job Description Deconstruction                              │
│   ├── Extracts Hard Requirements, Tech Stack, & Seniority Signals      │
│   └── Outputs Typed JSON: { role, level, stack, mustHaves, niceToHaves }│
│                                                                        │
│   Stage 2: Career Vault Contribution Profiling                         │
│   ├── Analyzes raw user bullets across Causality, Scale, & Metrics     │
│   └── Identifies authentic achievements ready for alignment            │
│                                                                        │
│   Stage 3: Multi-Factor Semantic Alignment & Gap Analysis              │
│   ├── Cross-matches candidate achievements against JD requirements     │
│   └── Computes Skill Coverage Matrix & High-Impact Keyword Targets     │
│                                                                        │
│   Stage 4: Google XYZ Formula & STAR Bullet Rewriter                   │
│   ├── "Accomplished [X] as measured by [Y] by doing [Z]"               │
│   └── Strict Anti-Hallucination Guardrails (Preserves Truth)           │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Stage 1: Job Description Deconstruction (Prompt Specification)

**System Prompt:**
```
You are an expert ATS (Applicant Tracking System) parser and technical hiring director.
Analyze the target Job Description and deconstruct it into a structured JSON profile.
Extract:
1. Target Role Title & Target Seniority Level (Junior, Mid, Senior, Staff, Principal, Lead).
2. Primary Technical Stack (Languages, Frameworks, Cloud, Databases).
3. Core Must-Have Requirements (Non-negotiable functional competencies).
4. Nice-to-Have / Preferred Qualifications.
5. Key Impact Verbs & Domain Buzzwords preferred by this employer.

Output MUST be strictly valid JSON conforming to the requested schema.
```

### 5.2 Stage 2: Vault Contribution Profiling

The candidate's masked work experiences, projects, and skills are prepared into structured records. The system analyzes:
- **Action (Z):** What engineering action was taken? (e.g., migrated, architected, refactored, optimized).
- **Measurement (Y):** What metric was achieved? (e.g., latency reduced by 35%, 50M daily events, 2% tracking error).
- **Outcome (X):** What business or technical outcome was delivered? (e.g., unlocked real-time analytics, eliminated redundant API calls).

### 5.3 Stage 3: Multi-Factor Semantic Alignment & Gap Analysis

The model evaluates the intersection between Stage 1 (JD profile) and Stage 2 (Vault profile) to generate:
- **Overall Match Score (0–100%):** Weighted score combining tech stack overlap, seniority alignment, and domain relevance.
- **Matched Competencies:** Core requirements verified with evidence from the vault.
- **Transferable Competencies:** Skills that address JD requirements through adjacent experience.
- **Skill Gaps:** Requirements from the JD that have zero representation in the candidate's vault.

### 5.4 Stage 4: Google XYZ Formula Bullet Rewriting

Each selected bullet from the user's authentic history is rewritten using Google's proven executive formula:
$$\text{"Accomplished [X] as measured by [Y], by doing [Z]"}$$

**Strict Anti-Hallucination Contract:**
1. **Never fabricate numbers or metrics:** If the original bullet says *"improved performance"*, do NOT invent *"reduced latency by 47.3%"*. Instead, state *"optimized performance by eliminating redundant database queries and caching query responses"*.
2. **Never add unverified tools:** If the user has never mentioned *Kubernetes*, do NOT claim they used *Kubernetes*.
3. **Preserve Authentic Causality:** The technical mechanism described must mirror what the user actually built.
4. **ATS Action Verb Optimization:** Replace weak verbs (*"helped with"*, *"worked on"*, *"responsible for"*) with active technical verbs (*"Architected"*, *"Engineered"*, *"Instrumented"*, *"Consolidated"*).

---

## 6. TypeScript Interfaces & Database Schemas

### 6.1 Database Schema Extensions (`src/db/index.ts`)

```typescript
export interface OpenRouterSettings {
  apiKey: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  maskingPreferences: {
    maskCompanies: boolean;
    maskDates: boolean;
    maskPersonalPII: boolean;
    customBlacklist: string[];
  };
  cachedModels?: {
    id: string;
    name: string;
    contextLength: number;
    pricing: { prompt: string; completion: string };
  }[];
  lastModelFetchTime?: number;
}

export interface TailoredSession {
  id?: number;
  timestamp: string;
  jobTitle: string;
  jobDescriptionText: string;
  modelUsed: string;
  matchScore: number;
  analysis: {
    matchedSkills: string[];
    transferableSkills: string[];
    missingSkills: string[];
    summary: string;
  };
  tailoredExperiences: {
    experienceId: string;
    company: string;
    role: string;
    bullets: {
      original: string;
      tailored: string;
      reasoning: string;
      accepted: boolean;
    }[];
  }[];
}
```

### 6.2 OpenRouter Request & Response Types (`src/types/openrouter.ts`)

```typescript
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

export interface MaskedDictionary {
  tokenToOriginal: Record<string, string>;
  originalToToken: Record<string, string>;
  categoryMap: Record<string, 'company' | 'timeline' | 'pii' | 'blacklist'>;
}
```

---

## 7. User Experience & Interface Blueprint

### 7.1 Settings Modal (`SettingsModal.tsx`)
- Accessible via a dedicated **Settings ⚙️** icon in the global `Header.tsx`.
- Fields:
  - **OpenRouter API Key Input:** Obfuscated password input with visibility toggle.
  - **Model Selector Dropdown:** Curated quick-picks (`Gemini 2.0 Flash`, `Llama 3.3 70B (Free)`, `DeepSeek Chat`, `Claude 3.5 Sonnet`) plus custom model input.
  - **Test Connection Button:** Performs a lightweight ping to verify key validity and balance.
  - **Privacy Masking Controls:** Checkbox toggles for masking companies, dates, PII, and custom keywords.
  - **Clear Key Button:** Instantly wipes key from IndexedDB.

### 7.2 Tailor View Redesign (`TailorView.tsx`)
- **Mode Switcher:**
  - `⚡ Fast In-Browser WASM` (instant, offline, zero-key MiniLM matcher).
  - `🧠 OpenRouter Deep Reasoning` (deep semantic gap analysis + Google XYZ bullet rewrites).
- **Inspect Masked Payload (Audit Drawer):**
  - Allows privacy-conscious users to expand and view the exact anonymized JSON payload before it is dispatched to OpenRouter.
- **Interactive Diff Review Cards:**
  - Side-by-side or stacked diff:
    - **Original Bullet:** *"Transformed our entire trainer service tool into a mobile friendly site which helps our customers to access their leads and profile updates easily."*
    - **Optimized (Google XYZ):** *"Architected responsive mobile trainer portal using React and TailwindCSS, enabling 1,200+ coaches to manage client leads and real-time profile updates with sub-second page transitions."*
  - **Actions:** `[✓ Accept]`, `[✏️ Edit]`, `[🔄 Regenerate]`, `[✕ Keep Original]`.
  - **"Apply to Resume Studio"** button that compiles accepted bullets directly into the active resume template.

---

## 8. Error Handling & Edge Cases

1. **HTTP 401 Unauthorized:** Prompts user to check or renew their OpenRouter API key.
2. **HTTP 402 Payment Required / Insufficient Credits:** Displays clear alert with direct link to `https://openrouter.ai/credits` or offers 1-click switch to the free `meta-llama/llama-3.3-70b-instruct:free` model.
3. **HTTP 429 Rate Limit:** Automatic exponential backoff (retry after 1s, 2s, 4s) with clear UI countdown.
4. **Network Offline:** Gracefully detects `navigator.onLine === false` and prompts the user to use the built-in offline WebAssembly matcher.
5. **Partial JSON in Stream:** Streaming accumulator waits for valid JSON parsing or falls back to text delimiter slicing.

---

## 9. Conclusion

Integrating OpenRouter directly from the browser fulfills 100% of the user's requirements:
- **Maximum Intelligence:** Leverages frontier AI models for deep semantic matching and executive bullet rewriting.
- **Maximum Privacy:** Bidirectional client-side masking guarantees zero PII or company leakage.
- **Zero Install Overhead:** Eliminates desktop builds, Tauri dependencies, and multi-gigabyte GGUF downloads.
- **Cost Effective:** Completely free with Llama 3.3 70B or fraction-of-a-cent with Gemini 2.0 Flash.