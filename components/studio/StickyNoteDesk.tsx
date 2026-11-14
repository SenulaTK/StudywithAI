'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  StickyNote,
  RotateCw,
  Plus,
  Sliders,
  BookMarked,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useStudyDeskStore, type StudioTab } from '@/lib/store';
import { compileMathExpression } from '@/lib/mathParser';
import { chiptuneAudio } from '@/lib/audio';
import { storageAdapter, type StoredStickyNote } from '@/lib/storage';
import { PersonaMenuStage } from '@/components/transitions/PersonaSchoolTransition';

const STICKY_COLORS: Record<
  StoredStickyNote['color'],
  { frontBg: string; backBg: string; border: string; pinColor: string }
> = {
  yellow: {
    frontBg: 'bg-[#FEF08A]',
    backBg: 'bg-[#FDE047]',
    border: 'border-[#EAB308]',
    pinColor: 'bg-[#EF4444]',
  },
  mint: {
    frontBg: 'bg-[#A7F3D0]',
    backBg: 'bg-[#6EE7B7]',
    border: 'border-[#10B981]',
    pinColor: 'bg-[#047857]',
  },
  amber: {
    frontBg: 'bg-[#FDE68A]',
    backBg: 'bg-[#FCD34D]',
    border: 'border-[#F59E0B]',
    pinColor: 'bg-[#B45309]',
  },
  coral: {
    frontBg: 'bg-[#FECACA]',
    backBg: 'bg-[#FCA5A5]',
    border: 'border-[#EF4444]',
    pinColor: 'bg-[#B91C1C]',
  },
};

function FunctionGraphCanvas({
  expression,
  paramA,
  paramB,
  evaluated,
  parseError,
}: {
  expression: string;
  paramA: number;
  paramB: number;
  evaluated: ((x: number, a: number, b: number) => number) | null;
  parseError: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const logicalW = 360;
    const logicalH = 190;
    if (canvas.width !== logicalW * dpr || canvas.height !== logicalH * dpr) {
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const w = logicalW;
    const h = logicalH;
    const cx = w / 2;
    const cy = h / 2;
    const scaleX = w / 12; // [-6, 6]
    const scaleY = h / 8; // [-4, 4]

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#14241E';
    ctx.fillRect(0, 0, w, h);

    // Subtle integer grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = -5; gx <= 5; gx += 1) {
      const px = cx + gx * scaleX;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (let gy = -3; gy <= 3; gy += 1) {
      const py = cy - gy * scaleY;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Principal coordinate axes
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    // Axis scale markers
    ctx.fillStyle = 'rgba(241, 245, 249, 0.5)';
    ctx.font = '10px monospace';
    for (const tx of [-4, -2, 2, 4]) {
      ctx.fillText(String(tx), cx + tx * scaleX - 4, cy + 12);
    }
    for (const ty of [-2, 2]) {
      ctx.fillText(String(ty), cx + 6, cy - ty * scaleY + 3);
    }

    const trimmed = expression.trim();
    if (!trimmed) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.55)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Blank Graph Canvas', cx, cy - 12);
      ctx.textAlign = 'start';
    } else if (evaluated && !parseError) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      let started = false;
      let prevPy = 0;

      for (let px = 0; px <= w; px += 1) {
        const xVal = (px - cx) / scaleX;
        const yVal = evaluated(xVal, paramA, paramB);
        if (!Number.isFinite(yVal)) {
          started = false;
          continue;
        }
        const py = cy - yVal * scaleY;
        if (py < -h * 2 || py > h * 3) {
          started = false;
          continue;
        }
        if (!started || Math.abs(py - prevPy) > h * 0.85) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevPy = py;
      }
      ctx.stroke();

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '11px monospace';
      ctx.fillText(
        `y = ${trimmed.slice(0, 26)} | a=${paramA.toFixed(1)} b=${paramB.toFixed(1)}`,
        10,
        18
      );
    }

    ctx.restore();
  }, [expression, paramA, paramB, evaluated, parseError]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={190}
      className="w-full h-52 rounded-xl border-2 border-[#3E2723] shadow-inner bg-[#14241E]"
    />
  );
}

