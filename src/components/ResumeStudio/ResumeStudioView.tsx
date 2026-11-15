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
  PlusCircle,
  Scissors,
  AlertTriangle,
  FileText,
  Layers
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

  // Page measurement & visual break indicators
  const [pageCount, setPageCount] = useState<number>(1);
  const [overflowRatio, setOverflowRatio] = useState<number>(1);
  const [showPageGuides, setShowPageGuides] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<number>(1);
  const [onePagePx, setOnePagePx] = useState<number>(1122.5);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('Tailored Resume');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  // Measure A4 page height and content bounds
  const measureSheet = () => {
    if (!probeRef.current) return;
    const probeHeight = probeRef.current.offsetHeight || 1122.5;
    setOnePagePx(probeHeight);

    const sheetEl = document.querySelector('#resume-live-canvas .resume-sheet') as HTMLElement | null;
    if (!sheetEl) return;

    let maxChildBottom = 0;
    const allDescendants = sheetEl.querySelectorAll('header, section, div, p, ul, h1, h2, h3, li');
    const sheetRect = sheetEl.getBoundingClientRect();
    const currentScale = zoomLevel / 100;

    allDescendants.forEach((node) => {
      const el = node as HTMLElement;
      if (el.closest('.page-guide-overlay')) return;
      const rect = el.getBoundingClientRect();
      const bottomRelative = (rect.bottom - sheetRect.top) / currentScale;
      if (bottomRelative > maxChildBottom) {
        maxChildBottom = bottomRelative;
      }
    });

    // Add padding bottom buffer (~16mm in px ~ 60px)
    const paddingBuffer = 60;
    const actualHeight = Math.max(100, maxChildBottom + paddingBuffer);

    const ratio = Math.max(0.1, actualHeight / probeHeight);
    const count = Math.max(1, Math.ceil(actualHeight / probeHeight));

    setOverflowRatio(Number(ratio.toFixed(2)));
    setPageCount(count);
  };

  const scrollToPage = (pageNum: number) => {
    if (!canvasContainerRef.current) return;
    const targetY = (pageNum - 1) * onePagePx * (zoomLevel / 100);
    canvasContainerRef.current.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
    setActivePage(pageNum);
  };

  const handleCanvasScroll = () => {
    if (!canvasContainerRef.current) return;
    const scrollY = canvasContainerRef.current.scrollTop;
    const pagePxZoomed = onePagePx * (zoomLevel / 100);
    const currentPage = Math.min(pageCount, Math.max(1, Math.floor((scrollY + 50) / pagePxZoomed) + 1));
    setActivePage(currentPage);
  };

  // Re-measure when live content, css, or zoom changes
  useEffect(() => {
    const timer = setTimeout(() => {
      measureSheet();
    }, 100);

    const sheetEl = document.querySelector('#resume-live-canvas .resume-sheet');
    if (sheetEl) {
      const ro = new ResizeObserver(() => {
        measureSheet();
      });
      ro.observe(sheetEl);
      return () => {
        clearTimeout(timer);
        ro.disconnect();
      };
    }

    // Also re-measure when fonts finish loading
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measureSheet();
      });
    }

    return () => clearTimeout(timer);
  }, [liveHtml, liveCss, zoomLevel]);

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

        {/* Live Page Status & Guides Toggle */}
        <div className="flex items-center gap-2">
          {pageCount === 1 ? (
            <div 
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800 shadow-sm"
              title={`Single-page resume. Content utilizes ~${Math.round(overflowRatio * 100)}% of standard A4 height.`}
            >
              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold">1 Page</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-1 rounded">
                {Math.round(overflowRatio * 100)}% full
              </span>
            </div>
          ) : overflowRatio <= 1.25 ? (
            <button
              type="button"
              onClick={() => scrollToPage(2)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100 transition-all cursor-pointer group"
              title="Warning: Content spills slightly onto Page 2. Click to jump to the page break line."
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform animate-pulse" />
              <span>~{overflowRatio} Pages</span>
              <span className="rounded bg-amber-200/90 px-1 py-0.2 text-[10px] font-medium text-amber-900">
                Spilling
              </span>
            </button>
          ) : (
            <div 
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-900 shadow-sm"
              title={`${pageCount}-page resume (~${overflowRatio} A4 heights)`}
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-semibold">{pageCount} Pages</span>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-1 rounded">
                ~{overflowRatio} A4
              </span>
            </div>
          )}

          {/* Toggle Guides Button */}
          <button
            type="button"
            onClick={() => setShowPageGuides(prev => !prev)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors shadow-sm ${
              showPageGuides
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
            title="Toggle visual page break guide lines and boundaries on preview canvas"
          >
            <Scissors className="h-3 w-3" />
            <span className="hidden md:inline">Guides:</span>
            <span className="font-semibold">{showPageGuides ? 'ON' : 'OFF'}</span>
          </button>
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
          onScroll={handleCanvasScroll}
          className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col h-full min-h-0 min-w-0 overflow-auto bg-zinc-200/70 p-4 sm:p-8 relative`}
        >
          <div className="w-fit min-w-full my-0 mx-auto pb-28 flex justify-center items-start">
            <div 
              className="transition-transform duration-100 origin-top shadow-xl relative"
              style={{ zoom: zoomLevel / 100 }}
            >
              {/* Inject dynamic CSS */}
              <style dangerouslySetInnerHTML={{ __html: liveCss }} />
              
              {/* Live rendered HTML container */}
              <div 
                id="resume-live-canvas"
                style={{ ['--page-count' as any]: pageCount }}
                dangerouslySetInnerHTML={{ __html: liveHtml }}
              />

              {/* Page Break & Boundary Visual Indicators */}
              {showPageGuides && (
                <div 
                  className="page-guide-overlay pointer-events-none absolute inset-0 w-full no-print"
                  style={{ height: `${pageCount * 297}mm` }}
                >
                  {/* Page number watermark tags for each page */}
                  {Array.from({ length: pageCount }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <div
                        key={`page-tag-${pageNum}`}
                        className="absolute left-3 flex items-center gap-1.5 rounded-md bg-zinc-900/80 text-white px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur border border-zinc-700/60 z-10"
                        style={{ top: `${(pageNum - 1) * 297 + 5}mm` }}
                      >
                        <FileText className="h-2.5 w-2.5 text-indigo-400" />
                        <span className="font-semibold tracking-wide">PAGE {pageNum}</span>
                        <span className="text-[9px] text-zinc-300 font-mono">
                          ({(pageNum - 1) * 297}–{pageNum * 297}mm)
                        </span>
                      </div>
                    );
                  })}

                  {/* Boundaries for every page */}
                  {Array.from({ length: pageCount }).map((_, idx) => {
                    const k = idx + 1;
                    const isLast = k === pageCount;

                    if (!isLast) {
                      // Active Page Break between Page k and Page k+1
                      return (
                        <div
                          key={`break-${k}`}
                          className="absolute left-0 right-0 flex items-center justify-center -translate-y-1/2 z-20"
                          style={{ top: `${k * 297}mm` }}
                        >
                          {/* Left scissor badge on sheet edge */}
                          <div className="absolute -left-3.5 flex items-center justify-center h-7 w-7 rounded-full bg-rose-600 text-white shadow-md ring-2 ring-white">
                            <Scissors className="h-3.5 w-3.5" />
                          </div>

                          {/* Dashed line across resume */}
                          <div className="w-full border-t-2 border-dashed border-rose-500 shadow-sm" />

                          {/* Center badge */}
                          <div className="absolute flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-1 text-[11px] font-bold text-white shadow-lg ring-2 ring-white tracking-wide">
                            <Scissors className="h-3 w-3" />
                            <span>PAGE BREAK • Page {k} End / Page {k + 1} Start</span>
                            <span className="bg-rose-700/80 rounded px-1.5 py-0.2 text-[10px] font-mono">
                              ({k * 297}mm)
                            </span>
                          </div>

                          {/* Right scissor badge on sheet edge */}
                          <div className="absolute -right-3.5 flex items-center justify-center h-7 w-7 rounded-full bg-rose-600 text-white shadow-md ring-2 ring-white">
                            <Scissors className="h-3.5 w-3.5 -scale-x-100" />
                          </div>
                        </div>
                      );
                    }

                    // End of document boundary (Page 1 Limit or Page N Limit)
                    return (
                      <div
                        key={`end-${k}`}
                        className="absolute left-0 right-0 flex items-center justify-center -translate-y-1/2 z-20"
                        style={{ top: `${k * 297}mm` }}
                      >
                        {k === 1 ? (
                          <>
                            <div className="w-full border-t-2 border-dashed border-emerald-500/80" />
                            <div className="absolute flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-semibold text-white shadow-md ring-2 ring-white">
                              <Check className="h-3 w-3" />
                              <span>Page 1 Boundary Limit (297mm) • {Math.round(overflowRatio * 100)}% Used</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-full border-t border-dashed border-zinc-400/80" />
                            <div className="absolute flex items-center gap-1.5 rounded-full bg-zinc-700 px-3 py-0.5 text-[10px] font-medium text-white shadow-sm ring-2 ring-white">
                              <span>Page {k} End ({k * 297}mm) • ~{overflowRatio} A4 Total</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Floating Multi-Page Navigation Dock */}
          {pageCount > 1 && (
            <div className="fixed bottom-6 right-6 z-30 flex items-center gap-1.5 rounded-full bg-zinc-950/90 p-1.5 text-white shadow-2xl backdrop-blur border border-zinc-800 no-print animate-fade-in">
              <span className="pl-2 pr-1 text-[11px] font-medium text-zinc-400">Pages:</span>
              {Array.from({ length: pageCount }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => scrollToPage(pageNum)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                      activePage === pageNum
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    P.{pageNum}
                  </button>
                );
              })}
            </div>
          )}
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

      {/* Hidden A4 Height Measurement Probe */}
      <div 
        ref={probeRef}
        style={{
          height: '297mm',
          width: '210mm',
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          top: -9999,
          left: -9999
        }}
        aria-hidden="true"
      />

    </div>
  );
};
