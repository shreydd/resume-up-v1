import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ResumeData } from '../types';
import { ResumePDFDocument } from '../components/ResumePDF/ResumePDFDocument';

/**
 * Extracts structured data from the live HTML in the dual-pane editor
 * to ensure that any edits typed into the CodeMirror editor are reflected in the PDF.
 */
export function parseResumeHTML(html: string, fallbackData?: ResumeData | null): ResumeData {
  if (typeof window === 'undefined' || !html || !html.trim()) {
    return fallbackData || createEmptyResumeData();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Profile
    const nameEl = doc.querySelector('.minimal-name, .name, h1');
    const headlineEl = doc.querySelector('.minimal-title, .headline');
    const contactContainer = doc.querySelector('.minimal-contact, .contact-bar');

    const rawFullName = nameEl ? nameEl.textContent?.trim() || '' : fallbackData?.profile?.fullName || '';
    const fullName = rawFullName.replace(/\s+/g, ' ');

    const rawHeadline = headlineEl ? headlineEl.textContent?.trim() || '' : fallbackData?.profile?.headline || '';
    const headline = rawHeadline.replace(/\s+/g, ' ');

    let email = fallbackData?.profile?.email || '';
    let phone = fallbackData?.profile?.phone || '';
    let location = fallbackData?.profile?.location || '';
    let linkedin = fallbackData?.profile?.linkedin || '';
    let github = fallbackData?.profile?.github || '';
    let website = fallbackData?.profile?.website || '';

    if (contactContainer) {
      const links = Array.from(contactContainer.querySelectorAll('a'));
      const spans = Array.from(contactContainer.querySelectorAll('span'));

      for (const a of links) {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.trim() || '';
        if (href.startsWith('mailto:') || text.includes('@')) {
          email = text.replace(/^mailto:/i, '');
        } else if (href.includes('linkedin.com') || text.includes('linkedin.com')) {
          linkedin = text;
        } else if (href.includes('github.com') || text.includes('github.com')) {
          github = text;
        } else if (text) {
          website = text;
        }
      }

      for (const span of spans) {
        const text = span.textContent?.trim() || '';
        // If it looks like a phone number
        if (/[\d\+\(\)\-]{7,}/.test(text)) {
          phone = text;
        } else if (text && text !== email && text !== phone) {
          location = text;
        }
      }
    }

    // 2. Sections
    const sections = Array.from(doc.querySelectorAll('section, .section, .minimal-section'));
    const experiences: ResumeData['experiences'] = [];
    const education: ResumeData['education'] = [];
    const skills: ResumeData['skills'] = [];
    const certifications: ResumeData['certifications'] = [];
    const customSections: NonNullable<ResumeData['customSections']> = [];

    for (const sec of sections) {
      const headingEl = sec.querySelector('h2, .section-title, .minimal-heading');
      const headingText = headingEl ? headingEl.textContent?.trim().toUpperCase() || '' : '';

      // Experience Section
      if (headingText.includes('EXPERIENCE') || headingText.includes('WORK HISTORY')) {
        const entries = Array.from(sec.querySelectorAll('.minimal-entry, .entry-block'));
        for (const entry of entries) {
          const roleEl = entry.querySelector('.primary-text, .role, strong');
          const metaEl = entry.querySelector('.meta-text, .dates');
          const companyEl = entry.querySelector('.secondary-text, .company, em');
          const bulletEls = Array.from(entry.querySelectorAll('li'));

          const role = roleEl ? roleEl.textContent?.trim() || '' : '';
          const rawDates = metaEl ? metaEl.textContent?.trim() || '' : '';
          const [startDate, endDate] = rawDates.split(/—|-|–/).map(s => s.trim());
          const companyLoc = companyEl ? companyEl.textContent?.trim() || '' : '';
          const [company, ...locParts] = companyLoc.split(/·|\|/).map(s => s.trim());

          const achievements = bulletEls.map((b, idx) => ({
            id: `ach-${idx}-${Date.now()}`,
            experienceId: `exp-${experiences.length}`,
            originalText: b.textContent?.trim() || ''
          })).filter(a => a.originalText.length > 0);

          if (role || company || achievements.length > 0) {
            experiences.push({
              experience: {
                id: `exp-${experiences.length}`,
                company: company || 'Company',
                role: role || 'Role',
                location: locParts.join(' · '),
                startDate: startDate || '',
                endDate: endDate || '',
                isCurrent: endDate ? endDate.toLowerCase().includes('present') : false
              },
              achievements
            });
          }
        }
      }
      // Education Section
      else if (headingText.includes('EDUCATION')) {
        const entries = Array.from(sec.querySelectorAll('.minimal-entry, .entry-block'));
        for (const entry of entries) {
          const instEl = entry.querySelector('.primary-text, .institution, strong');
          const metaEl = entry.querySelector('.meta-text, .dates');
          const degreeEl = entry.querySelector('.secondary-text, .degree, em');

          const institution = instEl ? instEl.textContent?.trim() || '' : '';
          const rawDates = metaEl ? metaEl.textContent?.trim() || '' : '';
          const [startDate, endDate] = rawDates.split(/—|-|–/).map(s => s.trim());
          const degreeField = degreeEl ? degreeEl.textContent?.trim() || '' : '';
          const [degree, fieldOfStudy] = degreeField.split(/·|in/).map(s => s.trim());

          if (institution || degree) {
            education.push({
              id: `edu-${education.length}`,
              institution: institution || 'Institution',
              degree: degree || 'Degree',
              fieldOfStudy: fieldOfStudy || '',
              startDate: startDate || '',
              endDate: endDate || ''
            });
          }
        }
      }
      // Skills Section
      else if (headingText.includes('SKILL') || headingText.includes('COMPETENC')) {
        const skillRows = Array.from(sec.querySelectorAll('.skill-row, .skills-list li, li'));
        for (const row of skillRows) {
          const catEl = row.querySelector('.skill-cat, strong');
          const valEl = row.querySelector('.skill-val');

          let cat = catEl ? catEl.textContent?.replace(/:$/, '').trim() || '' : '';
          let names = '';
          if (valEl) {
            names = valEl.textContent?.trim() || '';
          } else {
            const raw = row.textContent?.trim() || '';
            const parts = raw.split(':');
            if (parts.length > 1) {
              cat = parts[0].trim();
              names = parts.slice(1).join(':').trim();
            } else {
              names = raw;
            }
          }

          if (cat || names) {
            skills.push({
              id: `skill-${skills.length}`,
              category: cat || 'General',
              name: names
            });
          }
        }
      }
      // Certifications Section
      else if (headingText.includes('CERTIFICATION')) {
        const certRows = Array.from(sec.querySelectorAll('li'));
        for (const row of certRows) {
          const nameEl = row.querySelector('.primary-text, strong');
          const certName = nameEl ? nameEl.textContent?.trim() || '' : '';
          const fullText = row.textContent?.trim() || '';

          // e.g. "AWS Solutions Architect — Amazon (2023)"
          let issuer = '';
          let issueDate = '';
          const parts = fullText.split(/—|-/);
          if (parts.length > 1) {
            const issuerPart = parts[1].trim();
            const dateMatch = issuerPart.match(/\(([^)]+)\)/);
            if (dateMatch) {
              issueDate = dateMatch[1];
              issuer = issuerPart.replace(/\([^)]+\)/, '').trim();
            } else {
              issuer = issuerPart;
            }
          }

          if (certName || fullText) {
            certifications.push({
              id: `cert-${certifications.length}`,
              name: certName || fullText,
              issuer: issuer || '',
              issueDate: issueDate || ''
            });
          }
        }
      }
      // Custom Sections (e.g. Projects, Leadership, Publications)
      else if (headingText) {
        const entries = Array.from(sec.querySelectorAll('.minimal-entry, .entry-block'));
        const items: NonNullable<ResumeData['customSections']>[number]['items'] = [];

        for (const entry of entries) {
          const strongEl = entry.querySelector('.primary-text strong, strong');
          const primaryEl = entry.querySelector('.primary-text');
          const metaEl = entry.querySelector('.meta-text, .dates');
          const subEl = entry.querySelector('.secondary-text, em');
          const descEl = entry.querySelector('.entry-desc, .project-desc, p');
          const bulletEls = Array.from(entry.querySelectorAll('li'));
          const linkEl = entry.querySelector('a');

          const url = linkEl ? linkEl.getAttribute('href') || '' : '';
          let title = '';
          if (strongEl) {
            title = strongEl.textContent?.trim() || '';
          } else if (primaryEl) {
            const clone = primaryEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('a').forEach(a => a.remove());
            title = clone.textContent?.replace(/\s*[|·•—\-]\s*$/, '').trim() || '';
          } else {
            const titleEl = entry.querySelector('.primary-text');
            title = titleEl ? titleEl.textContent?.trim() || '' : '';
          }

          if (url && title) {
            const cleanUrl = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            const escaped = cleanUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            title = title.replace(new RegExp(`\\s*[|·•—\\-]\\s*https?:?\\/?\\/?${escaped}\\/?`, 'gi'), '');
            title = title.replace(new RegExp(`\\s*[|·•—\\-]?\\s*${escaped}\\/?$`, 'gi'), '');
            title = title.trim();
          }

          // If title matches section title (e.g. Professional Summary), suppress redundant repetition
          const secTitleText = (headingEl?.textContent?.trim() || headingText).toLowerCase();
          if (title.toLowerCase() === secTitleText) {
            title = '';
          }

          const rawDates = metaEl ? metaEl.textContent?.trim() || '' : '';
          const [startDate, endDate] = rawDates.split(/—|-|–/).map(s => s.trim());
          const subtitle = subEl ? subEl.textContent?.trim() || '' : '';
          const description = descEl ? descEl.textContent?.trim() || '' : '';
          const bullets = bulletEls.map(b => b.textContent?.trim() || '').filter(Boolean);

          if (title || bullets.length > 0 || description || subtitle) {
            items.push({
              id: `custom-item-${items.length}`,
              sectionId: `sec-${customSections.length}`,
              title: title || '',
              subtitle,
              startDate,
              endDate,
              url,
              description,
              bullets
            });
          }
        }

        if (items.length > 0) {
          customSections.push({
            section: {
              id: `sec-${customSections.length}`,
              title: headingEl?.textContent?.trim() || headingText
            },
            items
          });
        }
      }
    }

    return {
      profile: {
        fullName,
        headline,
        email,
        phone,
        location,
        linkedin,
        github,
        website,
        preferredTemplate: fallbackData?.profile?.preferredTemplate || 'minimal'
      },
      experiences: experiences.length > 0 ? experiences : (fallbackData?.experiences || []),
      education: education.length > 0 ? education : (fallbackData?.education || []),
      skills: skills.length > 0 ? skills : (fallbackData?.skills || []),
      certifications: certifications.length > 0 ? certifications : (fallbackData?.certifications || []),
      customSections: customSections.length > 0 ? customSections : (fallbackData?.customSections || [])
    };
  } catch (err) {
    console.warn('Could not parse live HTML, falling back to structured data:', err);
    return fallbackData || createEmptyResumeData();
  }
}

function createEmptyResumeData(): ResumeData {
  return {
    profile: {
      fullName: 'Your Name',
      email: '',
      preferredTemplate: 'minimal'
    },
    experiences: [],
    education: [],
    skills: [],
    certifications: []
  };
}

/**
 * Generates an ATS-compliant PDF using @react-pdf/renderer and triggers a direct browser download.
 */
export async function exportResumeToPDF(options: {
  resumeData?: ResumeData | null;
  html?: string;
  filename?: string;
}): Promise<void> {
  const { resumeData, html, filename } = options;

  // Prefer parsing current live HTML if available so editor changes are preserved,
  // falling back to structured data.
  const finalData = html ? parseResumeHTML(html, resumeData) : (resumeData || createEmptyResumeData());

  const doc = React.createElement(ResumePDFDocument, { data: finalData });
  const blob = await pdf(doc as any).toBlob();

  // Create downloadable link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const defaultName = finalData.profile?.fullName
    ? `${finalData.profile.fullName.trim().replace(/\s+/g, '_')}_Resume.pdf`
    : 'Resume.pdf';

  a.download = filename || defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Release object URL
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}
