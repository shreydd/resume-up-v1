import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Database, 
  BookmarkCheck, 
  Printer, 
  Cpu,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { semanticMatcher, ModelProgressInfo } from '../services/semanticMatcher';

interface HeaderProps {
  activeTab: 'vault' | 'tailor' | 'studio' | 'saved';
  setActiveTab: (tab: 'vault' | 'tailor' | 'studio' | 'saved') => void;
  onPrint: () => void;
  experienceCount?: number;
  savedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onPrint,
  experienceCount = 0,
  savedCount = 0
}) => {
  const [modelInfo, setModelInfo] = useState<ModelProgressInfo>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  useEffect(() => {
    const unsub = semanticMatcher.subscribeStatus(setModelInfo);
    return unsub;
  }, []);

  const handleModelClick = () => {
    if (modelInfo.status === 'idle' || modelInfo.status === 'error' || modelInfo.status === 'fallback') {
      semanticMatcher.triggerModelDownload();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/85 backdrop-blur-md no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm flex-shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-zinc-950 text-base">resume-up</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/60 hidden md:inline-block">
                100% Private
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden lg:block">A quick resume composer</p>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="flex items-center space-x-1 rounded-xl bg-zinc-100/80 p-1 border border-zinc-200/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'vault'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Career Vault</span>
            <span className="sm:hidden">Vault</span>
            {experienceCount > 0 && (
              <span className="ml-0.5 rounded-full bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600 font-mono">
                {experienceCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tailor')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'tailor'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Tailor with AI</span>
            <span className="sm:hidden">Tailor</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'studio'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resume Studio</span>
            <span className="sm:hidden">Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'saved'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="ml-0.5 rounded-full bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600 font-mono">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* AI Model Status Badge */}
          <button
            onClick={handleModelClick}
            title={`${modelInfo.message} (Click to initialize neural embeddings)`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Cpu className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden md:inline font-mono text-[11px]">
              {modelInfo.status === 'ready' && 'MiniLM WASM: Ready'}
              {modelInfo.status === 'loading' && `Downloading (${modelInfo.progress}%)`}
              {modelInfo.status === 'fallback' && 'In-Memory Matcher'}
              {modelInfo.status === 'idle' && 'AI: On-Demand'}
              {modelInfo.status === 'error' && 'AI: Fallback'}
            </span>
            {modelInfo.status === 'ready' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            {modelInfo.status === 'loading' && <Download className="h-3 w-3 text-indigo-500 animate-bounce" />}
            {(modelInfo.status === 'fallback' || modelInfo.status === 'idle') && (
              <div className="h-2 w-2 rounded-full bg-blue-400" />
            )}
            {modelInfo.status === 'error' && <AlertCircle className="h-3 w-3 text-amber-500" />}
          </button>

          {/* Quick Print CTA */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

        </div>
      </div>
    </header>
  );
};
