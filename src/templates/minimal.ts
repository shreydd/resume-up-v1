import { ResumeData } from '../types';

export function generateMinimalHTML(data: ResumeData): string {
  const { profile, experiences, education, skills, certifications, customSections } = data;

  const contactItems: string[] = [];
  if (profile.email) contactItems.push(`<a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>`);
  if (profile.phone) contactItems.push(`<span>${escapeHtml(profile.phone)}</span>`);
  if (profile.location) contactItems.push(`<span>${escapeHtml(profile.location)}</span>`);
  if (profile.linkedin) {
    const cleanUrl = profile.linkedin.replace(/^https?:\/\//, '');
    contactItems.push(`<a href="https://${cleanUrl}" target="_blank" rel="noreferrer">${escapeHtml(cleanUrl)}</a>`);
  }
  if (profile.github) {
    const cleanUrl = profile.github.replace(/^https?:\/\//, '');
    contactItems.push(`<a href="https://${cleanUrl}" target="_blank" rel="noreferrer">${escapeHtml(cleanUrl)}</a>`);
  }
  if (profile.website) {
    const cleanUrl = profile.website.replace(/^https?:\/\//, '');
    contactItems.push(`<a href="https://${cleanUrl}" target="_blank" rel="noreferrer">${escapeHtml(cleanUrl)}</a>`);
  }

  const educationHtml = education.length > 0 ? `
    <section class="minimal-section">
      <h2 class="minimal-heading">Education</h2>
      ${education.map(edu => `
        <div class="minimal-entry">
          <div class="entry-top">
            <span class="primary-text">${escapeHtml(edu.institution)}</span>
            <span class="meta-text">${escapeHtml([edu.startDate, edu.endDate].filter(Boolean).join(' — '))}</span>
          </div>
          <div class="entry-sub">
            <span class="secondary-text">${escapeHtml(edu.degree)}${edu.fieldOfStudy ? ` · ${escapeHtml(edu.fieldOfStudy)}` : ''}</span>
          </div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const experienceHtml = experiences.length > 0 ? `
    <section class="minimal-section">
      <h2 class="minimal-heading">Experience</h2>
      ${experiences.map(({ experience, achievements }) => `
        <div class="minimal-entry experience-block">
          <div class="entry-top">
            <span class="primary-text">${escapeHtml(experience.role)}</span>
            <span class="meta-text">${escapeHtml([experience.startDate, experience.endDate || (experience.isCurrent ? 'Present' : '')].filter(Boolean).join(' — '))}</span>
          </div>
          <div class="entry-sub">
            <span class="secondary-text">${escapeHtml(experience.company)}${experience.location ? ` · ${escapeHtml(experience.location)}` : ''}</span>
          </div>
          ${achievements.length > 0 ? `
            <ul class="minimal-bullets">
              ${achievements.map(ach => `<li>${escapeHtml(ach.originalText)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const skillsHtml = skills.length > 0 ? `
    <section class="minimal-section">
      <h2 class="minimal-heading">Skills & Competencies</h2>
      <div class="minimal-skills">
        ${skills.map(s => `
          <div class="skill-row">
            <span class="skill-cat">${escapeHtml(s.category)}:</span>
            <span class="skill-val">${escapeHtml(s.name)}</span>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certificationsHtml = certifications.length > 0 ? `
    <section class="minimal-section">
      <h2 class="minimal-heading">Certifications</h2>
      <div class="minimal-certs">
        <ul class="minimal-bullets">
          ${certifications.map(c => `
            <li>
              <span class="primary-text">${escapeHtml(c.name)}</span> — ${escapeHtml(c.issuer)}${c.issueDate ? ` (${escapeHtml(c.issueDate)})` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    </section>
  ` : '';

  const customSectionsHtml = (customSections || []).map(({ section, items }) => {
    if (!items || items.length === 0) return '';
    const sectionTitle = section?.title || 'Custom Section';
    return `
    <section class="minimal-section">
      <h2 class="minimal-heading">${escapeHtml(sectionTitle)}</h2>
      ${items.map(item => {
        const rawBullets = Array.isArray(item.bullets) 
          ? item.bullets 
          : (typeof item.bullets === 'string' ? [item.bullets] : []);
        
        let validBullets = rawBullets.map(b => {
          if (typeof b === 'string') return b.trim();
          if (typeof b === 'object' && b !== null) {
            return ((b as any).text || (b as any).originalText || (b as any).bullet || '').trim();
          }
          return String(b || '').trim();
        }).filter(b => b.length > 0);

        let descText = '';
        const rawDesc = item.description as any;
        if (typeof rawDesc === 'string') {
          descText = rawDesc.trim();
        } else if (Array.isArray(rawDesc)) {
          const extra = rawDesc.map((d: any) => String(d || '').trim()).filter(Boolean);
          if (validBullets.length === 0) {
            validBullets = extra;
          } else {
            validBullets = [...validBullets, ...extra];
          }
        }

        const rawUrl = item.url ? item.url.trim() : '';
        const href = rawUrl ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('mailto:') ? rawUrl : 'https://' + rawUrl) : '';
        const displayUrl = rawUrl ? rawUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
        const urlLink = href ? ` | <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer" class="entry-link">${escapeHtml(displayUrl)}</a>` : '';

        return `
        <div class="minimal-entry">
          <div class="entry-top">
            <span class="primary-text">
              <strong>${escapeHtml(item.title || '')}</strong>${urlLink}
            </span>
            <span class="meta-text">${escapeHtml([item.startDate, item.endDate].filter(Boolean).join(' — '))}</span>
          </div>
          ${item.subtitle ? `
            <div class="entry-sub">
              <span class="secondary-text"><em>${escapeHtml(item.subtitle)}</em></span>
            </div>
          ` : ''}
          ${descText ? `<p class="entry-desc">${escapeHtml(descText)}</p>` : ''}
          ${validBullets.length > 0 ? `
            <ul class="minimal-bullets">
              ${validBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        `;
      }).join('')}
    </section>
    `;
  }).join('');

  return `
<div class="resume-sheet minimal-template">
  <header class="minimal-header">
    <h1 class="minimal-name">${escapeHtml(profile.fullName || 'Your Name')}</h1>
    ${profile.headline ? `<div class="minimal-title">${escapeHtml(profile.headline)}</div>` : ''}
    <div class="minimal-contact">
      ${contactItems.join(' • ')}
    </div>
  </header>

  ${experienceHtml}
  ${customSectionsHtml}
  ${educationHtml}
  ${skillsHtml}
  ${certificationsHtml}
</div>
  `.trim();
}

export const minimalCSS = `
/* Modern Minimalist Tech Template */
.minimal-template {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #18181b;
  background-color: #fff;
  font-size: 10pt;
  line-height: 1.45;
  padding: 16mm 18mm;
  box-sizing: border-box;
}

.minimal-template a {
  color: #09090b;
  text-decoration: underline;
  text-decoration-color: #d4d4d8;
  text-underline-offset: 2px;
}

.minimal-template a:hover {
  text-decoration-color: #18181b;
}

.minimal-header {
  border-bottom: 2px solid #18181b;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.minimal-name {
  font-size: 20pt;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #09090b;
  margin: 0 0 4px 0;
}

.minimal-title {
  font-size: 11pt;
  font-weight: 500;
  color: #52525b;
  margin-bottom: 6px;
}

.minimal-contact {
  font-size: 9pt;
  color: #71717a;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.minimal-section {
  margin-bottom: 12px;
}

.minimal-heading {
  font-size: 10.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #09090b;
  margin: 10px 0 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  break-after: avoid !important;
  page-break-after: avoid !important;
}

.minimal-heading::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #e4e4e7;
}

.minimal-entry {
  margin-bottom: 9px;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.entry-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.entry-top .primary-text {
  font-weight: 600;
  color: #09090b;
  font-size: 10pt;
}

.entry-top .meta-text {
  font-size: 9pt;
  color: #71717a;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.entry-sub {
  margin-top: 1px;
}

.entry-sub .secondary-text {
  font-size: 9.5pt;
  color: #52525b;
}

.entry-desc {
  margin: 3px 0 4px 0;
  font-size: 9.5pt;
  color: #3f3f46;
  line-height: 1.4;
}

.entry-link {
  font-size: 8.5pt;
  font-weight: normal;
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.minimal-bullets {
  margin: 3px 0 0 0;
  padding-left: 16px;
  list-style-type: square;
}

.minimal-bullets li {
  margin-bottom: 2.5px;
  font-size: 9.5pt;
  color: #27272a;
  line-height: 1.4;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.minimal-skills {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 9.5pt;
}

.skill-row {
  display: flex;
  gap: 6px;
}

.skill-cat {
  font-weight: 600;
  color: #09090b;
  min-width: 130px;
}

.skill-val {
  color: #3f3f46;
}
`.trim();

function escapeHtml(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  if (typeof val === 'object') {
    const text = val.text ?? val.originalText ?? val.bullet ?? val.title ?? val.name ?? '';
    if (text) return escapeHtml(text);
    return '';
  }
  return escapeHtml(String(val));
}
