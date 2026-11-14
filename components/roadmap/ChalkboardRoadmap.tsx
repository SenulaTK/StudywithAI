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
  Plus,
  BookPlus,
} from 'lucide-react';
import {
  useStudyDeskStore,
  type BadgeStatus,
  type RoadmapTopicNode,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { storageAdapter } from '@/lib/storage';
import { WhiteboardTeachingStage } from '@/components/roadmap/WhiteboardTeachingStage';

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
    cardStyle:
      'bg-slate-100 border-slate-300 opacity-75 cursor-not-allowed',
    pillStyle: 'bg-slate-200 text-slate-600',
    iconColor: 'text-slate-500',
  },
  UNLOCKED: {
    label: 'Active',
    cardStyle:
      'bg-emerald-50/85 border-[#10B981] cursor-pointer hover:border-[#1E293B]',
    pillStyle: 'bg-[#10B981]/20 text-[#065F46]',
    iconColor: 'text-[#059669]',
  },
  BRONZE: {
    label: '🥉 Bronze',
    cardStyle:
      'bg-amber-50 border-amber-500 cursor-pointer hover:border-[#1E293B]',
    pillStyle: 'bg-amber-200/75 text-amber-950',
    iconColor: 'text-amber-700',
  },
  SILVER: {
    label: '🥈 Silver',
    cardStyle:
      'bg-slate-100 border-slate-400 cursor-pointer hover:border-[#1E293B]',
    pillStyle: 'bg-slate-200 text-slate-900',
    iconColor: 'text-slate-700',
  },
  GOLD: {
    label: '🥇 Gold',
    cardStyle:
      'bg-yellow-50 border-amber-400 cursor-pointer hover:border-[#1E293B]',
    pillStyle: 'bg-[#FDE047]/70 text-amber-950',
    iconColor: 'text-amber-600',
  },
  DIAMOND: {
    label: '💎 Diamond',
    cardStyle:
      'bg-cyan-50 border-cyan-400 cursor-pointer hover:border-[#1E293B]',
    pillStyle: 'bg-cyan-100 text-cyan-950',
    iconColor: 'text-cyan-700',
  },
};

let uploadSeq = 0;
function nextUploadId(): string {
  uploadSeq += 1;
  return `rag-${Date.now()}-${uploadSeq}`;
}