export function StickyNoteDesk() {
  const {
    currentSubject,
    roadmapState,
    activeTopicId,
    studioTab,
    stickyNotes,
    cornellNotes,
    setStudioTab,
    setTopicLabExpression,
    addStickyNote,
    updateStickyMastery,
    deleteStickyNote,
    saveCornellForTopic,
  } = useStudyDeskStore();

  const activeNode =
    roadmapState.find((n) => n.id === activeTopicId) || null;

  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newColor, setNewColor] =
    useState<StoredStickyNote['color']>('yellow');

  // Graph parameter sliders for custom equations (blank until user plots)
  const [paramA, setParamA] = useState(1);
  const [paramB, setParamB] = useState(0);

  // Empty-first Cornell drafts per topic (no pre-seeded notes)
  const [cornellDrafts, setCornellDrafts] = useState<
    Record<string, { cues: string; notes: string; summary: string }>
  >({});
  const [savedCornellBadge, setSavedCornellBadge] = useState(false);

  const storedCornell = activeTopicId ? cornellNotes[activeTopicId] : undefined;
  const activeDraft = activeTopicId ? cornellDrafts[activeTopicId] : undefined;
  const cuesText = activeDraft?.cues ?? storedCornell?.cues ?? '';
  const notesText = activeDraft?.notes ?? storedCornell?.notes ?? '';
  const summaryText = activeDraft?.summary ?? storedCornell?.summary ?? '';

  const updateCornellDraft = (
    field: 'cues' | 'notes' | 'summary',
    value: string
  ) => {
    if (!activeTopicId) return;
    setCornellDrafts((prev) => {
      const current = prev[activeTopicId] ?? {
        cues: storedCornell?.cues ?? '',
        notes: storedCornell?.notes ?? '',
        summary: storedCornell?.summary ?? '',
      };
      return {
        ...prev,
        [activeTopicId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const subjectStickies = currentSubject
    ? stickyNotes.filter((s) => s.subject === currentSubject)
    : [];

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    chiptuneAudio.playPaperFlip();
  };

  const handleCreateSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !currentSubject) return;
    const rotations = ['rotate-2', '-rotate-1', 'rotate-1', '-rotate-2'];
    const rotationClass =
      rotations[stickyNotes.length % rotations.length];

    addStickyNote({
      subject: currentSubject,
      topicId: activeTopicId,
      frontPrompt: newFront.trim(),
      backAnswer: newBack.trim(),
      color: newColor,
      rotationClass,
      masteryStatus: 'NEW',
    });

    await storageAdapter.saveStickyNotes(
      useStudyDeskStore.getState().stickyNotes
    );
    chiptuneAudio.playMasteryFanfare();
    setNewFront('');
    setNewBack('');
    setShowAddForm(false);
  };

  const handleSaveCornell = async () => {
    if (
      !activeTopicId ||
      (!cuesText.trim() && !notesText.trim() && !summaryText.trim())
    ) {
      return;
    }
    saveCornellForTopic(activeTopicId, cuesText, notesText, summaryText);
    setCornellDrafts((prev) => {
      if (!(activeTopicId in prev)) return prev;
      const next = { ...prev };
      delete next[activeTopicId];
      return next;
    });
    await storageAdapter.saveCornellNote({
      id: `cornell-${activeTopicId}`,
      subject: currentSubject,
      topicId: activeTopicId,
      cues: cuesText,
      notes: notesText,
      summary: summaryText,
      updatedAt: Date.now(),
    });
    chiptuneAudio.playPaperFlip();
    setSavedCornellBadge(true);
    setTimeout(() => setSavedCornellBadge(false), 2500);
  };

  const handleSwitchStudioTab = (tab: StudioTab) => {
    if (tab === studioTab) return;
    chiptuneAudio.playMenuSlash();
    setStudioTab(tab);
  };

  const rawLabExpression = activeNode?.labExpression ?? '';
  const compiledGraph = compileMathExpression(rawLabExpression);

  const STUDIO_TABS: Array<{
    id: StudioTab;
    label: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'stickies',
      label: '3D Cards',
      badge: String(subjectStickies.length),
      icon: StickyNote,
    },
    {
      id: 'simulation',
      label: 'Graph Pad',
      icon: Sliders,
    },
    {
      id: 'cornell',
      label: 'Cornell Notes',
      icon: BookMarked,
    },
  ];

  const hasCornellContent = Boolean(
    cuesText.trim() || notesText.trim() || summaryText.trim()
  );

  return (
    <aside
      aria-label="Right Panel: 3D Tactile Sticky Notes & Graph Studio"
      className="rounded-2xl border-2 border-[#B89972] bg-[#F3E5D0]/90 p-4 flex flex-col justify-between gap-4 h-full min-h-[760px] shadow-[0_12px_28px_-6px_rgba(30,41,59,0.12)]"
    >
      <div className="space-y-4">
        {/* Clean Studio Header */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#D4B996] pb-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-wide text-[#5D4037] font-bold block">
              {currentSubject ? `${currentSubject} Tools` : 'Study Tools'}
            </span>
            <h2 className="text-lg font-bold font-serif text-[#1E293B]">
              Notes &amp; Graph
            </h2>
          </div>

          {studioTab === 'stickies' && currentSubject && (
            <button
              id="add-3d-sticky-btn"
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                chiptuneAudio.playPaperFlip();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-bold border border-[#1E293B] shadow-[2px_2px_0px_#FDE047] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FDE047]" />
              Pin Note
            </button>
          )}
        </div>

        {/* Persona-Style Skewed Folder Sub-Menu Bar */}
        <div
          role="tablist"
          aria-label="Studio Tool Sections"
          className="grid grid-cols-3 gap-1.5 bg-[#E6D5B8]/80 p-1 rounded-xl border border-[#C8AE8D]"
        >
          {STUDIO_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = studioTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`studio-tab-${tab.id}`}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => handleSwitchStudioTab(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'text-[#1E293B]'
                    : 'text-[#1E293B]/75 hover:text-[#1E293B]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="studio-subtab-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 430,
                      damping: 30,
                    }}
                    className="absolute inset-0 bg-[#FDE047] border-2 border-[#1E293B] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#1E293B]"
                  />
                )}
                <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                <span className="relative z-10 truncate">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`relative z-10 px-1.5 py-0.5 rounded font-mono text-xs font-bold ${
                      active
                        ? 'bg-[#1A2E26] text-[#FDE047]'
                        : 'bg-[#FDFBF7] text-[#1E293B]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Animated Persona Menu Stage for Studio Views */}
        <PersonaMenuStage stageKey={studioTab}>
          {/* TAB 1: 3D Tactile Sticky Notes */}
          {studioTab === 'stickies' && (
            <div className="space-y-3">
              {showAddForm && currentSubject && (
                <form
                  onSubmit={handleCreateSticky}
                  className="p-3.5 rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] space-y-2.5 shadow-[4px_4px_0px_#1E293B]"
                >
                  <input
                    id="new-sticky-front-input"
                    type="text"
                    required
                    placeholder="Front Prompt (Active Recall Question)..."
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8AE8D] text-xs bg-white focus:outline-none focus:border-[#1A2E26]"
                  />
                  <textarea
                    id="new-sticky-back-input"
                    rows={2}
                    required
                    placeholder="Back Side Answer / Formula intuition..."
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8AE8D] text-xs bg-white focus:outline-none focus:border-[#1A2E26]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(['yellow', 'mint', 'amber', 'coral'] as const).map(
                        (col) => (
                          <button
                            type="button"
                            key={col}
                            aria-label={`Sticky color ${col}`}
                            onClick={() => setNewColor(col)}
                            className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                              STICKY_COLORS[col].frontBg
                            } ${
                              newColor === col
                                ? 'border-[#1E293B] scale-110'
                                : 'border-transparent'
                            }`}
                          />
                        )
                      )}
                    </div>
                    <button
                      id="submit-new-sticky-btn"
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer"
                    >
                      Stick (+25 XP)
                    </button>
                  </div>
                </form>
              )}

              {subjectStickies.length === 0 ? (
                <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-5 text-center space-y-2.5">
                  <p className="text-sm font-serif font-bold text-[#1E293B]">
                    {currentSubject
                      ? `No flashcards pinned to ${currentSubject} yet`
                      : 'No flashcards yet'}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentSubject
                      ? 'Pin your own 3D active-recall sticky notes to practice SM-2 spaced repetition.'
                      : 'Create a subject notebook first, then pin 3D sticky notes for quick recall review.'}
                  </p>
                  {currentSubject && !showAddForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(true);
                        chiptuneAudio.playPaperFlip();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FDE047] hover:bg-yellow-300 border-2 border-[#1E293B] text-xs font-bold text-[#1E293B] shadow-[2px_2px_0px_#1E293B] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Pin First Sticky Note
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-700 font-medium px-0.5">
                    Click any sticky note to flip 180° and grade your active
                    recall.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {subjectStickies.map((note) => {
                      const isFlipped = !!flippedIds[note.id];
                      const palette = STICKY_COLORS[note.color];

                      return (
                        <div
                          key={note.id}
                          id={`sticky-note-card-${note.id}`}
                          onClick={() => toggleFlip(note.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              toggleFlip(note.id);
                            }
                          }}
                          className={`perspective-1200 h-48 cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] hover:-translate-y-1 ${note.rotationClass}`}
                        >
                          <div
                            className={`relative w-full h-full duration-500 preserve-3d transition-transform ${
                              isFlipped ? 'rotate-y-180' : ''
                            }`}
                          >
                            {/* FRONT SIDE */}
                            <div
                              className={`absolute inset-0 backface-hidden sticky-paper-curl rounded-xl border-2 ${palette.border} ${palette.frontBg} p-3.5 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.14)] flex flex-col justify-between`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full ${palette.pinColor} inline-block`}
                                  />
                                  {note.masteryStatus.replace('_', ' ')}
                                </span>
                                <span className="text-xs font-mono text-slate-700 flex items-center gap-1">
                                  <RotateCw className="w-3 h-3" />
                                  Flip
                                </span>
                              </div>

                              <p className="text-sm font-bold text-[#1E293B] leading-snug line-clamp-3">
                                {note.frontPrompt}
                              </p>

                              <div className="text-xs font-mono text-slate-700 flex items-center justify-between pt-1.5 border-t border-black/10">
                                <span>
                                  SM-2: {note.intervalDays || 1}d • EF{' '}
                                  {(note.easeFactor || 2.5).toFixed(1)}
                                </span>
                                <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                              </div>
                            </div>

                            {/* REVERSE SIDE */}
                            <div
                              className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 ${palette.border} ${palette.backBg} p-3.5 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.16)] flex flex-col justify-between`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold uppercase text-[#1E293B]">
                                  Answer
                                </span>
                                <button
                                  type="button"
                                  aria-label="Delete sticky note"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteStickyNote(note.id);
                                    chiptuneAudio.playPaperFlip();
                                  }}
                                  className="p-1 rounded text-slate-700 hover:text-[#B91C1C] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="text-xs font-medium text-[#1E293B] leading-relaxed overflow-y-auto pr-1">
                                {note.backAnswer}
                              </p>

                              {/* Tag Mastery Buttons */}
                              <div
                                className="flex items-center gap-1.5 pt-1.5 border-t border-black/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStickyMastery(note.id, 'MASTERED')
                                  }
                                  title="Mark Mastered (Increases SM-2 Interval)"
                                  className="flex-1 py-1 rounded-md bg-[#10B981] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Got It
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStickyMastery(note.id, 'SPACED_DUE')
                                  }
                                  title="Schedule Spaced Review (2d)"
                                  className="flex-1 py-1 rounded-md bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Clock className="w-3 h-3" />
                                  Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStickyMastery(note.id, 'WEAK_POINT')
                                  }
                                  title="Flag Weak Point (1d Reset)"
                                  className="flex-1 py-1 rounded-md bg-[#EF4444] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Retry
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Blank Custom Function Graph Pad */}
          {studioTab === 'simulation' && (
            <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] p-4 school-stamp-card space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sliders className="w-4 h-4 text-[#B45309] shrink-0" />
                  <h3 className="text-sm font-bold font-serif text-[#1E293B] truncate">
                    Function Graph Pad
                  </h3>
                </div>
                {activeNode && rawLabExpression.trim() && (
                  <button
                    id="clear-graph-expr-btn"
                    type="button"
                    onClick={() => {
                      setTopicLabExpression(activeNode.id, '');
                      chiptuneAudio.playPaperFlip();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] border border-[#C8AE8D] text-xs font-mono font-bold text-[#1E293B] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="custom-graph-expr-input"
                  className="text-xs font-mono font-bold text-slate-600 block"
                >
                  y =
                </label>
                <input
                  id="custom-graph-expr-input"
                  type="text"
                  disabled={!activeNode}
                  placeholder={
                    activeNode
                      ? 'Enter math expression with x, a, b'
                      : 'Open a topic first to plot on graph'
                  }
                  value={rawLabExpression}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setTopicLabExpression(activeNode.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white disabled:bg-[#F5EBE0]/60 border border-[#C8AE8D] text-xs font-mono text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#1A2E26]"
                />
                {compiledGraph.error && rawLabExpression.trim() && (
                  <p className="text-xs font-mono text-[#991B1B]">
                    {compiledGraph.error}
                  </p>
                )}
              </div>

              <FunctionGraphCanvas
                expression={rawLabExpression}
                paramA={paramA}
                paramB={paramB}
                evaluated={compiledGraph.evaluate}
                parseError={compiledGraph.error}
              />

              {compiledGraph.evaluate && !compiledGraph.error && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-[#5D4037] mb-1">
                      <span>Parameter a</span>
                      <span>{paramA.toFixed(1)}</span>
                    </div>
                    <input
                      id="sim-brass-slider-a"
                      type="range"
                      min={-5}
                      max={5}
                      step={0.1}
                      value={paramA}
                      onChange={(e) => setParamA(Number(e.target.value))}
                      className="w-full h-2.5 rounded-lg appearance-none bg-gradient-to-r from-[#D4B996] via-[#B45309] to-[#8D6E63] accent-[#5D4037] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-[#5D4037] mb-1">
                      <span>Parameter b</span>
                      <span>{paramB.toFixed(1)}</span>
                    </div>
                    <input
                      id="sim-wooden-slider-b"
                      type="range"
                      min={-5}
                      max={5}
                      step={0.1}
                      value={paramB}
                      onChange={(e) => setParamB(Number(e.target.value))}
                      className="w-full h-2.5 rounded-lg appearance-none bg-gradient-to-r from-[#D4B996] via-[#10B981] to-[#1A2E26] accent-[#1A2E26] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Cornell Notes Folio (Clean Empty Fields) */}
          {studioTab === 'cornell' && (
            <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] p-4 school-stamp-card space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E6D5B8] pb-2.5">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-[#1A2E26]" />
                  <h3 className="text-sm font-bold font-serif text-[#1E293B]">
                    Cornell Recall Sheet
                  </h3>
                </div>
                <button
                  id="save-cornell-notes-btn"
                  type="button"
                  disabled={!activeTopicId || !hasCornellContent}
                  onClick={handleSaveCornell}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savedCornellBadge ? 'Saved!' : 'Save Folio'}
                </button>
              </div>

              {!activeNode ? (
                <p className="text-xs text-slate-600 py-8 text-center">
                  Create or select a topic in your notebook to record Cornell
                  notes.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <label
                        htmlFor="cornell-cues-input"
                        className="text-xs font-mono uppercase text-slate-600 font-bold block mb-1.5"
                      >
                        Recall Cues
                      </label>
                      <textarea
                        id="cornell-cues-input"
                        rows={7}
                        placeholder="Recall prompts or keywords..."
                        value={cuesText}
                        onChange={(e) =>
                          updateCornellDraft('cues', e.target.value)
                        }
                        className="w-full p-2.5 rounded-lg bg-[#F5EBE0]/75 border border-[#C8AE8D] text-xs text-[#1E293B] placeholder:text-slate-400 leading-relaxed focus:outline-none focus:border-[#1A2E26]"
                      />
                    </div>

                    <div className="col-span-7">
                      <label
                        htmlFor="cornell-notes-input"
                        className="text-xs font-mono uppercase text-slate-600 font-bold block mb-1.5"
                      >
                        Notes &amp; Key Steps
                      </label>
                      <textarea
                        id="cornell-notes-input"
                        rows={7}
                        placeholder="Structured notes or key steps..."
                        value={notesText}
                        onChange={(e) =>
                          updateCornellDraft('notes', e.target.value)
                        }
                        className="w-full p-2.5 rounded-lg bg-white border border-[#C8AE8D] text-xs text-[#1E293B] placeholder:text-slate-400 leading-relaxed focus:outline-none focus:border-[#1A2E26]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cornell-summary-input"
                      className="text-xs font-mono uppercase text-slate-600 font-bold block mb-1.5"
                    >
                      Synthesis Summary
                    </label>
                    <input
                      id="cornell-summary-input"
                      type="text"
                      placeholder="Short summary in your own words..."
                      value={summaryText}
                      onChange={(e) =>
                        updateCornellDraft('summary', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F4EC] border border-[#C8AE8D] text-xs text-[#1E293B] placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#1A2E26]"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </PersonaMenuStage>
      </div>

      {/* Subtle Bottom Studio Reminder Footer */}
      <div className="pt-3 border-t border-[#D4B996] flex items-center justify-between text-xs font-mono text-[#5D4037]">
        <span>Local-First Saved</span>
        <span>
          {activeNode ? `Topic: ${activeNode.code}` : 'No Topic Active'}
        </span>
      </div>
    </aside>
  );
}
