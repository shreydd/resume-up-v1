import Dexie, { Table } from 'dexie';
import Papa from 'papaparse';
import {
  Profile,
  Experience,
  Achievement,
  Education,
  Skill,
  Certification,
  CustomSection,
  CustomSectionItem,
  TailoredResume,
  ResumeData
} from '../types';

export class CareerVaultDB extends Dexie {
  profile!: Table<Profile, number>;
  experiences!: Table<Experience, string>;
  achievements!: Table<Achievement, string>;
  education!: Table<Education, string>;
  skills!: Table<Skill, string>;
  certifications!: Table<Certification, string>;
  tailoredResumes!: Table<TailoredResume, string>;
  customSections!: Table<CustomSection, string>;
  customSectionItems!: Table<CustomSectionItem, string>;

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

    this.version(2).stores({
      profile: '++id',
      experiences: 'id, company, role, startDate',
      achievements: 'id, experienceId, category',
      education: 'id, institution',
      skills: 'id, category, name',
      certifications: 'id, name',
      tailoredResumes: 'id, templateId, createdAt, updatedAt',
      customSections: 'id, title, order',
      customSectionItems: 'id, sectionId, title'
    });
  }
}

export const db = new CareerVaultDB();

// Sample Data based on sample_data/career_template.json
export const SAMPLE_DATA = {
  profile: {
    id: 1,
    fullName: "Alex Mercer",
    headline: "Senior Full Stack & Systems Engineer",
    email: "alex.mercer@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    website: "https://alexmercer.dev",
    linkedin: "linkedin.com/in/alexmercer",
    github: "github.com/alexmercer",
    preferredTemplate: "minimal" as const
  },
  experiences: [
    {
      id: "exp-1",
      company: "Acme Corporation",
      role: "Senior Software Engineer",
      location: "San Francisco, CA",
      startDate: "2022-01",
      endDate: "Present",
      isCurrent: true
    },
    {
      id: "exp-2",
      company: "Starlight Systems",
      role: "Full Stack Developer",
      location: "Austin, TX",
      startDate: "2019-06",
      endDate: "2021-12",
      isCurrent: false
    }
  ],
  achievements: [
    {
      id: "ach-1",
      experienceId: "exp-1",
      originalText: "Architected high-throughput event processing pipeline handling 50M daily events using Kafka and Go.",
      category: "Backend"
    },
    {
      id: "ach-2",
      experienceId: "exp-1",
      originalText: "Reduced p99 API latency by 35% through Redis caching and PostgreSQL query optimization.",
      category: "Performance"
    },
    {
      id: "ach-3",
      experienceId: "exp-1",
      originalText: "Mentored 4 junior and mid-level engineers, running weekly technical design reviews.",
      category: "Leadership"
    },
    {
      id: "ach-4",
      experienceId: "exp-2",
      originalText: "Built responsive React client dashboard adopted by 120,000 monthly active enterprise users.",
      category: "Frontend"
    },
    {
      id: "ach-5",
      experienceId: "exp-2",
      originalText: "Designed and implemented automated CI/CD pipeline using GitHub Actions, cutting release cycles from 2 weeks to daily.",
      category: "DevOps"
    },
    {
      id: "ach-6",
      experienceId: "exp-2",
      originalText: "Spearheaded OAuth2 and RBAC migration across 8 core services ensuring SOC-2 compliance.",
      category: "Security"
    }
  ],
  education: [
    {
      id: "edu-1",
      institution: "University of Texas at Austin",
      degree: "B.S. in Computer Science",
      fieldOfStudy: "Software Engineering",
      startDate: "2015",
      endDate: "2019"
    }
  ],
  skills: [
    {
      id: "skill-1",
      category: "Languages",
      name: "TypeScript, JavaScript, Go, Python, SQL"
    },
    {
      id: "skill-2",
      category: "Frameworks & Libraries",
      name: "React, Next.js, Node.js, Express, Tailwind CSS"
    },
    {
      id: "skill-3",
      category: "Cloud & Tools",
      name: "Docker, Kubernetes, AWS, PostgreSQL, Redis, Kafka, Git"
    }
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      issueDate: "2023",
      url: "https://aws.amazon.com/verification"
    }
  ],
  customSections: [
    {
      id: "sec-projects",
      title: "Projects",
      order: 1
    },
    {
      id: "sec-extracurriculars",
      title: "Extra-Curricular Activities",
      order: 2
    }
  ],
  customSectionItems: [
    {
      id: "item-proj-1",
      sectionId: "sec-projects",
      title: "Distributed KV Store",
      subtitle: "Go, Raft Consensus, gRPC",
      startDate: "2023-01",
      endDate: "2023-05",
      url: "https://github.com/alexmercer/raft-kv",
      description: "Fault-tolerant distributed key-value storage engine implementing the Raft consensus protocol.",
      bullets: [
        "Implemented Raft leader election, log replication, and snapshotting in Go with sub-10ms failover.",
        "Benchmarked system throughput reaching 45,000 requests/sec with linearizability guarantees."
      ]
    },
    {
      id: "item-extra-1",
      sectionId: "sec-extracurriculars",
      title: "Open Source Maintainer & Mentor",
      subtitle: "Austin Developer Community",
      startDate: "2021-03",
      endDate: "Present",
      url: "https://github.com/alexmercer",
      description: "Active open-source contributor and technical mentor.",
      bullets: [
        "Maintained top 50 developer utility repositories on GitHub with over 1,200 stars.",
        "Organized bi-weekly systems programming study groups and mentored 15+ aspiring engineers."
      ]
    }
  ]
};

