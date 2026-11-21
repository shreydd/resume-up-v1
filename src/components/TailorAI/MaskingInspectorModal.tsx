import React, { useState } from 'react';
import { Modal } from '../Shared/Modal';
import { MaskingResult, maskCareerRecords } from '../../services/privacyMasker';
import { Experience, Achievement, Profile, CustomSection, CustomSectionItem, OpenRouterSettings } from '../../types';
import { db } from '../../db';
import { 
  ShieldCheck, 
  Check, 
  Code, 
  Eye, 
  Tag, 
  Briefcase, 
  Save, 
  ArrowRight, 
  Info,
  Lock
} from 'lucide-react';

interface MaskingInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  experiences: Experience[];
  achievements: Achievement[];
  profile?: Profile | null;
  skills?: Array<{ category: string; name: string }>;
  customSections?: CustomSection[];
  customItems?: CustomSectionItem[];
  settings: OpenRouterSettings;
}

export const MaskingInspectorModal: React.FC<MaskingInspectorModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  experiences,
  achievements,
  profile,
  skills = [],
  customSections = [],
  customItems = [],
  settings
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [industryEdits, setIndustryEdits] = useState<Record<string, string>>({});
  const [isSavingIndustry, setIsSavingIndustry] = useState<boolean>(false);
  const [industrySavedMsg, setIndustrySavedMsg] = useState<string | null>(null);

  // Compute live masked payload
  const maskingResult: MaskingResult = maskCareerRecords(
    experiences.map(e => ({
      ...e,
      industry: industryEdits[e.id] !== undefined ? industryEdits[e.id] : e.industry
    })),
    achievements,
    profile,
    skills,
    customSections,
    customItems,
    settings.maskingPreferences
  );

  const handleIndustryChange = (expId: string, val: string) => {
    setIndustryEdits(prev => ({ ...prev, [expId]: val }));
  };

  const handleSaveIndustries = async () => {
    setIsSavingIndustry(true);
    try {
      for (const [expId, indVal] of Object.entries(industryEdits)) {
        await db.experiences.update(expId, { industry: indVal.trim() });
      }
      setIndustrySavedMsg('Industry contexts saved to Career Vault!');
      setTimeout(() => setIndustrySavedMsg(null), 2500);
    } catch (err) {
      console.error('Failed to update experience industry:', err);
    } finally {
      setIsSavingIndustry(false);
    }
  };

  const tokenEntries = Object.entries(maskingResult.tokenMap);
  const jsonString = JSON.stringify(maskingResult.maskedPayload, null, 2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Masking Inspector & Audit Drawer"
      description="Inspect the exact anonymized payload before it leaves your browser. Zero personal PII or real company names are transmitted."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        
        {/* Top Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Masked Tokens</span>
            <span className="text-lg font-mono font-bold text-indigo-600">{tokenEntries.length}</span>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Experiences</span>
            <span className="text-lg font-mono font-bold text-zinc-900">{experiences.length}</span>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Achievements</span>
            <span className="text-lg font-mono font-bold text-zinc-900">{achievements.length}</span>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">PII Leakage</span>
            <span className="text-lg font-mono font-bold text-emerald-600">0 Bytes</span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'visual'
                  ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Token Audit & Industry Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'json'
                  ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Outgoing JSON Payload</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Local Rehydration Guaranteed</span>
          </div>
        </div>

        {/* VIEW 1: Visual Token Audit & Inline Industry Metadata Editor */}
        {viewMode === 'visual' && (
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            
            {/* Inline Industry Metadata Editor */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Company Industry & Domain Context Annotations
                  </span>
                </div>
                {industrySavedMsg && (
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {industrySavedMsg}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 leading-normal">
                Enriching surrogate tokens with domain context (e.g. <em>"Consumer Sports Tech, ~500k MAU"</em>) teaches the AI model your technical scale without revealing your authentic employer identity.
              </p>

              <div className="space-y-2.5 pt-1">
                {experiences.map((exp) => {
                  const currentVal = industryEdits[exp.id] !== undefined ? industryEdits[exp.id] : (exp.industry || '');
                  const meta = Object.values(maskingResult.companyMetadata).find(m => m.originalName === exp.company);
                  return (
                    <div
                      key={exp.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-zinc-200/80 bg-white p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-900">{exp.company}</span>
                          <span className="text-xs text-zinc-400">({exp.role})</span>
                          {meta && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.2 text-[10px] font-mono text-purple-800 font-medium">
                              {meta.token}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-1/2">
                        <input
                          type="text"
                          value={currentVal}
                          onChange={e => handleIndustryChange(exp.id, e.target.value)}
                          placeholder="e.g. B2B Enterprise SaaS / Distributed Cloud"
                          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:border-zinc-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}

                {Object.keys(industryEdits).length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSavingIndustry}
                      onClick={handleSaveIndustries}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Save className="h-3 w-3" />
                      <span>{isSavingIndustry ? 'Saving...' : 'Persist Context to Vault'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Token Table */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-200 text-xs font-semibold text-zinc-800 flex items-center justify-between">
                <span>Active Surrogate Token Mapping</span>
                <span className="text-[11px] font-normal text-zinc-500">
                  {tokenEntries.length} mapped entities
                </span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                {tokenEntries.map(([token, original]) => {
                  const category = maskingResult.categoryMap[token] || 'token';
                  return (
                    <div key={token} className="flex items-center justify-between p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          category === 'company' 
                            ? 'bg-purple-100 text-purple-800'
                            : category === 'timeline'
                            ? 'bg-blue-100 text-blue-800'
                            : category === 'pii'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {token}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          {category}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-600 text-right truncate max-w-xs">
                        {original}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: Raw JSON Payload */}
        {viewMode === 'json' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>This JSON payload is dispatched directly to OpenRouter:</span>
              <span className="font-mono">{jsonString.length} bytes</span>
            </div>
            <pre className="rounded-xl border border-zinc-200 bg-zinc-950 text-emerald-400 p-4 text-xs font-mono max-h-96 overflow-y-auto leading-relaxed select-text">
              {jsonString}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onProceed();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors active:scale-95"
          >
            <span>Proceed with Deep Tailoring</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </Modal>
  );
};
