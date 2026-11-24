import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { ResumeData } from '../../types';

// ATS-Optimized Helvetica Stylesheet
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#111827',
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#111827',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  headline: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#374151',
    lineHeight: 1.25,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    fontSize: 8.5,
    color: '#4B5563',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    color: '#2563EB',
    textDecoration: 'none',
  },
  separator: {
    color: '#9CA3AF',
    marginHorizontal: 3,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#000000',
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: '#D1D5DB',
    borderBottomStyle: 'solid',
    marginBottom: 6,
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  entry: {
    marginBottom: 7,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 1.5,
  },
  roleTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    lineHeight: 1.2,
  },
  metaDate: {
    fontSize: 8.5,
    color: '#4B5563',
    lineHeight: 1.2,
  },
  subRow: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#374151',
    lineHeight: 1.25,
    marginBottom: 3,
  },
  entryLink: {
    fontSize: 9,
    color: '#09090b',
    textDecoration: 'underline',
  },
  pipeSeparator: {
    fontSize: 9,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  bulletList: {
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingRight: 6,
  },
  bulletDot: {
    width: 10,
    fontSize: 8.5,
    color: '#111827',
  },
  bulletContent: {
    flex: 1,
    fontSize: 9,
    color: '#1F2937',
    lineHeight: 1.35,
  },
  skillRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 9,
  },
  skillCategory: {
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginRight: 4,
  },
  skillNames: {
    flex: 1,
    color: '#374151',
  },
  descText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
    lineHeight: 1.3,
  },
});

interface ResumePDFDocumentProps {
  data: ResumeData;
}

export const ResumePDFDocument: React.FC<ResumePDFDocumentProps> = ({ data }) => {
  const { profile, experiences, education, skills, certifications, customSections } = data;

  const contactLinks: { text: string; url?: string }[] = [];
  if (profile.email) {
    contactLinks.push({ text: profile.email, url: `mailto:${profile.email}` });
  }
  if (profile.phone) {
    contactLinks.push({ text: profile.phone });
  }
  if (profile.location) {
    contactLinks.push({ text: profile.location });
  }
  if (profile.linkedin) {
    const clean = profile.linkedin.replace(/^https?:\/\//i, '');
    contactLinks.push({ text: clean, url: `https://${clean}` });
  }
  if (profile.github) {
    const clean = profile.github.replace(/^https?:\/\//i, '');
    contactLinks.push({ text: clean, url: `https://${clean}` });
  }
  if (profile.website) {
    const clean = profile.website.replace(/^https?:\/\//i, '');
    contactLinks.push({ text: clean, url: `https://${clean}` });
  }

  return (
    <Document title={`${profile.fullName || 'Resume'} - ATS Optimized`} author={profile.fullName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{profile.fullName || 'Your Name'}</Text>
          {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
          <View style={styles.contactRow}>
            {contactLinks.map((item, idx) => (
              <View key={idx} style={styles.contactItem}>
                {item.url ? (
                  <Link src={item.url} style={styles.link}>
                    {item.text}
                  </Link>
                ) : (
                  <Text>{item.text}</Text>
                )}
                {idx < contactLinks.length - 1 && <Text style={styles.separator}>•</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* Experience */}
        {experiences && experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map(({ experience, achievements }) => {
              const dates = [
                experience.startDate,
                experience.endDate || (experience.isCurrent ? 'Present' : '')
              ].filter(Boolean).join(' — ');

              return (
                <View key={experience.id} style={styles.entry} wrap={false}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.roleTitle}>{experience.role}</Text>
                    {dates ? <Text style={styles.metaDate}>{dates}</Text> : null}
                  </View>
                  <Text style={styles.subRow}>
                    {experience.company}
                    {experience.location ? ` · ${experience.location}` : ''}
                  </Text>
                  {achievements && achievements.length > 0 && (
                    <View style={styles.bulletList}>
                      {achievements.map((ach) => (
                        <View key={ach.id} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletContent}>{ach.originalText}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Custom Sections (e.g. Projects) */}
        {customSections && customSections.length > 0 && (
          <>
            {customSections.map(({ section, items }) => {
              if (!items || items.length === 0) return null;
              return (
                <View key={section.id} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title || 'Custom Section'}</Text>
                  {items.map((item) => {
                    const rawBullets = Array.isArray(item.bullets)
                      ? item.bullets
                      : typeof item.bullets === 'string'
                      ? [item.bullets]
                      : [];
                    const bullets = rawBullets
                      .map((b) => (typeof b === 'string' ? b.trim() : (b as any)?.text || ''))
                      .filter(Boolean);
                    const dates = [item.startDate, item.endDate].filter(Boolean).join(' — ');

                    const rawUrl = item.url ? item.url.trim() : '';
                    const href = rawUrl
                      ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('mailto:') ? rawUrl : 'https://' + rawUrl)
                      : '';
                    const displayUrl = rawUrl ? rawUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

                    let cleanTitle = item.title ? item.title.trim() : '';
                    if (displayUrl) {
                      const escaped = displayUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      cleanTitle = cleanTitle.replace(new RegExp(`\\s*[|·•—\\-]\\s*https?:?\\/?\\/?${escaped}\\/?`, 'gi'), '');
                      cleanTitle = cleanTitle.replace(new RegExp(`\\s*[|·•—\\-]?\\s*${escaped}\\/?$`, 'gi'), '');
                      cleanTitle = cleanTitle.trim();
                    }

                    // Suppress title if it's identical to the section title (e.g. "Professional Summary" under "Professional Summary")
                    const sectionTitleText = (section.title || '').trim().toLowerCase();
                    if (cleanTitle.toLowerCase() === sectionTitleText) {
                      cleanTitle = '';
                    }

                    const hasHeaderRow = Boolean(cleanTitle || displayUrl || dates);

                    return (
                      <View key={item.id} style={styles.entry} wrap={false}>
                        {hasHeaderRow ? (
                          <View style={styles.rowBetween}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', flex: 1 }}>
                              {cleanTitle ? <Text style={styles.roleTitle}>{cleanTitle}</Text> : null}
                              {displayUrl ? (
                                <>
                                  {cleanTitle ? <Text style={styles.pipeSeparator}>|</Text> : null}
                                  <Link src={href} style={styles.entryLink}>
                                    {displayUrl}
                                  </Link>
                                </>
                              ) : null}
                            </View>
                            {dates ? <Text style={styles.metaDate}>{dates}</Text> : null}
                          </View>
                        ) : null}
                        {item.subtitle ? <Text style={styles.subRow}>{item.subtitle}</Text> : null}
                        {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
                        {bullets.length > 0 && (
                          <View style={styles.bulletList}>
                            {bullets.map((bullet, bIdx) => (
                              <View key={bIdx} style={styles.bulletRow}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.bulletContent}>{bullet}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu) => {
              const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' — ');
              return (
                <View key={edu.id} style={styles.entry} wrap={false}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.roleTitle}>{edu.institution}</Text>
                    {dates ? <Text style={styles.metaDate}>{dates}</Text> : null}
                  </View>
                  <Text style={styles.subRow}>
                    {edu.degree}
                    {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Competencies</Text>
            {skills.map((s) => (
              <View key={s.id} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{s.category}:</Text>
                <Text style={styles.skillNames}>{s.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.map((c) => (
              <View key={c.id} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletContent}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{c.name}</Text>
                  {` — ${c.issuer}`}
                  {c.issueDate ? ` (${c.issueDate})` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};
