# resume-up 📄⚡

> **100% Client-Side, Privacy-First Career Vault, OpenRouter AI Tailor & ATS Resume Studio.**  
> Zero backend servers. Zero cloud databases. Zero telemetry. True browser privacy with client-side PII masking.

---

## 🌟 Executive Summary

**`resume-up`** is designed for software engineers, tech professionals, and creators who want total ownership of their career records. Instead of uploading your personal career history, contact details, and employer data to third-party cloud servers, `resume-up` runs **100% locally in your browser**.

- **Master Career Vault:** Store unlimited work experiences, quantified achievements, education, technical skills, and certifications directly in browser **IndexedDB**.
- **Frontier OpenRouter Integration (BYOK):** Deep cognitive reasoning powered by Gemini 2.0 Flash, Llama 3.3 70B (Free), DeepSeek V3, and Claude 3.5 Sonnet directly from the browser over encrypted HTTPS.
- **Zero-Leakage Client-Side Privacy Masking:** Sensitive candidate PII, employer names (enriched with domain context tokens like `__COMPANY_1__ [Industry: B2B SaaS]`), exact dates, and custom confidential keywords are anonymized *before* dispatching to OpenRouter and rehydrated locally.
- **Google XYZ Bullet Rewriting & Gap Analysis:** 4-stage cognitive pipeline that evaluates match overlap and rewrites accomplishments into *"Accomplished [X] as measured by [Y] by doing [Z]"* with strict anti-hallucination rules.
- **In-Browser Semantic Matcher (WASM):** Offline fallback powered by `@xenova/transformers` running `all-MiniLM-L6-v2` via WebAssembly (WASM) in a Web Worker, paired with keyword-overlap and TF-IDF scoring.
- **Curated ATS Templates:** Industry-standard **Jake's Resume** (LaTeX-style typography, high-density format) and **Modern Minimalist Tech**.
- **Live Dual-Pane Editor:** Real-time CodeMirror HTML/CSS editor alongside debounced, pixel-perfect A4 live sheet rendering.
- **On-Demand Google Fonts:** Professional ATS typography (*Merriweather*, *EB Garamond*, *Lora*, *Inter*, *Plus Jakarta Sans*, *JetBrains Mono*, etc.) dynamically loaded on-demand.
- **In-Editor Career Vault Inserter:** Double-click or click "Insert from DB" in the editor to search and insert achievements, job blocks, or **⭐ Tailored Suggestions** at the cursor position.
- **Native Vector PDF Export:** Clean print engine export (`window.print()`) styled via `@page { size: A4; margin: 0; }` with zero duplicate pages, timestamps, URLs, or browser headers.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CLIENT-SIDE BROWSER / PWA                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              REACT 18 + TYPESCRIPT + VITE + TAILWIND             │  │
│  │                                                                  │  │
│  │  ┌──────────────┐  ┌───────────────────────┐  ┌───────────────┐  │  │
│  │  │ Career Vault │  │ Privacy Masking &     │  │ Dual-Pane /   │  │  │
│  │  │  (IndexedDB) │  │ Rehydration Engine    │  │ Studio View   │  │  │
│  │  │  Experiences │  │ [__COMPANY_1__ [Ctx]] │  │ [Code | View] │  │  │
│  │  └──────┬───────┘  └───────────┬───────────┘  └───────┬───────┘  │  │
│  └─────────┼──────────────────────┼──────────────────────┼──────────┘  │
│            │                      │                      │             │
│            ▼                      ▼                      ▼             │
│     IndexedDB Storage     Direct OpenRouter API    Native Browser      │
│     (via Dexie.js)        (CORS / SSE Streaming)    Print Engine       │
│                           Gemini / Llama / Claude  (window.print)      │
│                                   │                      │             │
└───────────────────────────────────┼──────────────────────┼─────────────┘
                                    ▼                      ▼
                            Google XYZ Rewrites    Vector ATS PDF
