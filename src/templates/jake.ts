import { ResumeData } from '../types';

export function generateJakeHTML(data: ResumeData): string {
  const { profile, experiences, education, skills, certifications, customSections } = data;

  const contactItems: string[] = [];
  if (profile.phone) contactItems.push(`<span>${escapeHtml(profile.phone)}</span>`);
  if (profile.email) contactItems.push(`<a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>`);
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
    <section class="section">
      <h2 class="section-title">EDUCATION</h2>
      ${education.map(edu => `
        <div class="entry-block">
          <div class="row-header">
            <span class="institution"><strong>${escapeHtml(edu.institution)}</strong></span>
            <span class="dates">${escapeHtml([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</span>
          </div>
          <div class="row-sub">
            <span class="degree"><em>${escapeHtml(edu.degree)}${edu.fieldOfStudy ? ` in ${escapeHtml(edu.fieldOfStudy)}` : ''}</em></span>
          </div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const experienceHtml = experiences.length > 0 ? `
    <section class="section">
      <h2 class="section-title">EXPERIENCE</h2>
      ${experiences.map(({ experience, achievements }) => `
        <div class="entry-block experience-block">
          <div class="row-header">
            <span class="company"><strong>${escapeHtml(experience.company)}</strong></span>
            <span class="location"><strong>${escapeHtml(experience.location || '')}</strong></span>
          </div>
          <div class="row-sub">
            <span class="role"><em>${escapeHtml(experience.role)}</em></span>
            <span class="dates"><em>${escapeHtml([experience.startDate, experience.endDate || (experience.isCurrent ? 'Present' : '')].filter(Boolean).join(' – '))}</em></span>
          </div>
          ${achievements.length > 0 ? `
            <ul class="bullet-list">
              ${achievements.map(ach => `<li>${escapeHtml(ach.originalText)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const skillsHtml = skills.length > 0 ? `
    <section class="section">
      <h2 class="section-title">TECHNICAL SKILLS</h2>
      <div class="skills-block">
        <ul class="skills-list">
          ${skills.map(s => `
            <li>
              <strong>${escapeHtml(s.category)}:</strong> ${escapeHtml(s.name)}
            </li>
          `).join('')}
        </ul>
      </div>
    </section>
  ` : '';

  const certificationsHtml = certifications.length > 0 ? `
    <section class="section">
      <h2 class="section-title">CERTIFICATIONS</h2>
      <div class="certifications-block">
        <ul class="bullet-list">
          ${certifications.map(c => `
            <li>
              <strong>${escapeHtml(c.name)}</strong> – ${escapeHtml(c.issuer)}${c.issueDate ? ` (${escapeHtml(c.issueDate)})` : ''}
              ${c.url ? ` <a href="${escapeHtml(c.url)}" target="_blank" class="cert-link">[Credential]</a>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    </section>
  ` : '';

  const customSectionsHtml = (customSections || []).map(({ section, items }) => {
    if (!items || items.length === 0) return '';
    return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(section.title.toUpperCase())}</h2>
      ${items.map(item => `
        <div class="entry-block">
          <div class="row-header">
            <span class="company">
              <strong>${escapeHtml(item.title)}</strong>
              ${item.subtitle ? ` | <em>${escapeHtml(item.subtitle)}</em>` : ''}
              ${item.url ? ` <a href="${escapeHtml(item.url)}" target="_blank" class="cert-link">[Link]</a>` : ''}
            </span>
            <span class="dates">${escapeHtml([item.startDate, item.endDate].filter(Boolean).join(' – '))}</span>
          </div>
          ${item.description ? `<p class="project-desc" style="margin: 2px 0 3px 0; font-size: 10pt; color: #333;">${escapeHtml(item.description)}</p>` : ''}
          ${item.bullets && item.bullets.length > 0 ? `
            <ul class="bullet-list">
              ${item.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
    `;
  }).join('');

  return `
<div class="resume-sheet jake-template">
  <header class="header">
    <h1 class="name">${escapeHtml(profile.fullName || 'Your Name')}</h1>
    ${profile.headline ? `<div class="headline">${escapeHtml(profile.headline)}</div>` : ''}
    <div class="contact-bar">
      ${contactItems.join(' | ')}
    </div>
  </header>

  ${educationHtml}
  ${experienceHtml}
  ${customSectionsHtml}
  ${skillsHtml}
  ${certificationsHtml}
</div>
  `.trim();
}

export const jakeCSS = `
/* Jake's Resume Template Styles - ATS Optimized */
.jake-template {
  font-family: 'Computer Modern Serif', 'Times New Roman', 'Cambria', Georgia, serif;
  color: #000;
  background-color: #fff;
  font-size: 10.5pt;
  line-height: 1.35;
  letter-spacing: normal;
  padding: 16mm 18mm;
  box-sizing: border-box;
}

.jake-template a {
  color: #000;
  text-decoration: none;
}

.jake-template a:hover {
  text-decoration: underline;
}

.jake-template .header {
  text-align: center;
  margin-bottom: 12px;
}

.jake-template .name {
  font-size: 22pt;
  font-weight: 700;
  margin: 0 0 2px 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.jake-template .headline {
  font-size: 10.5pt;
  font-style: italic;
  margin-bottom: 4px;
}

.jake-template .contact-bar {
  font-size: 9.5pt;
  margin-top: 2px;
}

.jake-template .contact-bar span,
.jake-template .contact-bar a {
  display: inline-block;
  margin: 0 3px;
}

.jake-template .section {
  margin-bottom: 12px;
}

.jake-template .section-title {
  font-size: 11pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid #000;
  margin: 0 0 6px 0;
  padding-bottom: 1px;
}

.jake-template .entry-block {
  margin-bottom: 8px;
  break-inside: avoid;
}

.jake-template .row-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10.5pt;
}

.jake-template .row-sub {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10pt;
  margin-top: 1px;
}

.jake-template .bullet-list {
  margin: 3px 0 0 0;
  padding-left: 18px;
  list-style-type: disc;
}

.jake-template .bullet-list li {
  margin-bottom: 2px;
  font-size: 10pt;
  text-align: justify;
}

.jake-template .skills-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.jake-template .skills-list li {
  margin-bottom: 3px;
  font-size: 10pt;
}

.jake-template .cert-link {
  font-size: 8.5pt;
  color: #333;
}
`.trim();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