export async function loadSampleData(): Promise<void> {
  await db.transaction('rw', [
    db.profile,
    db.experiences,
    db.achievements,
    db.education,
    db.skills,
    db.certifications,
    db.customSections,
    db.customSectionItems
  ], async () => {
    await db.profile.clear();
    await db.experiences.clear();
    await db.achievements.clear();
    await db.education.clear();
    await db.skills.clear();
    await db.certifications.clear();
    await db.customSections.clear();
    await db.customSectionItems.clear();

    await db.profile.put(SAMPLE_DATA.profile);
    await db.experiences.bulkPut(SAMPLE_DATA.experiences);
    await db.achievements.bulkPut(SAMPLE_DATA.achievements);
    await db.education.bulkPut(SAMPLE_DATA.education);
    await db.skills.bulkPut(SAMPLE_DATA.skills);
    await db.certifications.bulkPut(SAMPLE_DATA.certifications);
    await db.customSections.bulkPut(SAMPLE_DATA.customSections);
    await db.customSectionItems.bulkPut(SAMPLE_DATA.customSectionItems);
  });
}

export async function clearVault(): Promise<void> {
  await db.transaction('rw', [
    db.profile,
    db.experiences,
    db.achievements,
    db.education,
    db.skills,
    db.certifications,
    db.customSections,
    db.customSectionItems
  ], async () => {
    await db.profile.clear();
    await db.experiences.clear();
    await db.achievements.clear();
    await db.education.clear();
    await db.skills.clear();
    await db.certifications.clear();
    await db.customSections.clear();
    await db.customSectionItems.clear();
  });
}

export function extractCustomItemFields(raw: any) {
  // Title / Name
  const title = (raw.name || raw.title || raw.projectName || raw.item || raw.titleName || "Item").trim();

  // Subtitle / Technologies / Tools / Role
  let subtitle = raw.tools || raw.technologies || raw.techStack || raw.tech || raw.stack || raw.subtitle || raw.role || raw.position || raw.keywords || "";
  if (Array.isArray(subtitle)) {
    subtitle = subtitle.filter(Boolean).join(", ");
  } else if (typeof subtitle === "string") {
    subtitle = subtitle.trim();
  } else {
    subtitle = String(subtitle || "").trim();
  }

  // URL / Link
  let url = (raw.url || raw.link || raw.website || raw.github || raw.demo || "").trim();
  if (url && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("mailto:")) {
    url = "https://" + url;
  }

  // Dates & Location
  const startDate = (raw.startDate || raw.start_date || raw.date || raw.year || "").trim();
  const endDate = (raw.endDate || raw.end_date || "").trim();
  const location = (raw.location || raw.city || "").trim();

  // Bullets & Description
  let description = "";
  let bullets: string[] = [];

  // Check if explicit bullets/highlights/points/details/achievements are provided
  const explicitBullets = raw.bullets || raw.highlights || raw.points || raw.details || raw.achievements;
  if (Array.isArray(explicitBullets) && explicitBullets.length > 0) {
    bullets = normalizeBullets(explicitBullets);
  }

  // Handle description or summary
  const descVal = raw.description !== undefined ? raw.description : raw.summary;
  if (Array.isArray(descVal)) {
    // Description is an array of strings (e.g. user's projects JSON)
    const normalized = normalizeBullets(descVal);
    if (bullets.length === 0) {
      bullets = normalized;
    } else {
      bullets = [...bullets, ...normalized];
    }
  } else if (typeof descVal === "string" && descVal.trim()) {
    const trimmed = descVal.trim();
    if (bullets.length === 0) {
      if (trimmed.includes('\n') || /^[•\-\*]/m.test(trimmed)) {
        bullets = normalizeBullets(trimmed);
      } else {
        description = trimmed;
      }
    } else {
      description = trimmed;
    }
  }

  return {
    title,
    subtitle,
    startDate,
    endDate,
    location,
    url,
    description,
    bullets
  };
}

