'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Upload,
  KeyRound,
  Columns3,
  Presentation,
  BookOpenCheck,
  Sliders,
  Award,
  Flame,
  HardDrive,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Share2,
} from 'lucide-react';
import {
  useStudyDeskStore,
  type CameraPanTarget,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { geminiRotator, type KeySlotStatus } from '@/lib/gemini';
import {
  LOCAL_MODEL_OPTIONS,
  isWebGPUSupported,
  loadLocalModel,
  unloadLocalModel,
} from '@/lib/localModel';
import { generateSyllabusTopicsWithAI } from '@/lib/syllabusGenerator';
import { storageAdapter } from '@/lib/storage';
import { PersonaMenuStage } from '@/components/transitions/PersonaSchoolTransition';

const STATIONS: Array<{
  id: CameraPanTarget;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Study Desk', icon: Columns3 },
  { id: 'left', label: 'Whiteboard', icon: Presentation },
  { id: 'center', label: 'Workbook', icon: BookOpenCheck },
  { id: 'right', label: 'Notes & Graph', icon: Sliders },
];

export function DeskHeader() {
  const {
    subjects,
    currentSubject,
    syllabusBoard,
    activeTopicId,
    userXP,
    streakCount,
    lastStudyDate,
    activeCallState,
    cameraPan,
    audioMuted,
    geminiHasKey,
    aiEngineMode,
    localModelId,
    localModelStatus,
    localModelProgress,
    localModelProgressText,
    stickyNotes,
    backpackFiles,
    cornellNotes,
    roadmapState,
    workbookDialogues,
    quizCompletedIds,
    selectedAnswers,
    createNotebook,
    addSyllabusTopics,
    setSubject,
    setActiveTopic,
    setStudioTab,
    setActiveCallState,
    setGeminiHasKey,
    setAiEngineMode,
    setLocalModelId,
    setLocalModelState,
    panToLeft,
    panToCenter,
    panToRight,
    panToOverview,
    setAudioMuted,
    awardXP,
    resetAllData,
    hydrateFromArchive,
  } = useStudyDeskStore();

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);

  // Global search modal state (Ctrl+K / Cmd+K)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Locker modal state
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultTab, setVaultTab] = useState<'keys' | 'archive'>('keys');
  const [keySlots, setKeySlots] = useState<KeySlotStatus[]>(
    geminiRotator.getTelemetry().slots
  );
  const [customKeyInputs, setCustomKeyInputs] = useState<
    [string, string, string]
  >(['', '', '']);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // New notebook creator modal state
  const [showCreateNotebook, setShowCreateNotebook] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectBoard, setNewSubjectBoard] = useState('');
  const [autoGenerateModalSyllabus, setAutoGenerateModalSyllabus] =
    useState(false);
  const [isCreatingSyllabus, setIsCreatingSyllabus] = useState(false);

  const [archiveToast, setArchiveToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
        chiptuneAudio.playPaperFlip();
        return;
      }
      if (e.key === 'Escape') {
        setShowVaultModal(false);
        setShowCreateNotebook(false);
        setShowSearchModal(false);
        setConfirmResetOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPomodoroRunning(false);
          setActiveCallState('IDLE');
          awardXP(100);
          chiptuneAudio.playSchoolBellChime();
          chiptuneAudio.playMasteryFanfare();
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomodoroRunning, setActiveCallState, awardXP]);

  const showToast = (msg: string, ms = 3500) => {
    setArchiveToast(msg);
    setTimeout(() => setArchiveToast(null), ms);
  };

  const togglePomodoro = () => {
    const next = !pomodoroRunning;
    setPomodoroRunning(next);
    setActiveCallState(next ? 'FOCUS_SPRINT' : 'IDLE');
    chiptuneAudio.playPaperFlip();
  };

  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setSecondsLeft(25 * 60);
    if (activeCallState === 'FOCUS_SPRINT') {
      setActiveCallState('IDLE');
    }
  };

  const toggleMute = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    chiptuneAudio.setMuted(next);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const minuteAngle = ((1500 - secondsLeft) / 1500) * 360;
  const secondAngle = ((60 - secs) % 60) * 6;

  const handleStationSelect = (target: CameraPanTarget) => {
    if (target === cameraPan) return;
    chiptuneAudio.playMenuSlash();
    if (target === 'overview') panToOverview();
    else if (target === 'left') panToLeft();
    else if (target === 'center') panToCenter();
    else panToRight();
  };

  const handleSubjectSelect = (subj: string) => {
    if (subj === currentSubject) return;
    chiptuneAudio.playSchoolBellChime();
    setSubject(subj);
  };

  const handleOpenLocker = async () => {
    setShowVaultModal(true);
    setConfirmResetOpen(false);
    chiptuneAudio.playMenuSlash();
    const status = await geminiRotator.fetchServerKeyStatus();
    setKeySlots(status.slots);
    setGeminiHasKey(status.anyConfigured);
    const savedCustom = geminiRotator.getCustomKeys();
    setCustomKeyInputs(savedCustom);
  };

  const handleCreateNotebookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSubjectName.trim();
    const cleanBoard = newSubjectBoard.trim();
    if (!cleanName || isCreatingSyllabus) return;
    chiptuneAudio.playSchoolBellChime();
    createNotebook(cleanName, cleanBoard);
    if (autoGenerateModalSyllabus) {
      setIsCreatingSyllabus(true);
      try {
        const nodes = await generateSyllabusTopicsWithAI({
          subject: cleanName,
          syllabusBoard: cleanBoard,
          aiEngineMode,
          localModelId,
          geminiHasKey,
          onLocalProgress: (report) => {
            setLocalModelState({
              status: report.progress >= 100 ? 'ready' : 'loading',
              progress: report.progress,
              text: report.text,
            });
          },
        });
        addSyllabusTopics(cleanName, nodes);
      } finally {
        setIsCreatingSyllabus(false);
      }
    }
    setNewSubjectName('');
    setNewSubjectBoard('');
    setShowCreateNotebook(false);
  };

  const handleExportTeacherCartridge = async () => {
    const cleanRoadmap = roadmapState.map((n) => ({
      ...n,
      status: 'UNLOCKED' as const,
      weakPoint: false,
      spacedDue: false,
    }));
    const topicBadges: Record<string, string> = {};
    cleanRoadmap.forEach((n) => {
      topicBadges[n.id] = 'UNLOCKED';
    });
    const cleanStickies = stickyNotes.map((s) => ({
      ...s,
      masteryStatus: 'NEW' as const,
      intervalDays: 1,
      easeFactor: 2.5,
    }));
    await storageAdapter.exportDeskArchive({
      formatVersion: '2.0.0-desk',
      exportedAt: new Date().toISOString(),
      userXP: 0,
      streakCount: 0,
      lastStudyDate: null,
      currentSubject,
      syllabusBoard,
      activeTopicId,
      subjects,
      roadmapState: cleanRoadmap,
      workbookDialogues: {},
      quizCompletedIds: {},
      selectedAnswers: {},
      topicBadges,
      stickyNotes: cleanStickies,
      backpackFiles,
      cornellNotes: Object.values(cornellNotes),
    });
    showToast('Exported shareable Teacher Lesson Cartridge (.desk)!');
  };

  const handleExportDesk = async () => {
    const topicBadges: Record<string, string> = {};
    roadmapState.forEach((n) => {
      topicBadges[n.id] = n.status;
    });
    await storageAdapter.exportDeskArchive({
      formatVersion: '2.0.0-desk',
      exportedAt: new Date().toISOString(),
      userXP,
      streakCount,
      lastStudyDate,
      currentSubject,
      syllabusBoard,
      activeTopicId,
      subjects,
      roadmapState,
      workbookDialogues,
      quizCompletedIds,
      selectedAnswers,
      topicBadges,
      stickyNotes,
      backpackFiles,
      cornellNotes: Object.values(cornellNotes),
    });
    showToast('Exported .desk backup file!');
  };

  const handleImportDesk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const archive = await storageAdapter.parseDeskArchive(file);
      hydrateFromArchive({
        userXP: archive.userXP || 0,
        streakCount: archive.streakCount || 0,
        lastStudyDate: archive.lastStudyDate ?? null,
        currentSubject: archive.currentSubject || '',
        syllabusBoard: archive.syllabusBoard || '',
        activeTopicId: archive.activeTopicId || '',
        subjects: archive.subjects || [],
        roadmapState: archive.roadmapState || [],
        workbookDialogues: archive.workbookDialogues || {},
        quizCompletedIds: archive.quizCompletedIds || {},
        selectedAnswers: archive.selectedAnswers || {},
        topicBadges: archive.topicBadges,
        stickyNotes: archive.stickyNotes || [],
        backpackFiles: archive.backpackFiles || [],
        cornellNotes: archive.cornellNotes,
      });
      chiptuneAudio.playMasteryFanfare();
      showToast(
        `Restored .desk backup (${archive.subjects?.length ?? 0} notebooks, ${archive.stickyNotes.length} cards)!`,
        4000
      );
    } catch {
      showToast('Could not parse .desk backup file.', 4000);
    }
    e.target.value = '';
  };

  const handleApplyKeys = async () => {
    const hasShortNonEmpty = customKeyInputs.some((k) => {
      const len = k.trim().length;
      return len > 0 && len < 8;
    });
    if (hasShortNonEmpty) {
      showToast(
        'One of your API key entries looks too short — paste the full Gemini key.',
        4000
      );
      return;
    }
    geminiRotator.setCustomKeys(customKeyInputs);
    const status = await geminiRotator.fetchServerKeyStatus();
    setKeySlots(status.slots);
    setGeminiHasKey(status.anyConfigured);
    const hasCustomBrowserKey = customKeyInputs.some((k) => k.trim().length >= 8);
    showToast(
      hasCustomBrowserKey
        ? 'Browser Gemini API key pool saved and active!'
        : status.anyConfigured
          ? 'Using configured server environment Gemini API key(s).'
          : 'No API key configured — paste a Gemini key to activate Barnaby.'
    );
  };

  const handleClearKeys = async () => {
    geminiRotator.clearCustomKeys();
    setCustomKeyInputs(['', '', '']);
    const status = await geminiRotator.fetchServerKeyStatus();
    setKeySlots(status.slots);
    setGeminiHasKey(status.anyConfigured);
    showToast('Cleared browser API keys.');
  };

  const handleConfirmResetDesk = async () => {
    await storageAdapter.clearAllDeskData();
    geminiRotator.clearCustomKeys();
    resetAllData();
    const status = await geminiRotator.fetchServerKeyStatus();
    setKeySlots(status.slots);
    setGeminiHasKey(status.anyConfigured);
    setCustomKeyInputs(['', '', '']);
    setConfirmResetOpen(false);
    setShowVaultModal(false);
    chiptuneAudio.playMenuSlash();
    showToast('All local desk data reset cleanly.');
  };

  return (
    <header className="w-full border-b-2 border-[#C8AE8D] bg-[#F3E6D3]/95 backdrop-blur-md px-3 sm:px-5 py-2.5 shadow-sm z-30 sticky top-0">
      <div className="max-w-[1760px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: Brand Crest & Dynamic User Notebooks */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="chalkboard-surface border-2 border-[#4E342E] rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 text-[#FDFBF7] shadow-[2px_2px_0px_#3E2723]">
            <BookOpen className="w-4 h-4 text-[#FDE047] shrink-0" />
            <div>
              <h1 className="text-sm font-bold tracking-tight font-serif leading-tight">
                Barnaby&apos;s Study Desk
              </h1>
              <p className="text-xs text-emerald-200/90 font-mono leading-tight hidden sm:block">
                {currentSubject
                  ? syllabusBoard
                    ? `${currentSubject} • ${syllabusBoard}`
                    : currentSubject
                  : 'Blank Desk'}
              </p>
            </div>
          </div>

          {/* Dynamic User Notebooks */}
          {subjects.length > 0 && (
            <div
              className="flex items-center flex-wrap gap-1 bg-[#E6D5B8] p-1 rounded-xl border border-[#C8AE8D]"
              role="group"
              aria-label="Your Notebooks"
            >
              {subjects.map((subj) => {
                const active = currentSubject === subj.name;
                return (
                  <button
                    key={subj.id}
                    id={`subject-tab-${subj.id}`}
                    type="button"
                    onClick={() => handleSubjectSelect(subj.name)}
                    className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'text-[#1E293B]'
                        : 'text-[#1E293B]/75 hover:text-[#1E293B]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="subject-highlighter"
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 24,
                          mass: 1.05,
                        }}
                        className="absolute inset-0 bg-[#FDE047] border border-[#1E293B] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#1E293B]"
                      />
                    )}
                    <span className="relative z-10">{subj.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Create Notebook Trigger */}
          <button
            id="header-new-notebook-btn"
            type="button"
            onClick={() => {
              setShowCreateNotebook(true);
              chiptuneAudio.playPaperFlip();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDFBF7] hover:bg-[#FDE047] border border-[#B89972] hover:border-[#1E293B] text-xs font-bold text-[#1E293B] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Notebook</span>
          </button>
        </div>

        {/* CENTER: Station Switcher */}
        <nav
          aria-label="Workspace Navigation"
          className="flex items-center bg-[#FDFBF7] border-2 border-[#B89972] rounded-xl p-1 shadow-[2px_2px_0px_#C8AE8D]"
        >
          {STATIONS.map((station) => {
            const Icon = station.icon;
            const active = cameraPan === station.id;
            return (
              <button
                key={station.id}
                id={`camera-pan-${station.id}`}
                type="button"
                title={station.label}
                aria-label={station.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => handleStationSelect(station.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'text-[#FDFBF7]'
                    : 'text-[#1E293B]/80 hover:text-[#1E293B]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="station-active-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 210,
                      damping: 25,
                      mass: 1.05,
                    }}
                    className="absolute inset-0 bg-[#1A2E26] border border-[#1E293B] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#10B981]"
                  />
                )}
                <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                <span className="relative z-10 hidden sm:inline">
                  {station.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Analog Pomodoro Clock, Streak/XP, Audio & Desk Locker */}
        <div className="flex items-center gap-2">
          {/* Compact Brass Analog Pomodoro Clock */}
          <div className="flex items-center gap-2 bg-[#FDFBF7] border border-[#B89972] rounded-xl px-2.5 py-1 shadow-xs">
            <div className="relative w-7 h-7 rounded-full border-2 border-[#8D6E63] bg-[#FFFDF9] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="#E6D5B8"
                  strokeWidth="1"
                />
                <line
                  x1="20"
                  y1="20"
                  x2="20"
                  y2="8"
                  stroke="#1E293B"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  transform={`rotate(${minuteAngle} 20 20)`}
                />
                <line
                  x1="20"
                  y1="20"
                  x2="20"
                  y2="6"
                  stroke="#EF4444"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  transform={`rotate(${secondAngle} 20 20)`}
                />
                <circle cx="20" cy="20" r="2" fill="#5D4037" />
              </svg>
            </div>
            <span className="text-xs font-mono font-bold text-[#1E293B]">
              {formattedTime}
            </span>
            <button
              id="pomodoro-toggle-btn"
              type="button"
              onClick={togglePomodoro}
              aria-label={
                pomodoroRunning
                  ? 'Pause Focus Sprint'
                  : 'Start 25-minute Focus Sprint'
              }
              title={
                pomodoroRunning
                  ? 'Pause Focus Sprint'
                  : 'Start 25m Focus Sprint'
              }
              className={`p-1.5 rounded-lg text-white transition-colors cursor-pointer ${
                pomodoroRunning
                  ? 'bg-[#EF4444]'
                  : 'bg-[#10B981] hover:bg-[#059669]'
              }`}
            >
              {pomodoroRunning ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
            {(pomodoroRunning || secondsLeft < 1500) && (
              <button
                id="pomodoro-reset-btn"
                type="button"
                onClick={resetPomodoro}
                aria-label="Reset Pomodoro Clock"
                title="Reset Clock"
                className="p-1 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Streak & XP Pill */}
          <div className="hidden md:flex items-center gap-2 bg-[#1A2E26] text-[#FDFBF7] px-3 py-1.5 rounded-xl border border-[#3E2723] text-xs font-mono">
            <span
              className="flex items-center gap-1 text-[#F59E0B] font-bold"
              title="Daily Study Streak"
            >
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
              {streakCount}d
            </span>
            <span className="text-slate-500">|</span>
            <span
              className="flex items-center gap-1 text-[#FDE047] font-bold"
              title="Total Mastery XP"
            >
              <Award className="w-3.5 h-3.5" />
              {userXP.toLocaleString()} XP
            </span>
          </div>

          {/* Global Search Button (Ctrl+K) */}
          <button
            id="open-global-search-btn"
            type="button"
            onClick={() => setShowSearchModal(true)}
            aria-label="Search Desk (Ctrl+K)"
            title="Search Topics, Notes, Flashcards & Files (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FDFBF7] border border-[#B89972] text-[#1A2E26] hover:bg-[#F5EBE0] text-xs font-bold transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#1A2E26]" />
            <span className="hidden xl:inline font-mono text-[11px] text-slate-600">
              Ctrl+K
            </span>
          </button>

          {/* Audio Toggle */}
          <button
            id="toggle-chiptune-audio-btn"
            type="button"
            onClick={toggleMute}
            aria-label={audioMuted ? 'Unmute Desk Sound' : 'Mute Desk Sound'}
            title={audioMuted ? 'Unmute Desk Sound' : 'Mute Desk Sound'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              audioMuted
                ? 'bg-slate-200 border-slate-300 text-slate-600'
                : 'bg-[#FDFBF7] border-[#B89972] text-[#1A2E26] hover:bg-[#F5EBE0]'
            }`}
          >
            {audioMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#10B981]" />
            )}
          </button>

          {/* Desk Locker: API Keys, Backups & Reset */}
          <button
            id="open-desk-vault-btn"
            type="button"
            title="Desk Locker: Gemini API Keys, Backups & Reset"
            aria-label="Open Desk Locker"
            onClick={handleOpenLocker}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-bold border border-[#1E293B] shadow-[2px_2px_0px_#FDE047] transition-all cursor-pointer"
          >
            <KeyRound
              className={`w-3.5 h-3.5 ${
                geminiHasKey === false ? 'text-[#F59E0B]' : 'text-[#FDE047]'
              }`}
            />
            <span className="hidden lg:inline">
              {geminiHasKey === false ? 'Setup Keys' : 'Desk Locker'}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {archiveToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: 16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-5 right-5 z-50 bg-[#1A2E26] text-[#FDFBF7] border-2 border-[#10B981] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            {archiveToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Notebook Modal */}
      <AnimatePresence>
        {showCreateNotebook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowCreateNotebook(false)}
          >
            <motion.form
              onSubmit={handleCreateNotebookSubmit}
              initial={{ opacity: 0, scale: 0.94, skewX: -2.5, y: 14 }}
              animate={{ opacity: 1, scale: 1, skewX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="workbook-paper-surface border-2 border-[#1E293B] rounded-2xl max-w-md w-full p-5 shadow-[8px_8px_0px_#1E293B] text-[#1E293B] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D4B996] pb-3">
                <h2 className="text-lg font-bold font-serif">
                  Create Study Notebook
                </h2>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowCreateNotebook(false)}
                  className="p-1.5 rounded-lg bg-[#E6D5B8] hover:bg-[#D4B996] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="new-notebook-name"
                    className="text-xs font-mono font-bold uppercase text-slate-700 block mb-1"
                  >
                    Notebook Name
                  </label>
                  <input
                    id="new-notebook-name"
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g., A-Level Physics, AP Biology, World History"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#C8AE8D] text-xs sm:text-sm focus:outline-none focus:border-[#1A2E26]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-notebook-board"
                    className="text-xs font-mono font-bold uppercase text-slate-700 block mb-1"
                  >
                    Course / Standard (Optional)
                  </label>
                  <input
                    id="new-notebook-board"
                    type="text"
                    placeholder="e.g., Edexcel 9PH0, IB HL, GCSE"
                    value={newSubjectBoard}
                    onChange={(e) => setNewSubjectBoard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#C8AE8D] text-xs sm:text-sm focus:outline-none focus:border-[#1A2E26]"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F5EBE0] border border-[#D4B996] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateModalSyllabus}
                    onChange={(e) =>
                      setAutoGenerateModalSyllabus(e.target.checked)
                    }
                    className="mt-0.5 accent-[#1A2E26]"
                  />
                  <span className="text-xs text-[#1E293B] leading-snug">
                    <strong>Auto-generate 4-unit syllabus &amp; whiteboard formulas</strong>{' '}
                    (seeds topics, Socratic prompts, and diagnostic quizzes automatically)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNotebook(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#E6D5B8] hover:bg-[#D4B996] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-create-notebook-btn"
                  type="submit"
                  disabled={isCreatingSyllabus}
                  className="px-4 py-2 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] disabled:opacity-60 text-[#FDFBF7] text-xs font-bold border border-[#1E293B] shadow-[2px_2px_0px_#FDE047] cursor-pointer"
                >
                  {isCreatingSyllabus ? 'Building Syllabus...' : 'Create Notebook'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom Locker Modal (Gemini 3-Key Pool & .desk Backups / Reset) */}
      <AnimatePresence>
        {showVaultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowVaultModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, skewX: -3, y: 16 }}
              animate={{ opacity: 1, scale: 1, skewX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="workbook-paper-surface border-2 border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 shadow-[8px_8px_0px_#1E293B] text-[#1E293B] space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#D4B996] pb-3">
                <div>
                  <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#1A2E26]" />
                    Desk Locker: API Keys, Saves &amp; Reset
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Configure real Gemini 3.8 Flash keys, export local backups,
                    or wipe all desk data cleanly.
                  </p>
                </div>
                <button
                  id="close-desk-vault-btn"
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  aria-label="Close Desk Locker"
                  className="p-1.5 rounded-lg bg-[#E6D5B8] hover:bg-[#D4B996] text-[#1E293B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Clean Locker Sub-Tabs */}
              <div className="flex items-center gap-1.5 bg-[#E6D5B8]/70 p-1 rounded-xl border border-[#C8AE8D]">
                {(
                  [
                    { id: 'keys', label: 'Gemini 3-Key Rotator' },
                    { id: 'archive', label: 'Backups & Reset' },
                  ] as const
                ).map((t) => {
                  const active = vaultTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (vaultTab === t.id) return;
                        setVaultTab(t.id);
                        chiptuneAudio.playMenuSlash();
                      }}
                      className={`relative flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        active
                          ? 'text-[#FDFBF7]'
                          : 'text-slate-700 hover:text-[#1E293B]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="vault-subtab-pill"
                          transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 24,
                            mass: 1.05,
                          }}
                          className="absolute inset-0 bg-[#1A2E26] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#FDE047]"
                        />
                      )}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <PersonaMenuStage stageKey={vaultTab}>
                {vaultTab === 'keys' && (
                  <div className="space-y-3.5">
                    {/* AI Engine Mode Switcher */}
                    <div className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#1E293B]">
                            AI Engine Mode
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Choose Cloud Gemini 3.8 Flash or zero-cost In-Browser
                            WebGPU.
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#F5EBE0] p-1 rounded-lg border border-[#D4B996]">
                          <button
                            type="button"
                            onClick={() => setAiEngineMode('gemini')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                              aiEngineMode === 'gemini'
                                ? 'bg-[#1A2E26] text-[#FDE047]'
                                : 'text-slate-700 hover:text-[#1E293B]'
                            }`}
                          >
                            Gemini 3.8 Flash
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiEngineMode('local-webgpu')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                              aiEngineMode === 'local-webgpu'
                                ? 'bg-[#1A2E26] text-[#FDE047]'
                                : 'text-slate-700 hover:text-[#1E293B]'
                            }`}
                          >
                            Local WebGPU (Free)
                          </button>
                        </div>
                      </div>

                      {aiEngineMode === 'local-webgpu' && (
                        <div className="pt-2 border-t border-[#E6D5B8] space-y-2">
                          {!isWebGPUSupported() && (
                            <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-2.5 py-1.5">
                              WebGPU is not detected in this browser. Try Chrome,
                              Edge, or Safari 18+ on a WebGPU-capable device.
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={localModelId}
                              onChange={(e) => setLocalModelId(e.target.value)}
                              className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg bg-white border border-[#C8AE8D] text-xs font-medium text-[#1E293B]"
                            >
                              {LOCAL_MODEL_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label} ({opt.sizeLabel})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={localModelStatus === 'loading'}
                              onClick={async () => {
                                setLocalModelState({
                                  status: 'loading',
                                  progress: 0,
                                  text: 'Starting WebGPU download...',
                                });
                                try {
                                  await loadLocalModel(
                                    localModelId,
                                    (report) => {
                                      setLocalModelState({
                                        status:
                                          report.progress >= 100
                                            ? 'ready'
                                            : 'loading',
                                        progress: report.progress,
                                        text: report.text,
                                      });
                                    }
                                  );
                                  setLocalModelState({
                                    status: 'ready',
                                    progress: 100,
                                    text: 'Model ready in browser!',
                                  });
                                } catch (err) {
                                  setLocalModelState({
                                    status: 'error',
                                    progress: 0,
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : 'Failed to load WebGPU model.',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                            >
                              {localModelStatus === 'loading'
                                ? `Loading ${localModelProgress}%`
                                : localModelStatus === 'ready'
                                  ? 'Reload Model'
                                  : 'Download & Load'}
                            </button>
                            {localModelStatus === 'ready' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await unloadLocalModel();
                                  setLocalModelState({
                                    status: 'idle',
                                    progress: 0,
                                    text: '',
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] text-xs font-bold cursor-pointer"
                              >
                                Unload
                              </button>
                            )}
                          </div>
                          {localModelProgressText && (
                            <div className="text-[11px] text-slate-600 truncate">
                              {localModelProgressText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {keySlots.map((slot, idx) => (
                        <div
                          key={slot.id}
                          className="p-3 rounded-xl bg-[#F5EBE0] border border-[#D4B996] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-bold text-[#1A2E26]">
                              {slot.id}
                            </span>
                            <span
                              className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${
                                slot.configured
                                  ? 'bg-[#10B981]/20 text-[#065F46]'
                                  : 'bg-[#F59E0B]/20 text-[#92400E]'
                              }`}
                            >
                              {slot.source === 'server-env'
                                ? 'SERVER ENV'
                                : slot.source === 'browser-key'
                                  ? 'ACTIVE'
                                  : 'NOT SET'}
                            </span>
                          </div>
                          <div className="text-xs flex items-center justify-between text-slate-700 pt-1">
                            <span>Requests:</span>
                            <span className="font-mono font-bold">
                              {slot.requestCount}
                            </span>
                          </div>
                          <input
                            type="password"
                            placeholder={`Paste ${slot.id}`}
                            value={customKeyInputs[idx]}
                            onChange={(e) => {
                              const next: [string, string, string] = [
                                ...customKeyInputs,
                              ] as [string, string, string];
                              next[idx] = e.target.value;
                              setCustomKeyInputs(next);
                            }}
                            className="w-full mt-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        id="apply-custom-gemini-keys-btn"
                        type="button"
                        onClick={handleApplyKeys}
                        className="px-4 py-2 rounded-xl bg-[#1A2E26] text-white text-xs font-bold hover:bg-[#243F35] cursor-pointer"
                      >
                        Save Keys to Browser &amp; Activate
                      </button>

                      {customKeyInputs.some((k) => k.trim().length > 0) && (
                        <button
                          type="button"
                          onClick={handleClearKeys}
                          className="px-3.5 py-2 rounded-xl bg-[#F5EBE0] hover:bg-[#E6D5B8] border border-[#C8AE8D] text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Clear Saved Browser Keys
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {vaultTab === 'archive' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-[#1A2E26] text-[#FDFBF7] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-[#10B981] shrink-0" />
                        <div>
                          <div className="text-xs font-bold">
                            Local IndexedDB + WebOPFS
                          </div>
                          <div className="text-xs text-slate-300">
                            All notebooks, flashcards, files, and Cornell notes
                            stay private on your device.
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#10B981]/25 text-[#10B981] font-mono text-xs font-bold shrink-0">
                        ACTIVE
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        id="export-desk-archive-btn"
                        type="button"
                        onClick={handleExportDesk}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Export Full Backup (.desk)
                      </button>
                      <button
                        id="export-teacher-cartridge-btn"
                        type="button"
                        onClick={handleExportTeacherCartridge}
                        title="Export clean Teacher Lesson Cartridge without personal XP or chat history"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] text-[#FDE047] border border-[#1E293B] text-xs font-bold cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        Export Teacher Lesson Cartridge (.desk)
                      </button>
                      <button
                        id="import-desk-archive-btn"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] border border-[#C8AE8D] text-xs font-bold cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Restore / Load Cartridge (.desk)
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".desk,.json"
                        onChange={handleImportDesk}
                        className="hidden"
                      />
                    </div>

                    {/* Clear All Desk Data / Reset */}
                    <div className="pt-3 border-t border-[#D4B996] space-y-2.5">
                      {!confirmResetOpen ? (
                        <button
                          id="open-reset-desk-confirm-btn"
                          type="button"
                          onClick={() => setConfirmResetOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#991B1B] text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All Desk Data / Reset
                        </button>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border-2 border-[#EF4444] space-y-2.5">
                          <div className="flex items-start gap-2 text-xs text-[#7F1D1D] font-semibold">
                            <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                            <span>
                              This removes every notebook, topic, sticky note,
                              uploaded file, Cornell sheet, XP, and browser
                              Gemini key on this device.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              id="confirm-reset-desk-btn"
                              type="button"
                              onClick={handleConfirmResetDesk}
                              className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold cursor-pointer"
                            >
                              Confirm Wipe Everything
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetOpen(false)}
                              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </PersonaMenuStage>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Modal (Ctrl+K / Cmd+K) */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-start justify-center pt-16 p-4"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="workbook-paper-surface border-2 border-[#1E293B] rounded-2xl max-w-xl w-full p-4 shadow-[8px_8px_0px_#1E293B] text-[#1E293B] space-y-3 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center gap-2 border-b border-[#D4B996] pb-2.5">
                <Search className="w-4 h-4 text-[#1A2E26] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics, formulas, 3D flashcards, Cornell notes, or files..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-[#1E293B] placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="px-2 py-0.5 rounded bg-[#E6D5B8] hover:bg-[#D4B996] text-[11px] font-mono font-bold cursor-pointer"
                >
                  ESC
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pr-1 max-h-[60vh]">
                {(() => {
                  const q = searchQuery.trim().toLowerCase();
                  const topicHits = roadmapState.filter((t) =>
                    !q
                      ? true
                      : t.title.toLowerCase().includes(q) ||
                        t.subtitle.toLowerCase().includes(q) ||
                        t.subject.toLowerCase().includes(q) ||
                        t.coreLatex.toLowerCase().includes(q) ||
                        t.coreLatexCaption.toLowerCase().includes(q)
                  );
                  const cardHits = stickyNotes.filter((n) =>
                    !q
                      ? false
                      : n.frontPrompt.toLowerCase().includes(q) ||
                        n.backAnswer.toLowerCase().includes(q) ||
                        n.subject.toLowerCase().includes(q)
                  );
                  const cornellHits = Object.values(cornellNotes).filter((c) =>
                    !q
                      ? false
                      : c.cues.toLowerCase().includes(q) ||
                        c.notes.toLowerCase().includes(q) ||
                        c.summary.toLowerCase().includes(q) ||
                        c.subject.toLowerCase().includes(q)
                  );
                  const fileHits = backpackFiles.filter((f) =>
                    !q
                      ? false
                      : f.name.toLowerCase().includes(q) ||
                        f.chunks.some((ch) => ch.toLowerCase().includes(q))
                  );

                  if (
                    topicHits.length === 0 &&
                    cardHits.length === 0 &&
                    cornellHits.length === 0 &&
                    fileHits.length === 0
                  ) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-600">
                        No matching study items found across your notebooks.
                      </div>
                    );
                  }

                  return (
                    <>
                      {topicHits.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                            Whiteboard Topics ({topicHits.length})
                          </div>
                          {topicHits.slice(0, 8).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSubject(t.subject);
                                setActiveTopic(t.id);
                                setShowSearchModal(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-[#F5EBE0] border border-[#D4B996] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E293B] truncate">
                                  {t.title}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate">
                                  {t.subject} • {t.coreLatexCaption || t.coreLatex}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] shrink-0">
                                Open Topic
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {cardHits.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                            3D Sticky Flashcards ({cardHits.length})
                          </div>
                          {cardHits.slice(0, 6).map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                if (card.subject) setSubject(card.subject);
                                setStudioTab('stickies');
                                panToRight();
                                setShowSearchModal(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FEF08A]/60 hover:bg-[#FEF08A] border border-[#D4B996] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E293B] truncate">
                                  {card.frontPrompt}
                                </div>
                                <div className="text-[11px] text-slate-700 truncate">
                                  {card.backAnswer}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-white shrink-0">
                                3D Card
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {cornellHits.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                            Cornell Notes ({cornellHits.length})
                          </div>
                          {cornellHits.slice(0, 5).map((note) => (
                            <button
                              key={note.id}
                              type="button"
                              onClick={() => {
                                setSubject(note.subject);
                                if (note.topicId) setActiveTopic(note.topicId);
                                setStudioTab('cornell');
                                panToRight();
                                setShowSearchModal(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-[#F5EBE0] border border-[#D4B996] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E293B] truncate">
                                  {note.subject} — {note.cues || 'Cornell Sheet'}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate">
                                  {note.summary || note.notes}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981] text-white shrink-0">
                                Cornell
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {fileHits.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                            Uploaded Sources ({fileHits.length})
                          </div>
                          {fileHits.slice(0, 5).map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => {
                                setSubject(file.subject);
                                panToLeft();
                                setShowSearchModal(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-[#F5EBE0] border border-[#D4B996] flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E293B] truncate">
                                  {file.name}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate">
                                  {file.subject}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5EBE0] text-[#1E293B] shrink-0">
                                Source
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

