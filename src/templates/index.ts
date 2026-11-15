import { ResumeData } from '../types';
import { generateMinimalHTML, minimalCSS } from './minimal';

export interface TemplateDefinition {
  id: 'minimal' | 'custom';
  name: string;
  description: string;
  generateHTML: (data: ResumeData) => string;
  defaultCSS: string;
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  minimal: {
    id: 'minimal',
    name: "Modern Minimalist",
    description: "A clean, contemporary ATS-optimized layout with subtle divider lines and refined hierarchy.",
    generateHTML: generateMinimalHTML,
    defaultCSS: minimalCSS
  },
  custom: {
    id: 'custom',
    name: "Custom HTML / CSS",
    description: "Full dual-pane code editor control over the raw markup and styling.",
    generateHTML: generateMinimalHTML,
    defaultCSS: minimalCSS
  }
};

export function renderTemplate(templateId: 'minimal' | 'custom' | string, data: ResumeData): { html: string; css: string } {
  const t = TEMPLATES[templateId] || TEMPLATES.minimal;
  return {
    html: t.generateHTML(data),
    css: t.defaultCSS
  };
}
