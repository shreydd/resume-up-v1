import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getCompleteResumeData, loadSampleData } from './db';
import { ResumeData, TailoredResume } from './types';
import { Header } from './components/Header';
import { VaultManager } from './components/CareerVault/VaultManager';
import { TailorView } from './components/TailorAI/TailorView';
import { ResumeStudioView } from './components/ResumeStudio/ResumeStudioView';
import { SavedResumesView } from './components/SavedResumes/SavedResumesView';
import { Laptop } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vault' | 'tailor' | 'studio' | 'saved'>('vault');
  const [currentResumeData, setCurrentResumeData] = useState<ResumeData | null>(null);
  const [targetJobDescription, setTargetJobDescription] = useState<string>('');
  const [activeSavedResume, setActiveSavedResume] = useState<TailoredResume | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  const experiences = useLiveQuery(() => db.experiences.toArray());
  const customItems = useLiveQuery(() => db.customSectionItems?.toArray());
  const savedResumes = useLiveQuery(() => db.tailoredResumes.toArray());

  // Monitor window width for screen resolution guard
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On first load, check if DB is empty; if empty, preload sample data for instant exploration
  useEffect(() => {
    async function initVault() {
      const count = await db.experiences.count();
      if (count === 0) {
        await loadSampleData();
      }
      const data = await getCompleteResumeData();
      setCurrentResumeData(data);
    }
    initVault();
  }, []);

  // Whenever experiences or custom items change in DB, update our current resume data
  useEffect(() => {
    async function refresh() {
      const data = await getCompleteResumeData();
      setCurrentResumeData(data);
    }
    refresh();
  }, [experiences?.length, customItems?.length]);

  const handleTailoredReady = (tailoredData: ResumeData, targetJdText: string) => {
    setActiveSavedResume(null);
    setCurrentResumeData(tailoredData);
    setTargetJobDescription(targetJdText);
    setActiveTab('studio');
  };

  const handleOpenSavedInStudio = (saved: TailoredResume) => {
    setActiveSavedResume(saved);
    setActiveTab('studio');
  };

  const handleGlobalPrint = () => {
    // If not already on studio, switch to studio or print
    if (activeTab !== 'studio') {
      setActiveTab('studio');
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      window.print();
    }
  };

  return (
    <div className="h-screen bg-zinc-50 flex flex-col font-sans overflow-hidden">
      
      {/* LAPTOP ONLY SCREEN GUARD (< 1024px) */}
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-8 text-center lg:hidden print:hidden">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 border border-zinc-200/80 shadow-sm mb-6">
          <Laptop className="h-10 w-10 text-zinc-900" strokeWidth={1.5} />
        </div>
        
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-1 text-xs font-mono text-zinc-600 border border-zinc-200 mb-4">
          <span className="font-semibold text-zinc-900">Laptop View Required</span>
          <span>•</span>
          <span>Current: {windowWidth}px (Min: 1024px)</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Laptop Views Only
        </h1>
        
        <p className="mt-3 text-sm text-zinc-500 max-w-md leading-relaxed">
          <strong>resume-up</strong> is designed exclusively for laptop and desktop screens to provide precision dual-pane code editing and A4 document compilation. Mobile and tablet views are not supported.
        </p>
        
        <p className="mt-6 text-xs text-zinc-400">
          Please expand your browser window or switch to a laptop computer.
        </p>
      </div>

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPrint={handleGlobalPrint}
        experienceCount={experiences?.length || 0}
        savedCount={savedResumes?.length || 0}
      />

      <main className={`flex-1 min-h-0 ${activeTab === 'studio' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTab === 'vault' && <VaultManager />}
        
        {activeTab === 'tailor' && (
          <TailorView
            onTailoredReady={handleTailoredReady}
            onNavigateToVault={() => setActiveTab('vault')}
          />
        )}

        {activeTab === 'studio' && (
          <ResumeStudioView
            initialResumeData={currentResumeData}
            initialJobDescription={targetJobDescription}
            savedResume={activeSavedResume}
            onSaved={() => setActiveTab('saved')}
          />
        )}

        {activeTab === 'saved' && (
          <SavedResumesView
            onOpenInStudio={handleOpenSavedInStudio}
            onNavigateToTailor={() => setActiveTab('tailor')}
          />
        )}
      </main>
    </div>
  );
};

export default App;
