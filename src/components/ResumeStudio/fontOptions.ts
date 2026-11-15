export interface FontOption {
  id: string;
  name: string;
  category: 'Serif' | 'Sans-Serif' | 'Monospace';
  googleFontFamily: string;
  cssFamily: string;
  description: string;
}

export const CURATED_FONTS: FontOption[] = [
  // Serifs (ATS Classic / Academic)
  {
    id: 'computer-modern',
    name: 'Computer Modern (LaTeX)',
    category: 'Serif',
    googleFontFamily: '',
    cssFamily: "'Computer Modern Serif', 'Times New Roman', 'Cambria', Georgia, serif",
    description: 'Iconic academic LaTeX publication standard'
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'Serif',
    googleFontFamily: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700',
    cssFamily: "'Merriweather', Georgia, serif",
    description: 'Editorial serif designed for supreme readability'
  },
  {
    id: 'eb-garamond',
    name: 'EB Garamond',
    category: 'Serif',
    googleFontFamily: 'EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600',
    cssFamily: "'EB Garamond', 'Garamond', Georgia, serif",
    description: 'Classic humanist book serif, refined & timeless'
  },
  {
    id: 'lora',
    name: 'Lora',
    category: 'Serif',
    googleFontFamily: 'Lora:ital,wght@0,400;0,600;0,700;1,400;1,600',
    cssFamily: "'Lora', Georgia, serif",
    description: 'Contemporary serif with brushed calligraphic curves'
  },
  {
    id: 'source-serif-4',
    name: 'Source Serif 4',
    category: 'Serif',
    googleFontFamily: 'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400',
    cssFamily: "'Source Serif 4', Georgia, serif",
    description: 'Adobe professional serif standard for high density documents'
  },

  // Sans-Serif (Modern Tech & Corporate ATS Standards)
  {
    id: 'inter',
    name: 'Inter',
    category: 'Sans-Serif',
    googleFontFamily: 'Inter:wght@300;400;500;600;700',
    cssFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Modern tech industry gold standard for legibility'
  },
  {
    id: 'roboto',
    name: 'Roboto',
    category: 'Sans-Serif',
    googleFontFamily: 'Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400',
    cssFamily: "'Roboto', -apple-system, sans-serif",
    description: 'Clean neo-grotesque with geometric clarity'
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    category: 'Sans-Serif',
    googleFontFamily: 'Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400',
    cssFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    description: 'Crisp contemporary tech aesthetic'
  },
  {
    id: 'lato',
    name: 'Lato',
    category: 'Sans-Serif',
    googleFontFamily: 'Lato:ital,wght@0,300;0,400;0,700;1,400',
    cssFamily: "'Lato', -apple-system, sans-serif",
    description: 'Balanced humanist sans-serif with warm contours'
  },
  {
    id: 'source-sans-3',
    name: 'Source Sans 3',
    category: 'Sans-Serif',
    googleFontFamily: 'Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400',
    cssFamily: "'Source Sans 3', sans-serif",
    description: 'Executive corporate standard for business profiles'
  },

  // Monospace (Engineering & Systems)
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    category: 'Monospace',
    googleFontFamily: 'JetBrains+Mono:wght@400;500;700',
    cssFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
    description: 'Precision developer typeface for systems resumes'
  }
];

export function loadGoogleFontOnDemand(font: FontOption): void {
  if (typeof document === 'undefined') return;
  if (!font.googleFontFamily) return; // Local system font

  const linkId = `google-font-${font.id}`;
  if (document.getElementById(linkId)) return; // Already injected

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontFamily}&display=swap`;
  document.head.appendChild(link);
}

export function applyFontToCSS(css: string, font: FontOption): string {
  let updated = css;

  // 1. If it's a google font, add @import if not already present
  if (font.googleFontFamily) {
    const importStatement = `@import url('https://fonts.googleapis.com/css2?family=${font.googleFontFamily}&display=swap');\n`;
    if (!updated.includes(font.googleFontFamily)) {
      // Remove any prior Google Font @import
      updated = updated.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?[^']+'\);\n?/g, '');
      updated = importStatement + updated;
    }
  }

  // 2. Replace font-family inside template root class
  updated = updated.replace(/font-family:\s*[^;]+;/g, `font-family: ${font.cssFamily};`);

  return updated;
}