```

---

## 🚀 Key Features

### 1. 🌐 OpenRouter Integration & Cognitive Reasoning
- **Bring Your Own Key (BYOK):** Save your personal OpenRouter API key in local IndexedDB. Zero telemetry, zero middleman backend servers.
- **Curated Frontier & Free Models:**
  - `google/gemini-2.0-flash` (Recommended default: lightning-fast, ultra-cheap)
  - `meta-llama/llama-3.3-70b-instruct:free` (100% Free tier open-weights)
  - `deepseek/deepseek-chat` (High-precision technical budget)
  - `anthropic/claude-3.5-sonnet` (Frontier executive tone)
  - Custom model slug input option.
- **4-Stage Cognitive Pipeline:**
  1. *JD Deconstruction:* Hard requirements, tech stack, and seniority detection.
  2. *Vault Profiling:* Action, measurement, outcome, and tool tuple decomposition.
  3. *Gap Analysis:* Overall match score (0–100%), verified competencies, transferable skills, and skill gaps.
  4. *Google XYZ Bullet Rewriting:* "Accomplished [X] as measured by [Y] by doing [Z]" with strict anti-hallucination rules (never invents metrics or unmentioned technologies).

### 2. 🛡️ Client-Side Privacy Masking (Zero-Leakage)
- **Company Masking with Industry Context:** Replaces real employer names with surrogate tokens enriched with domain context (e.g. `__COMPANY_1__ [Industry: Consumer Sports Tech, ~500k MAU]`).
- **Date Normalization:** Replaces exact calendar years with relative tenure descriptors (e.g. `__TIMELINE_1__ [Recent: 2+ Years]`).
- **Personal PII Redaction:** Strips full name, email, phone, location, LinkedIn, GitHub, and portfolio URLs.
- **Custom Proprietary Blacklist:** Redacts internal project codenames or confidential tools into `__INTERNAL_PROJECT_X__`.
- **Pre-Dispatch Masking Inspector:** Review the exact anonymized JSON payload before dispatch, and edit company industry tags inline.
- **Local Rehydration Map:** Automatically restores authentic company names and dates back into the generated bullets in the browser.

### 3. 🔍 Interactive Diff Review Cards
- Side-by-side / stacked diff between the raw Career Vault bullet and the optimized Google XYZ bullet.
- One-click `[✓ Accept]`, `[✏️ Edit]` inline text editor, `[🔄 Regenerate]` single bullet, and `[✕ Revert]` to original.
- **1-Click Apply to Studio:** Packages all accepted tailored bullets directly into the active resume template in Resume Studio.

### 4. 🗄️ Career Vault (Local IndexedDB)
- **Profile:** Full name, title, contact info, LinkedIn, GitHub, and portfolio links.
- **Experiences & Impact Bullets:** Full history with company, role, dates, location, industry context, and categorized achievements.
- **Education, Skills, Certifications & Custom Sections:** Unlimited projects, extracurriculars, publications, and awards.
- **Data Portability:** 1-Click sample data, CSV spreadsheet import/export via `PapaParse`, and full JSON backup and restore.

### 5. 🧠 In-Browser Semantic Matcher (WASM Offline Mode)
- **Instant Dual-Mode Switcher:** Toggle between OpenRouter deep reasoning and fast offline in-browser WASM matching.
- **Vector Cosine Similarity:** Computes 384-dimensional dense vectors using `all-MiniLM-L6-v2` in a Web Worker with TF-IDF fallback.

### 6. 🖋️ Resume Studio (Dual-Pane Code Editor)
- **Split View:** CodeMirror 6 with HTML & CSS syntax highlighting alongside live A4 preview.
- **In-Editor Data Inserter:** Browse Vault achievements, custom sections, and **⭐ Tailored Suggestions** from recent OpenRouter sessions to insert at cursor position.
- **On-Demand Google Fonts:** Curated ATS typefaces (*Computer Modern / LaTeX*, *Merriweather*, *EB Garamond*, *Lora*, *Inter*, *JetBrains Mono*, etc.).
- **Native Vector PDF Export:** Clean print engine export (`window.print()`) styled via `@page { size: A4; margin: 0; }`.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18** | UI component architecture and state management |
| **TypeScript** | Strict type safety for data models and schemas |
| **Vite** | Fast HMR dev server and optimized production bundler |
| **Tailwind CSS** | Clean, refined, high-contrast styling |
| **Dexie.js** | Typed client-side IndexedDB database |
| **OpenRouter Direct API** | Frontier LLM inference (Gemini, Llama, DeepSeek, Claude) with SSE streaming |
| **@xenova/transformers** | In-browser WebAssembly embedding model (`all-MiniLM-L6-v2`) |
| **@uiw/react-codemirror** | In-browser code editor with HTML & CSS language servers |
| **PapaParse** | High-performance client-side CSV parser |
| **Lucide React** | Clean, minimalist icon system |

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended, v20+ supported)
- npm, pnpm, or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/resume-up.git
cd resume-up

# Install dependencies
npm install
```

### Running Locally
```bash
# Start development server
npm run dev

# Open your browser at http://localhost:5173
```

### Building for Production
```bash
# Build static bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📖 Specifications & Roadmap

- **[OPENROUTER_SPEC.md](file:///Users/shreyas/projects/resume-up-v1/OPENROUTER_SPEC.md)**: Technical specification for direct client-side OpenRouter AI integration (BYOK, model matrix, bidirectional privacy masking engine, and 4-stage cognitive reasoning pipeline).
- **[OPENROUTER_PLAN.md](file:///Users/shreyas/projects/resume-up-v1/OPENROUTER_PLAN.md)**: Actionable 6-phase implementation roadmap, module breakdown, and verification criteria for OpenRouter integration.
- **[TECH_SPEC.md](file:///Users/shreyas/projects/resume-up-v1/TECH_SPEC.md)**: Core web architecture, IndexedDB schema, and client-side embedding matcher.
- **[TODO.md](file:///Users/shreyas/projects/resume-up-v1/TODO.md)**: Feature roadmap and release changelog.

---

## 🔒 Privacy Guarantee

1. **No Intermediate Servers:** All network requests to OpenRouter go directly from your browser to `https://openrouter.ai/api/v1/` using your personal API key over encrypted HTTPS.
2. **Client-Side Privacy Masking:** Company names, dates, contact details, and custom blacklisted terms are redacted *before* sending and rehydrated locally upon response.
3. **Local Storage:** Your API key and all career data are stored exclusively in your browser's local IndexedDB.
4. **Zero Telemetry:** No third-party trackers, analytics scripts, or cookies are loaded.
5. **Local PDF Generation:** PDFs are generated locally by your browser's print engine.

---

## 📄 License

MIT License. Free to use, modify, and deploy for personal or commercial projects.
