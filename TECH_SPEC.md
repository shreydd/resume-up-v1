# Technical Specification: resume-up (Client-Side Web App / PWA)

**Version:** 1.0 (Static Client-Side MVP)  
**Philosophy:** 100% Client-side, zero backend servers, zero native binaries, local IndexedDB storage, client-side ML matching, and true browser privacy.  
**Deployment Targets:** Any modern web browser (Chrome, Safari, Edge, Firefox), installable as a Desktop/Mobile PWA.

---

## 1. Executive Summary

`resume-up` is a privacy-first, 100% client-side web application designed to store a user's entire career history (experiences, achievements, skills, education, certifications). 

All data is stored directly in the user's browser using **IndexedDB**—no personal data ever leaves the user's device. 

When a user pastes a target Job Description (JD), an in-browser WebAssembly embedding model scores and matches the most relevant achievements from their career vault. The matched achievements are compiled into the industry-standard **Jake's Resume** template or edited in a **Live Dual-Pane Editor** (HTML/CSS code on the left, live preview on the right). The user can tweak styling and export an ATS-friendly, vector PDF via the browser's native print engine (`window.print()`).

---

## 2. Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CLIENT-SIDE BROWSER / PWA                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               REACT 18 + TYPESCRIPT + VITE + TAILWIND            │  │
│  │                                                                  │  │
│  │  ┌──────────────┐  ┌───────────────────────┐  ┌───────────────┐  │  │
│  │  │ Master Brain │  │   Semantic Matcher    │  │ Dual-Pane /   │  │  │
│  │  │ (Forms, CSV, │  │ (all-MiniLM-L6-v2)    │  │ Preset View   │  │  │
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

* **Frontend Framework:** React 18+, Vite, TypeScript.
* **Styling:** Tailwind CSS. Native HTML controls (`<dialog>`, `<select>`, `<button>`) for minimal bundle size.
* **Database & Persistence:** **IndexedDB** via `Dexie.js` (a typed, zero-overhead client-side database).
* **In-Browser ML:** `@xenova/transformers` running `all-MiniLM-L6-v2` inside a Web Worker via WebAssembly. Fast, offline-capable, ~23MB footprint.
* **Code Editor:** `@uiw/react-codemirror` (HTML & CSS syntax highlighting, ~300KB).
* **PDF Export:** Native browser print engine (`window.print()`) styled via `@media print` and `@page` CSS rules.
* **Hosting:** 100% static files. Deployable to GitHub Pages, Cloudflare Pages, Vercel, or Netlify at $0 cost.

---

## 3. Database Schema (IndexedDB via Dexie.js)

IndexedDB stores all records directly on the user's local disk inside the browser.

```typescript
import Dexie, { Table } from 'dexie';

export interface Profile {
  id?: number; // Primary key (singleton = 1)
  fullName: string;
  headline?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  preferredTemplate: 'jake' | 'minimal' | 'custom';
}

export interface Experience {
  id: string; // UUID v4
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface Achievement {
  id: string; // UUID v4
  experienceId: string; // Foreign key referencing Experience.id
  originalText: string;
  category?: string;
  embedding?: number[]; // 384-dimensional dense vector
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface Skill {
  id: string;
  category: string; // e.g., 'Languages', 'Frameworks', 'Tools'
  name: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  url?: string;
}

export interface TailoredResume {
  id: string;
  title: string;
  jobDescription: string;
  templateId: 'jake' | 'minimal' | 'custom';
  rawHtml: string;
  rawCss: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CareerVaultDB extends Dexie {
  profile!: Table<Profile, number>;
  experiences!: Table<Experience, string>;
  achievements!: Table<Achievement, string>;
  education!: Table<Education, string>;
  skills!: Table<Skill, string>;
  certifications!: Table<Certification, string>;
  tailoredResumes!: Table<TailoredResume, string>;

  constructor() {
    super('ResumeUpCareerVault');
    this.version(1).stores({
      profile: '++id',
      experiences: 'id, company, role, startDate',
      achievements: 'id, experienceId, category',
      education: 'id, institution',
      skills: 'id, category, name',
      certifications: 'id, name',
      tailoredResumes: 'id, templateId, createdAt, updatedAt'
    });
  }
}

export const db = new CareerVaultDB();
```

---

## 4. Ingestion Engine: CSV & JSON Templates

To allow rapid onboarding without requiring any backend servers:
1. **Interactive UI Forms** for direct manual entry and management.
2. **CSV Spreadsheet Import:** Users fill out a simple spreadsheet (Google Sheets or Excel), export to CSV, and drag-and-drop it into the app.
3. **JSON Vault Export/Import:** One-click download of all IndexedDB tables as `career_vault.json` for backup and device migration.

### Master CSV Format
```csv
Company,Role,Location,StartDate,EndDate,Achievement,Category
Acme Corporation,Senior Software Engineer,"San Francisco, CA",2022-01,Present,"Architected high-throughput event processing pipeline handling 50M daily events using Kafka and Go.",Backend
Acme Corporation,Senior Software Engineer,"San Francisco, CA",2022-01,Present,"Reduced p99 API latency by 35% through Redis caching and PostgreSQL query optimization.",Performance
Starlight Systems,Full Stack Developer,"Austin, TX",2019-06,2021-12,"Built responsive React client dashboard adopted by 120,000 monthly active enterprise users.",Frontend
```

* **Ingestion Flow:**
  1. Frontend parses CSV with `PapaParse` directly in the browser.
  2. Groups rows by `(Company, Role, StartDate)`.
  3. Batch-inserts unique jobs into `experiences` and bullet points into `achievements` in IndexedDB.
  4. Dispatches new achievements to the Web Worker to compute 384-dimensional embeddings.

---

## 5. Semantic Matching & Tailoring Workflow

1. **Job Description Input:** User pastes the JD into a modal/screen.
2. **Chunking:** The app splits the JD into requirement sentences based on newlines, dashes, and punctuation.
3. **Vector Comparison (Client-Side WASM):**
   * The Web Worker runs `all-MiniLM-L6-v2` over each requirement.
   * Computes cosine similarity between each requirement and all achievements in IndexedDB.
4. **Draft Assembly:**
   * Selects the top 3–5 most relevant achievements per experience.
   * Injects the matched data into the user's preferred template (e.g., Jake's Resume HTML).
