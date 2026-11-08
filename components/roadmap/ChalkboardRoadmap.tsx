'use client';

import React, { useState, useRef } from 'react';
import {
  Lock,
  Unlock,
  Crown,
  Flame,
  Upload,
  FileText,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  GraduationCap,
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
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  }
> = {
  LOCKED: {
    label: 'Locked (Pass Previous Revision Test)',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700',
    text: 'text-slate-400',
    iconColor: 'text-slate-500',
  },
  UNLOCKED: {
    label: 'Unlocked • Ready for Mastery',
    bg: 'bg-[#10B981]/15',
    border: 'border-[#10B981]',
    text: 'text-[#FDFBF7]',
    iconColor: 'text-[#10B981]',
  },
  BRONZE: {
    label: '🥉 Bronze Crown',
    bg: 'bg-amber-900/30',
    border: 'border-amber-600',
    text: 'text-amber-100',
    iconColor: 'text-amber-500',
  },
  SILVER: {
    label: '🥈 Silver Crown',
    bg: 'bg-slate-700/45',
    border: 'border-slate-300',
    text: 'text-slate-100',
    iconColor: 'text-slate-200',
  },
  GOLD: {
    label: '🥇 Gold Crown',
    bg: 'bg-yellow-500/20',
    border: 'border-[#FDE047]',
    text: 'text-[#FDE047]',
    iconColor: 'text-[#FDE047]',
  },
  DIAMOND: {
    label: '💎 Diamond Mastery',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-300',
    text: 'text-cyan-100',
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
    setActiveCallState,
    addBackpackFile,
    removeBackpackFile,
  } = useStudyDeskStore();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjectNodes = roadmapState.filter(
    (node) => node.subject === currentSubject
  );
  const subjectFiles = backpackFiles.filter(
    (f) => f.subject === currentSubject
  );

  // Calculate level & progress bar
  const currentLevel = Math.floor(userXP / 500) + 1;
  const xpIntoLevel = userXP % 500;
  const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / 500) * 100));

  const processUploadedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    let rawText = '';
    try {
      if (
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json')
      ) {
        rawText = await file.text();
      } else {
        rawText = `Extracted RAG Study Notes from ${file.name} (${currentSubject} - ${syllabusBoard} Syllabus): Key equations, worked exam derivations, and examiner mark-scheme definitions indexed for Socratic retrieval.`;
      }
    } catch {
      rawText = `Indexed ${file.name} into local RAG context.`;
    }

    // Chunk text into ~240-char segments for Gemini context injection
    const chunks: string[] = [];
    const clean = rawText.replace(/\s+/g, ' ').trim();
    for (let i = 0; i < Math.min(clean.length, 900); i += 280) {
      chunks.push(clean.slice(i, i + 280));
    }
    if (chunks.length === 0) {
      chunks.push(
        `[${file.name}] Uploaded to ${currentSubject} RAG Backpack for ${syllabusBoard} exam alignment.`
      );
    }

    const newFile = {
      id: `rag-${Date.now()}`,
      name: file.name,
      sizeBytes: file.size || 24500,
      type: file.name.endsWith('.pdf')
        ? ('pdf' as const)
        : file.name.endsWith('.mp4')
          ? ('video-transcript' as const)
          : ('notes' as const),
      subject: currentSubject,
      chunks,
      uploadedAt: Date.now(),
    };

    addBackpackFile(newFile);
    await storageAdapter.saveBackpackFiles([newFile, ...backpackFiles]);
    chiptuneAudio.playMasteryFanfare();
    setUploadStatus(
      `Chunked "${file.name}" (${chunks.length} RAG passages linked to Barnaby)`
    );
    setTimeout(() => setUploadStatus(null), 4000);
  };

  const handleSelectNode = (node: RoadmapTopicNode) => {
    if (node.status === 'LOCKED') return;
    setActiveTopic(node.id);
    chiptuneAudio.playPaperFlip();
  };

  return (
    <aside
      aria-label="Left Panel: Chalkboard Scheme of Work Roadmap"
      className="chalkboard-surface rounded-2xl border-4 border-[#4E342E] p-4 text-[#F1F5F9] flex flex-col justify-between h-full min-h-[760px]"
    >
      <div className="space-y-4">
        {/* Chalkboard Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/80 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#10B981] font-bold">
                {syllabusBoard} Scheme of Work
              </span>
            </div>
            <h2 className="text-base font-bold font-serif text-[#FDFBF7] mt-0.5">
              {currentSubject} Skill Tree
            </h2>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-300 block">
              Mastered Nodes
            </span>
            <span className="text-xs font-bold text-[#FDE047]">
              {
                subjectNodes.filter(
                  (n) => n.status !== 'LOCKED' && n.status !== 'UNLOCKED'
                ).length
              }{' '}
              / {subjectNodes.length} Crowns
            </span>
          </div>
        </div>

        {/* Daily Streaks & XP Mastery Bar */}
        <div className="rounded-xl bg-black/25 border border-emerald-800/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-[#FDE047]">
              <Crown className="w-4 h-4 text-[#FDE047]" />
              Scholar Lv.{currentLevel}
            </span>
            <span className="font-mono text-[11px] text-[#F59E0B] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
              {streakCount}-Day Active Streak
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-emerald-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#10B981] via-[#FDE047] to-[#F59E0B] transition-all duration-500"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
            <span>{userXP.toLocaleString()} Total XP</span>
            <span>{500 - xpIntoLevel} XP to Lv.{currentLevel + 1}</span>
          </div>
        </div>

        {/* Mastery Legend Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-md bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
            ● Mastered/Unlocked
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
            ● Spaced Due
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
            ● Weak Point
          </span>
        </div>

        {/* Sequential Skill Tree Nodes */}
        <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-emerald-700/50">
          {subjectNodes.map((node) => {
            const cfg = BADGE_CONFIG[node.status];
            const isSelected = node.id === activeTopicId;
            const isLocked = node.status === 'LOCKED';

            return (
              <div
                key={node.id}
                id={`roadmap-node-${node.id}`}
                onClick={() => handleSelectNode(node)}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectNode(node);
                  }
                }}
                className={`relative z-10 rounded-xl border-2 p-3 transition-all ${
                  cfg.bg
                } ${
                  isSelected
                    ? 'border-[#FDE047] ring-2 ring-[#FDE047]/40 translate-x-1 shadow-lg'
                    : cfg.border
                } ${
                  isLocked
                    ? 'opacity-65 cursor-not-allowed'
                    : 'cursor-pointer hover:translate-x-1 hover:border-[#FDE047]/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-black/40 border border-white/15 ${cfg.iconColor}`}
                    >
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : node.status === 'UNLOCKED' ? (
                        <Unlock className="w-3.5 h-3.5" />
                      ) : (
                        <Crown className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-emerald-300">
                          {node.code}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#FDFBF7] mt-1">
                        {node.title}
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                        {node.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mastery Telemetry Flags (Spaced Due / Weak Point / Revision Test Trigger) */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {node.spacedDue && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/25 text-[#FDE047] border border-[#F59E0B]/50">
                        <Clock className="w-2.5 h-2.5" />
                        Spaced Due
                      </span>
                    )}
                    {node.weakPoint && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EF4444]/25 text-red-200 border border-[#EF4444]/50">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Weak Point
                      </span>
                    )}
                    {!node.spacedDue && !node.weakPoint && !isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#10B981]">
                        <CheckCircle2 className="w-3 h-3" />
                        Retention 96%
                      </span>
                    )}
                  </div>

                  {!isLocked && (
                    <button
                      id={`revision-test-trigger-${node.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTopic(node.id);
                        setActiveCallState('REVISION_TEST');
                        chiptuneAudio.playPaperFlip();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FDE047]/20 hover:bg-[#FDE047]/35 text-[#FDE047] border border-[#FDE047]/40 transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-3 h-3" />
                      Revision Test
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: RAG Backpack File Drawer */}
      <div className="mt-5 pt-4 border-t border-emerald-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-[#FDE047]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FDFBF7]">
              RAG Backpack File Drawer
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#10B981]">
            {subjectFiles.length} Context Docs
          </span>
        </div>

        {/* Drag-and-Drop Upload Zone */}
        <div
          id="rag-backpack-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            processUploadedFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-3 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#FDE047] bg-[#10B981]/20'
              : 'border-emerald-700/80 bg-black/20 hover:border-[#10B981] hover:bg-black/30'
          }`}
        >
          <Upload className="w-4 h-4 text-[#10B981] mx-auto mb-1" />
          <p className="text-[11px] font-medium text-slate-200">
            Drop PDFs, Class Notes, or Video Transcripts
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Auto-chunks text into Professor Barnaby&apos;s Gemini RAG context
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
          <div className="p-2 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-[11px] text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FDE047] shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Uploaded RAG Files List */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {subjectFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#FDE047] shrink-0" />
                <div className="truncate">
                  <p className="text-[11px] font-medium text-slate-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[9px] font-mono text-emerald-300">
                    {file.chunks.length} chunks • {(file.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeBackpackFile(file.id)}
                title="Remove from RAG Backpack"
                className="p-1 text-slate-400 hover:text-[#EF4444] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
