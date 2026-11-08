'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useStudyDeskStore } from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { storageAdapter, type StoredStickyNote } from '@/lib/storage';

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

export function StickyNoteDesk() {
  const {
    currentSubject,
    activeTopicId,
    stickyNotes,
    cornellNotes,
    addStickyNote,
    updateStickyMastery,
    saveCornellForTopic,
    awardXP,
  } = useStudyDeskStore();

  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newColor, setNewColor] =
    useState<StoredStickyNote['color']>('yellow');

  // Interactive STEM Simulation Brass/Wood Sliders State
  // Param A: e.g. Secant step h (Maths), Launch Angle θ (Physics), Temperature T (Chemistry)
  // Param B: e.g. Tangent point x0 (Maths), Launch Velocity v0 (Physics), Activation Energy Ea (Chemistry)
  const [paramA, setParamA] = useState(45);
  const [paramB, setParamB] = useState(60);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cornell Notes State
  const existingCornell = cornellNotes[activeTopicId];
  const [cuesText, setCuesText] = useState(
    existingCornell?.cues ||
      '• Core Governing Law?\n• Boundary Condition?\n• Examiner Trap?'
  );
  const [notesText, setNotesText] = useState(
    existingCornell?.notes ||
      '1. Always state standard syllabus equation before substituting values.\n2. Verify dimensional consistency and SI prefixes.\n3. Connect graphical slope to physical rate of change.'
  );
  const [summaryText, setSummaryText] = useState(
    existingCornell?.summary ||
      'One-sentence synthesis linking the mathematical derivative/integral to the real physical system.'
  );
  const [savedCornellBadge, setSavedCornellBadge] = useState(false);

  useEffect(() => {
    const c = cornellNotes[activeTopicId];
    if (c) {
      setCuesText(c.cues);
      setNotesText(c.notes);
      setSummaryText(c.summary);
    }
  }, [activeTopicId, cornellNotes]);

  // Interactive HTML5 Canvas STEM Simulation Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle dark slate grid background
    ctx.fillStyle = '#14241E';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, h - 26);
    ctx.lineTo(w - 16, h - 26);
    ctx.moveTo(32, h - 26);
    ctx.lineTo(32, 16);
    ctx.stroke();

    if (currentSubject === 'Mathematics') {
      // Draw curve f(x) = 0.012 * (x - 40)^2 + 25 and secant chord with step h
      const stepH = Math.max(8, (paramA / 100) * 120);
      const x0 = 55 + (paramB / 100) * 110;

      const f = (x: number) => {
        const norm = (x - 45) / 42;
        return h - 34 - (norm * norm * 26 + Math.sin(norm) * 14);
      };

      // Plot function f(x)
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let px = 34; px < w - 18; px += 3) {
        const py = f(px);
        if (px === 34) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Points P(x0, f(x0)) and Q(x0 + h, f(x0 + h))
      const x1 = Math.min(w - 24, x0 + stepH);
      const y0 = f(x0);
      const y1 = f(x1);
      const slope = (y0 - y1) / Math.max(1, x1 - x0);

      // Secant Chord Line
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0 - 35, y0 + slope * 35);
      ctx.lineTo(x1 + 35, y1 - slope * 35);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Points P and Q
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(x0, y0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(x1, y1, 5, 0, Math.PI * 2);
      ctx.fill();

      // Readout overlay
      ctx.fillStyle = '#F1F5F9';
      ctx.font = '11px monospace';
      ctx.fillText(
        `Δx (h) = ${(stepH / 40).toFixed(2)}  |  Secant Gradient m = ${slope.toFixed(2)}`,
        42,
        26
      );
    } else if (currentSubject === 'Physics') {
      // Parabolic Projectile Trajectory: paramA = Angle θ (15°..80°), paramB = Initial Speed v0
      const angleDeg = 15 + (paramA / 100) * 65;
      const angleRad = (angleDeg * Math.PI) / 180;
      const v0 = 35 + (paramB / 100) * 45;
      const g = 9.81;

      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      let apexX = 32;
      let apexY = h - 26;

      for (let t = 0; t <= 12; t += 0.12) {
        const dx = v0 * Math.cos(angleRad) * t * 0.85;
        const dy = (v0 * Math.sin(angleRad) * t - 0.5 * g * t * t) * 0.85;
        const px = 32 + dx;
        const py = h - 26 - dy;
        if (py < apexY) {
          apexY = py;
          apexX = px;
        }
        if (py > h - 25 && t > 0.2) break;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Apex Marker
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(apexX, apexY, 5, 0, Math.PI * 2);
      ctx.fill();

      const rangeMeters = ((v0 * v0 * Math.sin(2 * angleRad)) / g).toFixed(1);
      const maxHeight = (
        (v0 * v0 * Math.pow(Math.sin(angleRad), 2)) /
        (2 * g)
      ).toFixed(1);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '11px monospace';
      ctx.fillText(
        `θ = ${angleDeg.toFixed(0)}° | v₀ = ${v0.toFixed(0)} m/s | Range = ${rangeMeters}m | Hmax = ${maxHeight}m`,
        40,
        26
      );
    } else {
      // Chemistry: Maxwell-Boltzmann Distribution with Temperature T (paramA) & Catalyst Ea (paramB)
      const tempFactor = 0.65 + (paramA / 100) * 0.9;
      const eaX = 135 + (paramB / 100) * 130;

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let x = 32; x < w - 16; x += 2) {
        const e = (x - 32) / (55 * tempFactor);
        const prob =
          (e * e * Math.exp(-e * 1.15)) / (tempFactor * 0.55);
        const py = h - 26 - prob * 145;

        if (x === 32) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      // Shade reactive molecules beyond Ea
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath();
      ctx.moveTo(eaX, h - 26);
      for (let x = eaX; x < w - 16; x += 2) {
        const e = (x - 32) / (55 * tempFactor);
        const prob =
          (e * e * Math.exp(-e * 1.15)) / (tempFactor * 0.55);
        const py = h - 26 - prob * 145;
        ctx.lineTo(x, py);
      }
      ctx.lineTo(w - 16, h - 26);
      ctx.closePath();
      ctx.fill();

      // Activation Energy Ea threshold line
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(eaX, 24);
      ctx.lineTo(eaX, h - 26);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '11px monospace';
      ctx.fillText(
        `T = ${(273 + paramA * 2.5).toFixed(0)} K  |  Activation Barrier Ea = ${(30 + paramB * 0.7).toFixed(1)} kJ/mol`,
        40,
        26
      );
    }
  }, [currentSubject, paramA, paramB]);

  const subjectStickies = stickyNotes.filter(
    (s) => s.subject === currentSubject
  );

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    chiptuneAudio.playPaperFlip();
  };

  const handleCreateSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
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
    saveCornellForTopic(activeTopicId, cuesText, notesText, summaryText);
    await storageAdapter.saveCornellNote({
      id: `cornell-${activeTopicId}`,
      subject: currentSubject,
      topicId: activeTopicId,
      cues: cuesText,
      notes: notesText,
      summary: summaryText,
      updatedAt: Date.now(),
    });
    awardXP(20);
    chiptuneAudio.playPaperFlip();
    setSavedCornellBadge(true);
    setTimeout(() => setSavedCornellBadge(false), 2500);
  };

  const sliderALabel =
    currentSubject === 'Mathematics'
      ? 'Chord Step h (Δx → 0)'
      : currentSubject === 'Physics'
        ? 'Launch Angle θ (deg)'
        : 'Temperature T (Kelvin)';

  const sliderBLabel =
    currentSubject === 'Mathematics'
      ? 'Curve Probe Coordinate x₀'
      : currentSubject === 'Physics'
        ? 'Initial Velocity v₀ (m/s)'
        : 'Activation Energy E_a (Catalyst)';

  return (
    <aside
      aria-label="Right Panel: 3D Tactile Sticky Notes & Simulation Studio"
      className="rounded-2xl border-2 border-[#C8AE8D] bg-[#F3E5D0]/85 p-4 flex flex-col justify-between gap-4 h-full min-h-[760px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]"
    >
      <div className="space-y-4">
        {/* Panel 1: 3D Tactile Sticky Notes with Paper-Curl 180deg Flip */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#D4B996] pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8D6E63] font-bold block">
                Active Recall Flashcards
              </span>
              <h2 className="text-base font-bold font-serif text-[#1E293B] flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-[#F59E0B]" />
                3D Sticky Note Desk
              </h2>
            </div>

            <button
              id="add-3d-sticky-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FDE047]" />
              Pin Note
            </button>
          </div>

          {/* Quick Add 3D Sticky Note Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateSticky}
              className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#C8AE8D] space-y-2 shadow-md"
            >
              <input
                type="text"
                required
                placeholder="Front Prompt (Active Recall Question)..."
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
              />
              <textarea
                rows={2}
                required
                placeholder="Reverse Side Answer / Formula intuition..."
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(['yellow', 'mint', 'amber', 'coral'] as const).map(
                    (col) => (
                      <button
                        type="button"
                        key={col}
                        onClick={() => setNewColor(col)}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
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
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-[#10B981] text-white text-xs font-bold cursor-pointer"
                >
                  Stick to Desk (+25 XP)
                </button>
              </div>
            </form>
          )}

          {/* 3D Sticky Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                  className={`perspective-1200 h-40 cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] hover:-translate-y-1 ${note.rotationClass}`}
                >
                  <div
                    className={`relative w-full h-full duration-500 preserve-3d transition-transform ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* FRONT SIDE: Active Recall Question */}
                    <div
                      className={`absolute inset-0 backface-hidden sticky-paper-curl rounded-xl border-2 ${palette.border} ${palette.frontBg} p-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12)] flex flex-col justify-between`}
                    >
                      {/* Red/Brass Push-Pin */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700/80 flex items-center gap-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${palette.pinColor} shadow-xs inline-block`}
                          />
                          {note.masteryStatus.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 flex items-center gap-0.5">
                          <RotateCw className="w-2.5 h-2.5" />
                          Flip 180°
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#1E293B] leading-snug line-clamp-3">
                        {note.frontPrompt}
                      </p>

                      <div className="text-[10px] font-mono text-slate-600 flex items-center justify-between pt-1 border-t border-black/10">
                        <span>Click to curl &amp; reveal</span>
                        <Sparkles className="w-3 h-3 text-amber-700" />
                      </div>
                    </div>

                    {/* REVERSE SIDE: Revealed Answer & Mastery Status Tagging */}
                    <div
                      className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 ${palette.border} ${palette.backBg} p-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.16)] flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#1E293B]">
                          Reverse • Active Recall Answer
                        </span>
                        <RotateCw className="w-3 h-3 text-slate-700" />
                      </div>

                      <p className="text-[11px] font-medium text-[#1E293B] leading-snug overflow-y-auto">
                        {note.backAnswer}
                      </p>

                      {/* Tag Mastery Buttons */}
                      <div
                        className="flex items-center gap-1 pt-1 border-t border-black/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            updateStickyMastery(note.id, 'MASTERED')
                          }
                          title="Mark Mastered"
                          className="flex-1 py-0.5 rounded bg-[#10B981] text-white text-[9px] font-mono font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Mastered
                        </button>
                        <button
                          onClick={() =>
                            updateStickyMastery(note.id, 'SPACED_DUE')
                          }
                          title="Mark Spaced Due"
                          className="flex-1 py-0.5 rounded bg-[#F59E0B] text-white text-[9px] font-mono font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          Due
                        </button>
                        <button
                          onClick={() =>
                            updateStickyMastery(note.id, 'WEAK_POINT')
                          }
                          title="Flag Weak Point"
                          className="flex-1 py-0.5 rounded bg-[#EF4444] text-white text-[9px] font-mono font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Weak
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Interactive Code-Rendered STEM Simulation Sandbox */}
        <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#B89972] p-3.5 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#B45309]" />
              <h3 className="text-xs sm:text-sm font-bold font-serif text-[#1E293B]">
                Interactive Code Simulation Studio
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A2E26] text-[#10B981] font-semibold">
              Live 60fps Canvas
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={360}
            height={175}
            className="w-full h-40 rounded-lg border-2 border-[#3E2723] shadow-inner"
          />

          {/* Tactile Brass & Wooden Parameter Sliders */}
          <div className="space-y-2 pt-1">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[#5D4037] mb-0.5">
                <span>{sliderALabel}</span>
                <span>{paramA}%</span>
              </div>
              <input
                id="sim-brass-slider-a"
                type="range"
                min={5}
                max={95}
                value={paramA}
                onChange={(e) => setParamA(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-gradient-to-r from-[#D4B996] via-[#B45309] to-[#8D6E63] accent-[#5D4037] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[#5D4037] mb-0.5">
                <span>{sliderBLabel}</span>
                <span>{paramB}%</span>
              </div>
              <input
                id="sim-wooden-slider-b"
                type="range"
                min={5}
                max={95}
                value={paramB}
                onChange={(e) => setParamB(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-gradient-to-r from-[#D4B996] via-[#10B981] to-[#1A2E26] accent-[#1A2E26] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3: Cornell Notes Folio & Past Paper Synthesis */}
      <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#C8AE8D] p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#E6D5B8] pb-2">
          <div className="flex items-center gap-1.5">
            <BookMarked className="w-4 h-4 text-[#1A2E26]" />
            <h3 className="text-xs sm:text-sm font-bold font-serif text-[#1E293B]">
              Cornell Active Recall Notes
            </h3>
          </div>
          <button
            id="save-cornell-notes-btn"
            onClick={handleSaveCornell}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            <Save className="w-3 h-3" />
            {savedCornellBadge ? 'Saved to Dexie!' : 'Save Folio'}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-2">
          {/* Left 4 cols: Cues / Exam Prompts */}
          <div className="col-span-5">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
              Recall Cues
            </label>
            <textarea
              rows={3}
              value={cuesText}
              onChange={(e) => setCuesText(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#F5EBE0]/60 border border-[#D4B996] text-[11px] text-[#1E293B] leading-snug focus:outline-none"
            />
          </div>

          {/* Right 8 cols: Condensed Notes */}
          <div className="col-span-7">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
              Derivation &amp; Key Steps
            </label>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full p-2 rounded-lg bg-white border border-[#D4B996] text-[11px] text-[#1E293B] leading-snug focus:outline-none"
            />
          </div>
        </div>

        {/* Bottom Summary Strip */}
        <div>
          <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
            2-Line Synthesis Summary
          </label>
          <input
            type="text"
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8F4EC] border border-[#D4B996] text-[11px] text-[#1E293B] font-medium focus:outline-none"
          />
        </div>
      </div>
    </aside>
  );
}
