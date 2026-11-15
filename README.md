# resume-up 📄⚡

> **100% Client-Side, Privacy-First Career Vault & ATS Resume Tailor.**  
> Zero backend servers. Zero cloud databases. Zero telemetry. True browser privacy.

---

## 🌟 Executive Summary

**`resume-up`** is designed for software engineers, tech professionals, and creators who want total ownership of their career records. Instead of uploading your personal career history, contact details, and employer data to third-party cloud servers, `resume-up` runs **100% locally in your browser**.

- **Master Career Vault:** Store unlimited work experiences, quantified achievements, education, technical skills, and certifications directly in browser **IndexedDB**.
- **In-Browser Semantic Matcher:** Powered by `@xenova/transformers` running `all-MiniLM-L6-v2` via WebAssembly (WASM) in a Web Worker, paired with an instant keyword-overlap and TF-IDF scoring fallback.
- **Curated ATS Templates:** Industry-standard **Jake's Resume** (LaTeX-style typography, high-density format) and **Modern Minimalist Tech**.
- **Live Dual-Pane Editor:** Real-time CodeMirror HTML/CSS editor alongside debounced, pixel-perfect A4 live sheet rendering.
- **On-Demand Google Fonts:** Professional ATS typography (*Merriweather*, *EB Garamond*, *Lora*, *Inter*, *Plus Jakarta Sans*, *JetBrains Mono*, etc.) dynamically loaded on-demand without initial page bloat.
- **In-Editor Career Vault Inserter:** Double-click or click "Insert from DB" in the editor to search and insert achievements, job blocks, or skills at the cursor position.
- **Native Vector PDF Export:** Clean print engine export (`window.print()`) styled via `@page { size: A4; margin: 0; }` with zero duplicate pages, timestamps, URLs, or browser headers.
- **Desktop & Laptop Guard:** Dedicated screen guard overlay enforcing desktop/laptop viewports (≥ 1024px) for precision dual-pane editing and A4 document compilation.

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
│  │  │ Master Brain │  │   Semantic Matcher    │  │ Dual-Pane /   │  │  │
│  │  │ (Forms, CSV, │  │ (all-MiniLM-L6-v2)    │  │ Studio View   │  │  │
│  │  │  JSON Import)│  │  Web Worker / WASM    │  │ [Code | View] │  │  │
│  │  └──────┬───────┘  └───────────┬───────────┘  └───────┬───────┘  │  │
│  └─────────┼──────────────────────┼──────────────────────┼──────────┘  │
│            │                      │                      │             │
│            ▼                      ▼                      ▼             │
│     IndexedDB Storage     384-dim Embeddings      Native Browser       │
│     (via Dexie.js)        (In-memory Cosine)       Print Engine        │
│                                                   (window.print)       │
│                                                          │             │
└──────────────────────────────────────────────────────────┼─────────────┘
                                                           ▼
                                                Vector ATS-Friendly PDF
