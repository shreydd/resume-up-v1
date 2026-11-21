import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveTailoredSession } from '../../db';
import { semanticMatcher } from '../../services/semanticMatcher';
import { 
  MatchedExperienceGroup, 
  ResumeData, 
  JobDescriptionAnalysis, 
  TailoredExperience,
  OpenRouterSettings,
  DEFAULT_SETTINGS,
  DEFAULT_OPENROUTER_MODEL,
  CURATED_MODELS
} from '../../types';
import { runTailoringPipeline, regenerateBullet, PipelineResult } from '../../services/openRouterService';
import { MaskingInspectorModal } from './MaskingInspectorModal';
import { BulletDiffCard } from './BulletDiffCard';
import { SettingsModal } from '../Settings/SettingsModal';
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
  Info,
  ShieldCheck,
  Zap,
  Key,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings as SettingsIcon,
  RotateCcw,
  Eye,
  TrendingUp,
  Award
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
  const customSections = useLiveQuery(() => db.customSections?.orderBy('order').toArray());
  const customSectionItems = useLiveQuery(() => db.customSectionItems?.toArray());
  const liveSettings = useLiveQuery(() => db.settings?.get('settings'));

  const activeSettings: OpenRouterSettings = liveSettings || DEFAULT_SETTINGS;

  // Active Mode: OpenRouter (Deep Reasoning) vs In-Browser WASM (Instant MiniLM)
  const [engineMode, setEngineMode] = useState<'openrouter' | 'wasm'>('openrouter');

  const [jobDescription, setJobDescription] = useState<string>('');
  const [topPerRole, setTopPerRole] = useState<number>(3);

  // WASM Matcher state
  const [isWasmAnalyzing, setIsWasmAnalyzing] = useState<boolean>(false);
  const [matchedGroups, setMatchedGroups] = useState<MatchedExperienceGroup[] | null>(null);

  // OpenRouter Pipeline state
  const [isOpenRouterRunning, setIsOpenRouterRunning] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressStep, setProgressStep] = useState<number>(1);
  const [streamSnippet, setStreamSnippet] = useState<string>('');
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // OpenRouter Tailored Results
  const [tailoredSessionData, setTailoredSessionData] = useState<{
    matchScore: number;
    analysis: JobDescriptionAnalysis;
    tailoredExperiences: TailoredExperience[];
    tokenMap: Record<string, string>;
  } | null>(null);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isInspectorModalOpen, setIsInspectorModalOpen] = useState<boolean>(false);

  const handleLoadSampleJD = (sampleText: string) => {
    setJobDescription(sampleText);
  };

  // --- WASM MATCHER EXECUTION ---
  const handleWasmAnalyze = async () => {
    if (!jobDescription.trim()) return;
    if (!experiences || experiences.length === 0 || !achievements || achievements.length === 0) {
      alert('Your Career Vault is empty. Please add or load experiences first.');
      return;
    }

    setIsWasmAnalyzing(true);
    try {
      const groups = await semanticMatcher.matchAchievements(
        jobDescription,
        experiences,
        achievements,
        topPerRole
      );
      setMatchedGroups(groups);
    } catch (err) {
      console.error('WASM matching failed:', err);
    } finally {
      setIsWasmAnalyzing(false);
    }
  };

  const handleToggleWasmAchievement = (groupIndex: number, itemIndex: number) => {
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

  // --- OPENROUTER DEEP PIPELINE EXECUTION ---
  const handleOpenRouterAnalyze = async () => {
    if (!jobDescription.trim()) return;
    if (!experiences || experiences.length === 0 || !achievements || achievements.length === 0) {
      alert('Your Career Vault is empty. Please add or load experiences first.');
      return;
    }

    if (!activeSettings.apiKey) {
      setIsSettingsModalOpen(true);
      return;
    }

    setIsOpenRouterRunning(true);
    setPipelineError(null);
    setStreamSnippet('');

    try {
      const result: PipelineResult = await runTailoringPipeline(
        jobDescription,
        experiences,
        achievements,
        profileList?.[0] || null,
        skills || [],
        customSections || [],
        customSectionItems || [],
        activeSettings,
        (stageName, step, total, stream) => {
          setProgressStage(stageName);
          setProgressStep(step);
          if (stream) {
            setStreamSnippet(stream.slice(-200));
          }
        }
      );

      setTailoredSessionData({
        matchScore: result.matchScore,
        analysis: result.analysis,
        tailoredExperiences: result.tailoredExperiences,
        tokenMap: result.maskingResult.tokenMap
      });
    } catch (err: any) {
      console.error('OpenRouter pipeline error:', err);
      setPipelineError(err.message || 'An error occurred during tailoring.');
    } finally {
      setIsOpenRouterRunning(false);
    }
  };

  // --- BULLET DIFF ACTIONS (OPENROUTER MODE) ---
  const handleToggleAcceptBullet = (expIdx: number, bulletIdx: number) => {
    if (!tailoredSessionData) return;
    const updatedExperiences = [...tailoredSessionData.tailoredExperiences];
    const exp = { ...updatedExperiences[expIdx] };
    const bullets = [...exp.bullets];
    bullets[bulletIdx] = {
      ...bullets[bulletIdx],
      accepted: !bullets[bulletIdx].accepted
    };
    exp.bullets = bullets;
    updatedExperiences[expIdx] = exp;

    setTailoredSessionData({
      ...tailoredSessionData,
      tailoredExperiences: updatedExperiences
    });
  };

  const handleUpdateBulletText = (expIdx: number, bulletIdx: number, newText: string) => {
    if (!tailoredSessionData) return;
    const updatedExperiences = [...tailoredSessionData.tailoredExperiences];
    const exp = { ...updatedExperiences[expIdx] };
    const bullets = [...exp.bullets];
    bullets[bulletIdx] = {
      ...bullets[bulletIdx],
      tailored: newText,
      accepted: true
    };
    exp.bullets = bullets;
    updatedExperiences[expIdx] = exp;

    setTailoredSessionData({
      ...tailoredSessionData,
      tailoredExperiences: updatedExperiences
    });
  };

  const handleRegenerateBullet = async (expIdx: number, bulletIdx: number) => {
    if (!tailoredSessionData) return;
    const exp = tailoredSessionData.tailoredExperiences[expIdx];
    const bullet = exp.bullets[bulletIdx];

    const result = await regenerateBullet(
      jobDescription,
      bullet.original,
      exp.role,
      exp.company,
      activeSettings,
      tailoredSessionData.tokenMap
    );

    const updatedExperiences = [...tailoredSessionData.tailoredExperiences];
    const targetExp = { ...updatedExperiences[expIdx] };
    const bullets = [...targetExp.bullets];
    bullets[bulletIdx] = {
      ...bullets[bulletIdx],
      tailored: result.tailored,
      reasoning: result.reasoning,
      accepted: true
    };
    targetExp.bullets = bullets;
    updatedExperiences[expIdx] = targetExp;

    setTailoredSessionData({
      ...tailoredSessionData,
      tailoredExperiences: updatedExperiences
    });
  };

  const handleRevertBullet = (expIdx: number, bulletIdx: number) => {
    if (!tailoredSessionData) return;
    const updatedExperiences = [...tailoredSessionData.tailoredExperiences];
    const exp = { ...updatedExperiences[expIdx] };
    const bullets = [...exp.bullets];
    bullets[bulletIdx] = {
      ...bullets[bulletIdx],
      tailored: bullets[bulletIdx].original,
      reasoning: 'Reverted to original unedited vault bullet.'
    };
    exp.bullets = bullets;
    updatedExperiences[expIdx] = exp;

    setTailoredSessionData({
      ...tailoredSessionData,
      tailoredExperiences: updatedExperiences
    });
  };

  // --- COMPILE ACTIONS ---
  const handleCompileWasmResume = () => {
    if (!matchedGroups) return;

    const profile = profileList?.[0] || {
      id: 1,
      fullName: 'Alex Mercer',
      email: 'alex@example.com',
      preferredTemplate: 'minimal'
    };

    const tailoredExperiences = matchedGroups.map(group => ({
      experience: group.experience,
      achievements: group.matchedAchievements
        .filter(item => item.included)
        .map(item => item.achievement)
    })).filter(group => group.achievements.length > 0);

    const packagedCustomSections = (customSections || []).map(sec => ({
      section: sec,
      items: (customSectionItems || []).filter(it => it.sectionId === sec.id)
    }));

    const tailoredData: ResumeData = {
      profile,
      experiences: tailoredExperiences,
      education: education || [],
      skills: skills || [],
      certifications: certifications || [],
      customSections: packagedCustomSections
    };

    onTailoredReady(tailoredData, jobDescription);
  };

  const handleCompileOpenRouterResume = async () => {
    if (!tailoredSessionData) return;

    const profile = profileList?.[0] || {
      id: 1,
      fullName: 'Alex Mercer',
      email: 'alex@example.com',
      preferredTemplate: 'minimal'
    };

    // Save session in Dexie for future insertion in Resume Studio
    await saveTailoredSession({
      timestamp: new Date().toISOString(),
      jobTitle: tailoredSessionData.analysis.role || 'Tailored Role',
      jobDescriptionText: jobDescription,
      modelUsed: activeSettings.defaultModel || DEFAULT_OPENROUTER_MODEL,
      matchScore: tailoredSessionData.matchScore,
      analysis: tailoredSessionData.analysis,
      tailoredExperiences: tailoredSessionData.tailoredExperiences
    });

    // Map accepted tailored bullets back to ResumeData structure
    const expMap = new Map((experiences || []).map(e => [e.id, e]));

    const compiledExperiences = tailoredSessionData.tailoredExperiences
      .map(tExp => {
        const authenticExp = expMap.get(tExp.experienceId) || {
          id: tExp.experienceId,
          company: tExp.company,
          role: tExp.role,
          startDate: '2022',
          isCurrent: true
        };

        const acceptedAchs = tExp.bullets
          .filter(b => b.accepted)
          .map((b, idx) => ({
            id: `ach-tailored-${tExp.experienceId}-${idx}`,
            experienceId: tExp.experienceId,
            originalText: b.tailored
          }));

        return {
          experience: authenticExp,
          achievements: acceptedAchs
        };
      })
      .filter(item => item.achievements.length > 0);

    const packagedCustomSections = (customSections || []).map(sec => ({
      section: sec,
      items: (customSectionItems || []).filter(it => it.sectionId === sec.id)
    }));

    const tailoredData: ResumeData = {
      profile,
      experiences: compiledExperiences,
      education: education || [],
      skills: skills || [],
      certifications: certifications || [],
      customSections: packagedCustomSections
    };

    onTailoredReady(tailoredData, jobDescription);
  };

  const totalVaultAchievements = achievements?.length || 0;
  const activeModelMeta = CURATED_MODELS.find(m => m.id === activeSettings.defaultModel);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print">
      
      {/* Page Title & Dual Mode Switcher */}
      <div className="mb-8 border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tailor with AI</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Deconstruct target job postings, analyze skills overlap, and align accomplishments using the Google XYZ Formula.
          </p>
        </div>

        {/* Dual Mode Switcher Pill */}
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 border border-zinc-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setEngineMode('openrouter')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              engineMode === 'openrouter'
                ? 'bg-white text-indigo-950 shadow-sm border border-indigo-100'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-indigo-600" />
            <span>OpenRouter Deep Reasoning</span>
          </button>

          <button
            type="button"
            onClick={() => setEngineMode('wasm')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              engineMode === 'wasm'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            <span>In-Browser WASM</span>
          </button>
        </div>
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
        
        {/* Left Column: Input Form & Mode Options */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-900">Target Job Description</label>
              <span className="text-[11px] text-zinc-400">{jobDescription.length} chars</span>
            </div>

            {/* Quick Sample JD Buttons */}
            <div className="space-y-1.5">
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
              placeholder="Paste target job description, qualifications, and core requirements here..."
              className="w-full rounded-xl border border-zinc-200 p-3.5 text-xs font-mono leading-relaxed text-zinc-800 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />

            {/* OpenRouter Mode Controls */}
            {engineMode === 'openrouter' && (
              <div className="space-y-3 pt-3 border-t border-zinc-100">
                
                {/* Active Model & Privacy Badge */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-semibold text-zinc-800">
                      {activeModelMeta ? activeModelMeta.name : (activeSettings.defaultModel || 'OpenRouter')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <SettingsIcon className="h-3 w-3" />
                    <span>Change Model / Key</span>
                  </button>
                </div>

                {/* API Key Missing Banner */}
                {!activeSettings.apiKey && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-2">
                    <div className="text-xs text-amber-900 space-y-0.5">
                      <span className="font-bold block">OpenRouter API Key Required</span>
                      <p className="text-[11px] text-amber-700 leading-normal">
                        Configure your key to run deep gap analysis and Google XYZ rewrites.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap transition-colors"
                    >
                      Configure Key
                    </button>
                  </div>
                )}

                {/* Privacy Inspector Drawer Trigger */}
                <div className="flex items-center justify-between rounded-xl bg-purple-50/60 border border-purple-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-700" />
                    <span className="text-xs font-medium text-purple-900">
                      Client-Side PII Masking Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInspectorModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-purple-200 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-50 transition-colors shadow-2xs"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Inspect Payload</span>
                  </button>
                </div>

                {/* OpenRouter Run CTA */}
                <button
                  type="button"
                  disabled={isOpenRouterRunning || !jobDescription.trim() || totalVaultAchievements === 0}
                  onClick={handleOpenRouterAnalyze}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.99]"
                >
                  {isOpenRouterRunning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{progressStage || 'Running 4-Stage Reasoning Pipeline...'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-indigo-200" />
                      <span>Run Deep Cognitive Tailoring</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* WASM Mode Controls */}
            {engineMode === 'wasm' && (
              <div className="space-y-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between">
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

                <button
                  type="button"
                  disabled={isWasmAnalyzing || !jobDescription.trim() || totalVaultAchievements === 0}
                  onClick={handleWasmAnalyze}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-[0.99]"
                >
                  {isWasmAnalyzing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Computing Semantic Embeddings...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span>Analyze & Match Achievements (WASM)</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Tailored Results Display */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* OPENROUTER MODE RESULTS */}
          {engineMode === 'openrouter' && (
            !tailoredSessionData ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center space-y-3">
                <Zap className="mx-auto h-10 w-10 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-700">Ready for Deep Cognitive Alignment</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Paste the target JD and run Deep Tailoring. The pipeline deconstructs requirements, produces a full gap matrix, and optimizes your bullets into Google XYZ format.
                </p>
                {isOpenRouterRunning && (
                  <div className="pt-4 max-w-md mx-auto space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-indigo-700">
                      <span>Step {progressStep} of 4:</span>
                      <span className="font-semibold">{progressStage}</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300"
                        style={{ width: `${(progressStep / 4) * 100}%` }}
                      />
                    </div>
                    {streamSnippet && (
                      <p className="text-[10px] font-mono text-zinc-400 truncate bg-zinc-100 p-2 rounded-lg text-left">
                        {streamSnippet}
                      </p>
                    )}
                  </div>
                )}
                {pipelineError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left max-w-md mx-auto">
                    {pipelineError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. GAP ANALYSIS SUMMARY CARD */}
                <div className="rounded-2xl border border-indigo-200/90 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-bold text-base text-zinc-900">
                          {tailoredSessionData.analysis.role || 'Target Role'}
                        </h3>
                        {tailoredSessionData.analysis.seniority && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/70">
                            {tailoredSessionData.analysis.seniority} Level
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">
                        Evaluated across technical stack, causality, and scale
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 border border-indigo-200 font-mono text-sm font-bold text-indigo-800">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <span>{tailoredSessionData.matchScore}% Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Assessment */}
                  {tailoredSessionData.analysis.summary && (
                    <p className="text-xs text-zinc-700 leading-relaxed font-sans bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/60">
                      {tailoredSessionData.analysis.summary}
                    </p>
                  )}

                  {/* Competency Badges Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    
                    {/* Verified Competencies */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified Matches</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {tailoredSessionData.analysis.matchedSkills?.map((skill, i) => (
                          <span key={i} className="rounded-md bg-emerald-100/80 text-emerald-900 px-2 py-0.5 text-[10px] font-mono font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Transferable Competencies */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-800 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Transferable</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {tailoredSessionData.analysis.transferableSkills?.map((skill, i) => (
                          <span key={i} className="rounded-md bg-indigo-100/80 text-indigo-900 px-2 py-0.5 text-[10px] font-mono font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Skill Gaps */}
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Identified Gaps</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {tailoredSessionData.analysis.missingSkills?.map((skill, i) => (
                          <span key={i} className="rounded-md bg-amber-100/80 text-amber-900 px-2 py-0.5 text-[10px] font-mono font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. COMPILE CTA TOP BAR */}
                <div className="flex items-center justify-between rounded-xl bg-indigo-600 text-white p-4 shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold">Google XYZ Achievements Ready</h4>
                    <p className="text-xs text-indigo-100 mt-0.5">
                      Review diff cards below. Accepted bullets will be compiled into Resume Studio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCompileOpenRouterResume}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-indigo-900 shadow hover:bg-zinc-100 transition-colors"
                  >
                    <span>Open in Resume Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 3. EXPERIENCE ROLE GROUPS & BULLET DIFF CARDS */}
                {tailoredSessionData.tailoredExperiences.map((tExp, expIdx) => {
                  const acceptedCount = tExp.bullets.filter(b => b.accepted).length;
                  return (
                    <div key={tExp.experienceId} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-zinc-500" />
                          <div>
                            <span className="font-bold text-sm text-zinc-900">{tExp.role}</span>
                            <span className="text-xs text-zinc-500 ml-1.5">@ {tExp.company}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-zinc-500 font-mono">
                          {acceptedCount} / {tExp.bullets.length} accepted
                        </span>
                      </div>

                      <div className="space-y-4">
                        {tExp.bullets.map((bullet, bulletIdx) => (
                          <BulletDiffCard
                            key={bullet.id || bulletIdx}
                            bullet={bullet}
                            company={tExp.company}
                            role={tExp.role}
                            onToggleAccept={() => handleToggleAcceptBullet(expIdx, bulletIdx)}
                            onUpdateTailoredText={(text) => handleUpdateBulletText(expIdx, bulletIdx, text)}
                            onRegenerate={() => handleRegenerateBullet(expIdx, bulletIdx)}
                            onRevertToOriginal={() => handleRevertBullet(expIdx, bulletIdx)}
                          />
                        ))}
                      </div>

                    </div>
                  );
                })}

                {/* Bottom Compile Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCompileOpenRouterResume}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-zinc-800 transition-colors"
                  >
                    <span>Open in Resume Studio with Tailored Bullets</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>
            )
          )}

          {/* WASM MODE RESULTS */}
          {engineMode === 'wasm' && (
            !matchedGroups ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-zinc-300" />
                <h3 className="mt-3 text-sm font-semibold text-zinc-700">Ready to Match (WASM)</h3>
                <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
                  Paste a Job Description on the left and click "Analyze & Match Achievements (WASM)".
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
                    onClick={handleCompileWasmResume}
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

                      <div className="space-y-3">
                        {group.matchedAchievements.map((item, aIdx) => {
                          const scorePct = Math.round(item.score * 100);
                          const isHigh = scorePct >= 80;
                          const isMed = scorePct >= 65 && scorePct < 80;

                          return (
                            <div
                              key={item.achievement.id}
                              onClick={() => handleToggleWasmAchievement(gIdx, aIdx)}
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
                                  onChange={() => handleToggleWasmAchievement(gIdx, aIdx)}
                                  onClick={e => e.stopPropagation()}
                                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                />

                                <div className="flex-1 space-y-1.5">
                                  <p className="font-medium text-zinc-900 leading-relaxed">
                                    {item.achievement.originalText}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono font-semibold ${
                                      isHigh 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : isMed
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                    }`}>
                                      {scorePct}% match
                                    </span>

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

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCompileWasmResume}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-zinc-800 transition-colors"
                  >
                    <span>Open in Resume Studio</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>
            )
          )}

        </div>

      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Masking Inspector Modal */}
      <MaskingInspectorModal
        isOpen={isInspectorModalOpen}
        onClose={() => setIsInspectorModalOpen(false)}
        onProceed={() => {
          setIsInspectorModalOpen(false);
          handleOpenRouterAnalyze();
        }}
        experiences={experiences || []}
        achievements={achievements || []}
        profile={profileList?.[0] || null}
        skills={skills || []}
        customSections={customSections || []}
        customItems={customSectionItems || []}
        settings={activeSettings}
      />

    </div>
  );
};
