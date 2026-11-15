import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TailoredResume } from '../../types';
import { 
  BookmarkCheck, 
  Trash2, 
  ExternalLink, 
  Printer, 
  Calendar, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

interface SavedResumesViewProps {
  onOpenInStudio: (resume: TailoredResume) => void;
  onNavigateToTailor: () => void;
}

export const SavedResumesView: React.FC<SavedResumesViewProps> = ({
  onOpenInStudio,
  onNavigateToTailor
}) => {
  const savedResumes = useLiveQuery(() => 
    db.tailoredResumes.orderBy('updatedAt').reverse().toArray()
  );

  const [activePrintResume, setActivePrintResume] = useState<TailoredResume | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this saved resume?')) {
      await db.tailoredResumes.delete(id);
    }
  };

  const handlePrint = (resume: TailoredResume) => {
    setActivePrintResume(resume);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print">
      
      {/* Title */}
      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-6 w-6 text-zinc-900" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Saved Resumes</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Previously tailored resumes stored in your browser's IndexedDB. Re-open them to edit, tweak code, or export.
          </p>
        </div>
        <button
          onClick={onNavigateToTailor}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Tailor New Resume</span>
        </button>
      </div>

      {(!savedResumes || savedResumes.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
          <BookmarkCheck className="mx-auto h-10 w-10 text-zinc-300" />
          <h3 className="mt-3 text-sm font-semibold text-zinc-700">No saved resumes yet</h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
            When you tailor a resume or customize code in Resume Studio, click "Save" to keep versions here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedResumes.map(resume => (
            <div 
              key={resume.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 transition-all hover:shadow-md"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-zinc-900 leading-snug line-clamp-1">
                    {resume.title}
                  </h3>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-600 uppercase border border-zinc-200">
                    {resume.templateId}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(resume.updatedAt).toLocaleDateString()} at {new Date(resume.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* JD Excerpt if present */}
                {resume.jobDescription ? (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-600 border border-zinc-100">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">Target JD Excerpt</span>
                    <p className="line-clamp-3 italic text-[11px] leading-relaxed">
                      "{resume.jobDescription.slice(0, 150)}..."
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-zinc-400 italic">No job description linked.</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => handleDelete(resume.id)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Delete resume"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(resume)}
                    className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => onOpenInStudio(resume)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER */}
      {activePrintResume && (
        <div className="print-only-container hidden print:block">
          <style dangerouslySetInnerHTML={{ __html: activePrintResume.rawCss }} />
          <div dangerouslySetInnerHTML={{ __html: activePrintResume.rawHtml }} />
        </div>
      )}

    </div>
  );
};
