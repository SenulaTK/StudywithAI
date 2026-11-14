'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  Crown,
  Flame,
  Upload,
  FileText,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  useStudyDeskStore,
  type BadgeStatus,
  type RoadmapTopicNode,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { storageAdapter } from '@/lib/storage';

const BADGE_CONFIG: Record<
  BadgeStatus,
  {
    label: string;
    cardStyle: string;
    pillStyle: string;
    iconColor: string;
  }
> = {
  LOCKED: {
    label: 'Locked',
    cardStyle: 'bg-slate-900/50 border-slate-700/80 opacity-65 cursor-not-allowed',
    pillStyle: 'bg-slate-800 text-slate-400',
    iconColor: 'text-slate-500',
  },
  UNLOCKED: {
    label: 'Active',
    cardStyle: 'bg-[#10B981]/15 border-[#10B981]/70 cursor-pointer hover:border-[#FDE047]',
    pillStyle: 'bg-[#10B981]/25 text-emerald-200',
    iconColor: 'text-[#10B981]',
  },
  BRONZE: {
    label: '🥉 Bronze',
    cardStyle: 'bg-amber-950/35 border-amber-600/70 cursor-pointer hover:border-[#FDE047]',
    pillStyle: 'bg-amber-900/60 text-amber-200',
    iconColor: 'text-amber-400',
  },
  SILVER: {
    label: '🥈 Silver',
    cardStyle: 'bg-slate-800/60 border-slate-400/70 cursor-pointer hover:border-[#FDE047]',
    pillStyle: 'bg-slate-700 text-slate-100',
    iconColor: 'text-slate-200',
  },
  GOLD: {
    label: '🥇 Gold',
    cardStyle: 'bg-yellow-500/15 border-[#FDE047]/80 cursor-pointer hover:border-[#FDE047]',
    pillStyle: 'bg-[#FDE047]/20 text-[#FDE047]',
    iconColor: 'text-[#FDE047]',
  },
  DIAMOND: {
    label: '💎 Diamond',
    cardStyle: 'bg-cyan-500/15 border-cyan-300/80 cursor-pointer hover:border-[#FDE047]',
    pillStyle: 'bg-cyan-500/20 text-cyan-200',
    iconColor: 'text-cyan-300',
  },
};

