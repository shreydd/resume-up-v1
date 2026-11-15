import { ResumeData } from '../types';
import { generateJakeHTML, jakeCSS } from './jake';
import { generateMinimalHTML, minimalCSS } from './minimal';

export interface TemplateDefinition {
  id: 'jake' | 'minimal' | 'custom';
  name: string;
  description: string;
  generateHTML: (data: ResumeData) => string;
  defaultCSS: string;
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  jake: {
    id: 'jake',
    name: "Jake's Resume",
    description: "The classic, ATS-optimized LaTeX layout with centered headers and serif typography.",
    generateHTML: generateJakeHTML,
    defaultCSS: jakeCSS
  },
  minimal: {
    id: 'minimal',
    name: "Modern Minimalist Tech",
    description: "A clean, contemporary sans-serif layout with subtle divider lines and refined hierarchy.",
    generateHTML: generateMinimalHTML,
    defaultCSS: minimalCSS
  },
  custom: {
    id: 'custom',
    name: "Custom HTML / CSS",
    description: "Full dual-pane code editor control over the raw markup and styling.",
    generateHTML: generateJakeHTML,
    defaultCSS: jakeCSS
  }
};

export function renderTemplate(templateId: 'jake' | 'minimal' | 'custom', data: ResumeData): { html: string; css: string } {
  const t = TEMPLATES[templateId] || TEMPLATES.jake;
  return {
    html: t.generateHTML(data),
    css: t.defaultCSS
  };
}
