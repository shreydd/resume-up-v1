export interface Profile {
  id?: number; // Primary key (singleton = 1)
  fullName: string;
  headline?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  preferredTemplate: 'jake' | 'minimal' | 'custom';
}

export interface Experience {
  id: string; // UUID v4
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface Achievement {
  id: string; // UUID v4
  experienceId: string; // Foreign key referencing Experience.id
  originalText: string;
  category?: string;
  embedding?: number[]; // 384-dimensional dense vector
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface Skill {
  id: string;
  category: string; // e.g., 'Languages', 'Frameworks', 'Tools'
  name: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  url?: string;
}

export interface CustomSection {
  id: string; // e.g. "sec-projects" or UUID
  title: string; // e.g. "Projects", "Extra-Curriculars", "Publications"
  order?: number;
}

export interface CustomSectionItem {
  id: string; // UUID
  sectionId: string; // references CustomSection.id
  title: string; // e.g. "Distributed KV Store", "Robotics Club Lead"
  subtitle?: string; // e.g. "Go, Raft, gRPC", "Stanford Robotics Club"
  startDate?: string;
  endDate?: string;
  location?: string;
  url?: string;
  description?: string;
  bullets: string[];
}

export interface TailoredResume {
  id: string;
  title: string;
  jobDescription: string;
  templateId: 'jake' | 'minimal' | 'custom';
  rawHtml: string;
  rawCss: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchedAchievementItem {
  achievement: Achievement;
  score: number; // 0.0 to 1.0 (similarity)
  matchedKeywords: string[];
  bestMatchingRequirement?: string;
  included: boolean;
}

export interface MatchedExperienceGroup {
  experience: Experience;
  matchedAchievements: MatchedAchievementItem[];
}

export interface ResumeData {
  profile: Profile;
  experiences: {
    experience: Experience;
    achievements: Achievement[];
  }[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  customSections?: {
    section: CustomSection;
    items: CustomSectionItem[];
  }[];
}
