import Dexie, { Table } from 'dexie';
import Papa from 'papaparse';
import {
  Profile,
  Experience,
  Achievement,
  Education,
  Skill,
  Certification,
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
    preferredTemplate: "jake" as const
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
  ]
};

export async function loadSampleData(): Promise<void> {
  await db.transaction('rw', [
    db.profile,
    db.experiences,
    db.achievements,
    db.education,
    db.skills,
    db.certifications
  ], async () => {
    await db.profile.clear();
    await db.experiences.clear();
    await db.achievements.clear();
    await db.education.clear();
    await db.skills.clear();
    await db.certifications.clear();

    await db.profile.put(SAMPLE_DATA.profile);
    await db.experiences.bulkPut(SAMPLE_DATA.experiences);
    await db.achievements.bulkPut(SAMPLE_DATA.achievements);
    await db.education.bulkPut(SAMPLE_DATA.education);
    await db.skills.bulkPut(SAMPLE_DATA.skills);
    await db.certifications.bulkPut(SAMPLE_DATA.certifications);
  });
}

export async function clearVault(): Promise<void> {
  await db.transaction('rw', [
    db.profile,
    db.experiences,
    db.achievements,
    db.education,
    db.skills,
    db.certifications
  ], async () => {
    await db.profile.clear();
    await db.experiences.clear();
    await db.achievements.clear();
    await db.education.clear();
    await db.skills.clear();
    await db.certifications.clear();
  });
}

export async function getCompleteResumeData(): Promise<ResumeData> {
  const profileList = await db.profile.toArray();
  const profile = profileList[0] || {
    id: 1,
    fullName: "Your Name",
    email: "your.email@example.com",
    preferredTemplate: 'jake'
  };

  const experiences = await db.experiences.orderBy('startDate').reverse().toArray();
  const achievements = await db.achievements.toArray();
  const education = await db.education.toArray();
  const skills = await db.skills.toArray();
  const certifications = await db.certifications.toArray();

  const groupedExperiences = experiences.map(exp => ({
    experience: exp,
    achievements: achievements.filter(ach => ach.experienceId === exp.id)
  }));

  return {
    profile,
    experiences: groupedExperiences,
    education,
    skills,
    certifications
  };
}

export async function exportVaultAsJSON(): Promise<string> {
  const profile = (await db.profile.toArray())[0];
  const experiences = await db.experiences.toArray();
  const achievements = await db.achievements.toArray();
  const education = await db.education.toArray();
  const skills = await db.skills.toArray();
  const certifications = await db.certifications.toArray();

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
    db.certifications
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
        preferredTemplate: 'jake'
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
  });
}

export async function exportVaultAsCSV(): Promise<string> {
  const experiences = await db.experiences.toArray();
  const achievements = await db.achievements.toArray();

  const rows: Array<{
    Company: string;
    Role: string;
    Location: string;
    StartDate: string;
    EndDate: string;
    Achievement: string;
    Category: string;
  }> = [];

  for (const exp of experiences) {
    const expAchs = achievements.filter(a => a.experienceId === exp.id);
    if (expAchs.length === 0) {
      rows.push({
        Company: exp.company,
        Role: exp.role,
        Location: exp.location || '',
        StartDate: exp.startDate,
        EndDate: exp.endDate || (exp.isCurrent ? 'Present' : ''),
        Achievement: '',
        Category: ''
      });
    } else {
      for (const ach of expAchs) {
        rows.push({
          Company: exp.company,
          Role: exp.role,
          Location: exp.location || '',
          StartDate: exp.startDate,
          EndDate: exp.endDate || (exp.isCurrent ? 'Present' : ''),
          Achievement: ach.originalText,
          Category: ach.category || ''
        });
      }
    }
  }

  return Papa.unparse(rows);
}

export async function importVaultFromCSV(csvText: string): Promise<{ experiencesCount: number; achievementsCount: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          let experiencesCount = 0;
          let achievementsCount = 0;

          // Group by company + role + startDate
          const grouped = new Map<string, {
            company: string;
            role: string;
            location: string;
            startDate: string;
            endDate: string;
            achievements: { text: string; category?: string }[];
          }>();

          for (const row of results.data) {
            const company = (row.Company || row.company || '').trim();
            const role = (row.Role || row.role || '').trim();
            const location = (row.Location || row.location || '').trim();
            const startDate = (row.StartDate || row.start_date || '').trim();
            const endDate = (row.EndDate || row.end_date || '').trim();
            const achievement = (row.Achievement || row.achievement || '').trim();
            const category = (row.Category || row.category || '').trim();

            if (!company && !role && !achievement) continue;

            const key = `${company.toLowerCase()}|||${role.toLowerCase()}|||${startDate}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                company: company || 'Company',
                role: role || 'Role',
                location,
                startDate,
                endDate,
                achievements: []
              });
            }

            if (achievement) {
              grouped.get(key)!.achievements.push({
                text: achievement,
                category: category || undefined
              });
            }
          }

          await db.transaction('rw', [db.experiences, db.achievements], async () => {
            for (const [, group] of grouped) {
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
          });

          resolve({ experiencesCount, achievementsCount });
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
