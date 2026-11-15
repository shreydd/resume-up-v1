import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Experience, CustomSection, CustomSectionItem } from '../../types';
import { Modal } from '../Shared/Modal';
import { 
  Search, 
  Plus, 
  Briefcase, 
  Check, 
  Wrench, 
  GraduationCap, 
  User, 
  Tag, 
  Code,
  FileText,
  FolderPlus,
  ExternalLink
} from 'lucide-react';

interface InsertVaultDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

type TabType = 'achievements' | 'experiences' | 'custom' | 'skills' | 'education' | 'profile';

export const InsertVaultDataModal: React.FC<InsertVaultDataModalProps> = ({
  isOpen,
  onClose,
  onInsert
}) => {
  const experiences = useLiveQuery(() => db.experiences.toArray());
  const achievements = useLiveQuery(() => db.achievements.toArray());
  const skills = useLiveQuery(() => db.skills.toArray());
  const educations = useLiveQuery(() => db.education.toArray());
  const profileList = useLiveQuery(() => db.profile.toArray());
  const customSections = useLiveQuery(() => db.customSections?.toArray());
  const customItems = useLiveQuery(() => db.customSectionItems?.toArray());

  const profile = profileList?.[0];

  const [activeTab, setActiveTab] = useState<TabType>('achievements');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatMode, setFormatMode] = useState<'html' | 'raw'>('html');

  // Map of experience ID to experience for fast lookup
  const expMap = useMemo(() => {
    const map = new Map<string, Experience>();
    if (experiences) {
      for (const exp of experiences) {
        map.set(exp.id, exp);
      }
    }
    return map;
  }, [experiences]);

  // Map of section ID to custom section
  const sectionMap = useMemo(() => {
    const map = new Map<string, CustomSection>();
    if (customSections) {
      for (const s of customSections) {
        map.set(s.id, s);
      }
    }
    return map;
  }, [customSections]);

  // Filtered achievements & bullets (includes experiences and custom items like projects)
  const filteredAchievements = useMemo(() => {
    const list: Array<{
      id: string;
      text: string;
      sourceRole?: string;
      sourceEntity: string;
      category?: string;
    }> = [];

    if (achievements) {
      for (const ach of achievements) {
        const exp = expMap.get(ach.experienceId);
        list.push({
          id: ach.id,
          text: ach.originalText,
          sourceRole: exp?.role,
          sourceEntity: exp?.company || 'Experience',
          category: ach.category
        });
      }
    }

    if (customItems) {
      for (const it of customItems) {
        const sec = sectionMap.get(it.sectionId);
        const secName = sec?.title || 'Custom';
        
        if (it.description && it.description.trim()) {
          list.push({
            id: `custom-desc-${it.id}`,
            text: it.description.trim(),
            sourceRole: it.subtitle,
            sourceEntity: it.title,
            category: secName
          });
        }

        if (it.bullets && it.bullets.length > 0) {
          it.bullets.forEach((b, bIdx) => {
            if (b.trim()) {
              list.push({
                id: `custom-b-${it.id}-${bIdx}`,
                text: b.trim(),
                sourceRole: it.subtitle,
                sourceEntity: it.title,
                category: secName
              });
            }
          });
        }
      }
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => {
      return item.text.toLowerCase().includes(q) ||
        item.sourceEntity.toLowerCase().includes(q) ||
        (item.sourceRole && item.sourceRole.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
    });
  }, [achievements, expMap, customItems, sectionMap, searchQuery]);

  // Filtered experiences
  const filteredExperiences = useMemo(() => {
    if (!experiences) return [];
    return experiences.filter(exp => {
      return searchQuery === '' ||
        exp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.location && exp.location.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [experiences, searchQuery]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    return skills.filter(s => {
      return searchQuery === '' ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [skills, searchQuery]);

  // Filtered educations
  const filteredEducations = useMemo(() => {
    if (!educations) return [];
    return educations.filter(edu => {
      return searchQuery === '' ||
        edu.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        edu.degree.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (edu.fieldOfStudy && edu.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [educations, searchQuery]);

  // Filtered custom items
  const filteredCustomItems = useMemo(() => {
    if (!customItems) return [];
    return customItems.filter(it => {
      const sec = sectionMap.get(it.sectionId);
      const matchSearch = searchQuery === '' ||
        it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.subtitle && it.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (it.description && it.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sec && sec.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (it.bullets && it.bullets.some(b => b.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchSearch;
    });
  }, [customItems, sectionMap, searchQuery]);

  const handleInsertCustomItem = (item: CustomSectionItem) => {
    if (formatMode === 'html') {
      const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
      const titleLink = item.url
        ? `<a href="${item.url}" target="_blank"><strong>${escapeHtml(item.title)}</strong></a>`
        : `<strong>${escapeHtml(item.title)}</strong>`;

      const snippet = `
<div class="entry-block custom-block">
  <div class="row-header">
    <span class="title">${titleLink}</span>
    <span class="dates"><em>${escapeHtml(dates)}</em></span>
  </div>
  ${item.subtitle ? `<div class="row-sub"><span class="subtitle"><em>${escapeHtml(item.subtitle)}</em></span></div>` : ''}
  ${item.description ? `<p class="entry-desc">${escapeHtml(item.description)}</p>` : ''}
  ${item.bullets && item.bullets.length > 0 ? `<ul class="bullet-list">
    ${item.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('\n    ')}
  </ul>` : ''}
</div>`.trim();
      onInsert(snippet);
    } else {
      const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
      const bulletText = item.bullets && item.bullets.length > 0
        ? '\n' + item.bullets.map(b => `• ${b}`).join('\n')
        : '';
      const snippet = `${item.title}${item.subtitle ? ` (${item.subtitle})` : ''}${dates ? ` [${dates}]` : ''}${item.url ? ` - ${item.url}` : ''}${bulletText}`;
      onInsert(snippet);
    }
    onClose();
  };

  const handleInsertAchievement = (achText: string) => {
    const snippet = formatMode === 'html'
      ? `<li>${escapeHtml(achText)}</li>`
      : achText;
    onInsert(snippet);
    onClose();
  };

  const handleInsertExperience = (expId: string) => {
    const exp = expMap.get(expId);
    if (!exp) return;

    const expAchs = achievements?.filter(a => a.experienceId === expId) || [];

    if (formatMode === 'html') {
      const snippet = `
<div class="entry-block experience-block">
  <div class="row-header">
    <span class="company"><strong>${escapeHtml(exp.company)}</strong></span>
    <span class="location"><strong>${escapeHtml(exp.location || '')}</strong></span>
  </div>
  <div class="row-sub">
    <span class="role"><em>${escapeHtml(exp.role)}</em></span>
    <span class="dates"><em>${escapeHtml([exp.startDate, exp.endDate || (exp.isCurrent ? 'Present' : '')].filter(Boolean).join(' – '))}</em></span>
  </div>
  <ul class="bullet-list">
    ${expAchs.map(a => `<li>${escapeHtml(a.originalText)}</li>`).join('\n    ')}
  </ul>
</div>`.trim();
      onInsert(snippet);
    } else {
      const bulletText = expAchs.map(a => `• ${a.originalText}`).join('\n');
      const snippet = `${exp.role} @ ${exp.company} (${exp.startDate} – ${exp.endDate || (exp.isCurrent ? 'Present' : '')})\n${bulletText}`;
      onInsert(snippet);
    }
    onClose();
  };

  const handleInsertSkill = (s: { category: string; name: string }) => {
    const snippet = formatMode === 'html'
      ? `<li><strong>${escapeHtml(s.category)}:</strong> ${escapeHtml(s.name)}</li>`
      : `${s.category}: ${s.name}`;
    onInsert(snippet);
    onClose();
  };

  const handleInsertEducation = (edu: { institution: string; degree: string; fieldOfStudy?: string; startDate?: string; endDate?: string }) => {
    if (formatMode === 'html') {
      const snippet = `
<div class="entry-block">
  <div class="row-header">
    <span class="institution"><strong>${escapeHtml(edu.institution)}</strong></span>
    <span class="dates">${escapeHtml([edu.startDate, edu.endDate].filter(Boolean).join(' – '))}</span>
  </div>
  <div class="row-sub">
    <span class="degree"><em>${escapeHtml(edu.degree)}${edu.fieldOfStudy ? ` in ${escapeHtml(edu.fieldOfStudy)}` : ''}</em></span>
  </div>
</div>`.trim();
      onInsert(snippet);
    } else {
      const snippet = `${edu.degree} in ${edu.fieldOfStudy || ''} – ${edu.institution} (${[edu.startDate, edu.endDate].filter(Boolean).join(' – ')})`;
      onInsert(snippet);
    }
    onClose();
  };

  const handleInsertProfileField = (label: string, value: string) => {
    onInsert(value);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert from Career Vault"
      description="Browse your stored achievements, experiences, and skills to insert into the editor at your cursor position."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        
        {/* Top Controls: Search + Format Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search achievements, companies, roles, skills..."
              className="w-full rounded-xl border border-zinc-200 pl-9 pr-4 py-2 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Format Toggle */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[11px] font-medium text-zinc-500">Insert Format:</span>
            <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
              <button
                type="button"
                onClick={() => setFormatMode('html')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-mono transition-all ${
                  formatMode === 'html'
                    ? 'bg-white text-zinc-900 font-semibold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Code className="h-3 w-3" />
                <span>HTML Tag</span>
              </button>
              <button
                type="button"
                onClick={() => setFormatMode('raw')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-mono transition-all ${
                  formatMode === 'raw'
                    ? 'bg-white text-zinc-900 font-semibold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Raw Text</span>
              </button>
            </div>
          </div>

        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-2">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'achievements'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Achievements ({achievements?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('experiences')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'experiences'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Job Blocks ({experiences?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'custom'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Custom Sections ({customItems?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'skills'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Skills ({skills?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'education'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Education ({educations?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile Data</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          
          {/* TAB 1: ACHIEVEMENTS & BULLETS */}
          {activeTab === 'achievements' && (
            filteredAchievements.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No achievements or bullets match your search.</p>
            ) : (
              filteredAchievements.map(item => {
                return (
                  <div
                    key={item.id}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                        <span>{item.sourceRole ? `${item.sourceRole} · ` : ''}{item.sourceEntity}</span>
                        {item.category && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.2 font-mono text-[10px] text-zinc-600 border border-zinc-200">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-800 leading-relaxed font-sans">{item.text}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertAchievement(item.text)}
                      className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                      title="Insert bullet point into editor"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: JOB BLOCKS */}
          {activeTab === 'experiences' && (
            filteredExperiences.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No experiences recorded.</p>
            ) : (
              filteredExperiences.map(exp => {
                const expAchs = achievements?.filter(a => a.experienceId === exp.id) || [];
                return (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-zinc-900">{exp.role}</h4>
                        <span className="text-xs text-zinc-500 font-medium">@ {exp.company}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {exp.startDate} – {exp.endDate || (exp.isCurrent ? 'Present' : '')} {exp.location ? `· ${exp.location}` : ''}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {expAchs.length} bullet point{expAchs.length === 1 ? '' : 's'} included
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertExperience(exp.id)}
                      className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Insert Block</span>
                    </button>
                  </div>
                );
              })
            )
          )}

          {/* TAB: CUSTOM SECTIONS */}
          {activeTab === 'custom' && (
            filteredCustomItems.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No custom section items found.</p>
            ) : (
              filteredCustomItems.map(item => {
                const sec = sectionMap.get(item.sectionId);
                const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {sec && (
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {sec.title}
                            </span>
                          )}
                          <h4 className="font-semibold text-xs text-zinc-900">{item.title}</h4>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-zinc-600 font-medium">{item.subtitle}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                          {dates && <span>{dates}</span>}
                          {item.location && <span>{item.location}</span>}
                          {item.url && (
                            <span className="text-indigo-600 truncate max-w-xs">{item.url}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInsertCustomItem(item)}
                          className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors shadow-xs"
                          title="Insert complete formatted HTML block"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Insert Block</span>
                        </button>
                      </div>
                    </div>

                    {/* Individual Description & Bullet Point Insertions */}
                    {item.description && (
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 border border-zinc-200/70 p-2 text-xs text-zinc-700">
                        <span className="flex-1 leading-relaxed font-sans">{item.description}</span>
                        <button
                          type="button"
                          onClick={() => handleInsertAchievement(item.description!)}
                          className="flex items-center gap-0.5 rounded bg-white hover:bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 border border-zinc-200 flex-shrink-0 transition-colors"
                          title="Insert this description as a bullet/snippet"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>Insert Text</span>
                        </button>
                      </div>
                    )}

                    {item.bullets && item.bullets.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="text-[11px] font-medium text-zinc-500">Bullet points ({item.bullets.length}):</div>
                        {item.bullets.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 border border-zinc-200/70 p-2 text-xs text-zinc-700"
                          >
                            <span className="flex-1 leading-relaxed font-sans">• {b}</span>
                            <button
                              type="button"
                              onClick={() => handleInsertAchievement(b)}
                              className="flex items-center gap-0.5 rounded bg-white hover:bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 border border-zinc-200 flex-shrink-0 transition-colors"
                              title="Insert this bullet point into editor"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              <span>Insert Bullet</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}

          {/* TAB 3: SKILLS */}
          {activeTab === 'skills' && (
            filteredSkills.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No skills found.</p>
            ) : (
              filteredSkills.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-zinc-400">{s.category}</span>
                    <p className="text-xs font-medium text-zinc-800">{s.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertSkill(s)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Insert</span>
                  </button>
                </div>
              ))
            )
          )}

          {/* TAB 4: EDUCATION */}
          {activeTab === 'education' && (
            filteredEducations.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No education recorded.</p>
            ) : (
              filteredEducations.map(edu => (
                <div
                  key={edu.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                >
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900">{edu.institution}</h4>
                    <p className="text-xs text-zinc-600">{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</p>
                    <p className="text-[10px] text-zinc-400">{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertEducation(edu)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Insert</span>
                  </button>
                </div>
              ))
            )
          )}

          {/* TAB 5: PROFILE */}
          {activeTab === 'profile' && (
            !profile ? (
              <p className="text-center text-xs text-zinc-400 py-8">No profile data saved.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Full Name', val: profile.fullName },
                  { label: 'Headline', val: profile.headline },
                  { label: 'Email', val: profile.email },
                  { label: 'Phone', val: profile.phone },
                  { label: 'Location', val: profile.location },
                  { label: 'Website', val: profile.website },
                  { label: 'LinkedIn', val: profile.linkedin },
                  { label: 'GitHub', val: profile.github },
                ].filter(item => Boolean(item.val)).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">{item.label}</span>
                      <p className="text-xs font-medium text-zinc-800 truncate">{item.val}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInsertProfileField(item.label, item.val || '')}
                      className="flex-shrink-0 flex items-center gap-1 rounded-md bg-zinc-900 hover:bg-zinc-800 px-2 py-1 text-xs font-medium text-white"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

        </div>

      </div>
    </Modal>
  );
};

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
