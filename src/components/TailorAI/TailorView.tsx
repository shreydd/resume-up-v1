import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { semanticMatcher } from '../../services/semanticMatcher';
import { MatchedExperienceGroup, ResumeData } from '../../types';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Briefcase, 
  FileText, 
  Sliders, 
  Tag, 
  Quote, 
  Layers,
  Info
} from 'lucide-react';

interface TailorViewProps {
  onTailoredReady: (tailoredData: ResumeData, targetJdText: string) => void;
  onNavigateToVault: () => void;
}

const SAMPLE_JDS = [
  {
    title: "Senior Backend & Distributed Systems Engineer",
    text: `Job Description: Senior Backend Engineer
We are seeking an experienced Backend Engineer to lead development of our distributed event streaming architecture.
Responsibilities:
• Architect, build and maintain high-throughput streaming pipelines processing 50M+ events daily with low latency.
• Optimize relational databases (PostgreSQL) and caching systems (Redis) to reduce p99 query latency.
• Lead technical design reviews, mentor junior and mid-level engineers, and champion engineering best practices.
• Ensure enterprise security, SOC-2 compliance, and robust authentication/authorization protocols (OAuth2, RBAC).
Requirements:
• 5+ years building backend microservices in Go, Java, or Python.
• Strong experience with Apache Kafka, message brokers, and event-driven architectures.
• Deep understanding of distributed caching, SQL optimization, and performance profiling.`
  },
  {
    title: "Lead Full Stack & Frontend Engineer",
    text: `Job Description: Lead Full Stack Engineer
Looking for a full stack engineer with a strong frontend focus to build web applications used by enterprise clients.
Key Responsibilities:
• Build modern, accessible, and responsive user interfaces using React, TypeScript, and Tailwind CSS.
• Design automated CI/CD pipelines (GitHub Actions) to enable daily continuous delivery cycles.
• Collaborate with design and product teams to translate complex business workflows into intuitive client dashboards.
• Integrate frontend clients with backend microservices and REST/GraphQL APIs.
Requirements:
• Proficiency in TypeScript, React, and modern state management.
• Proven track record architecting CI/CD and DevOps workflows.
• Experience scaling applications to 100k+ monthly active enterprise users.`
  }
];

