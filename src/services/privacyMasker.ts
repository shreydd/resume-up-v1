import { 
  Experience, 
  Achievement, 
  Profile, 
  CustomSection, 
  CustomSectionItem, 
  MaskingPreferences 
} from '../types';

export interface CompanyMetadata {
  originalName: string;
  industry: string;
  token: string;
  surrogateWithContext: string;
}

export interface MaskingResult {
  maskedPayload: {
    targetRoleFocus?: string;
    headline?: string;
    experiences: Array<{
      id: string;
      company: string; // Token with optional industry context
      role: string;
      timeline: string; // Normalized relative timeline token
      achievements: Array<{
        id: string;
        text: string;
      }>;
    }>;
    skills: Array<{ category: string; name: string }>;
    customSections?: Array<{
      title: string;
      items: Array<{
        title: string;
        subtitle?: string;
        timeline?: string;
        bullets: string[];
      }>;
    }>;
  };
  tokenMap: Record<string, string>; // __TOKEN__ -> original string
  reverseTokenMap: Record<string, string>; // original string -> __TOKEN__
  categoryMap: Record<string, 'company' | 'timeline' | 'pii' | 'blacklist'>;
  companyMetadata: Record<string, CompanyMetadata>; // company token -> metadata
}

/**
 * Parses start and end dates and computes an approximate, non-identifying tenure descriptor.
 * E.g., "2022-01" to "Present" -> "[Recent: ~3 Years]"
 */
export function formatRelativeTenure(startDateStr: string, endDateStr?: string, isCurrent?: boolean): string {
  if (!startDateStr) return '[Duration: Undisclosed]';

  const parseYearMonth = (str: string): { year: number; month: number } | null => {
    const clean = str.trim().toLowerCase();
    if (!clean) return null;

    // Check for "Present"
    if (clean.includes('present') || clean.includes('current')) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }

    // Match YYYY-MM or YYYY/MM
    const ymMatch = clean.match(/^(\d{4})[-/.](\d{1,2})/);
    if (ymMatch) {
      return { year: parseInt(ymMatch[1], 10), month: parseInt(ymMatch[2], 10) };
    }

    // Match Year only YYYY
    const yMatch = clean.match(/^(\d{4})/);
    if (yMatch) {
      return { year: parseInt(yMatch[1], 10), month: 1 };
    }

    return null;
  };

  const start = parseYearMonth(startDateStr);
  const isPresent = isCurrent || !endDateStr || endDateStr.toLowerCase().includes('present');
  const end = isPresent
    ? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
    : parseYearMonth(endDateStr);

  if (!start || !end) {
    return isPresent ? '[Recent: Active]' : '[Prior Experience]';
  }

  const totalMonths = Math.max(1, (end.year - start.year) * 12 + (end.month - start.month));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  let durationText = '';
  if (years === 0) {
    durationText = `${months} Month${months > 1 ? 's' : ''}`;
  } else if (months < 3) {
    durationText = `${years} Year${years > 1 ? 's' : ''}`;
  } else if (months >= 3 && months < 9) {
    durationText = `${years}.5 Years`;
  } else {
    durationText = `${years + 1} Years`;
  }

  if (isPresent) {
    return `[Recent: ${durationText}]`;
  }
  return `[Prior: ${durationText}]`;
}

/**
 * Masks candidate career vault data according to user masking preferences.
 */
