import React, { useState } from 'react';
import { TailoredBullet } from '../../types';
import { 
  Check, 
  RotateCcw, 
  Edit3, 
  Sparkles, 
  Save, 
  X, 
  ArrowRight, 
  Quote,
  CheckCircle2
} from 'lucide-react';

interface BulletDiffCardProps {
  bullet: TailoredBullet;
  company: string;
  role: string;
  onToggleAccept: () => void;
  onUpdateTailoredText: (newText: string) => void;
  onRegenerate: () => Promise<void>;
  onRevertToOriginal: () => void;
}

export const BulletDiffCard: React.FC<BulletDiffCardProps> = ({
  bullet,
  company,
  role,
  onToggleAccept,
  onUpdateTailoredText,
  onRegenerate,
  onRevertToOriginal
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(bullet.tailored);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdateTailoredText(editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(bullet.tailored);
    setIsEditing(false);
  };

  const handleTriggerRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        bullet.accepted
          ? 'border-indigo-200/90 bg-indigo-50/20 shadow-xs'
          : 'border-zinc-200 bg-white opacity-85 hover:opacity-100'
      }`}
    >
      <div className="p-4 sm:p-5 space-y-3.5">
        
        {/* Top Header: Accept Toggle & Action Toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAccept}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                bullet.accepted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{bullet.accepted ? 'Accepted for Resume' : 'Accept Bullet'}</span>
            </button>

            <span className="text-[11px] font-medium text-zinc-400 hidden sm:inline">
              Google XYZ Formula
            </span>
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditText(bullet.tailored);
                    setIsEditing(true);
                  }}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                  title="Edit tailored bullet text"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={handleTriggerRegenerate}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                  title="Regenerate single bullet"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin text-indigo-600' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={onRevertToOriginal}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                  title="Revert to original vault bullet"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Diff Comparison: Stacked Layout */}
        <div className="grid grid-cols-1 gap-3">
          
          {/* 1. Original Vault Bullet */}
          <div className="rounded-xl bg-zinc-50/80 p-3 border border-zinc-200/60">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
              Original (Career Vault):
            </span>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              {bullet.original}
            </p>
          </div>

          {/* 2. Tailored Bullet (Google XYZ) */}
          <div className="rounded-xl bg-white p-3 border border-indigo-200/80 shadow-xs space-y-2">
            <span className="text-[10px] uppercase font-bold text-indigo-600 block">
              Tailored (Google XYZ Formula):
            </span>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full rounded-lg border border-indigo-300 p-2.5 text-xs text-zinc-900 font-sans focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    <X className="h-3 w-3" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Save className="h-3 w-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs font-medium text-zinc-950 leading-relaxed font-sans">
                {bullet.tailored}
              </p>
            )}

            {/* Rationale / Explanation */}
            {bullet.reasoning && !isEditing && (
              <div className="flex items-start gap-1.5 pt-1 text-[11px] text-zinc-500 border-t border-zinc-100">
                <Quote className="h-3 w-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="italic leading-normal">{bullet.reasoning}</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