export function normalizeBullets(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(b => {
      if (typeof b === 'string') return b.trim();
      if (typeof b === 'object' && b !== null) {
        return (b.text || b.originalText || b.bullet || b.content || '').trim();
      }
      return String(b || '').trim();
    }).filter(b => b.length > 0);
  }
  if (typeof raw === 'string') {
    return raw.split('\n').map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(b => b.length > 0);
  }
  return [];
}

export async function getCompleteResumeData(): Promise<ResumeData> {
  const profileList = await db.profile.toArray();
  const profile = profileList[0] || {
    id: 1,
    fullName: "Your Name",
    email: "your.email@example.com",
    preferredTemplate: 'minimal'
  };

  const experiences = await db.experiences.orderBy('startDate').reverse().toArray();
  const achievements = await db.achievements.toArray();
  const education = await db.education.toArray();
  const skills = await db.skills.toArray();
  const certifications = await db.certifications.toArray();
  const customSections = await db.customSections.orderBy('order').toArray();
  const customItems = await db.customSectionItems.toArray();

  const groupedExperiences = experiences.map(exp => ({
    experience: exp,
    achievements: achievements.filter(ach => ach.experienceId === exp.id)
  }));

  const groupedCustomSections = customSections.map(sec => ({
    section: sec,
    items: customItems
      .filter(item => item.sectionId === sec.id)
      .map(item => ({
        ...item,
        title: item.title || '',
        bullets: normalizeBullets(item.bullets)
      }))
  }));

  return {
    profile,
    experiences: groupedExperiences,
    education,
    skills,
    certifications,
    customSections: groupedCustomSections
  };
}