export function maskCareerRecords(
  experiences: Experience[],
  achievements: Achievement[],
  profile?: Profile | null,
  skills: Array<{ category: string; name: string }> = [],
  customSections: CustomSection[] = [],
  customItems: CustomSectionItem[] = [],
  preferences: MaskingPreferences = {
    maskCompanies: true,
    maskDates: true,
    maskPersonalPII: true,
    customBlacklist: []
  }
): MaskingResult {
  const tokenMap: Record<string, string> = {};
  const reverseTokenMap: Record<string, string> = {};
  const categoryMap: Record<string, 'company' | 'timeline' | 'pii' | 'blacklist'> = {};
  const companyMetadata: Record<string, CompanyMetadata> = {};

  let companyCounter = 1;
  let timelineCounter = 1;
  let blacklistCounter = 1;

  // 1. Personal PII Masking
  if (preferences.maskPersonalPII && profile) {
    if (profile.fullName && profile.fullName.trim()) {
      const token = '__CANDIDATE_NAME__';
      tokenMap[token] = profile.fullName.trim();
      reverseTokenMap[profile.fullName.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.email && profile.email.trim()) {
      const token = '__EMAIL__';
      tokenMap[token] = profile.email.trim();
      reverseTokenMap[profile.email.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.phone && profile.phone.trim()) {
      const token = '__PHONE__';
      tokenMap[token] = profile.phone.trim();
      reverseTokenMap[profile.phone.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.location && profile.location.trim()) {
      const token = '__LOCATION__';
      tokenMap[token] = profile.location.trim();
      reverseTokenMap[profile.location.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.linkedin && profile.linkedin.trim()) {
      const token = '__LINKEDIN_URL__';
      tokenMap[token] = profile.linkedin.trim();
      reverseTokenMap[profile.linkedin.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.github && profile.github.trim()) {
      const token = '__GITHUB_URL__';
      tokenMap[token] = profile.github.trim();
      reverseTokenMap[profile.github.trim()] = token;
      categoryMap[token] = 'pii';
    }
    if (profile.website && profile.website.trim()) {
      const token = '__PORTFOLIO_URL__';
      tokenMap[token] = profile.website.trim();
      reverseTokenMap[profile.website.trim()] = token;
      categoryMap[token] = 'pii';
    }
  }

  // 2. Custom User Blacklist Keywords
  if (preferences.customBlacklist && preferences.customBlacklist.length > 0) {
    for (const term of preferences.customBlacklist) {
      const trimmed = term.trim();
      if (trimmed && !reverseTokenMap[trimmed]) {
        const token = `__INTERNAL_PROJECT_${blacklistCounter++}__`;
        tokenMap[token] = trimmed;
        reverseTokenMap[trimmed] = token;
        categoryMap[token] = 'blacklist';
      }
    }
  }

  // 3. Company & Timeline Tokenization
  const companyTokens = new Map<string, string>(); // company original -> token
  const timelineTokens = new Map<string, string>(); // raw date range -> token

  experiences.forEach((exp) => {
    const rawCompany = exp.company?.trim();
    if (rawCompany && preferences.maskCompanies) {
      if (!companyTokens.has(rawCompany)) {
        const token = `__COMPANY_${companyCounter++}__`;
        companyTokens.set(rawCompany, token);
        tokenMap[token] = rawCompany;
        reverseTokenMap[rawCompany] = token;
        categoryMap[token] = 'company';

        const industryCtx = exp.industry?.trim();
        const surrogate = industryCtx ? `${token} [Industry: ${industryCtx}]` : token;
        companyMetadata[token] = {
          originalName: rawCompany,
          industry: industryCtx || '',
          token,
          surrogateWithContext: surrogate
        };
      }
    }

    const rawDates = [exp.startDate, exp.endDate || (exp.isCurrent ? 'Present' : '')].filter(Boolean).join(' – ');
    if (rawDates && preferences.maskDates) {
      if (!timelineTokens.has(rawDates)) {
        const token = `__TIMELINE_${timelineCounter++}__`;
        timelineTokens.set(rawDates, token);
        tokenMap[token] = rawDates;
        reverseTokenMap[rawDates] = token;
        categoryMap[token] = 'timeline';
      }
    }
  });

  // Helper to sanitize any free-form text with PII / Company / Blacklist replacements
  const redactString = (text: string): string => {
    if (!text) return '';
    let result = text;

    // Apply custom blacklist replacements first
    for (const [orig, token] of Object.entries(reverseTokenMap)) {
      if (!orig || orig.length < 2) continue;
      // Escape for regex
      const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      result = result.replace(regex, token);
    }

    // Email regex fallback
    if (preferences.maskPersonalPII) {
      result = result.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '__EMAIL__');
      // Phone number regex fallback
      result = result.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '__PHONE__');
    }

    return result;
  };

  // 4. Construct Masked Experiences
  const maskedExperiences = experiences.map((exp) => {
    const rawCompany = exp.company?.trim() || 'Company';
    let companyString = rawCompany;

    if (preferences.maskCompanies) {
      const token = companyTokens.get(rawCompany) || rawCompany;
      const meta = companyMetadata[token];
      companyString = meta ? meta.surrogateWithContext : token;
    }

    let timelineString = [exp.startDate, exp.endDate || (exp.isCurrent ? 'Present' : '')].filter(Boolean).join(' – ');
    if (preferences.maskDates) {
      const token = timelineTokens.get(timelineString) || `__TIMELINE_${timelineCounter++}__`;
      const relative = formatRelativeTenure(exp.startDate, exp.endDate, exp.isCurrent);
      timelineString = `${token} ${relative}`;
    }

    const expAchs = achievements
      .filter((a) => a.experienceId === exp.id)
      .map((a) => ({
        id: a.id,
        text: redactString(a.originalText)
      }));

    return {
      id: exp.id,
      company: companyString,
      role: redactString(exp.role),
      timeline: timelineString,
      achievements: expAchs
    };
  });

  // 5. Construct Masked Custom Sections
  const maskedCustomSections = customSections.map((sec) => {
    const items = customItems
      .filter((it) => it.sectionId === sec.id)
      .map((it) => {
        let timeline = [it.startDate, it.endDate].filter(Boolean).join(' – ');
        if (preferences.maskDates && timeline) {
          const relative = formatRelativeTenure(it.startDate || '', it.endDate || '');
          timeline = relative;
        }

        const bullets: string[] = [];
        if (typeof it.description === 'string' && it.description.trim()) {
          bullets.push(redactString(it.description.trim()));
        }
        if (Array.isArray(it.bullets)) {
          it.bullets.forEach((b) => {
            if (typeof b === 'string' && b.trim()) {
              bullets.push(redactString(b.trim()));
            }
          });
        }

        return {
          title: redactString(it.title || ''),
          subtitle: redactString(it.subtitle || ''),
          timeline: timeline || undefined,
          bullets
        };
      });

    return {
      title: sec.title,
      items
    };
  });

  return {
    maskedPayload: {
      headline: profile?.headline ? redactString(profile.headline) : undefined,
      experiences: maskedExperiences,
      skills: skills.map((s) => ({
        category: s.category,
        name: redactString(s.name)
      })),
      customSections: maskedCustomSections.length > 0 ? maskedCustomSections : undefined
    },
    tokenMap,
    reverseTokenMap,
    categoryMap,
    companyMetadata
  };
}

/**
 * Rehydrates a masked string output by replacing tokens and attached metadata back to authentic values.
 * E.g., "__COMPANY_1__ [Industry: Enterprise Cloud]" -> "Acme Corporation"
 * "__COMPANY_1__" -> "Acme Corporation"
 * "__TIMELINE_1__ [Recent: 2 Years]" -> "2022-01 – Present"
 */
export function rehydrateText(text: string, tokenMap: Record<string, string>): string {
  if (!text) return '';
  let result = text;

  // Sort tokens by length in descending order to avoid prefix conflicts
  const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);

  for (const token of tokens) {
    const original = tokenMap[token];
    if (!original) continue;

    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. First replace token with attached bracketed context e.g. "__COMPANY_1__ [Industry: ...]" or "__TIMELINE_1__ [Recent: ...]"
    const contextRegex = new RegExp(`${escapedToken}\\s*\\[[^\\]]*\\]`, 'gi');
    result = result.replace(contextRegex, original);

    // 2. Then replace bare tokens e.g. "__COMPANY_1__"
    const bareRegex = new RegExp(`${escapedToken}`, 'g');
    result = result.replace(bareRegex, original);
  }

  // Also clean up any accidental leftover token artifacts like "__COMPANY_X__" if model invented one
  result = result.replace(/__COMPANY_\d+__(?:\s*\[[^\]]*\])?/gi, 'Company');
  result = result.replace(/__TIMELINE_\d+__(?:\s*\[[^\]]*\])?/gi, '');
  result = result.replace(/__CANDIDATE_NAME__/gi, 'Candidate');
  result = result.replace(/__INTERNAL_PROJECT_\d+__/gi, 'Internal Project');

  return result.trim();
}
