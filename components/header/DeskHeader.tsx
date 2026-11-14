'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Download,
  Upload,
  KeyRound,
  Columns3,
  Map,
  BookOpenCheck,
  FlaskConical,
  Award,
  Flame,
  HardDrive,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  useStudyDeskStore,
  type SubjectName,
  type SyllabusBoard,
  type CameraPanTarget,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { geminiRotator, type KeySlotStatus } from '@/lib/gemini';
import { storageAdapter, type StorageProviderType } from '@/lib/storage';
import { PersonaMenuStage } from '@/components/transitions/PersonaSchoolTransition';

const SUBJECTS: SubjectName[] = ['Mathematics', 'Physics', 'Chemistry'];
const BOARDS: SyllabusBoard[] = ['AQA', 'Edexcel', 'OCR', 'IB'];

const STATIONS: Array<{
  id: CameraPanTarget;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Study Desk', icon: Columns3 },
  { id: 'left', label: 'Chalkboard', icon: Map },
  { id: 'center', label: 'Workbook', icon: BookOpenCheck },
  { id: 'right', label: '3D Studio', icon: FlaskConical },
];

const SQUAD_MEMBERS = [
  {
    name: 'Maya L.',
    subject: 'Mathematics',
    status: 'Deriving M1.2',
    initials: 'ML',
    bg: 'bg-[#10B981]',
  },
  {
    name: 'Liam K.',
    subject: 'Physics',
    status: 'Simulating P2.1',
    initials: 'LK',
    bg: 'bg-[#F59E0B]',
  },
  {
    name: 'Zara T.',
    subject: 'Chemistry',
    status: 'Feynman Mode',
    initials: 'ZT',
    bg: 'bg-[#3B82F6]',
  },
];

