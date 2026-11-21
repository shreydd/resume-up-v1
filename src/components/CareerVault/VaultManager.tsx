import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  db, 
  loadSampleData, 
  clearVault, 
  exportVaultAsJSON, 
  importVaultFromJSON, 
  exportVaultAsCSV, 
  importVaultFromCSV 
} from '../../db';
import { 
  Profile, 
  Experience, 
  Achievement, 
  Education, 
  Skill, 
  Certification,
  CustomSection,
  CustomSectionItem
} from '../../types';
import { Modal } from '../Shared/Modal';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  Award, 
  User, 
  Calendar, 
  MapPin, 
  Tag,
  AlertTriangle,
  FolderPlus,
  ExternalLink,
  List
} from 'lucide-react';

export const VaultManager: React.FC = () => {
  const profileList = useLiveQuery(() => db.profile.toArray());
  const experiences = useLiveQuery(() => db.experiences.orderBy('startDate').reverse().toArray());
  const achievements = useLiveQuery(() => db.achievements.toArray());
  const educations = useLiveQuery(() => db.education.toArray());
  const skills = useLiveQuery(() => db.skills.toArray());
  const certifications = useLiveQuery(() => db.certifications.toArray());
  const customSections = useLiveQuery(() => db.customSections?.orderBy('order').toArray());
  const customItems = useLiveQuery(() => db.customSectionItems?.toArray());

  const profile = profileList?.[0] || {
    id: 1,
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    preferredTemplate: 'minimal'
  };

  const [activeSection, setActiveSection] = useState<'profile' | 'experience' | 'custom' | 'education' | 'skills' | 'certifications'>('experience');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File input refs for import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Custom Section Modal States
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [sectionTitleInput, setSectionTitleInput] = useState('');

  // Custom Item Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomSectionItem | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [itemFormData, setItemFormData] = useState({
    title: '',
    subtitle: '',
    startDate: '',
    endDate: '',
    location: '',
    url: '',
    description: '',
    bullets: ['']
  });

  // Modal states
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expFormData, setExpFormData] = useState({
    company: '',
    role: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    industry: ''
  });

  const [isAchModalOpen, setIsAchModalOpen] = useState(false);
  const [editingAch, setEditingAch] = useState<Achievement | null>(null);
  const [targetExpId, setTargetExpId] = useState<string>('');
  const [achFormData, setAchFormData] = useState({
    originalText: '',
    category: ''
  });

  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduFormData, setEduFormData] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: ''
  });

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillFormData, setSkillFormData] = useState({
    category: 'Languages',
    name: ''
  });

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [certFormData, setCertFormData] = useState({
    name: '',
    issuer: '',
    issueDate: '',
    url: ''
  });

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Profile Save
  const handleProfileChange = async (field: keyof Profile, value: string) => {
    const updated = { ...profile, [field]: value };
    await db.profile.put(updated);
  };

  // Sample data
  const handleLoadSample = async () => {
    await loadSampleData();
    showToast('Loaded sample career data (Alex Mercer)');
  };

  // Export handlers
  const handleExportJSON = async () => {
    const jsonStr = await exportVaultAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vault exported as JSON');
  };

  const handleExportCSV = async () => {
    const csvStr = await exportVaultAsCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Experiences & achievements exported as CSV');
  };

  // Import handlers
  const handleJSONFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importVaultFromJSON(text);
      showToast('Vault successfully imported from JSON');
    } catch (err) {
      showToast('Error importing JSON: invalid file structure');
    }
    e.target.value = '';
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importVaultFromCSV(text);
      showToast(`Imported ${res.experiencesCount} jobs & ${res.achievementsCount} achievements from CSV`);
    } catch (err) {
      showToast('Error parsing CSV file');
    }
    e.target.value = '';
  };

  // Experience handlers
  const openAddExp = () => {
    setEditingExp(null);
    setExpFormData({
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      industry: ''
    });
    setIsExpModalOpen(true);
  };

  const openEditExp = (exp: Experience) => {
    setEditingExp(exp);
    setExpFormData({
      company: exp.company,
      role: exp.role,
      location: exp.location || '',
      startDate: exp.startDate,
      endDate: exp.endDate || '',
      isCurrent: exp.isCurrent,
      industry: exp.industry || ''
    });
    setIsExpModalOpen(true);
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expFormData.company.trim() || !expFormData.role.trim()) return;

    if (editingExp) {
      await db.experiences.update(editingExp.id, {
        company: expFormData.company.trim(),
        role: expFormData.role.trim(),
        location: expFormData.location.trim(),
        startDate: expFormData.startDate.trim(),
        endDate: expFormData.isCurrent ? 'Present' : expFormData.endDate.trim(),
        isCurrent: expFormData.isCurrent,
        industry: expFormData.industry.trim()
      });
      showToast('Experience updated');
    } else {
      const newId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.experiences.put({
        id: newId,
        company: expFormData.company.trim(),
        role: expFormData.role.trim(),
        location: expFormData.location.trim(),
        startDate: expFormData.startDate.trim(),
        endDate: expFormData.isCurrent ? 'Present' : expFormData.endDate.trim(),
        isCurrent: expFormData.isCurrent,
        industry: expFormData.industry.trim()
      });
      showToast('Experience added');
    }
    setIsExpModalOpen(false);
  };

  const handleDeleteExp = async (expId: string) => {
    if (confirm('Delete this role and all its bullet points?')) {
      await db.experiences.delete(expId);
      await db.achievements.where('experienceId').equals(expId).delete();
      showToast('Role and achievements deleted');
    }
  };

  // Achievement handlers
  const openAddAch = (expId: string) => {
    setTargetExpId(expId);
    setEditingAch(null);
    setAchFormData({ originalText: '', category: '' });
    setIsAchModalOpen(true);
  };

  const openEditAch = (ach: Achievement) => {
    setTargetExpId(ach.experienceId);
    setEditingAch(ach);
    setAchFormData({
      originalText: ach.originalText,
      category: ach.category || ''
    });
    setIsAchModalOpen(true);
  };

  const handleSaveAch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achFormData.originalText.trim()) return;

    if (editingAch) {
      await db.achievements.update(editingAch.id, {
        originalText: achFormData.originalText.trim(),
        category: achFormData.category.trim() || undefined,
        embedding: undefined // clear old embedding so re-scoring updates
      });
      showToast('Achievement updated');
    } else {
      const newId = `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.achievements.put({
        id: newId,
        experienceId: targetExpId,
        originalText: achFormData.originalText.trim(),
        category: achFormData.category.trim() || undefined
      });
      showToast('Achievement bullet added');
    }
    setIsAchModalOpen(false);
  };

  const handleDeleteAch = async (achId: string) => {
    await db.achievements.delete(achId);
    showToast('Bullet point removed');
  };

  // Education handlers
  const openAddEdu = () => {
    setEditingEdu(null);
    setEduFormData({ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' });
    setIsEduModalOpen(true);
  };

  const openEditEdu = (edu: Education) => {
    setEditingEdu(edu);
    setEduFormData({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || ''
    });
    setIsEduModalOpen(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduFormData.institution.trim() || !eduFormData.degree.trim()) return;

    if (editingEdu) {
      await db.education.update(editingEdu.id, {
        institution: eduFormData.institution.trim(),
        degree: eduFormData.degree.trim(),
        fieldOfStudy: eduFormData.fieldOfStudy.trim(),
        startDate: eduFormData.startDate.trim(),
        endDate: eduFormData.endDate.trim()
      });
      showToast('Education updated');
    } else {
      await db.education.put({
        id: `edu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        institution: eduFormData.institution.trim(),
        degree: eduFormData.degree.trim(),
        fieldOfStudy: eduFormData.fieldOfStudy.trim(),
        startDate: eduFormData.startDate.trim(),
        endDate: eduFormData.endDate.trim()
      });
      showToast('Education added');
    }
    setIsEduModalOpen(false);
  };

  const handleDeleteEdu = async (eduId: string) => {
    await db.education.delete(eduId);
    showToast('Education removed');
  };

  // Skills handlers
  const openAddSkill = () => {
    setEditingSkill(null);
    setSkillFormData({ category: 'Languages', name: '' });
    setIsSkillModalOpen(true);
  };

  const openEditSkill = (s: Skill) => {
    setEditingSkill(s);
    setSkillFormData({ category: s.category, name: s.name });
    setIsSkillModalOpen(true);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillFormData.name.trim()) return;

    if (editingSkill) {
      await db.skills.update(editingSkill.id, {
        category: skillFormData.category.trim(),
        name: skillFormData.name.trim()
      });
      showToast('Skill category updated');
    } else {
      await db.skills.put({
        id: `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: skillFormData.category.trim(),
        name: skillFormData.name.trim()
      });
      showToast('Skill group added');
    }
    setIsSkillModalOpen(false);
  };

  const handleDeleteSkill = async (skillId: string) => {
    await db.skills.delete(skillId);
    showToast('Skill group removed');
  };

  // Certifications handlers
  const openAddCert = () => {
    setEditingCert(null);
    setCertFormData({ name: '', issuer: '', issueDate: '', url: '' });
    setIsCertModalOpen(true);
  };

  const openEditCert = (c: Certification) => {
    setEditingCert(c);
    setCertFormData({
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate || '',
      url: c.url || ''
    });
    setIsCertModalOpen(true);
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFormData.name.trim() || !certFormData.issuer.trim()) return;

    if (editingCert) {
      await db.certifications.update(editingCert.id, {
        name: certFormData.name.trim(),
        issuer: certFormData.issuer.trim(),
        issueDate: certFormData.issueDate.trim(),
        url: certFormData.url.trim()
      });
      showToast('Certification updated');
    } else {
      await db.certifications.put({
        id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: certFormData.name.trim(),
        issuer: certFormData.issuer.trim(),
        issueDate: certFormData.issueDate.trim(),
        url: certFormData.url.trim()
      });
      showToast('Certification added');
    }
    setIsCertModalOpen(false);
  };

  const handleDeleteCert = async (certId: string) => {
    await db.certifications.delete(certId);
    showToast('Certification removed');
  };

  // Custom Section Handlers
  const openAddSection = (presetTitle?: string) => {
    setEditingSection(null);
    setSectionTitleInput(presetTitle || '');
    setIsSectionModalOpen(true);
  };

  const openEditSection = (sec: CustomSection) => {
    setEditingSection(sec);
    setSectionTitleInput(sec.title);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitleInput.trim()) return;

    if (editingSection) {
      await db.customSections.update(editingSection.id, {
        title: sectionTitleInput.trim()
      });
      showToast('Section title updated');
    } else {
      const newId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const currentCount = await db.customSections.count();
      await db.customSections.put({
        id: newId,
        title: sectionTitleInput.trim(),
        order: currentCount + 1
      });
      showToast(`Created section "${sectionTitleInput.trim()}"`);
    }
    setIsSectionModalOpen(false);
  };

  const handleDeleteSection = async (secId: string, title: string) => {
    if (confirm(`Delete custom section "${title}" and all its items?`)) {
      await db.customSections.delete(secId);
      await db.customSectionItems.where('sectionId').equals(secId).delete();
      showToast(`Deleted section "${title}"`);
    }
  };

  // Custom Item Handlers
  const openAddItem = (secId: string) => {
    setTargetSectionId(secId);
    setEditingItem(null);
    setItemFormData({
      title: '',
      subtitle: '',
      startDate: '',
      endDate: '',
      location: '',
      url: '',
      description: '',
      bullets: ['']
    });
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: CustomSectionItem) => {
    setTargetSectionId(item.sectionId);
    setEditingItem(item);
    const desc = typeof item.description === 'string'
      ? item.description
      : (Array.isArray(item.description) ? (item.description as string[]).join('\n') : '');
    const bullets = Array.isArray(item.bullets) && item.bullets.length > 0
      ? [...item.bullets]
      : (Array.isArray(item.description) ? [...(item.description as string[])] : ['']);
    setItemFormData({
      title: item.title,
      subtitle: item.subtitle || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      location: item.location || '',
      url: item.url || '',
      description: desc,
      bullets: bullets.map(b => typeof b === 'string' ? b : String(b || ''))
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.title.trim()) return;

    const cleanBullets = itemFormData.bullets
      .map(b => b.trim())
      .filter(b => b.length > 0);

    if (editingItem) {
      await db.customSectionItems.update(editingItem.id, {
        title: itemFormData.title.trim(),
        subtitle: itemFormData.subtitle.trim() || undefined,
        startDate: itemFormData.startDate.trim() || undefined,
        endDate: itemFormData.endDate.trim() || undefined,
        location: itemFormData.location.trim() || undefined,
        url: itemFormData.url.trim() || undefined,
        description: itemFormData.description.trim() || undefined,
        bullets: cleanBullets
      });
      showToast('Item updated');
    } else {
      const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.customSectionItems.put({
        id: newId,
        sectionId: targetSectionId,
        title: itemFormData.title.trim(),
        subtitle: itemFormData.subtitle.trim() || undefined,
        startDate: itemFormData.startDate.trim() || undefined,
        endDate: itemFormData.endDate.trim() || undefined,
        location: itemFormData.location.trim() || undefined,
        url: itemFormData.url.trim() || undefined,
        description: itemFormData.description.trim() || undefined,
        bullets: cleanBullets
      });
      showToast('Item added');
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.customSectionItems.delete(itemId);
    showToast('Item deleted');
  };

  // Bullet management within item modal
  const handleAddBulletInput = () => {
    setItemFormData(prev => ({
      ...prev,
      bullets: [...prev.bullets, '']
    }));
  };

  const handleUpdateBulletInput = (idx: number, val: string) => {
    setItemFormData(prev => {
      const updated = [...prev.bullets];
      updated[idx] = val;
      return { ...prev, bullets: updated };
    });
  };

  const handleRemoveBulletInput = (idx: number) => {
    setItemFormData(prev => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white shadow-xl animate-fade-in border border-zinc-800">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file inputs for import */}
      <input 
        type="file" 
        ref={csvInputRef} 
        onChange={handleCSVFileChange} 
        accept=".csv" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={jsonInputRef} 
        onChange={handleJSONFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Top Banner & Storage Info */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Career Vault</h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-mono text-zinc-600 border border-zinc-200">
              IndexedDB
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Store your entire career record locally. All items are encrypted in your browser's private sandbox.
          </p>
        </div>

        {/* Global Vault Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Load Sample Data</span>
          </button>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Import CSV */}
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            title="Import from career spreadsheet (.csv)"
          >
            <Upload className="h-3.5 w-3.5 text-zinc-500" />
            <span>Import CSV</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            title="Download experiences as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-500" />
            <span>Export CSV</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            title="Restore from JSON backup"
          >
            <Upload className="h-3.5 w-3.5 text-zinc-500" />
            <span>Import JSON</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            title="Download full database backup"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            <span>Export JSON</span>
          </button>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Clear DB */}
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
            title="Clear all stored items"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Sub-Nav Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sub-Nav Pills */}
        <div className="space-y-1 lg:col-span-1">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setActiveSection('experience')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'experience'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-4 w-4" />
                <span>Work Experience</span>
              </div>
              <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                activeSection === 'experience' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {experiences?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('profile')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'profile'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4" />
                <span>Personal Profile</span>
              </div>
              {profile.fullName && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </button>

            <button
              onClick={() => setActiveSection('education')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'education'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-4 w-4" />
                <span>Education</span>
              </div>
              <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                activeSection === 'education' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {educations?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('skills')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'skills'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4" />
                <span>Skills & Tools</span>
              </div>
              <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                activeSection === 'skills' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {skills?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('certifications')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'certifications'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="h-4 w-4" />
                <span>Certifications</span>
              </div>
              <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                activeSection === 'certifications' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {certifications?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('custom')}
              className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                activeSection === 'custom'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderPlus className="h-4 w-4" />
                <span>Custom Sections</span>
              </div>
              <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                activeSection === 'custom' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {customItems?.length || 0}
              </span>
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">

          {/* SECTION: EXPERIENCE & ACHIEVEMENTS */}
          {activeSection === 'experience' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Work Experience & Achievements</h2>
                  <p className="text-xs text-zinc-500">Each role holds your raw accomplishments and high-impact metrics.</p>
                </div>
                <button
                  onClick={openAddExp}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {(!experiences || experiences.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-zinc-400" />
                  <h3 className="mt-2 text-sm font-medium text-zinc-900">No experiences added yet</h3>
                  <p className="mt-1 text-xs text-zinc-500">Click "Add Role" above or click "Load Sample Data" at the top.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {experiences.map(exp => {
                    const expAchs = achievements?.filter(a => a.experienceId === exp.id) || [];
                    return (
                      <div key={exp.id} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:border-zinc-300">
                        
                        {/* Header of Experience */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-zinc-900">{exp.role}</h3>
                              <span className="text-sm font-semibold text-zinc-500">@ {exp.company}</span>
                              {exp.industry && (
                                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                                  {exp.industry}
                                </span>
                              )}
                              {exp.isCurrent && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                {exp.startDate} – {exp.endDate || (exp.isCurrent ? 'Present' : '')}
                              </span>
                              {exp.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                  {exp.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditExp(exp)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                              title="Edit role"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExp(exp.id)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Bullets List */}
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                              Achievements & Impact ({expAchs.length})
                            </span>
                            <button
                              onClick={() => openAddAch(exp.id)}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Bullet</span>
                            </button>
                          </div>

                          {expAchs.length === 0 ? (
                            <p className="text-xs italic text-zinc-400 py-1">No bullet points added yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {expAchs.map(ach => (
                                <div 
                                  key={ach.id} 
                                  className="group flex items-start justify-between gap-3 rounded-xl bg-zinc-50/80 p-3 text-xs transition-colors hover:bg-zinc-100/70 border border-zinc-100"
                                >
                                  <div className="flex-1 space-y-1">
                                    <p className="leading-relaxed text-zinc-800">{ach.originalText}</p>
                                    {ach.category && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-zinc-200">
                                        <Tag className="h-2.5 w-2.5" />
                                        {ach.category}
                                      </span>
                                    )}
                                  </div>

                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <button
                                      onClick={() => openEditAch(ach)}
                                      className="rounded p-1 text-zinc-400 hover:text-zinc-600"
                                      title="Edit bullet"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAch(ach.id)}
                                      className="rounded p-1 text-zinc-400 hover:text-rose-600"
                                      title="Delete bullet"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION: PERSONAL PROFILE */}
          {activeSection === 'profile' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-1">Personal Contact Information</h2>
              <p className="text-xs text-zinc-500 mb-6">These appear in your resume header across all generated templates.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={profile.fullName || ''}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Professional Headline</label>
                  <input
                    type="text"
                    value={profile.headline || ''}
                    onChange={(e) => handleProfileChange('headline', e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={profile.location || ''}
                    onChange={(e) => handleProfileChange('location', e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Personal Website</label>
                  <input
                    type="text"
                    value={profile.website || ''}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                    placeholder="https://alexmercer.dev"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={profile.linkedin || ''}
                    onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/alexmercer"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">GitHub Profile</label>
                  <input
                    type="text"
                    value={profile.github || ''}
                    onChange={(e) => handleProfileChange('github', e.target.value)}
                    placeholder="github.com/alexmercer"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION: EDUCATION */}
          {activeSection === 'education' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Education</h2>
                  <p className="text-xs text-zinc-500">Universities, degrees, and academic milestones.</p>
                </div>
                <button
                  onClick={openAddEdu}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Education</span>
                </button>
              </div>

              {(!educations || educations.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-2 text-xs text-zinc-500">No education items recorded.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {educations.map(edu => (
                    <div key={edu.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300">
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-900">{edu.institution}</h4>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditEdu(edu)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEdu(edu.id)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: SKILLS */}
          {activeSection === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Technical Skills</h2>
                  <p className="text-xs text-zinc-500">Categorized skills (e.g. Languages, Frameworks, Cloud & Tools).</p>
                </div>
                <button
                  onClick={openAddSkill}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Skill Group</span>
                </button>
              </div>

              {(!skills || skills.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
                  <Wrench className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-2 text-xs text-zinc-500">No skills added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {skills.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{s.category}</span>
                        <p className="text-sm font-medium text-zinc-800 mt-1">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditSkill(s)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(s.id)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: CERTIFICATIONS */}
          {activeSection === 'certifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Certifications</h2>
                  <p className="text-xs text-zinc-500">Industry credentials, verified licenses, and honors.</p>
                </div>
                <button
                  onClick={openAddCert}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Certification</span>
                </button>
              </div>

              {(!certifications || certifications.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
                  <Award className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-2 text-xs text-zinc-500">No certifications recorded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300">
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-900">{c.name}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {c.issuer}{c.issueDate ? ` · ${c.issueDate}` : ''}
                        </p>
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                            Verify Credential
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditCert(c)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCert(c.id)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: CUSTOM SECTIONS (Projects, Extracurriculars, Publications, etc.) */}
          {activeSection === 'custom' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Custom Sections</h2>
                  <p className="text-xs text-zinc-500">
                    Add custom sections like Projects, Extra-Curriculars, Publications, Leadership, or Awards.
                  </p>
                </div>
                <button
                  onClick={() => openAddSection()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Section</span>
                </button>
              </div>

              {/* Quick Preset Buttons if user wants to add popular sections */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Presets:</span>
                {[
                  'Projects',
                  'Extra-Curricular Activities',
                  'Publications',
                  'Leadership & Volunteering',
                  'Awards & Honors'
                ].map((preset) => {
                  const alreadyExists = customSections?.some(s => s.title.toLowerCase() === preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => openAddSection(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        alreadyExists
                          ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-default'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 shadow-xs'
                      }`}
                      disabled={alreadyExists}
                    >
                      + {preset}
                    </button>
                  );
                })}
              </div>

              {/* Sections List */}
              {(!customSections || customSections.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
                  <FolderPlus className="mx-auto h-10 w-10 text-zinc-400" />
                  <h3 className="mt-3 text-sm font-semibold text-zinc-800">No Custom Sections Yet</h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                    Create sections like Projects, Extra-Curriculars, or Publications to enrich your resume and match specific job requirements.
                  </p>
                  <button
                    onClick={() => openAddSection('Projects')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 shadow-sm transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create "Projects" Section</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {customSections.map((sec) => {
                    const secItems = customItems?.filter(it => it.sectionId === sec.id) || [];
                    return (
                      <div
                        key={sec.id}
                        className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Section Card Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-sm text-zinc-900">{sec.title}</span>
                            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-mono text-zinc-700">
                              {secItems.length} {secItems.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openAddItem(sec.id)}
                              className="flex items-center gap-1 rounded-lg bg-white border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-xs transition-colors"
                            >
                              <Plus className="h-3 w-3 text-zinc-500" />
                              <span>Add Item</span>
                            </button>
                            <button
                              onClick={() => openEditSection(sec)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-600 transition-colors"
                              title="Edit Section Name"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sec.id, sec.title)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete Section"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Section Items */}
                        <div className="p-4 space-y-3">
                          {secItems.length === 0 ? (
                            <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                              No entries in this section yet. Click "+ Add Item" above.
                            </div>
                          ) : (
                            secItems.map(item => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs hover:border-zinc-300 transition-colors space-y-2"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-sm text-zinc-900">{item.title}</h4>
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          <span>Link</span>
                                        </a>
                                      )}
                                    </div>
                                    {item.subtitle && (
                                      <p className="text-xs text-zinc-600 font-medium mt-0.5">{item.subtitle}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                                      {[item.startDate, item.endDate].filter(Boolean).length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
                                        </span>
                                      )}
                                      {item.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {item.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => openEditItem(item)}
                                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {typeof item.description === 'string' && item.description.trim() && (
                                  <p className="text-xs text-zinc-600 pt-1 leading-relaxed">{item.description.trim()}</p>
                                )}

                                {item.bullets && item.bullets.length > 0 && (
                                  <ul className="mt-2 space-y-1 pl-4 border-l-2 border-zinc-100 text-xs text-zinc-600 list-disc list-inside">
                                    {item.bullets.map((b, idx) => (
                                      <li key={idx} className="leading-relaxed">
                                        <span className="text-zinc-700">{b}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL: EXPERIENCE */}
      <Modal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        title={editingExp ? 'Edit Work Experience' : 'Add Work Experience'}
      >
        <form onSubmit={handleSaveExp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Company / Organization *</label>
            <input
              type="text"
              required
              value={expFormData.company}
              onChange={e => setExpFormData({ ...expFormData, company: e.target.value })}
              placeholder="e.g. Acme Corporation"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Role / Job Title *</label>
            <input
              type="text"
              required
              value={expFormData.role}
              onChange={e => setExpFormData({ ...expFormData, role: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700">Industry / Domain Context</label>
              <span className="text-[10px] text-zinc-400 font-normal">Optional · For AI privacy masking</span>
            </div>
            <input
              type="text"
              value={expFormData.industry}
              onChange={e => setExpFormData({ ...expFormData, industry: e.target.value })}
              placeholder="e.g. Consumer Sports Tech, Fintech Payments, B2B SaaS"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              When tailoring with AI, company names are masked, but this industry context allows the model to align technical domain causality accurately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Location</label>
            <input
              type="text"
              value={expFormData.location}
              onChange={e => setExpFormData({ ...expFormData, location: e.target.value })}
              placeholder="e.g. San Francisco, CA or Remote"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date *</label>
              <input
                type="text"
                required
                value={expFormData.startDate}
                onChange={e => setExpFormData({ ...expFormData, startDate: e.target.value })}
                placeholder="2022-01"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date</label>
              <input
                type="text"
                disabled={expFormData.isCurrent}
                value={expFormData.isCurrent ? 'Present' : expFormData.endDate}
                onChange={e => setExpFormData({ ...expFormData, endDate: e.target.value })}
                placeholder="2024-05"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isCurrentRole"
              checked={expFormData.isCurrent}
              onChange={e => setExpFormData({ ...expFormData, isCurrent: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="isCurrentRole" className="text-xs text-zinc-700 font-medium cursor-pointer">
              I currently work here
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsExpModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save Experience
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ACHIEVEMENT */}
      <Modal
        isOpen={isAchModalOpen}
        onClose={() => setIsAchModalOpen(false)}
        title={editingAch ? 'Edit Achievement Bullet' : 'Add Achievement Bullet'}
        description="Include clear action verbs, context, and quantifiable metrics (e.g. % improvement, revenue, throughput)."
      >
        <form onSubmit={handleSaveAch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Achievement Description *</label>
            <textarea
              required
              rows={4}
              value={achFormData.originalText}
              onChange={e => setAchFormData({ ...achFormData, originalText: e.target.value })}
              placeholder="e.g. Architected high-throughput event processing pipeline handling 50M daily events using Kafka and Go, reducing latency by 35%."
              className="w-full rounded-lg border border-zinc-200 p-3 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Category (Optional)</label>
            <input
              type="text"
              value={achFormData.category}
              onChange={e => setAchFormData({ ...achFormData, category: e.target.value })}
              placeholder="e.g. Backend, Performance, Leadership, Cloud"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsAchModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save Bullet
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDUCATION */}
      <Modal
        isOpen={isEduModalOpen}
        onClose={() => setIsEduModalOpen(false)}
        title={editingEdu ? 'Edit Education' : 'Add Education'}
      >
        <form onSubmit={handleSaveEdu} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Institution *</label>
            <input
              type="text"
              required
              value={eduFormData.institution}
              onChange={e => setEduFormData({ ...eduFormData, institution: e.target.value })}
              placeholder="e.g. University of Texas at Austin"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Degree *</label>
            <input
              type="text"
              required
              value={eduFormData.degree}
              onChange={e => setEduFormData({ ...eduFormData, degree: e.target.value })}
              placeholder="e.g. B.S. in Computer Science"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Field of Study</label>
            <input
              type="text"
              value={eduFormData.fieldOfStudy}
              onChange={e => setEduFormData({ ...eduFormData, fieldOfStudy: e.target.value })}
              placeholder="e.g. Software Engineering"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Year</label>
              <input
                type="text"
                value={eduFormData.startDate}
                onChange={e => setEduFormData({ ...eduFormData, startDate: e.target.value })}
                placeholder="2015"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">End Year</label>
              <input
                type="text"
                value={eduFormData.endDate}
                onChange={e => setEduFormData({ ...eduFormData, endDate: e.target.value })}
                placeholder="2019"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsEduModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save Education
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SKILLS */}
      <Modal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        title={editingSkill ? 'Edit Skill Group' : 'Add Skill Group'}
      >
        <form onSubmit={handleSaveSkill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Category *</label>
            <input
              type="text"
              required
              value={skillFormData.category}
              onChange={e => setSkillFormData({ ...skillFormData, category: e.target.value })}
              placeholder="e.g. Languages, Frameworks, Cloud, Databases"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Skills (comma-separated) *</label>
            <input
              type="text"
              required
              value={skillFormData.name}
              onChange={e => setSkillFormData({ ...skillFormData, name: e.target.value })}
              placeholder="e.g. TypeScript, React, Go, Docker, PostgreSQL"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsSkillModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save Skill Group
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CERTIFICATIONS */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title={editingCert ? 'Edit Certification' : 'Add Certification'}
      >
        <form onSubmit={handleSaveCert} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Certification Name *</label>
            <input
              type="text"
              required
              value={certFormData.name}
              onChange={e => setCertFormData({ ...certFormData, name: e.target.value })}
              placeholder="e.g. AWS Certified Solutions Architect"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Issuing Authority *</label>
            <input
              type="text"
              required
              value={certFormData.issuer}
              onChange={e => setCertFormData({ ...certFormData, issuer: e.target.value })}
              placeholder="e.g. Amazon Web Services"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Issue Year / Date</label>
            <input
              type="text"
              value={certFormData.issueDate}
              onChange={e => setCertFormData({ ...certFormData, issueDate: e.target.value })}
              placeholder="2023"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Verification URL</label>
            <input
              type="url"
              value={certFormData.url}
              onChange={e => setCertFormData({ ...certFormData, url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsCertModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Save Certification
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CUSTOM SECTION (Add/Edit) */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={editingSection ? 'Edit Section Title' : 'Create Custom Section'}
        description="Add a new section category for your career vault and resume."
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Section Title *</label>
            <input
              type="text"
              required
              value={sectionTitleInput}
              onChange={e => setSectionTitleInput(e.target.value)}
              placeholder="e.g. Projects, Extra-Curricular Activities, Publications..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Preset Suggestions</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Projects',
                'Extra-Curricular Activities',
                'Publications',
                'Leadership & Volunteering',
                'Awards & Honors',
                'Open Source Contributions',
                'Speaking Engagements'
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSectionTitleInput(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    sectionTitleInput === preset
                      ? 'border-zinc-900 bg-zinc-900 text-white font-medium'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CUSTOM SECTION ITEM (Add/Edit) */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Section Item' : 'Add Item to Section'}
        description="Provide details, links, and bullet points for this section entry."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Title / Name *</label>
            <input
              type="text"
              required
              value={itemFormData.title}
              onChange={e => setItemFormData({ ...itemFormData, title: e.target.value })}
              placeholder="e.g. Distributed Key-Value Store, Hackathon Winner, IEEE Paper..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Subtitle / Role / Technologies</label>
            <input
              type="text"
              value={itemFormData.subtitle}
              onChange={e => setItemFormData({ ...itemFormData, subtitle: e.target.value })}
              placeholder="e.g. Go, Raft, gRPC, Docker or President / Lead Organizer"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date</label>
              <input
                type="text"
                value={itemFormData.startDate}
                onChange={e => setItemFormData({ ...itemFormData, startDate: e.target.value })}
                placeholder="2023-01"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date</label>
              <input
                type="text"
                value={itemFormData.endDate}
                onChange={e => setItemFormData({ ...itemFormData, endDate: e.target.value })}
                placeholder="2023-06 or Present"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Location</label>
              <input
                type="text"
                value={itemFormData.location}
                onChange={e => setItemFormData({ ...itemFormData, location: e.target.value })}
                placeholder="San Francisco, CA or Remote"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Project / Verification URL</label>
              <input
                type="url"
                value={itemFormData.url}
                onChange={e => setItemFormData({ ...itemFormData, url: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Description / Summary (Optional)</label>
            <textarea
              rows={2}
              value={itemFormData.description}
              onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
              placeholder="Brief summary or context..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          {/* Bullet Points */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-700">Bullet Points / Key Contributions</label>
              <button
                type="button"
                onClick={handleAddBulletInput}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 font-medium"
              >
                <Plus className="h-3 w-3" />
                <span>Add Bullet</span>
              </button>
            </div>
            <div className="space-y-2">
              {itemFormData.bullets.map((b, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs text-zinc-400 mt-2.5 font-mono">{idx + 1}.</span>
                  <textarea
                    rows={2}
                    value={b}
                    onChange={e => handleUpdateBulletInput(idx, e.target.value)}
                    placeholder="Action verb + context + measurable result..."
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs focus:border-zinc-900 focus:outline-none"
                  />
                  {itemFormData.bullets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBulletInput(idx)}
                      className="mt-2 rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {editingItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CLEAR CONFIRMATION */}
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title="Clear Career Vault?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-1">All experiences, bullet points, skills, and certifications stored in your browser's IndexedDB will be erased.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsClearConfirmOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await clearVault();
                setIsClearConfirmOpen(false);
                showToast('Vault cleared');
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700"
            >
              Yes, Clear All Data
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
