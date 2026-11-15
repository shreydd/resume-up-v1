import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import type { EditorView } from '@codemirror/view';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { ResumeData, TailoredResume } from '../../types';
import { renderTemplate, TEMPLATES } from '../../templates';
import { db } from '../../db';
import { Modal } from '../Shared/Modal';
import { CURATED_FONTS, loadGoogleFontOnDemand, applyFontToCSS } from './fontOptions';
import { InsertVaultDataModal } from './InsertVaultDataModal';
import { 
  Printer, 
  Columns, 
  Eye, 
  RotateCcw, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Code2, 
  Check, 
  FileCheck,
  Type,
  Database,
  PlusCircle
} from 'lucide-react';

interface ResumeStudioViewProps {
  initialResumeData: ResumeData | null;
  initialJobDescription?: string;
  savedResume?: TailoredResume | null;
  onSaved?: () => void;
}

export const ResumeStudioView: React.FC<ResumeStudioViewProps> = ({
  initialResumeData,
  initialJobDescription = '',
  savedResume = null,
  onSaved
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'jake' | 'minimal' | 'custom'>('jake');
  const [selectedFontId, setSelectedFontId] = useState<string>('computer-modern');
  const [viewMode, setViewMode] = useState<'split' | 'preview'>('split');
  const [codeTab, setCodeTab] = useState<'html' | 'css'>('html');
  const [zoomLevel, setZoomLevel] = useState<number>(70);

  const [rawHtml, setRawHtml] = useState<string>('');
  const [rawCss, setRawCss] = useState<string>('');
  const [liveHtml, setLiveHtml] = useState<string>('');
  const [liveCss, setLiveCss] = useState<string>('');

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('Tailored Resume');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Auto adjust default zoom when toggling split vs preview mode
  useEffect(() => {
    if (viewMode === 'split') {
      setZoomLevel(70);
    } else {
      setZoomLevel(95);
    }
  }, [viewMode]);

  const handleFitWidth = () => {
    if (canvasContainerRef.current) {
      const availableWidth = canvasContainerRef.current.clientWidth - 48;
      const fitZoom = Math.min(130, Math.max(45, Math.floor((availableWidth / 794) * 100)));
      setZoomLevel(fitZoom);
    }
  };

  // Font change with on-demand loading
  const handleFontChange = (fontId: string) => {
    setSelectedFontId(fontId);
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font) return;

    // Dynamically inject Google Font into head if needed
    loadGoogleFontOnDemand(font);

    // Update CSS
    const updated = applyFontToCSS(rawCss, font);
    setRawCss(updated);
    setLiveCss(updated);
    showToast(`Loaded font: ${font.name}`);
  };

  // Insert snippet from DB at cursor position
  const handleInsertSnippet = (snippet: string) => {
    const view = editorViewRef.current;
    if (view && codeTab === 'html') {
      const range = view.state.selection.main;
      view.dispatch({
        changes: {
          from: range.from,
          to: range.to,
          insert: snippet
        },
        selection: { anchor: range.from + snippet.length }
      });
      view.focus();
      const updated = view.state.doc.toString();
      setRawHtml(updated);
      setLiveHtml(updated);
    } else {
      setRawHtml(prev => prev + '\n' + snippet);
      setLiveHtml(prev => prev + '\n' + snippet);
    }
    showToast('Inserted from Career Vault');
  };

  // Initialize or update template when resumeData, savedResume or template changes
  useEffect(() => {
    if (savedResume) {
      setSelectedTemplate(savedResume.templateId);
      setResumeTitle(savedResume.title);
      setRawHtml(savedResume.rawHtml);
      setRawCss(savedResume.rawCss);
      setLiveHtml(savedResume.rawHtml);
      setLiveCss(savedResume.rawCss);
      return;
    }
    if (!initialResumeData) return;
    const { html: genHtml, css: genCss } = renderTemplate(selectedTemplate, initialResumeData);
    
    // Apply selected font if non-default
    const font = CURATED_FONTS.find(f => f.id === selectedFontId);
    const finalCss = font ? applyFontToCSS(genCss, font) : genCss;

    setRawHtml(genHtml);
    setRawCss(finalCss);
    setLiveHtml(genHtml);
    setLiveCss(finalCss);
  }, [selectedTemplate, initialResumeData, savedResume]);

  // Debounced live preview update
  const handleHtmlChange = (val: string) => {
    setRawHtml(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setLiveHtml(val);
    }, 250);
  };

  const handleCssChange = (val: string) => {
    setRawCss(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setLiveCss(val);
    }, 250);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetTemplate = () => {
    if (!initialResumeData) return;
    if (confirm('Reset HTML & CSS code to the default template? Any custom code edits will be discarded.')) {
      const { html: genHtml, css: genCss } = renderTemplate(selectedTemplate, initialResumeData);
      setRawHtml(genHtml);
      setRawCss(genCss);
      setLiveHtml(genHtml);
      setLiveCss(genCss);
      showToast('Reset to original template');
    }
  };

  const handleSaveToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeTitle.trim()) return;

    const newId = `resume-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.tailoredResumes.put({
      id: newId,
      title: resumeTitle.trim(),
      jobDescription: initialJobDescription,
      templateId: selectedTemplate,
      rawHtml,
      rawCss,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    setIsSaveModalOpen(false);
    showToast('Saved to My Resumes');
    if (onSaved) onSaved();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white shadow-xl animate-fade-in border border-zinc-800">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action & Formatting Bar */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 sm:px-6 no-print">
        
        {/* Template & Font Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Template:</label>
            <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
              {(['jake', 'minimal', 'custom'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTemplate(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    selectedTemplate === t
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {TEMPLATES[t]?.name || t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

          {/* Font Selector (On-Demand Google Fonts) */}
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-zinc-400" />
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:inline">Font:</label>
            <select
              value={selectedFontId}
              onChange={(e) => handleFontChange(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer shadow-sm"
            >
              <optgroup label="── Traditional & Academic Serif ──">
                {CURATED_FONTS.filter(f => f.category === 'Serif').map(font => (
                  <option key={font.id} value={font.id}>{font.name}</option>
                ))}
              </optgroup>
              <optgroup label="── Modern Tech & Corporate Sans ──">
                {CURATED_FONTS.filter(f => f.category === 'Sans-Serif').map(font => (
                  <option key={font.id} value={font.id}>{font.name}</option>
                ))}
              </optgroup>
              <optgroup label="── Engineering & Systems Mono ──">
                {CURATED_FONTS.filter(f => f.category === 'Monospace').map(font => (
                  <option key={font.id} value={font.id}>{font.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

        </div>

        {/* View Mode Toggle & Zoom */}
        <div className="flex items-center gap-2">
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 border border-zinc-200 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(40, prev - 5))}
              className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-200/60 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] w-9 text-center font-medium text-zinc-800">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 5))}
              className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-200/60 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <div className="h-3.5 w-px bg-zinc-300 mx-0.5" />
            <button
              onClick={handleFitWidth}
              className="px-1.5 py-0.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 rounded text-[11px] font-medium transition-colors"
              title="Fit to Width"
            >
              Fit
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-1.5 py-0.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 rounded text-[11px] font-medium transition-colors"
              title="100% Scale"
            >
              100%
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          {/* View Mode */}
          <div className="flex items-center rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Dual-Pane</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'preview'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetTemplate}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            title="Reset to Template Default"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Save button */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            <Save className="h-3.5 w-3.5 text-zinc-500" />
            <span>Save</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>

        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 bg-zinc-100 overflow-hidden no-print">
        
        {/* Left Pane: CodeMirror Editor (Only in Split Mode) */}
        {viewMode === 'split' && (
          <div className="lg:col-span-6 flex flex-col h-full min-h-0 min-w-0 border-r border-zinc-200 bg-zinc-900 text-zinc-200 no-print">
            
            {/* Editor Subheader Tabs */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-300">Live Editor</span>
                </div>

                {/* Insert from DB Button */}
                <button
                  type="button"
                  onClick={() => setIsInsertModalOpen(true)}
                  className="flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm transition-colors active:scale-95"
                  title="Browse and insert text/bullets from Career Vault into editor (or double-click editor)"
                >
                  <Database className="h-3 w-3" />
                  <span>Insert from DB</span>
                </button>
              </div>

              <div className="flex items-center gap-1 rounded bg-zinc-900 p-0.5 border border-zinc-800">
                <button
                  onClick={() => setCodeTab('html')}
                  className={`rounded px-2.5 py-0.5 text-xs font-mono transition-all ${
                    codeTab === 'html' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setCodeTab('css')}
                  className={`rounded px-2.5 py-0.5 text-xs font-mono transition-all ${
                    codeTab === 'css' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  CSS
                </button>
              </div>
            </div>

            {/* CodeMirror Surface */}
            <div 
              className="flex-1 min-h-0 overflow-auto cursor-text"
              onDoubleClick={() => setIsInsertModalOpen(true)}
              title="Double-click to open Career Vault inserter"
            >
              <CodeMirror
                onCreateEditor={(view) => {
                  editorViewRef.current = view;
                }}
                value={codeTab === 'html' ? rawHtml : rawCss}
                height="100%"
                theme={oneDark}
                extensions={codeTab === 'html' ? [html()] : [css()]}
                onChange={codeTab === 'html' ? handleHtmlChange : handleCssChange}
                className="h-full text-xs font-mono"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  autocompletion: true,
                }}
              />
            </div>

          </div>
        )}

        {/* Right Pane: Live Render Canvas */}
        <div 
          ref={canvasContainerRef}
          className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col h-full min-h-0 min-w-0 overflow-auto bg-zinc-200/70 p-4 sm:p-8`}
        >
          <div className="w-fit min-w-full my-0 mx-auto pb-28 flex justify-center items-start">
            <div 
              className="transition-transform duration-100 origin-top shadow-xl"
              style={{ zoom: zoomLevel / 100 }}
            >
              {/* Inject dynamic CSS */}
              <style dangerouslySetInnerHTML={{ __html: liveCss }} />
              
              {/* Live rendered HTML container */}
              <div 
                id="resume-live-canvas"
                dangerouslySetInnerHTML={{ __html: liveHtml }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* HIDDEN PRINT-ONLY CONTAINER (for window.print vector output) */}
      <div className="print-only-container hidden print:block">
        <style dangerouslySetInnerHTML={{ __html: liveCss }} />
        <div dangerouslySetInnerHTML={{ __html: liveHtml }} />
      </div>

      {/* SAVE RESUME MODAL */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Tailored Resume"
        description="Save this resume version in your local IndexedDB for future reference or exports."
      >
        <form onSubmit={handleSaveToDb} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Resume Title *</label>
            <input
              type="text"
              required
              value={resumeTitle}
              onChange={e => setResumeTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer - Acme Corp"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save to Database
            </button>
          </div>
        </form>
      </Modal>

      {/* INSERT VAULT DATA MODAL */}
      <InsertVaultDataModal
        isOpen={isInsertModalOpen}
        onClose={() => setIsInsertModalOpen(false)}
        onInsert={handleInsertSnippet}
      />

    </div>
  );
};