export function DeskHeader() {
  const {
    currentSubject,
    syllabusBoard,
    userXP,
    streakCount,
    activeCallState,
    cameraPan,
    audioMuted,
    stickyNotes,
    backpackFiles,
    cornellNotes,
    roadmapState,
    setSubject,
    setSyllabusBoard,
    setActiveCallState,
    panToLeft,
    panToCenter,
    panToRight,
    panToOverview,
    setAudioMuted,
    hydrateFromArchive,
  } = useStudyDeskStore();

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultTab, setVaultTab] = useState<'keys' | 'archive' | 'squad'>(
    'keys'
  );
  const [keySlots, setKeySlots] = useState<KeySlotStatus[]>(
    geminiRotator.getTelemetry().slots
  );
  const [customKeyInputs, setCustomKeyInputs] = useState<
    [string, string, string]
  >(['', '', '']);
  const [activeStorageProvider, setActiveStorageProvider] =
    useState<StorageProviderType>(storageAdapter.getProvider());
  const [archiveToast, setArchiveToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showVaultModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowVaultModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showVaultModal]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPomodoroRunning(false);
          setActiveCallState('IDLE');
          chiptuneAudio.playMasteryFanfare();
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomodoroRunning, setActiveCallState]);

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

  const handleSubjectSelect = (subj: SubjectName) => {
    if (subj === currentSubject) return;
    chiptuneAudio.playSchoolBellChime();
    setSubject(subj);
  };

  const handleExportDesk = async () => {
    const topicBadges: Record<string, string> = {};
    roadmapState.forEach((n) => {
      topicBadges[n.id] = n.status;
    });
    await storageAdapter.exportDeskArchive({
      formatVersion: '1.0.0-desk',
      exportedAt: new Date().toISOString(),
      studentCallsign: 'Scholar-01',
      userXP,
      streakCount,
      currentSubject,
      syllabusBoard,
      topicBadges,
      stickyNotes,
      backpackFiles,
      cornellNotes: Object.values(cornellNotes),
    });
    setArchiveToast('Saved .desk archive to your computer!');
    setTimeout(() => setArchiveToast(null), 3500);
  };

  const handleImportDesk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const archive = await storageAdapter.parseDeskArchive(file);
      hydrateFromArchive({
        userXP: archive.userXP,
        streakCount: archive.streakCount,
        currentSubject:
          (archive.currentSubject as SubjectName) || 'Mathematics',
        syllabusBoard: (archive.syllabusBoard as SyllabusBoard) || 'AQA',
        topicBadges: archive.topicBadges,
        stickyNotes: archive.stickyNotes || stickyNotes,
        backpackFiles: archive.backpackFiles || backpackFiles,
        cornellNotes: archive.cornellNotes,
      });
      chiptuneAudio.playMasteryFanfare();
      setArchiveToast(
        `Restored .desk snapshot (${archive.stickyNotes.length} flashcards)!`
      );
      setTimeout(() => setArchiveToast(null), 4000);
    } catch {
      setArchiveToast('Could not parse .desk archive file.');
      setTimeout(() => setArchiveToast(null), 4000);
    }
  };

  const handleApplyKeys = () => {
    geminiRotator.setCustomKeys(customKeyInputs);
    setKeySlots(geminiRotator.getTelemetry().slots);
    setArchiveToast('Updated 3-Key Gemini Flash Rotator pool!');
    setTimeout(() => setArchiveToast(null), 3000);
  };

  return (
    <header className="w-full border-b-2 border-[#C8AE8D] bg-[#F3E6D3]/95 backdrop-blur-md px-3 sm:px-5 py-2.5 shadow-sm z-30 sticky top-0">
      <div className="max-w-[1760px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: School Brand Crest & Subject Period Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="chalkboard-surface border-2 border-[#4E342E] rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 text-[#FDFBF7] shadow-[2px_2px_0px_#3E2723]">
            <BookOpen className="w-4 h-4 text-[#FDE047] shrink-0" />
            <div>
              <h1 className="text-sm font-bold tracking-tight font-serif leading-tight">
                Barnaby&apos;s Study Desk
              </h1>
              <p className="text-xs text-emerald-200/90 font-mono leading-tight hidden sm:block">
                {syllabusBoard} Classroom • Period: {currentSubject}
              </p>
            </div>
          </div>

          {/* Subject Period Tabs with Skewed Persona Highlighter */}
          <div
            className="flex items-center bg-[#E6D5B8] p-1 rounded-xl border border-[#C8AE8D]"
            role="group"
            aria-label="Subject Period Selector"
          >
            {SUBJECTS.map((subj) => {
              const active = currentSubject === subj;
              return (
                <button
                  key={subj}
                  id={`subject-tab-${subj.toLowerCase()}`}
                  onClick={() => handleSubjectSelect(subj)}
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
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="absolute inset-0 bg-[#FDE047] border border-[#1E293B] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#1E293B]"
                    />
                  )}
                  <span className="relative z-10">{subj}</span>
                </button>
              );
            })}
          </div>

          <select
            id="syllabus-board-select"
            aria-label="Exam Syllabus Board"
            value={syllabusBoard}
            onChange={(e) => {
              setSyllabusBoard(e.target.value as SyllabusBoard);
              chiptuneAudio.playPaperFlip();
            }}
            className="bg-[#FDFBF7] border border-[#B89972] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#1E293B] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A2E26]"
          >
            {BOARDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* CENTER: Classroom Station Switcher (Clear 1-Click Menu Navigation) */}
        <nav
          aria-label="Classroom Station Navigation"
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
                      stiffness: 440,
                      damping: 32,
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

        {/* RIGHT: Analog Pomodoro Clock, Streak/XP, Audio & Desk Vault */}
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
              onClick={togglePomodoro}
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
                onClick={resetPomodoro}
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

          {/* Audio Toggle */}
          <button
            id="toggle-chiptune-audio-btn"
            onClick={toggleMute}
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

          {/* Classroom Vault, Keys & Study Squad Button */}
          <button
            id="open-desk-vault-btn"
            type="button"
            title="Desk Locker: Keys, Saves & Squad"
            aria-label="Open Desk Locker"
            onClick={() => {
              setKeySlots(geminiRotator.getTelemetry().slots);
              setShowVaultModal(true);
              chiptuneAudio.playMenuSlash();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-bold border border-[#1E293B] shadow-[2px_2px_0px_#FDE047] transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FDE047]" />
            <span className="hidden lg:inline">Desk Locker</span>
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

      {/* Classroom Locker Modal (3-Key Pool, .desk Backups, & Study Squad) */}
      <AnimatePresence>
        {showVaultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowVaultModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, skewX: -3, y: 16 }}
              animate={{ opacity: 1, scale: 1, skewX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="workbook-paper-surface border-2 border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 shadow-[8px_8px_0px_#1E293B] text-[#1E293B] space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#D4B996] pb-3">
                <div>
                  <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#1A2E26]" />
                    Classroom Locker: Keys, Saves &amp; Squad
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Keep your physical study desk clutter-free by storing setup tools inside your locker.
                  </p>
                </div>
                <button
                  id="close-desk-vault-btn"
                  onClick={() => setShowVaultModal(false)}
                  aria-label="Close Classroom Locker"
                  className="p-1.5 rounded-lg bg-[#E6D5B8] hover:bg-[#D4B996] text-[#1E293B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Clean Persona Skewed Locker Sub-Tabs */}
              <div className="flex items-center gap-1.5 bg-[#E6D5B8]/70 p-1 rounded-xl border border-[#C8AE8D]">
                {(
                  [
                    { id: 'keys', label: 'Gemini 3-Key Rotator' },
                    { id: 'archive', label: '.desk Save & Storage' },
                    { id: 'squad', label: 'Study Squad (3 Peers)' },
                  ] as const
                ).map((t) => {
                  const active = vaultTab === t.id;
                  return (
                    <button
                      key={t.id}
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
                            stiffness: 430,
                            damping: 30,
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {keySlots.map((slot, idx) => (
                        <div
                          key={slot.id}
                          className="p-3 rounded-xl bg-[#F5EBE0] border border-[#D4B996] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
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
                              {slot.configured ? 'LIVE' : 'FALLBACK'}
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
                            placeholder={`Override ${slot.id}`}
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
                    <button
                      id="apply-custom-gemini-keys-btn"
                      onClick={handleApplyKeys}
                      className="px-4 py-2 rounded-xl bg-[#1A2E26] text-white text-xs font-bold hover:bg-[#243F35] cursor-pointer"
                    >
                      Save Keys to Server/Client Rotator
                    </button>
                  </div>
                )}

                {vaultTab === 'archive' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'local-dexie', label: 'Dexie + WebOPFS' },
                          { id: 'google-drive', label: 'Google Drive' },
                          { id: 'onedrive', label: 'OneDrive' },
                          { id: 'dropbox', label: 'Dropbox' },
                        ] as const
                      ).map((prov) => {
                        const active = activeStorageProvider === prov.id;
                        return (
                          <button
                            key={prov.id}
                            onClick={() => {
                              storageAdapter.toggleCloudConnection(prov.id);
                              setActiveStorageProvider(
                                storageAdapter.getProvider()
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-[#1A2E26] text-white border-[#1A2E26]'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-[#F5EBE0]'
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center gap-1">
                              <HardDrive className="w-3.5 h-3.5" />
                              {prov.label}
                            </div>
                            <div className="text-xs opacity-80 mt-0.5">
                              {active ? 'Active' : 'Mount'}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        id="export-desk-archive-btn"
                        onClick={handleExportDesk}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Export Backup (.desk)
                      </button>
                      <button
                        id="import-desk-archive-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] border border-[#C8AE8D] text-xs font-bold cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Restore Backup (.desk)
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".desk,.json"
                        onChange={handleImportDesk}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {vaultTab === 'squad' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#10B981]" />
                      Study Squad classmates currently active in today&apos;s period:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {SQUAD_MEMBERS.map((member) => (
                        <div
                          key={member.name}
                          className="p-3 rounded-xl bg-[#F5EBE0] border border-[#D4B996] flex items-center gap-2.5"
                        >
                          <div
                            className={`w-9 h-9 rounded-full ${member.bg} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1E293B]">
                              {member.name}
                            </div>
                            <div className="text-xs text-slate-600">
                              {member.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PersonaMenuStage>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
