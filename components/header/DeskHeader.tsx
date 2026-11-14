'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  BookOpen,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Download,
  Upload,
  KeyRound,
  Maximize2,
  PanelLeft,
  PanelRight,
  Columns3,
  Award,
  Flame,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import {
  useStudyDeskStore,
  type SubjectName,
  type SyllabusBoard,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { geminiRotator, type KeySlotStatus } from '@/lib/gemini';
import { storageAdapter, type StorageProviderType } from '@/lib/storage';

const SUBJECTS: SubjectName[] = ['Mathematics', 'Physics', 'Chemistry'];
const BOARDS: SyllabusBoard[] = ['AQA', 'Edexcel', 'OCR', 'IB'];

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

  // Pomodoro Analog Desk Clock state (25 minutes = 1500 seconds)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [keySlots, setKeySlots] = useState<KeySlotStatus[]>(
    geminiRotator.getTelemetry().slots
  );
  const [customKeyInputs, setCustomKeyInputs] = useState<[string, string, string]>([
    '',
    '',
    '',
  ]);
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

  // Analog hand rotation angles
  const minuteAngle = ((1500 - secondsLeft) / 1500) * 360;
  const secondAngle = ((60 - secs) % 60) * 6;

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
    setArchiveToast('Exported zero-cloud .desk archive to your device!');
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
        currentSubject: (archive.currentSubject as SubjectName) || 'Mathematics',
        syllabusBoard: (archive.syllabusBoard as SyllabusBoard) || 'AQA',
        topicBadges: archive.topicBadges,
        stickyNotes: archive.stickyNotes || stickyNotes,
        backpackFiles: archive.backpackFiles || backpackFiles,
        cornellNotes: archive.cornellNotes,
      });
      chiptuneAudio.playMasteryFanfare();
      setArchiveToast(`Restored .desk snapshot (${archive.stickyNotes.length} notes)!`);
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
    <header className="w-full border-b-2 border-[#D4B996] bg-[#EFE2D0]/95 backdrop-blur-md px-3 py-2.5 shadow-[0_6px_20px_-4px_rgba(62,39,35,0.12)] z-30">
      <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: Subject Slate Badge & Exam Syllabus Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="chalkboard-surface border-2 border-[#5D4037] rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 text-[#F1F5F9] shadow-md">
            <BookOpen className="w-4 h-4 text-[#10B981] shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight font-serif text-[#FDFBF7]">
                  Professor Barnaby&apos;s Study Desk
                </h1>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  ITS v2.5
                </span>
              </div>
              <p className="text-[10px] text-slate-300 hidden sm:block">
                Dual-Coding • Socratic Active Mastery • Local-First BYOS
              </p>
            </div>
          </div>

          {/* Subject Pills */}
          <div
            className="flex items-center bg-[#E6D5B8] p-1 rounded-xl border border-[#C8AE8D] shadow-inner"
            role="group"
            aria-label="Subject Selector"
          >
            {SUBJECTS.map((subj) => {
              const active = currentSubject === subj;
              return (
                <button
                  key={subj}
                  id={`subject-tab-${subj.toLowerCase()}`}
                  onClick={() => {
                    setSubject(subj);
                    chiptuneAudio.playPaperFlip();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1A2E26] text-[#FDFBF7] shadow-sm'
                      : 'text-[#1E293B]/80 hover:text-[#1E293B] hover:bg-[#FDFBF7]/50'
                  }`}
                >
                  {subj}
                </button>
              );
            })}
          </div>

          {/* Exam Board Selector */}
          <select
            id="syllabus-board-select"
            aria-label="Exam Syllabus Board"
            value={syllabusBoard}
            onChange={(e) =>
              setSyllabusBoard(e.target.value as SyllabusBoard)
            }
            className="bg-[#FDFBF7] border border-[#C8AE8D] rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-[#1E293B] shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A2E26]"
          >
            {BOARDS.map((b) => (
              <option key={b} value={b}>
                {b} Syllabus
              </option>
            ))}
          </select>
        </div>

        {/* CENTER: 3D Camera Panning Controls & Analog Desk Clock (Pomodoro) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Camera Pan Controls */}
          <div className="flex items-center bg-[#FDFBF7] border border-[#C8AE8D] rounded-xl p-1 shadow-xs">
            <button
              id="camera-pan-overview"
              onClick={() => {
                panToOverview();
                chiptuneAudio.playPaperFlip();
              }}
              title="Full 3-Panel Desk View"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                cameraPan === 'overview'
                  ? 'bg-[#1A2E26] text-[#FDFBF7]'
                  : 'text-slate-700 hover:bg-[#F5EBE0]'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">3-Panel Desk</span>
            </button>
            <button
              id="camera-pan-left"
              onClick={() => {
                panToLeft();
                chiptuneAudio.playPaperFlip();
              }}
              title="Pan Camera to Left Chalkboard Roadmap"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                cameraPan === 'left'
                  ? 'bg-[#1A2E26] text-[#FDFBF7]'
                  : 'text-slate-700 hover:bg-[#F5EBE0]'
              }`}
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Roadmap</span>
            </button>
            <button
              id="camera-pan-center"
              onClick={() => {
                panToCenter();
                chiptuneAudio.playPaperFlip();
              }}
              title="Pan Camera to Center Open Workbook"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                cameraPan === 'center'
                  ? 'bg-[#1A2E26] text-[#FDFBF7]'
                  : 'text-slate-700 hover:bg-[#F5EBE0]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Workbook</span>
            </button>
            <button
              id="camera-pan-right"
              onClick={() => {
                panToRight();
                chiptuneAudio.playPaperFlip();
              }}
              title="Pan Camera to Right 3D Sticky & Sim Studio"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                cameraPan === 'right'
                  ? 'bg-[#1A2E26] text-[#FDFBF7]'
                  : 'text-slate-700 hover:bg-[#F5EBE0]'
              }`}
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">3D Studio</span>
            </button>
          </div>

          {/* ⏱️ Analog Desk Clock (Pomodoro Focus Sprint) */}
          <div className="flex items-center gap-2 bg-[#FDFBF7] border-2 border-[#B89972] rounded-xl px-3 py-1 shadow-[0_4px_12px_rgba(62,39,35,0.1)]">
            {/* Tactile Brass Analog Clock SVG */}
            <div className="relative w-8 h-8 rounded-full border-2 border-[#8D6E63] bg-[#FFFDF9] shadow-inner flex items-center justify-center shrink-0">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                {/* Clock ticks */}
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
                  y1="3"
                  x2="20"
                  y2="6"
                  stroke="#5D4037"
                  strokeWidth="1.5"
                />
                <line
                  x1="37"
                  y1="20"
                  x2="34"
                  y2="20"
                  stroke="#5D4037"
                  strokeWidth="1.5"
                />
                <line
                  x1="20"
                  y1="37"
                  x2="20"
                  y2="34"
                  stroke="#5D4037"
                  strokeWidth="1.5"
                />
                <line
                  x1="3"
                  y1="20"
                  x2="6"
                  y2="20"
                  stroke="#5D4037"
                  strokeWidth="1.5"
                />
                {/* Minute hand */}
                <line
                  x1="20"
                  y1="20"
                  x2="20"
                  y2="8"
                  stroke="#1E293B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${minuteAngle} 20 20)`}
                />
                {/* Second hand */}
                <line
                  x1="20"
                  y1="20"
                  x2="20"
                  y2="6"
                  stroke="#EF4444"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  transform={`rotate(${secondAngle} 20 20)`}
                />
                <circle cx="20" cy="20" r="2" fill="#5D4037" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-[#F59E0B]" />
                {pomodoroRunning ? 'Focus Sprint' : 'Desk Pomodoro'}
              </span>
              <span className="text-xs font-mono font-bold text-[#1E293B]">
                {formattedTime}
              </span>
            </div>

            <div className="flex items-center gap-1 ml-1">
              <button
                id="pomodoro-toggle-btn"
                onClick={togglePomodoro}
                title={
                  pomodoroRunning
                    ? 'Pause Focus Sprint'
                    : 'Start 25m Focus Sprint (Equips Barnaby Focus Headband)'
                }
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  pomodoroRunning
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#10B981] text-white hover:bg-[#059669]'
                }`}
              >
                {pomodoroRunning ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
              <button
                id="pomodoro-reset-btn"
                onClick={resetPomodoro}
                title="Reset Desk Clock"
                className="p-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] text-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: XP / Streak Badges, Study Squad Avatars, Audio & BYOS/Key Modal */}
        <div className="flex items-center gap-2.5">
          {/* Streak & XP Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#1A2E26] text-[#FDFBF7] px-3 py-1.5 rounded-xl border border-[#3E2723] text-xs font-mono">
            <span
              className="flex items-center gap-1 text-[#F59E0B]"
              title="Daily Active Mastery Streak"
            >
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
              {streakCount}d
            </span>
            <span className="text-slate-500">|</span>
            <span
              className="flex items-center gap-1 text-[#FDE047]"
              title="Total Mastery XP"
            >
              <Award className="w-3.5 h-3.5" />
              {userXP.toLocaleString()} XP
            </span>
          </div>

          {/* 👥 Study Squad Avatars */}
          <div
            className="hidden lg:flex items-center gap-1.5 bg-[#FDFBF7] border border-[#C8AE8D] rounded-xl px-2.5 py-1 shadow-xs"
            title="Active Study Squad Peers"
          >
            <Users className="w-3.5 h-3.5 text-slate-600 mr-0.5" />
            <div className="flex -space-x-1.5">
              {SQUAD_MEMBERS.map((member) => (
                <div
                  key={member.name}
                  title={`${member.name} — ${member.status}`}
                  className={`w-6 h-6 rounded-full ${member.bg} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#FDFBF7] shadow-xs cursor-default`}
                >
                  {member.initials}
                </div>
              ))}
            </div>
            <span className="text-[11px] font-medium text-slate-600 ml-1">
              3 Peer Owls
            </span>
          </div>

          {/* Audio Synthesizer Toggle */}
          <button
            id="toggle-chiptune-audio-btn"
            onClick={toggleMute}
            title={
              audioMuted
                ? 'Unmute Barnaby 8-Bit Chiptune Voice'
                : 'Mute Barnaby 8-Bit Chiptune Voice'
            }
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              audioMuted
                ? 'bg-slate-200 border-slate-300 text-slate-600'
                : 'bg-[#FDFBF7] border-[#C8AE8D] text-[#1A2E26] hover:bg-[#F5EBE0]'
            }`}
          >
            {audioMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#10B981]" />
            )}
          </button>

          {/* 3-Key Rotator & BYOS .desk Vault Button */}
          <button
            id="open-desk-vault-btn"
            onClick={() => {
              setKeySlots(geminiRotator.getTelemetry().slots);
              setShowVaultModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-semibold border border-[#3E2723] shadow-sm transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FDE047]" />
            <span className="hidden md:inline">3-Key &amp; .desk Vault</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {archiveToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1A2E26] text-[#FDFBF7] border-2 border-[#10B981] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          {archiveToast}
        </div>
      )}

      {/* 3-Key Gemini Rotator + BYOS Storage Adapter Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="workbook-paper-surface border-2 border-[#8D6E63] rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-[#1E293B] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#1A2E26]" />
                  Gemini 3-Key Rotator &amp; Local-First BYOS Vault
                </h2>
                <p className="text-xs text-slate-600">
                  Round-robin API key failover (429/500 resilience) + IndexedDB/WebOPFS &amp; zero-cloud .desk archives
                </p>
              </div>
              <button
                id="close-desk-vault-btn"
                onClick={() => setShowVaultModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Section 1: 3-Key Rotator Status */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Gemini 2.0 Flash 3-Key Pool Telemetry (/lib/gemini.ts)
              </h3>
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
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          slot.configured
                            ? 'bg-[#10B981]/20 text-[#065F46]'
                            : 'bg-[#F59E0B]/20 text-[#92400E]'
                        }`}
                      >
                        {slot.configured ? 'LIVE KEY' : 'SIMULATED FALLBACK'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate">
                      {slot.envName}
                    </p>
                    <div className="text-[11px] flex items-center justify-between text-slate-700 pt-1">
                      <span>Turns Routed:</span>
                      <span className="font-mono font-bold">
                        {slot.requestCount}
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder={`Override ${slot.id} (optional)`}
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
                className="px-3.5 py-1.5 rounded-lg bg-[#1A2E26] text-white text-xs font-semibold hover:bg-[#243F35] cursor-pointer"
              >
                Save Runtime API Keys to Rotator Pool
              </button>
            </div>

            {/* Section 2: BYOS Storage Providers & .desk Archive */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                2. Storage Adapter (/lib/storage/) &amp; Zero-Cloud .desk Archives
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'local-dexie', label: 'Dexie + WebOPFS' },
                    { id: 'google-drive', label: 'Google Drive API' },
                    { id: 'onedrive', label: 'OneDrive Graph' },
                    { id: 'dropbox', label: 'Dropbox Vault' },
                  ] as const
                ).map((prov) => {
                  const active = activeStorageProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      onClick={() => {
                        storageAdapter.toggleCloudConnection(prov.id);
                        setActiveStorageProvider(storageAdapter.getProvider());
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1A2E26] text-white border-[#1A2E26]'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-[#F5EBE0]'
                      }`}
                    >
                      <div className="text-xs font-bold">{prov.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        {active ? 'Active Adapter' : 'Click to mount'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="export-desk-archive-btn"
                  onClick={handleExportDesk}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Zero-Cloud Archive (.desk)
                </button>
                <button
                  id="import-desk-archive-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] border border-[#C8AE8D] text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Import .desk Snapshot
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
          </div>
        </div>
      )}
    </header>
  );
}
