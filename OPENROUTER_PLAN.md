# OpenRouter Integration Implementation Plan 📋🚀

> **Target Application:** `resume-up`  
> **Associated Specification:** [OPENROUTER_SPEC.md](file:///Users/shreyas/projects/resume-up-v1/OPENROUTER_SPEC.md)  
> **Architecture:** 100% Client-Side Direct API with Bidirectional Privacy Masking  
> **Document Status:** Actionable Implementation Roadmap  

---

## 📌 Implementation Overview

This plan outlines the step-by-step technical execution to integrate OpenRouter into `resume-up`. The implementation replaces the need for a heavy local desktop binary, providing frontier-tier AI reasoning (Gemini 2.0 Flash, Llama 3.3 70B Free, DeepSeek V3, Claude 3.5 Sonnet) while strictly preserving user privacy via in-browser PII & entity masking.

---

## 🗂️ File Structure & New Modules

```
src/
├── types/
│   ├── settings.ts                # [NEW] Settings, API keys, masking preferences
│   └── openrouter.ts              # [NEW] OpenRouter payload types, streaming chunks, AI schemas
├── db/
│   └── index.ts                   # [UPDATE] Add 'settings' & 'tailored_sessions' Dexie tables
├── services/
│   ├── privacyMasker.ts           # [NEW] Bidirectional entity masking & local rehydration engine
│   └── openRouterService.ts       # [NEW] Direct OpenRouter client, SSE streaming, 4-stage pipeline
├── components/
│   ├── Header.tsx                 # [UPDATE] Add Settings ⚙️ button & active model indicator
│   ├── Settings/
│   │   └── SettingsModal.tsx      # [NEW] OpenRouter API key, model picker, connection test, masking
│   ├── TailorAI/
│   │   ├── TailorView.tsx         # [UPDATE] Mode toggle (WASM vs OpenRouter), streaming & diff UI
│   │   ├── MaskingInspectorModal.tsx # [NEW] Audit drawer showing anonymized payload before dispatch
│   │   └── BulletDiffCard.tsx     # [NEW] Interactive before/after bullet review with [Accept/Reject]
│   └── ResumeStudio/
│       └── InsertVaultDataModal.tsx # [UPDATE] Filter/insert tailored achievements directly into resume
```

---

## 🎯 Phased Implementation Milestones

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ROADMAP                          │
│                                                                        │
│   Phase 1: Local Settings & OpenRouter Key Infrastructure               │
│   ├── Types, Dexie Schema Update, SettingsModal, Connection Verification│
│                                                                        │
│   Phase 2: Client-Side Privacy Masking & Rehydration Engine             │
│   ├── Tokenizer, PII Redaction, Regex Rehydration, Masking Inspector    │
│                                                                        │
│   Phase 3: OpenRouter API Service & Cognitive Pipelines                 │
│   ├── Direct CORS Client, SSE Streaming Reader, Structured Prompting    │
│                                                                        │
│   Phase 4: Tailor AI Interface Redesign & Interactive Review            │
│   ├── Dual-Mode UI, Gap Analysis Matrix, Before/After Diff Cards        │
│                                                                        │
│   Phase 5: Resume Studio Integration & One-Click Application           │
│   ├── Syncing Accepted Bullets into Editor, Custom Section Inserter    │
│                                                                        │
│   Phase 6: End-to-End Verification & Documentation                      │
│   ├── Regression Testing, Build Validation, ATS Export Check            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Local Settings & OpenRouter Key Infrastructure

### 1.1 Goal
Provide a secure, 100% local mechanism to store and manage the user's OpenRouter API key, selected model, and masking preferences in browser IndexedDB.

### 1.2 Tasks
- [ ] **Task 1.1.1: Define TypeScript Interfaces**
  - Create `src/types/settings.ts`:
    - `UserSettings`: `apiKey`, `defaultModel`, `temperature`, `maxTokens`, `maskingPreferences`.
    - `MaskingPreferences`: `maskCompanies` (boolean), `maskDates` (boolean), `maskPersonalPII` (boolean), `customBlacklist` (string[]).
  - Create `src/types/openrouter.ts`:
    - `OpenRouterModel`: Model metadata (`id`, `name`, `context_length`, `pricing`).
    - `OpenRouterMessage`, `OpenRouterCompletionPayload`, `OpenRouterStreamChunk`.
- [ ] **Task 1.1.2: Extend Dexie Schema in `src/db/index.ts`**
  - Increment database version to support `settings` and `tailored_sessions`.
  - Add helper functions: `getSettings()`, `saveSettings()`, `clearApiKey()`.
- [ ] **Task 1.1.3: Create `src/components/Settings/SettingsModal.tsx`**
  - API Key input with hide/reveal toggle (`type="password"` / `type="text"`).
  - Curated model dropdown with quick-select buttons:
    - `google/gemini-2.0-flash-001` (Recommended default)
    - `openrouter/free` (100% Free dynamic router)
    - `meta-llama/llama-3.3-70b-instruct:free` (Free tier specific)
    - `deepseek/deepseek-chat` (High-accuracy budget)
    - `anthropic/claude-3.5-sonnet` (Frontier executive)
    - *Custom Model ID* free-form input option.
  - "Test Connection" button that calls OpenRouter's `/api/v1/auth/key` or completes a 5-token ping to verify key validity and balance.
  - Masking toggle checkboxes with helpful tooltips.
- [ ] **Task 1.1.4: Update `src/components/Header.tsx`**
  - Add a **Settings ⚙️** icon button to the top-right header action bar.
  - Show a small indicator badge (e.g. `⚡ Gemini 2.0 Flash` or `🔑 Setup Key`) next to the settings button.

### 1.3 Acceptance Criteria
- User can enter their OpenRouter key, test the connection, and save it.
- Key persists in IndexedDB across browser reloads.
- Key can be cleared with one click.
- Zero network requests leave the browser except to `openrouter.ai`.

---

## Phase 2: Client-Side Privacy Masking & Rehydration Engine

### 2.1 Goal
Ensure that no personal identifiers, company names, or sensitive dates are sent to OpenRouter unmasked, while enabling seamless local rehydration of model outputs.

### 2.2 Tasks
- [ ] **Task 2.1.1: Build `src/services/privacyMasker.ts`**
  - **Company Masking with User-Defined Industry / Domain Context:**
    - Collect all company names from `experiences` and `projects`.
    - Retrieve user-specified `exp.industry` (e.g. *"Consumer Sports Tech / B2C Mobile"* or *"B2B Enterprise SaaS"*).
    - Format surrogate tokens: `__COMPANY_1__ [Industry: ${exp.industry}]`.
    - Enables the LLM to align technical domain causality, operational scale, and terminology without knowing the authentic employer name.
  - **Date & Timeline Normalization:**
    - Parse dates (e.g., `2025-08 - Present`, `2021-08 - 2023-10`).
    - Replace with relative tenure descriptors (e.g., `__TIMELINE_1__ [1+ Years, Recent]`, `__TIMELINE_2__ [2 Years]`).
  - **Personal PII Redaction:**
    - Automatically redact `name`, `email`, `phone`, `location`, `linkedin`, `github`, and `website`.
    - Token mapping: `__CANDIDATE_NAME__`, `__EMAIL__`, `__PHONE__`, `__LINKEDIN_URL__`, etc.
  - **Custom User Blacklist:**
    - Scan for user-specified keywords (e.g. secret codenames, proprietary tools) and replace with `__INTERNAL_PROJECT_X__`.
  - **Bidirectional Token Map Generation:**
    - Returns `{ maskedData, tokenMap, companyContextMap }` where `tokenMap` stores `{ token: originalValue }`.
- [ ] **Task 2.1.2: Build Rehydration Function**
  - `rehydrateText(text: string, tokenMap: Record<string, string>): string`:
    - Safely replaces all `__TOKEN__` instances back to their original strings.
    - Handles case variations or slight formatting deviations from the model.
- [ ] **Task 2.1.3: Build `MaskingInspectorModal.tsx`**
  - A collapsible pre-dispatch audit drawer allowing users to review and inspect the exact JSON payload.
  - **Inline Industry Metadata Editor:** Allows users to inspect and refine company industry annotations on the fly (e.g., updating *"Playo"* $\rightarrow$ *"Consumer Sports Tech, ~500k MAU"*), persisting edits back to IndexedDB.
  - Highlights masked tokens in purple pill badges.

### 2.3 Acceptance Criteria
- Masked payload contains zero instances of candidate name, company names, emails, or exact calendar years.
- Rehydration restores 100% of the authentic names into the generated bullet points.

---

## Phase 3: OpenRouter API Service & Cognitive Pipelines

### 3.1 Goal
Implement the direct client communication layer and the 4-stage cognitive prompt pipeline for JD deconstruction, gap analysis, and Google XYZ bullet rewriting.

### 3.2 Tasks
- [ ] **Task 3.1.1: Build `src/services/openRouterService.ts`**
  - `testConnection(apiKey: string): Promise<{ valid: boolean; balance?: number; error?: string }>`
  - `streamChatCompletion(payload: OpenRouterCompletionPayload, apiKey: string, onChunk: (text: string) => void): Promise<string>`
  - Implement SSE (Server-Sent Events) streaming parser using standard `fetch()` and `ReadableStreamDefaultReader`.
- [ ] **Task 3.1.2: Implement 4-Stage Cognitive Prompts**
  - **Stage 1 (JD Deconstruction):** Extracts role, seniority, core tech stack, must-haves, nice-to-haves, and impact verbs into structured JSON.
  - **Stage 2 (Vault Profiling):** Organizes user's masked achievements into Action, Measurement, Outcome, and Tool tuples.
  - **Stage 3 (Semantic Alignment & Gap Analysis):** Evaluates overlap, returns match percentage, matched skills, transferable skills, and unaddressed requirements.
  - **Stage 4 (Google XYZ Rewriting):**
    - Rewrites user's achievements into *"Accomplished [X] as measured by [Y] by doing [Z]"*.
    - Injects strict anti-hallucination rules:
      - *Rule 1:* NEVER invent metrics or percentages not present in original bullets.
      - *Rule 2:* NEVER add technologies or tools the candidate did not mention.
      - *Rule 3:* Retain all `__COMPANY_X__` and `__TIMELINE_X__` placeholders verbatim.
- [ ] **Task 3.1.3: Robust JSON Output Extraction**
  - Robust parser that handles standard JSON, markdown fenced blocks (` ```json ... ``` `), and partial streaming JSON recovery.

### 3.3 Acceptance Criteria
- Streaming returns chunks smoothly without blocking the UI.
- JSON output conforms strictly to TypeScript schemas.
- Anti-hallucination guardrails prevent metric or skill fabrication.

---

## Phase 4: Tailor AI Interface Redesign & Interactive Review

### 4.1 Goal
Upgrade the "Tailor with AI" tab to support both the instant in-browser WASM matcher and the deep OpenRouter reasoning pipeline with interactive diff cards.

### 4.2 Tasks
- [ ] **Task 4.1.1: Mode Switcher in `src/components/TailorAI/TailorView.tsx`**
  - Toggle between:
    - `⚡ In-Browser WASM` (instant, offline, zero-key MiniLM matcher).
    - `🧠 OpenRouter Deep Reasoning` (deep gap analysis + Google XYZ rewrites).
  - If OpenRouter mode is selected without a saved API key, show an inline banner with a "Configure API Key" button that opens `SettingsModal`.
- [ ] **Task 4.1.2: Streaming Progress & Analysis Dashboard**
  - Live animated step indicator:
    1. *Deconstructing Job Requirements...*
    2. *Analyzing Career Vault Alignment...*
    3. *Optimizing Achievements with Google XYZ Formula...*
  - **Gap Analysis Summary Card:**
    - Match score dial (e.g. `87% Match`).
    - Green badges for **Verified Competencies** (`React.js`, `TypeScript`, `TailwindCSS`).
    - Blue badges for **Transferable Competencies** (`Redux` → State Management).
    - Amber badges for **Skill Gaps** (`GraphQL`, `AWS Lambda`).
- [ ] **Task 4.1.3: Interactive `BulletDiffCard.tsx`**
  - Side-by-side or stacked diff of each achievement:
    - **Original Bullet:** Shows the raw text from the Career Vault.
    - **Tailored Bullet (Google XYZ):** Shows the optimized, rehydrated bullet.
    - **Rationale:** 1-sentence explanation of what was improved (e.g., *"Framed mobile web transition using active engineering verbs and quantified user impact"*).
  - Action buttons:
    - `[✓ Accept]` (marks bullet as ready for resume export).
    - `[✏️ Edit]` (allows inline manual tweaking before insertion).
    - `[🔄 Regenerate]` (re-prompts for this specific bullet).
    - `[✕ Revert]` (keeps original unedited bullet).

### 4.3 Acceptance Criteria
- User can see side-by-side comparisons of original vs. tailored bullets.
- User can accept/reject individual bullets.
- Match breakdown clearly explains why bullets were prioritized.

---

## Phase 5: Resume Studio Integration & One-Click Application

### 5.1 Goal
Enable seamless 1-click export of accepted tailored bullets into the active resume template in Resume Studio.

### 5.2 Tasks
- [ ] **Task 5.1.1: "Apply to Resume Studio" Action**
  - Add a primary action in `TailorView.tsx`: **"Open in Resume Studio with Tailored Bullets"**.
  - Merges accepted bullets into the active resume model in IndexedDB.
  - Automatically switches view to `Resume Studio`.
- [ ] **Task 5.1.2: Update `InsertVaultDataModal.tsx`**
  - Add a dedicated **"⭐ Tailored Suggestions"** tab inside the In-Editor Vault Inserter.
  - Allows inserting freshly tailored bullets directly at the cursor position in CodeMirror.

### 5.3 Acceptance Criteria
- Tailored bullets appear immediately in the resume preview.
- HTML formatting (`<li>...</li>`) matches the active template (`minimal.ts` / custom templates).
- Rehydrated entities (real company names and dates) are cleanly inserted.

---

## Phase 6: Verification, End-to-End Testing & Documentation

### 6.1 Goal
Verify the end-to-end flow in the browser, validate builds, test edge cases, and finalize documentation.

### 6.2 Tasks
- [ ] **Task 6.1.1: Build & Typecheck Validation**
  - Run `npm run build` to ensure zero TypeScript errors or bundle warnings.
- [ ] **Task 6.1.2: Privacy Masking Verification**
  - Test payload inspector with sample data (Alex Mercer and custom profiles).
  - Verify that no PII or company names exist in outgoing network payloads.
- [ ] **Task 6.1.3: PDF Export Verification**
  - Export tailored resume to PDF via print engine (`window.print()`).
  - Verify layout integrity, typography, and page break prevention.
- [ ] **Task 6.1.4: Update Documentation**
  - Update `README.md` to link `OPENROUTER_SPEC.md` and `OPENROUTER_PLAN.md`.
  - Update `TODO.md` to reflect the completed OpenRouter architecture.

---

## 📅 Execution Order & Dependencies

```
[Phase 1: Settings & Key Store] 
       │
       ▼
[Phase 2: Privacy Masking Engine]
       │
       ▼
[Phase 3: OpenRouter API Client & Prompts]
       │
       ▼
[Phase 4: Tailor AI UI & Diff Review]
       │
       ▼
[Phase 5: Resume Studio Inserter Integration]
       │
       ▼
[Phase 6: Verification & End-to-End Testing]
```