5. **Review & Customization:**
   * User reviews the rendered page directly OR switches to **Split View** to tweak the raw HTML/CSS.
6. **Export:**
   * User clicks **"Export PDF"**, which triggers `window.print()` with `@media print` rules applied.

---

## 6. Curated Templates & Dual-Pane Custom View

### A. Preset Templates
* **Jake's Resume (Default):** The iconic, high-density LaTeX resume layout recreated in semantic HTML and CSS. (Centered contact bar, uppercase section headers with horizontal border lines, bold titles, right-aligned dates/locations).
* **Modern Minimalist Tech:** A contemporary single-column layout with inline skill badges.

### B. Custom HTML Layout (Dual-Pane Split View)
When the user selects **"Custom HTML Layout"** (or clicks "Inspect / Edit Code"):

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│        HTML / CSS CODE EDITOR         │          LIVE BROWSER PREVIEW         │
│  (Left Pane - @uiw/react-codemirror)  │        (Right Pane - Render Canvas)   │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ 1  <section class="section">          │                                       │
│ 2    <h2 class="section-title">       │  EXPERIENCE                           │
│ 3      EXPERIENCE                     │  ───────────────────────────────────  │
│ 4    </h2>                            │  Acme Corp            2022 - Present  │
│ 5    <div class="job">                │  Senior Software Eng  San Francisco   │
│ 6      <div class="job-header">       │  • Architected Kafka pipeline...      │
│ 7        <span class="role">...</span>│  • Reduced p99 latency by 35%...      │
│ 8      </div>                         │                                       │
│ 9      <ul>                           │                                       │
│ 10       <li>...</li>                 │                                       │
│ 11       <li>...</li>                 │                                       │
│ 12     </ul>                          │                                       │
│ 13   </div>                           │                                       │
│ 14 </section>                         │                                       │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

* **Left Pane (CodeMirror):** Full HTML and CSS source code with syntax highlighting.
* **Right Pane (Live Webview):** Real-time rendered preview of the A4 resume sheet (debounced live updates as you type).

---

## 7. Print Engine Setup

```css
/* Screen Preview Container */
.resume-sheet {
  width: 210mm;
  min-height: 297mm;
  background: white;
  margin: 0 auto;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  box-sizing: border-box;
  padding: 18mm 20mm;
}

/* Print & PDF Export Rules */
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .no-print {
    display: none !important; /* Hides code editor, navigation, buttons */
  }
  .resume-sheet {
    box-shadow: none !important;
    margin: 0 !important;
    width: 100% !important;
    min-height: auto !important;
    padding: 15mm 18mm !important;
  }
  .experience-block {
    break-inside: avoid; /* Prevents jobs from splitting awkwardly across pages */
  }
}
```

---

## 8. Step-by-Step Implementation Roadmap

* **Phase 1: Project Setup**
  * Scaffold Vite app: `npm create vite@latest resume-up -- --template react-ts`.
  * Install Tailwind CSS, `dexie`, `papaparse`, `@uiw/react-codemirror`, `@codemirror/lang-html`, `@codemirror/lang-css`.
* **Phase 2: IndexedDB & Career Vault UI**
  * Set up `src/db/index.ts` with Dexie schema.
  * Build Profile, Experience, Skills, and Education management screens.
  * Implement CSV & JSON import/export with downloadable template buttons.
* **Phase 3: In-Browser Semantic Matcher**
  * Install `@xenova/transformers`.
  * Create `src/workers/embedding.worker.ts`:
    * Load `all-MiniLM-L6-v2` via ONNX Runtime WebAssembly.
    * Handle embedding requests and return 384-dimensional vectors.
  * Persist embeddings in IndexedDB.
  * Build JD chunking and cosine similarity ranking functions.
* **Phase 4: Jake's Resume & Dual-Pane Editor**
  * Implement pixel-perfect HTML/CSS for **Jake's Resume**.
  * Build the dual-pane layout with CodeMirror on the left and live preview on the right.
* **Phase 5: Print Export & PWA Support**
  * Configure `@media print` rules.
  * Wire the "Export PDF" button to trigger `window.print()`.
  * Add PWA manifest and service worker (via `vite-plugin-pwa`) for offline support and "Install App" capability.