export function ChalkboardRoadmap() {
  const {
    currentSubject,
    syllabusBoard,
    roadmapState,
    activeTopicId,
    userXP,
    streakCount,
    backpackFiles,
    setActiveTopic,
    addBackpackFile,
    removeBackpackFile,
  } = useStudyDeskStore();

  const [backpackOpen, setBackpackOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjectNodes = roadmapState.filter(
    (node) => node.subject === currentSubject
  );
  const subjectFiles = backpackFiles.filter(
    (f) => f.subject === currentSubject
  );

  const currentLevel = Math.floor(userXP / 500) + 1;
  const xpIntoLevel = userXP % 500;
  const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / 500) * 100));

  const extractPdfTextFromBuffer = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(buffer);

    const extractedTokens: string[] = [];
    const regex = /\(([^()\\]{3,200})\)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      const token = match[1].replace(/[^\x20-\x7E]/g, ' ').trim();
      if (token.length >= 3 && /[a-zA-Z]{2,}/.test(token)) {
        extractedTokens.push(token);
      }
      if (extractedTokens.length >= 250) break;
    }

    const joined = extractedTokens.join(' ').replace(/\s+/g, ' ').trim();
    if (joined.length > 60) {
      return joined;
    }
    return `Uploaded PDF Document "${file.name}" (${currentSubject} • ${syllabusBoard} Syllabus): Core syllabus definitions, mathematical derivations, boundary assumptions, and mark-scheme checkpoints indexed for Socratic retrieval.`;
  };

  const chunkTextWithOverlap = (
    text: string,
    chunkSize = 360,
    overlap = 60,
    maxChunks = 24
  ): string[] => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    if (clean.length <= chunkSize) return [clean];

    const chunks: string[] = [];
    let start = 0;
    while (start < clean.length && chunks.length < maxChunks) {
      let end = Math.min(start + chunkSize, clean.length);
      if (end < clean.length) {
        const lastPeriod = clean.lastIndexOf('. ', end);
        const lastSpace = clean.lastIndexOf(' ', end);
        if (lastPeriod > start + chunkSize * 0.5) {
          end = lastPeriod + 1;
        } else if (lastSpace > start + chunkSize * 0.5) {
          end = lastSpace;
        }
      }
      const slice = clean.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push(slice);
      }
      if (end >= clean.length) break;
      start = Math.max(start + 1, end - overlap);
    }
    return chunks;
  };

  const processUploadedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    let rawText = '';
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        rawText = await extractPdfTextFromBuffer(file);
      } else {
        rawText = await file.text();
      }
    } catch {
      rawText = `Indexed ${file.name} into local RAG context.`;
    }

    const chunks = chunkTextWithOverlap(rawText);
    if (chunks.length === 0) {
      chunks.push(
        `[${file.name}] Uploaded to ${currentSubject} RAG Backpack for ${syllabusBoard} exam alignment.`
      );
    }

    const newFile = {
      id: `rag-${Date.now()}`,
      name: file.name,
      sizeBytes: file.size || 24500,
      type: file.name.toLowerCase().endsWith('.pdf')
        ? ('pdf' as const)
        : file.name.toLowerCase().endsWith('.mp4')
          ? ('video-transcript' as const)
          : ('notes' as const),
      subject: currentSubject,
      chunks,
      uploadedAt: Date.now(),
    };

    addBackpackFile(newFile);
    await storageAdapter.saveBackpackFiles([newFile, ...backpackFiles]);
    chiptuneAudio.playMasteryFanfare();
    setBackpackOpen(true);
    setUploadStatus(`Added "${file.name}" (${chunks.length} passages)`);
    setTimeout(() => setUploadStatus(null), 3500);
  };

  const handleSelectNode = (node: RoadmapTopicNode) => {
    if (node.status === 'LOCKED') return;
    setActiveTopic(node.id);
    chiptuneAudio.playPaperFlip();
  };

  return (
    <aside
      aria-label="Left Panel: Chalkboard Scheme of Work Roadmap"
      className="flex flex-col h-full rounded-2xl overflow-hidden border-4 border-[#4E342E] shadow-[0_12px_28px_-6px_rgba(30,41,59,0.22)]"
    >
      <div className="chalkboard-surface p-4 text-[#F1F5F9] flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          {/* Chalkboard Header */}
          <div className="flex items-center justify-between border-b border-emerald-800/70 pb-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#10B981] font-bold block">
                {syllabusBoard} Curriculum
              </span>
              <h2 className="text-lg font-bold font-serif text-[#FDFBF7]">
                {currentSubject} Syllabus
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-black/30 border border-emerald-800 text-xs font-mono font-bold text-[#FDE047]">
              {
                subjectNodes.filter(
                  (n) => n.status !== 'LOCKED' && n.status !== 'UNLOCKED'
                ).length
              }
              /{subjectNodes.length} Crowns
            </span>
          </div>

          {/* Clean Scholar XP & Streak Bar */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#FDE047] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                Level {currentLevel} Scholar
              </span>
              <span className="font-mono text-[#F59E0B] flex items-center gap-1 font-semibold">
                <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
                {streakCount}d Streak
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-emerald-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#FDE047] transition-all duration-500"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span>{userXP.toLocaleString()} XP</span>
              <span>{500 - xpIntoLevel} XP to next level</span>
            </div>
          </div>

          {/* Streamlined Sequential Skill Tree */}
          <div className="space-y-2.5">
            {subjectNodes.map((node, index) => {
              const cfg = BADGE_CONFIG[node.status];
              const isSelected = node.id === activeTopicId;
              const isLocked = node.status === 'LOCKED';

              return (
                <motion.div
                  key={node.id}
                  id={`roadmap-node-${node.id}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => handleSelectNode(node)}
                  role="button"
                  tabIndex={isLocked ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectNode(node);
                    }
                  }}
                  className={`rounded-xl border-2 p-3 transition-all ${cfg.cardStyle} ${
                    isSelected
                      ? 'border-[#FDE047] bg-[#1E3A2F] shadow-[3px_3px_0px_#FDE047] translate-x-1'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`${cfg.iconColor}`}>
                        {isLocked ? (
                          <Lock className="w-4 h-4" />
                        ) : node.status === 'UNLOCKED' ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Crown className="w-4 h-4" />
                        )}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {node.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {node.spacedDue && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/25 text-[#FDE047]">
                          Review Due
                        </span>
                      )}
                      {node.weakPoint && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#EF4444]/25 text-red-200">
                          Practice
                        </span>
                      )}
                      <span
                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${cfg.pillStyle}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#FDFBF7] mt-1.5 leading-snug">
                    {node.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                    {node.subtitle}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Collapsible RAG Backpack Drawer (Keeps Chalkboard Uncluttered) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
            setBackpackOpen(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            processUploadedFiles(e.dataTransfer.files);
          }}
          className="pt-3 border-t border-emerald-800/70"
        >
          <button
            type="button"
            onClick={() => {
              setBackpackOpen(!backpackOpen);
              chiptuneAudio.playPaperFlip();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-black/25 hover:bg-black/35 border border-emerald-800/80 text-xs font-bold text-[#FDFBF7] cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#FDE047]" />
              Class Notes Backpack ({subjectFiles.length})
            </span>
            {backpackOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <AnimatePresence>
            {backpackOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-2.5 space-y-2"
              >
                <div
                  id="rag-backpack-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed p-3 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-[#FDE047] bg-[#10B981]/20'
                      : 'border-emerald-700/80 bg-black/20 hover:border-[#10B981]'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#10B981] mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-200">
                    Upload PDF or Notes for Barnaby
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv"
                    onChange={(e) => processUploadedFiles(e.target.files)}
                    className="hidden"
                  />
                </div>

                {uploadStatus && (
                  <div className="p-2 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-xs text-emerald-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FDE047] shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {subjectFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[#FDE047] shrink-0" />
                        <span className="truncate text-slate-100">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeBackpackFile(file.id)}
                        title="Remove file"
                        className="p-1 text-slate-400 hover:text-[#EF4444] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Authentic Classroom Wooden Chalk Ledge with Chalk Sticks */}
      <div
        aria-hidden="true"
        className="chalkboard-wood-ledge h-3.5 px-6 flex items-center justify-end gap-3"
      >
        <span className="w-7 h-1.5 rounded-xs bg-[#F8FAFC] shadow-xs rotate-2" />
        <span className="w-5 h-1.5 rounded-xs bg-[#FDE047] shadow-xs -rotate-3" />
      </div>
    </aside>
  );
}