```

---

## 🚀 Key Features

### 1. 🗄️ Career Vault (Local IndexedDB)
- **Profile:** Full name, title, contact info, LinkedIn, GitHub, and portfolio links.
- **Experiences & Impact Bullets:** Full history with company, role, dates, location, and categorized achievements (Backend, Frontend, DevOps, Leadership, Security, Performance).
- **Education, Skills & Certifications:** Categorized tools and verified credentials.
- **Data Portability:**
  - **1-Click Sample Data:** Load Alex Mercer's complete career profile instantly.
  - **CSV Spreadsheet Import/Export:** Import from Google Sheets / Excel via `PapaParse`.
  - **JSON Backup:** Full database backup and restore for cross-device migration.

### 2. 🧠 AI Semantic Matcher (WASM & Fallback)
- **Job Description Chunking:** Breaks target JDs into discrete requirement statements.
- **Vector Cosine Similarity:** Computes 384-dimensional dense vectors using `all-MiniLM-L6-v2` inside a Web Worker.
- **Smart Token & Keyword Fallback:** Instant TF-IDF and keyword matching so the app works immediately, even offline or while the WASM model downloads.
- **Match Breakdown:** Visual match badges (`92% match`), extracted keyword chips (`kafka`, `redis`, `latency`), and individual bullet selection controls before compiling.

### 3. 🖋️ Resume Studio (Dual-Pane Code Editor)
- **Split View:** Left pane features CodeMirror 6 with HTML & CSS syntax highlighting, line numbers, and dark theme (`oneDark`). Right pane displays the live A4 preview.
- **Smart Zoom & Fit:** Zoom stepper (`-`, `+`), preset `100%`, and an auto-calculating **"Fit"** button that scales the document cleanly to the container width.
- **Independent Scrolling:** Fixed container bounds prevent layout clipping, allowing full vertical and horizontal scrolling across thousands of lines of code and the entire A4 sheet.

### 4. 🔤 On-Demand Google Fonts
- Curated selection of ATS-optimized typefaces:
  - **Traditional & Academic Serif:** *Computer Modern (LaTeX)*, *Merriweather*, *EB Garamond*, *Lora*, *Source Serif 4*.
  - **Modern Tech & Corporate Sans:** *Inter*, *Roboto*, *Plus Jakarta Sans*, *Lato*, *Source Sans 3*.
  - **Engineering & Systems Mono:** *JetBrains Mono*.
- Injected on selection into the document `<head>` and compiled into `@import` CSS rules for instant live preview and vector PDF rendering.

### 5. ➕ In-Editor Data Inserter
- Click **"Insert from DB"** in the editor toolbar or **double-click** inside the editor to browse your Career Vault.
- Filter by *Achievements*, *Job Blocks*, *Skills*, *Education*, or *Profile*.
- Insert as semantic HTML (`<li>...</li>`, `<div class="entry-block">...</div>`) or raw text directly at the cursor position.

### 6. 🖨️ Vector ATS PDF Export
- Strips browser timestamps, URLs, titles, and page numbers via `@page { size: A4; margin: 0; }`.
- Automatically hides all navigation, toolbars, and editor panes with `.no-print`.
- Renders exactly one vector sheet per page with page-break protection (`break-inside: avoid`).

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18** | UI component architecture and state management |
| **TypeScript** | Strict type safety for data models and schemas |
| **Vite** | Fast HMR dev server and optimized production bundler |
| **Tailwind CSS** | Clean, refined, high-contrast styling |
| **Dexie.js** | Typed client-side IndexedDB wrapper |
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

## 📁 Project Structure

```
resume-up/
├── sample_data/
│   ├── career_template.csv     # Master career spreadsheet template
│   └── career_template.json    # Full vault JSON export format
├── src/
│   ├── components/
│   │   ├── CareerVault/        # Vault management (profile, roles, skills, CSV/JSON)
│   │   ├── Header.tsx          # Top navigation & AI worker status badge
│   │   ├── ResumeStudio/       # Dual-pane editor, font selector, vault inserter
│   │   │   ├── fontOptions.ts  # Curated Google Fonts & on-demand injector
│   │   │   ├── InsertVaultDataModal.tsx # In-editor vault search & insert popup
│   │   │   └── ResumeStudioView.tsx     # CodeMirror + Live A4 preview
│   │   ├── SavedResumes/       # Tailored resumes history & quick print
│   │   ├── Shared/Modal.tsx    # Accessible modal dialog primitive
│   │   └── TailorAI/           # Job Description input & ranking breakdown
│   ├── db/
│   │   └── index.ts            # Dexie.js database schema & import/export helpers
│   ├── services/
│   │   └── semanticMatcher.ts  # Cosine similarity & keyword overlap matcher
│   ├── templates/
│   │   ├── index.ts            # Template registry
│   │   ├── jake.ts             # Jake's Resume (classic LaTeX ATS template)
│   │   └── minimal.ts          # Modern Minimalist Tech template
│   ├── types/
│   │   └── index.ts            # TypeScript definitions (Profile, Experience, etc.)
│   ├── workers/
│   │   └── embedding.worker.ts # Web Worker running @xenova/transformers WASM
│   ├── App.tsx                 # Root coordinator & laptop viewport screen guard
│   ├── index.css               # Print stylesheet & CodeMirror scrolling fixes
│   └── main.tsx                # React DOM entry
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Privacy Guarantee

1. **No External Requests for Data:** Your career records, contact numbers, email addresses, and employment dates are stored exclusively in your browser's IndexedDB.
2. **Zero Analytics / Tracking:** No third-party trackers, telemetry, or user analytics scripts are loaded.
3. **Local Machine Learning:** Embeddings and cosine similarity calculations run entirely client-side via WebAssembly.
4. **Local PDF Generation:** PDFs are generated locally by your browser's print engine without passing through external PDF rendering servers.

---

## 📄 License

MIT License. Free to use, modify, and deploy for personal or commercial projects.