export function ChalkboardRoadmap() {
  const {
    currentSubject,
    syllabusBoard,
    roadmapState,
    activeTopicId,
    activeCallState,
    workbookDialogues,
    userXP,
    streakCount,
    backpackFiles,
    createNotebook,
    deleteNotebook,
    addTopic,
    deleteTopic,
    setActiveTopic,
    addBackpackFile,
    removeBackpackFile,
  } = useStudyDeskStore();

  // Blank first-notebook creation state
  const [nbName, setNbName] = useState('');
  const [nbBoard, setNbBoard] = useState('');
  const [confirmDeleteNotebook, setConfirmDeleteNotebook] = useState(false);

  // Blank topic creation state
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [topicCode, setTopicCode] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicSubtitle, setTopicSubtitle] = useState('');

  // Backpack drawer state
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
  const activeNode =
    subjectNodes.find((n) => n.id === activeTopicId) || null;
  const activeTurns = activeNode
    ? workbookDialogues[activeNode.id] || []
    : [];
  const lastBarnabyTurn = [...activeTurns]
    .reverse()
    .find((t) => t.role === 'barnaby');

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
    if (joined.length > 40) {
      return joined;
    }
    return `Uploaded PDF "${file.name}" (${Math.max(1, Math.round(file.size / 1024))} KB) — no uncompressed text stream found.`;
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
    if (!files || files.length === 0 || !currentSubject) return;
    const file = files[0];

    let rawText = '';
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        rawText = await extractPdfTextFromBuffer(file);
      } else {
        rawText = await file.text();
      }
    } catch {
      rawText = `Uploaded note file "${file.name}"`;
    }

    const chunks = chunkTextWithOverlap(rawText);
    if (chunks.length === 0) {
      chunks.push(`[${file.name}] (${currentSubject})`);
    }

    const newFile = {
      id: nextUploadId(),
      name: file.name,
      sizeBytes: file.size || 0,
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

  const handleCreateFirstNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nbName.trim()) return;
    chiptuneAudio.playSchoolBellChime();
    createNotebook(nbName, nbBoard);
    setNbName('');
    setNbBoard('');
  };

  const handleCreateTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !currentSubject) return;
    addTopic({
      subject: currentSubject,
      code: topicCode,
      title: topicTitle,
      subtitle: topicSubtitle,
    });
    chiptuneAudio.playPaperFlip();
    setTopicCode('');
    setTopicTitle('');
    setTopicSubtitle('');
    setShowAddTopic(false);
  };

  return (
    <aside
      aria-label="Left Panel: Classroom Whiteboard"
      className="flex flex-col h-full rounded-2xl overflow-hidden border-4 border-[#475569] shadow-[0_12px_28px_-6px_rgba(30,41,59,0.2)]"
    >
      <div className="whiteboard-panel-surface p-4 text-[#1E293B] flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3.5">
          {/* Whiteboard Header */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-[#CBD5E1] pb-3">
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase tracking-wider text-[#059669] font-bold block">
                {currentSubject
                  ? syllabusBoard || 'Notebook'
                  : 'Study Desk'}
              </span>
              <h2 className="text-lg font-bold font-serif text-[#0F172A] truncate">
                {currentSubject ? `${currentSubject} Whiteboard` : 'Whiteboard'}
              </h2>
            </div>

            {currentSubject ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-[#1A2E26] text-xs font-mono font-bold text-[#FDE047]">
                  {
                    subjectNodes.filter(
                      (n) => n.status !== 'LOCKED' && n.status !== 'UNLOCKED'
                    ).length
                  }
                  /{subjectNodes.length}
                </span>
                <button
                  id="chalkboard-add-topic-toggle"
                  type="button"
                  onClick={() => {
                    setShowAddTopic((prev) => !prev);
                    chiptuneAudio.playPaperFlip();
                  }}
                  title="Add New Topic"
                  aria-label="Add New Topic"
                  className="p-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono font-bold text-slate-600">
                0 Notebooks
              </span>
            )}
          </div>

          {/* Scholar XP & Streak Bar */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#D97706]" />
                Level {currentLevel} Scholar
              </span>
              <span className="font-mono text-[#B45309] flex items-center gap-1 font-semibold">
                <Flame className="w-3.5 h-3.5 fill-[#F59E0B] text-[#D97706]" />
                {streakCount}d Streak
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#F59E0B] transition-all duration-700"
                style={{ width: `${levelProgressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-600">
              <span>{userXP.toLocaleString()} XP</span>
              <span>{500 - xpIntoLevel} XP to next level</span>
            </div>
          </div>

          {/* Interactive Whiteboard + Animated Owl Teacher */}
          <WhiteboardTeachingStage
            activeNode={activeNode}
            activeCallState={activeCallState}
            lastBarnabyTurn={lastBarnabyTurn}
          />

          {/* Blank Slate: Create First Notebook */}
          {!currentSubject ? (
            <form
              onSubmit={handleCreateFirstNotebook}
              className="rounded-xl border-2 border-dashed border-[#94A3B8] bg-white/90 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-[#1A2E26]">
                <BookPlus className="w-5 h-5 shrink-0 text-[#059669]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Create Your First Notebook
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Start with a blank notebook and add only the topics you want to
                study.
              </p>
              <input
                id="chalkboard-first-notebook-input"
                type="text"
                required
                placeholder="Notebook name"
                value={nbName}
                onChange={(e) => setNbName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
              />
              <input
                type="text"
                placeholder="Course or curriculum tag (optional)"
                value={nbBoard}
                onChange={(e) => setNbBoard(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
              />
              <button
                id="chalkboard-create-notebook-btn"
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-[#1A2E26] hover:bg-[#243F35] text-[#FDE047] text-xs font-bold cursor-pointer transition-colors shadow-[2px_2px_0px_#10B981]"
              >
                Create Notebook
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Inline New Topic Form */}
              <AnimatePresence>
                {(showAddTopic || subjectNodes.length === 0) && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                    onSubmit={handleCreateTopicSubmit}
                    className="overflow-hidden rounded-xl border-2 border-[#CBD5E1] bg-white p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#065F46]">
                        {subjectNodes.length === 0
                          ? `Add First Topic to ${currentSubject}`
                          : 'New Topic'}
                      </span>
                      {subjectNodes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAddTopic(false)}
                          className="text-xs text-slate-600 hover:text-[#1E293B] cursor-pointer"
                        >
                          Close
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Code"
                        value={topicCode}
                        onChange={(e) => setTopicCode(e.target.value)}
                        className="col-span-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                      />
                      <input
                        id="chalkboard-new-topic-title"
                        type="text"
                        required
                        placeholder="Topic title"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        className="col-span-2 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Short note (optional)"
                      value={topicSubtitle}
                      onChange={(e) => setTopicSubtitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                    />
                    <button
                      id="chalkboard-submit-topic-btn"
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Add Topic to Whiteboard
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Topic Nodes List */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-0.5">
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
                        duration: 0.38,
                        delay: index * 0.06,
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
                      className={`group rounded-xl border-2 p-3 transition-all ${cfg.cardStyle} ${
                        isSelected
                          ? 'border-[#1E293B] bg-[#FEF9C3] shadow-[3px_3px_0px_#1E293B] translate-x-0.5'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cfg.iconColor}>
                            {isLocked ? (
                              <Lock className="w-4 h-4" />
                            ) : node.status === 'UNLOCKED' ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Crown className="w-4 h-4" />
                            )}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#065F46]">
                            {node.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {node.spacedDue && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Review Due
                            </span>
                          )}
                          {node.weakPoint && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                              Practice
                            </span>
                          )}
                          <span
                            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${cfg.pillStyle}`}
                          >
                            {cfg.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTopic(node.id);
                              chiptuneAudio.playPaperFlip();
                            }}
                            title="Delete topic"
                            aria-label={`Delete topic ${node.title}`}
                            className="p-1 rounded text-slate-400 hover:text-[#EF4444] opacity-75 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">
                        {node.title}
                      </h3>
                      {node.subtitle && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                          {node.subtitle}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Clean Delete Active Notebook Control */}
              <div className="flex items-center justify-end">
                {!confirmDeleteNotebook ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteNotebook(true)}
                    className="text-xs text-slate-500 hover:text-[#DC2626] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete {currentSubject}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#991B1B] font-semibold">
                      Delete notebook?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteNotebook(currentSubject);
                        setConfirmDeleteNotebook(false);
                        chiptuneAudio.playPaperFlip();
                      }}
                      className="px-2 py-0.5 rounded bg-[#EF4444] text-white font-bold cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteNotebook(false)}
                      className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Notes Backpack Drawer */}
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
          className="pt-3 border-t border-[#CBD5E1]"
        >
          <button
            type="button"
            onClick={() => {
              setBackpackOpen(!backpackOpen);
              chiptuneAudio.playPaperFlip();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-xs font-bold text-[#1E293B] cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#D97706]" />
              Class Notes Backpack ({subjectFiles.length})
            </span>
            {backpackOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <AnimatePresence>
            {backpackOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden pt-2.5 space-y-2"
              >
                <div
                  id="rag-backpack-dropzone"
                  onClick={() => {
                    if (currentSubject) fileInputRef.current?.click();
                  }}
                  className={`rounded-xl border-2 border-dashed p-3 text-center transition-all ${
                    !currentSubject
                      ? 'border-slate-300 bg-slate-100/70 opacity-70 cursor-not-allowed'
                      : isDragging
                        ? 'border-[#1E293B] bg-emerald-50 cursor-pointer'
                        : 'border-[#94A3B8] bg-white hover:border-[#059669] cursor-pointer'
                  }`}
                >
                  <Upload className="w-4 h-4 text-[#059669] mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">
                    {currentSubject
                      ? `Upload PDF or Notes for ${currentSubject}`
                      : 'Create or open a notebook first to attach files'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv"
                    disabled={!currentSubject}
                    onChange={(e) => processUploadedFiles(e.target.files)}
                    className="hidden"
                  />
                </div>

                {uploadStatus && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-[#10B981] text-xs text-[#065F46] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {subjectFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                        <span className="truncate text-[#1E293B]">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBackpackFile(file.id)}
                        title="Remove file"
                        aria-label={`Remove ${file.name}`}
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

      {/* Brushed Aluminum Whiteboard Marker Tray & Felt Eraser */}
      <div
        aria-hidden="true"
        className="whiteboard-marker-ledge h-4 px-5 flex items-center justify-end gap-2.5"
      >
        <span className="w-8 h-2 rounded-xs bg-[#1E293B] border border-slate-500 shadow-xs" />
        <span className="w-6 h-1.5 rounded-full bg-[#059669] shadow-xs rotate-1" />
        <span className="w-6 h-1.5 rounded-full bg-[#DC2626] shadow-xs -rotate-2" />
        <span className="w-5 h-1.5 rounded-full bg-[#0284C7] shadow-xs" />
      </div>
    </aside>
  );
}