export async function exportVaultAsJSON(): Promise<string> {
  const profile = (await db.profile.toArray())[0];
  const experiences = await db.experiences.toArray();
  const achievements = await db.achievements.toArray();
  const education = await db.education.toArray();
  const skills = await db.skills.toArray();
  const certifications = await db.certifications.toArray();
  const customSections = await db.customSections.orderBy('order').toArray();
  const customItems = await db.customSectionItems.toArray();

  // Format to match sample_data/career_template.json conventions
  const exportPayload = {
    profile: profile ? {
      full_name: profile.fullName,
      headline: profile.headline,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      website: profile.website,
      linkedin: profile.linkedin,
      github: profile.github
    } : null,
    experiences: experiences.map(exp => ({
      company: exp.company,
      role: exp.role,
      location: exp.location,
      start_date: exp.startDate,
      end_date: exp.endDate || (exp.isCurrent ? "Present" : ""),
      achievements: achievements
        .filter(ach => ach.experienceId === exp.id)
        .map(ach => ach.originalText)
    })),
    education: education.map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.fieldOfStudy,
      start_date: edu.startDate,
      end_date: edu.endDate
    })),
    skills: skills.map(skill => ({
      category: skill.category,
      name: skill.name
    })),
    certifications: certifications.map(cert => ({
      name: cert.name,
      issuer: cert.issuer,
      issue_date: cert.issueDate,
      url: cert.url
    })),
    custom_sections: customSections.map(sec => ({
      id: sec.id,
      title: sec.title,
      order: sec.order,
      items: customItems
        .filter(item => item.sectionId === sec.id)
        .map(item => ({
          title: item.title,
          subtitle: item.subtitle,
          start_date: item.startDate,
          end_date: item.endDate,
          location: item.location,
          url: item.url,
          description: item.description,
          bullets: item.bullets
        }))
    })),
    // Standard top-level projects for JSON Resume compatibility
    projects: customItems
      .filter(item => {
        const sec = customSections.find(s => s.id === item.sectionId);
        return sec && sec.title.toLowerCase().includes('project');
      })
      .map(item => ({
        name: item.title,
        description: item.description || item.subtitle,
        highlights: item.bullets,
        url: item.url,
        start_date: item.startDate,
        end_date: item.endDate
      }))
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importVaultFromJSON(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  await db.transaction('rw', [
    db.profile,
    db.experiences,
    db.achievements,
    db.education,
    db.skills,
    db.certifications,
    db.customSections,
    db.customSectionItems
  ], async () => {
    if (data.profile) {
      const p = data.profile;
      await db.profile.put({
        id: 1,
        fullName: p.full_name || p.fullName || "Candidate",
        headline: p.headline || "",
        email: p.email || "",
        phone: p.phone || "",
        location: p.location || "",
        website: p.website || "",
        linkedin: p.linkedin || "",
        github: p.github || "",
        preferredTemplate: 'minimal'
      });
    }

    if (Array.isArray(data.experiences)) {
      for (const item of data.experiences) {
        const expId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const isCurrent = (item.end_date || item.endDate || '').toLowerCase().includes('present');
        await db.experiences.put({
          id: expId,
          company: item.company || "Company",
          role: item.role || "Role",
          location: item.location || "",
          startDate: item.start_date || item.startDate || "",
          endDate: item.end_date || item.endDate || "",
          isCurrent
        });

        const achs: (string | { text?: string; originalText?: string; category?: string })[] = item.achievements || [];
        for (const ach of achs) {
          const text = typeof ach === 'string' ? ach : (ach.originalText || ach.text || "");
          if (text.trim()) {
            await db.achievements.put({
              id: `ach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              experienceId: expId,
              originalText: text.trim(),
              category: typeof ach === 'object' ? ach.category : undefined
            });
          }
        }
      }
    }

    if (Array.isArray(data.education)) {
      for (const edu of data.education) {
        await db.education.put({
          id: `edu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          institution: edu.institution || "",
          degree: edu.degree || "",
          fieldOfStudy: edu.field_of_study || edu.fieldOfStudy || "",
          startDate: edu.start_date || edu.startDate || "",
          endDate: edu.end_date || edu.endDate || ""
        });
      }
    }

    if (Array.isArray(data.skills)) {
      for (const s of data.skills) {
        await db.skills.put({
          id: `skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          category: s.category || "General",
          name: s.name || ""
        });
      }
    }

    if (Array.isArray(data.certifications)) {
      for (const c of data.certifications) {
        await db.certifications.put({
          id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: c.name || "",
          issuer: c.issuer || "",
          issueDate: c.issue_date || c.issueDate || "",
          url: c.url || ""
        });
      }
    }

    // 1. Explicit custom_sections or customSections
    const incomingCustom = data.custom_sections || data.customSections;
    if (Array.isArray(incomingCustom)) {
      for (let i = 0; i < incomingCustom.length; i++) {
        const cs = incomingCustom[i];
        const secId = cs.id || `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.customSections.put({
          id: secId,
          title: cs.title || "Custom Section",
          order: cs.order ?? (i + 1)
        });

        const items = cs.items || [];
        for (const rawItem of items) {
          const fields = extractCustomItemFields(rawItem);
          await db.customSectionItems.put({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            sectionId: secId,
            ...fields
          });
        }
      }
    }

    // 2. Standard top-level projects
    if (Array.isArray(data.projects) && (!incomingCustom || !incomingCustom.some((s: any) => (s.title || '').toLowerCase().includes('project')))) {
      const secId = `sec-projects-${Date.now()}`;
      await db.customSections.put({
        id: secId,
        title: "Projects",
        order: 1
      });
      for (const p of data.projects) {
        const fields = extractCustomItemFields(p);
        await db.customSectionItems.put({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sectionId: secId,
          ...fields
        });
      }
    }

    // 3. Standard top-level extracurriculars / activities
    const extraList = data.extracurriculars || data.extra_curriculars || data.activities;
    if (Array.isArray(extraList) && (!incomingCustom || !incomingCustom.some((s: any) => (s.title || '').toLowerCase().includes('extra')))) {
      const secId = `sec-extra-${Date.now()}`;
      await db.customSections.put({
        id: secId,
        title: "Extra-Curricular Activities",
        order: 2
      });
      for (const e of extraList) {
        const fields = extractCustomItemFields(e);
        await db.customSectionItems.put({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sectionId: secId,
          ...fields
        });
      }
    }

    // 4. Standard top-level publications
    const pubList = data.publications || data.papers;
    if (Array.isArray(pubList) && (!incomingCustom || !incomingCustom.some((s: any) => (s.title || '').toLowerCase().includes('pub')))) {
      const secId = `sec-pubs-${Date.now()}`;
      await db.customSections.put({
        id: secId,
        title: "Publications",
        order: 3
      });
      for (const pub of pubList) {
        const fields = extractCustomItemFields(pub);
        await db.customSectionItems.put({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sectionId: secId,
          ...fields
        });
      }
    }

    // 5. Standard top-level awards / honors
    const awardList = data.awards || data.honors;
    if (Array.isArray(awardList) && (!incomingCustom || !incomingCustom.some((s: any) => (s.title || '').toLowerCase().includes('award')))) {
      const secId = `sec-awards-${Date.now()}`;
      await db.customSections.put({
        id: secId,
        title: "Awards & Honors",
        order: 4
      });
      for (const a of awardList) {
        const fields = extractCustomItemFields(a);
        await db.customSectionItems.put({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sectionId: secId,
          ...fields
        });
      }
    }

    // 6. Generic catch-all for any other top-level array of items
    const standardKeys = new Set([
      'profile', 'experiences', 'experience', 'work', 'work_experience',
      'education', 'skills', 'certifications', 'certificates',
      'custom_sections', 'customSections', 'custom',
      'projects', 'extracurriculars', 'extra_curriculars', 'activities',
      'publications', 'papers', 'awards', 'honors'
    ]);

    let genericOrder = 10;
    for (const [key, val] of Object.entries(data)) {
      if (standardKeys.has(key.toLowerCase()) || !Array.isArray(val) || val.length === 0) continue;
      if (typeof val[0] === 'object' || typeof val[0] === 'string') {
        const titleFormatted = key
          .replace(/[_\-]+/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        
        const secId = `sec-gen-${key}-${Date.now()}`;
        await db.customSections.put({
          id: secId,
          title: titleFormatted,
          order: genericOrder++
        });

        for (const item of val) {
          const fields = extractCustomItemFields(item);
          await db.customSectionItems.put({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            sectionId: secId,
            ...fields
          });
        }
      }
    }
  });
}

export async function exportVaultAsCSV(): Promise<string> {
  const experiences = await db.experiences.toArray();
  const achievements = await db.achievements.toArray();
  const customSections = await db.customSections.toArray();
  const customItems = await db.customSectionItems.toArray();

  const rows: Array<{
    Section: string;
    Title: string;
    Subtitle: string;
    Location: string;
    StartDate: string;
    EndDate: string;
    Bullet: string;
    URL: string;
  }> = [];

  for (const exp of experiences) {
    const expAchs = achievements.filter(a => a.experienceId === exp.id);
    if (expAchs.length === 0) {
      rows.push({
        Section: 'Experience',
        Title: exp.company,
        Subtitle: exp.role,
        Location: exp.location || '',
        StartDate: exp.startDate,
        EndDate: exp.endDate || (exp.isCurrent ? 'Present' : ''),
        Bullet: '',
        URL: ''
      });
    } else {
      for (const ach of expAchs) {
        rows.push({
          Section: 'Experience',
          Title: exp.company,
          Subtitle: exp.role,
          Location: exp.location || '',
          StartDate: exp.startDate,
          EndDate: exp.endDate || (exp.isCurrent ? 'Present' : ''),
          Bullet: ach.originalText,
          URL: ''
        });
      }
    }
  }

  for (const sec of customSections) {
    const items = customItems.filter(i => i.sectionId === sec.id);
    for (const item of items) {
      if (!item.bullets || item.bullets.length === 0) {
        rows.push({
          Section: sec.title,
          Title: item.title,
          Subtitle: item.subtitle || '',
          Location: item.location || '',
          StartDate: item.startDate || '',
          EndDate: item.endDate || '',
          Bullet: item.description || '',
          URL: item.url || ''
        });
      } else {
        for (const bullet of item.bullets) {
          rows.push({
            Section: sec.title,
            Title: item.title,
            Subtitle: item.subtitle || '',
            Location: item.location || '',
            StartDate: item.startDate || '',
            EndDate: item.endDate || '',
            Bullet: bullet,
            URL: item.url || ''
          });
        }
      }
    }
  }

  return Papa.unparse(rows);
}

export async function importVaultFromCSV(csvText: string): Promise<{ experiencesCount: number; achievementsCount: number; customItemsCount: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          let experiencesCount = 0;
          let achievementsCount = 0;
          let customItemsCount = 0;

          // Group experiences by company + role + startDate
          const expGrouped = new Map<string, {
            company: string;
            role: string;
            location: string;
            startDate: string;
            endDate: string;
            achievements: { text: string; category?: string }[];
          }>();

          // Group custom sections by sectionTitle + itemTitle + startDate
          const customGrouped = new Map<string, {
            sectionTitle: string;
            title: string;
            subtitle: string;
            location: string;
            startDate: string;
            endDate: string;
            url: string;
            bullets: string[];
          }>();

          for (const row of results.data) {
            const section = (row.Section || row.section || '').trim();
            const company = (row.Company || row.company || row.Title || row.title || '').trim();
            const role = (row.Role || row.role || row.Subtitle || row.subtitle || '').trim();
            const location = (row.Location || row.location || '').trim();
            const startDate = (row.StartDate || row.start_date || '').trim();
            const endDate = (row.EndDate || row.end_date || '').trim();
            const achievement = (row.Achievement || row.achievement || row.Bullet || row.bullet || '').trim();
            const category = (row.Category || row.category || '').trim();
            const url = (row.URL || row.url || '').trim();

            if (!company && !role && !achievement) continue;

            const isCustom = section && !section.toLowerCase().includes('experience');

            if (!isCustom) {
              const key = `${company.toLowerCase()}|||${role.toLowerCase()}|||${startDate}`;
              if (!expGrouped.has(key)) {
                expGrouped.set(key, {
                  company: company || 'Company',
                  role: role || 'Role',
                  location,
                  startDate,
                  endDate,
                  achievements: []
                });
              }

              if (achievement) {
                expGrouped.get(key)!.achievements.push({
                  text: achievement,
                  category: category || undefined
                });
              }
            } else {
              const key = `${section.toLowerCase()}|||${company.toLowerCase()}|||${startDate}`;
              if (!customGrouped.has(key)) {
                customGrouped.set(key, {
                  sectionTitle: section,
                  title: company,
                  subtitle: role,
                  location,
                  startDate,
                  endDate,
                  url,
                  bullets: []
                });
              }

              if (achievement) {
                customGrouped.get(key)!.bullets.push(achievement);
              }
            }
          }

          await db.transaction('rw', [db.experiences, db.achievements, db.customSections, db.customSectionItems], async () => {
            // Save experiences
            for (const [, group] of expGrouped) {
              const expId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const isCurrent = group.endDate.toLowerCase().includes('present');

              await db.experiences.put({
                id: expId,
                company: group.company,
                role: group.role,
                location: group.location,
                startDate: group.startDate,
                endDate: group.endDate,
                isCurrent
              });
              experiencesCount++;

              for (const ach of group.achievements) {
                await db.achievements.put({
                  id: `ach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  experienceId: expId,
                  originalText: ach.text,
                  category: ach.category
                });
                achievementsCount++;
              }
            }

            // Save custom sections & items
            const existingSections = await db.customSections.toArray();
            const sectionMap = new Map<string, string>();
            for (const s of existingSections) {
              sectionMap.set(s.title.toLowerCase(), s.id);
            }

            for (const [, group] of customGrouped) {
              let secId = sectionMap.get(group.sectionTitle.toLowerCase());
              if (!secId) {
                secId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                await db.customSections.put({
                  id: secId,
                  title: group.sectionTitle,
                  order: sectionMap.size + 1
                });
                sectionMap.set(group.sectionTitle.toLowerCase(), secId);
              }

              await db.customSectionItems.put({
                id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                sectionId: secId,
                title: group.title,
                subtitle: group.subtitle,
                location: group.location,
                startDate: group.startDate,
                endDate: group.endDate,
                url: group.url,
                description: '',
                bullets: group.bullets
              });
              customItemsCount++;
            }
          });

          resolve({ experiencesCount, achievementsCount, customItemsCount });
        } catch (err) {
          reject(err);
        }
      },
      error: (err: Error) => {
        reject(err);
      }
    });
  });
}