export const TailorView: React.FC<TailorViewProps> = ({ onTailoredReady, onNavigateToVault }) => {
  const experiences = useLiveQuery(() => db.experiences.orderBy('startDate').reverse().toArray());
  const achievements = useLiveQuery(() => db.achievements.toArray());
  const profileList = useLiveQuery(() => db.profile.toArray());
  const education = useLiveQuery(() => db.education.toArray());
  const skills = useLiveQuery(() => db.skills.toArray());
  const certifications = useLiveQuery(() => db.certifications.toArray());

  const [jobDescription, setJobDescription] = useState<string>('');
  const [topPerRole, setTopPerRole] = useState<number>(3);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [matchedGroups, setMatchedGroups] = useState<MatchedExperienceGroup[] | null>(null);

  const handleLoadSampleJD = (sampleText: string) => {
    setJobDescription(sampleText);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    if (!experiences || experiences.length === 0 || !achievements || achievements.length === 0) {
      alert('Your Career Vault is empty. Please add or load experiences first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const groups = await semanticMatcher.matchAchievements(
        jobDescription,
        experiences,
        achievements,
        topPerRole
      );
      setMatchedGroups(groups);
    } catch (err) {
      console.error('Matching failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleAchievement = (groupIndex: number, itemIndex: number) => {
    if (!matchedGroups) return;
    const updated = [...matchedGroups];
    const group = { ...updated[groupIndex] };
    const items = [...group.matchedAchievements];
    items[itemIndex] = {
      ...items[itemIndex],
      included: !items[itemIndex].included
    };
    group.matchedAchievements = items;
    updated[groupIndex] = group;
    setMatchedGroups(updated);
  };

  const handleCompileResume = () => {
    if (!matchedGroups) return;

    const profile = profileList?.[0] || {
      id: 1,
      fullName: 'Alex Mercer',
      email: 'alex@example.com',
      preferredTemplate: 'jake'
    };

    const tailoredExperiences = matchedGroups.map(group => ({
      experience: group.experience,
      achievements: group.matchedAchievements
        .filter(item => item.included)
        .map(item => item.achievement)
    })).filter(group => group.achievements.length > 0);

    const tailoredData: ResumeData = {
      profile,
      experiences: tailoredExperiences,
      education: education || [],
      skills: skills || [],
      certifications: certifications || []
    };

    onTailoredReady(tailoredData, jobDescription);
  };

  const totalVaultAchievements = achievements?.length || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print">
      
      {/* Page Title */}
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tailor with In-Browser AI</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Paste any Job Description. The client-side embedding model compares every bullet in your vault against the JD's requirements and ranks them by cosine similarity.
        </p>
      </div>

      {/* Vault Empty Warning */}
      {totalVaultAchievements === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600" />
            <p className="text-xs text-amber-800">
              Your Career Vault is currently empty. Add experiences or load sample data to begin tailoring.
            </p>
          </div>
          <button
            onClick={onNavigateToVault}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Go to Vault
          </button>
        </div>
      )}

      {/* Main Grid: JD Input & Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-zinc-900">Target Job Description</label>
              <span className="text-[11px] text-zinc-400">{jobDescription.length} chars</span>
            </div>

            {/* Quick Sample JD Buttons */}
            <div className="mb-3 space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 block">Quick Test Samples:</span>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_JDS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSampleJD(sample.text)}
                    className="text-left rounded-lg border border-zinc-200 bg-zinc-50/70 p-2 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 transition-colors"
                  >
                    <span className="font-semibold text-zinc-900 block">{sample.title}</span>
                    <span className="text-[10px] text-zinc-500 line-clamp-1">{sample.text.slice(0, 80)}...</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={11}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description, responsibilities, and requirements here..."
              className="w-full rounded-xl border border-zinc-200 p-3.5 text-xs font-mono leading-relaxed text-zinc-800 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />

            {/* Configuration */}
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-700">Bullets per role:</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
                {[2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTopPerRole(num)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      topPerRole === num
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              disabled={isAnalyzing || !jobDescription.trim() || totalVaultAchievements === 0}
              onClick={handleAnalyze}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Computing Semantic Embeddings...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Analyze & Match Achievements</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Matched Achievements Results */}
        <div className="lg:col-span-7 space-y-6">
          {!matchedGroups ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-zinc-300" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-700">Ready to Match</h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
                Paste a Job Description or choose a quick test sample on the left, then click "Analyze & Match Achievements".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Compile CTA Bar */}
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">Achievements Ranked & Filtered</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Top {topPerRole} bullets auto-selected per role. Adjust checkboxes below or compile directly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCompileResume}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
                >
                  <span>Compile into Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Matched Roles List */}
              {matchedGroups.map((group, gIdx) => {
                const selectedCount = group.matchedAchievements.filter(m => m.included).length;
                return (
                  <div key={group.experience.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    
                    {/* Role Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-zinc-500" />
                        <div>
                          <span className="font-bold text-sm text-zinc-900">{group.experience.role}</span>
                          <span className="text-xs text-zinc-500 ml-1.5">@ {group.experience.company}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">
                        {selectedCount} selected
                      </span>
                    </div>

                    {/* Ranked Bullets */}
                    <div className="space-y-3">
                      {group.matchedAchievements.map((item, aIdx) => {
                        const scorePct = Math.round(item.score * 100);
                        const isHigh = scorePct >= 80;
                        const isMed = scorePct >= 65 && scorePct < 80;

                        return (
                          <div
                            key={item.achievement.id}
                            onClick={() => handleToggleAchievement(gIdx, aIdx)}
                            className={`cursor-pointer rounded-xl p-3.5 text-xs transition-all border ${
                              item.included
                                ? 'bg-zinc-50/90 border-zinc-300 shadow-sm'
                                : 'bg-white border-zinc-100 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={item.included}
                                onChange={() => handleToggleAchievement(gIdx, aIdx)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />

                              <div className="flex-1 space-y-1.5">
                                <p className="font-medium text-zinc-900 leading-relaxed">
                                  {item.achievement.originalText}
                                </p>

                                {/* Match Breakdown / Explanation */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                  {/* Score Badge */}
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono font-semibold ${
                                    isHigh 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : isMed
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                  }`}>
                                    {scorePct}% match
                                  </span>

                                  {/* Matched Keywords */}
                                  {item.matchedKeywords.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Tag className="h-3 w-3 text-zinc-400" />
                                      {item.matchedKeywords.slice(0, 4).map((kw, i) => (
                                        <span key={i} className="rounded bg-zinc-200/60 px-1.5 py-0.2 font-mono text-[10px] text-zinc-700">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {item.bestMatchingRequirement && (
                                  <div className="flex items-start gap-1.5 text-[11px] text-zinc-500 pt-1 border-t border-zinc-100/80">
                                    <Quote className="h-3 w-3 text-zinc-400 flex-shrink-0 mt-0.5" />
                                    <span className="italic line-clamp-1">Matches: "{item.bestMatchingRequirement}"</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}

              {/* Bottom Compile Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCompileResume}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-zinc-800 transition-colors"
                >
                  <span>Open in Resume Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
