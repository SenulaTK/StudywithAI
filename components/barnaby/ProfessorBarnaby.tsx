'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Volume2, RotateCw, ShieldCheck } from 'lucide-react';
import { useStudyDeskStore } from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import type { BloomsLevel } from '@/lib/gemini';

export type BarnabyCostume =
  | 'maths'
  | 'lab-science'
  | 'focus-sprint'
  | 'revision-test';

interface ProfessorBarnabyProps {
  speechText: string;
  socraticQuestion: string;
  bloomsLevel?: BloomsLevel;
  keyUsed?: 'KEY_1' | 'KEY_2' | 'KEY_3';
  isStreamingTrigger?: number;
}

const COSTUME_LABELS: Record<BarnabyCostume, string> = {
  maths: 'Maths: Grid Bowtie + Round Glasses',
  'lab-science': 'Lab: Paper Coat + Safety Goggles',
  'focus-sprint': 'Sprint: Red Headband + Stopwatch',
  'revision-test': 'Revision: Graduation Mortarboard',
};

export function ProfessorBarnaby({
  speechText,
  socraticQuestion,
  bloomsLevel = 'Analyze',
  keyUsed = 'KEY_1',
  isStreamingTrigger = 0,
}: ProfessorBarnabyProps) {
  const { currentSubject, activeCallState, audioMuted } = useStudyDeskStore();
  const [manualCostume, setManualCostume] = useState<BarnabyCostume | null>(
    null
  );
  const [displayedText, setDisplayedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Derive active costume from context unless manually overridden
  const derivedCostume: BarnabyCostume = manualCostume
    ? manualCostume
    : activeCallState === 'FOCUS_SPRINT'
      ? 'focus-sprint'
      : activeCallState === 'REVISION_TEST'
        ? 'revision-test'
        : currentSubject === 'Mathematics'
          ? 'maths'
          : 'lab-science';

  // Stream text with synchronized 8-bit chiptune Web Audio oscillator syllables
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    setIsSpeaking(true);

    const interval = setInterval(() => {
      index += 2;
      if (index >= speechText.length) {
        setDisplayedText(speechText);
        setIsSpeaking(false);
        clearInterval(interval);
        return;
      }
      const nextSlice = speechText.slice(0, index);
      setDisplayedText(nextSlice);

      // Trigger soft 8-bit chiptune blip every 3rd character
      if (index % 3 === 0) {
        const ch = speechText[index - 1] || 'a';
        chiptuneAudio.playSyllableBlip(index, ch);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [speechText, isStreamingTrigger]);

  const replaySpeech = () => {
    let idx = 0;
    setDisplayedText('');
    setIsSpeaking(true);
    const interval = setInterval(() => {
      idx += 2;
      if (idx >= speechText.length) {
        setDisplayedText(speechText);
        setIsSpeaking(false);
        clearInterval(interval);
        return;
      }
      setDisplayedText(speechText.slice(0, idx));
      if (idx % 3 === 0) {
        chiptuneAudio.playSyllableBlip(idx, speechText[idx - 1] || 'e');
      }
    }, 18);
  };

  return (
    <div className="relative rounded-2xl border-2 border-[#C8AE8D] bg-gradient-to-b from-[#F9F3E8] to-[#F3E7D3] p-3.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)]">
      {/* Top Status & Costume Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[#E2D2B8]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1A2E26] text-[#FDFBF7] text-[11px] font-mono font-semibold">
            <Sparkles className="w-3 h-3 text-[#FDE047]" />
            Professor Barnaby • Paper-Craft Owl AI
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#065F46] border border-[#10B981]/30 font-semibold">
            Bloom&apos;s: {bloomsLevel}
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"
            title="Gemini 2.0 Flash 3-Key Rotator Slot"
          >
            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
            {keyUsed}
          </span>
        </div>

        {/* Costume Context Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {(
            [
              { id: 'maths', short: 'Maths Owl' },
              { id: 'lab-science', short: 'Lab Coat' },
              { id: 'focus-sprint', short: 'Focus Band' },
              { id: 'revision-test', short: 'Mortarboard' },
            ] as const
          ).map((c) => {
            const active = derivedCostume === c.id;
            return (
              <button
                key={c.id}
                id={`barnaby-costume-${c.id}`}
                onClick={() => {
                  setManualCostume(c.id === manualCostume ? null : c.id);
                  chiptuneAudio.playPaperFlip();
                }}
                title={COSTUME_LABELS[c.id]}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#5D4037] text-[#FDFBF7] shadow-xs'
                    : 'bg-[#FDFBF7] text-slate-600 hover:bg-[#E6D5B8]/60 border border-[#D4B996]'
                }`}
              >
                {c.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Owl Avatar + Unrolling Paper Scroll */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Tactile 3D Paper-Craft Owl SVG */}
        <motion.div
          animate={{
            y: isSpeaking ? [0, -3, 0] : [0, -1.5, 0],
            rotate: isSpeaking ? [-1, 1, -1] : 0,
          }}
          transition={{
            duration: isSpeaking ? 0.35 : 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-28 h-32 shrink-0 select-none flex flex-col items-center"
        >
          <svg
            viewBox="0 0 140 155"
            className="w-full h-full drop-shadow-[0_8px_12px_rgba(62,39,35,0.22)]"
            aria-label={`Professor Barnaby wearing ${COSTUME_LABELS[derivedCostume]}`}
          >
            {/* Paper-craft base shadow */}
            <ellipse
              cx="70"
              cy="144"
              rx="42"
              ry="7"
              fill="rgba(30, 41, 59, 0.14)"
            />

            {/* Origami Owl Body (Layered folded kraft paper facets) */}
            <polygon
              points="32,62 70,34 108,62 114,126 70,138 26,126"
              fill="#C89F72"
              stroke="#5D4037"
              strokeWidth="2"
            />
            <polygon
              points="70,34 108,62 114,126 70,138"
              fill="#B68B5E"
              stroke="#5D4037"
              strokeWidth="1.5"
            />

            {/* Cream Paper Belly Chevron Feathers */}
            <polygon
              points="44,78 70,66 96,78 92,130 70,136 48,130"
              fill="#FDFBF7"
              stroke="#8D6E63"
              strokeWidth="1.5"
            />
            <polyline
              points="54,92 62,98 70,92 78,98 86,92"
              fill="none"
              stroke="#A1887F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polyline
              points="56,106 63,112 70,106 77,112 84,106"
              fill="none"
              stroke="#A1887F"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Paper-craft Folded Wings */}
            <polygon
              points="32,64 16,96 28,122 42,114"
              fill="#A97C50"
              stroke="#5D4037"
              strokeWidth="2"
            />
            <polygon
              points="108,64 124,96 112,122 98,114"
              fill="#976B41"
              stroke="#5D4037"
              strokeWidth="2"
            />

            {/* COSTUME OVERLAY: Chemistry / Physics White Paper Lab Coat */}
            {derivedCostume === 'lab-science' && (
              <g>
                <polygon
                  points="35,80 62,84 60,134 30,128"
                  fill="#FFFFFF"
                  stroke="#64748B"
                  strokeWidth="1.8"
                />
                <polygon
                  points="105,80 78,84 80,134 110,128"
                  fill="#F1F5F9"
                  stroke="#64748B"
                  strokeWidth="1.8"
                />
                {/* Lapels */}
                <polygon
                  points="46,78 62,84 54,102"
                  fill="#E2E8F0"
                  stroke="#64748B"
                  strokeWidth="1.5"
                />
                <polygon
                  points="94,78 78,84 86,102"
                  fill="#E2E8F0"
                  stroke="#64748B"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Origami Ear Tufts */}
            <polygon
              points="30,52 46,24 58,44"
              fill="#8D6E63"
              stroke="#5D4037"
              strokeWidth="2"
            />
            <polygon
              points="110,52 94,24 82,44"
              fill="#795548"
              stroke="#5D4037"
              strokeWidth="2"
            />

            {/* Owl Facial Disc (Folded Octagon) */}
            <polygon
              points="36,48 70,38 104,48 100,82 70,88 40,82"
              fill="#F5EBE0"
              stroke="#5D4037"
              strokeWidth="2"
            />

            {/* Expressive Eyes */}
            <circle
              cx="53"
              cy="62"
              r="11"
              fill="#FFFDF9"
              stroke="#3E2723"
              strokeWidth="2"
            />
            <circle
              cx="87"
              cy="62"
              r="11"
              fill="#FFFDF9"
              stroke="#3E2723"
              strokeWidth="2"
            />
            <circle cx="53" cy="62" r="5.5" fill="#1E293B" />
            <circle cx="87" cy="62" r="5.5" fill="#1E293B" />
            <circle cx="55" cy="59.5" r="2" fill="#FFFFFF" />
            <circle cx="89" cy="59.5" r="2" fill="#FFFFFF" />

            {/* Golden Paper Beak (animates open/close slightly when speaking) */}
            <polygon
              points={
                isSpeaking ? '64,68 76,68 70,83' : '65,69 75,69 70,79'
              }
              fill="#F59E0B"
              stroke="#5D4037"
              strokeWidth="1.8"
            />

            {/* COSTUME 1: MATHS — Round Brass Glasses + Grid-Paper Bowtie */}
            {derivedCostume === 'maths' && (
              <g>
                {/* Round Scholarly Glasses */}
                <circle
                  cx="53"
                  cy="62"
                  r="14"
                  fill="none"
                  stroke="#B45309"
                  strokeWidth="2.5"
                />
                <circle
                  cx="87"
                  cy="62"
                  r="14"
                  fill="none"
                  stroke="#B45309"
                  strokeWidth="2.5"
                />
                <line
                  x1="67"
                  y1="62"
                  x2="73"
                  y2="62"
                  stroke="#B45309"
                  strokeWidth="2.5"
                />
                {/* Grid-Paper Bowtie */}
                <polygon
                  points="50,82 70,89 50,96"
                  fill="#E0F2FE"
                  stroke="#0369A1"
                  strokeWidth="1.8"
                />
                <polygon
                  points="90,82 70,89 90,96"
                  fill="#BAE6FD"
                  stroke="#0369A1"
                  strokeWidth="1.8"
                />
                <line
                  x1="56"
                  y1="85"
                  x2="56"
                  y2="93"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <line
                  x1="84"
                  y1="85"
                  x2="84"
                  y2="93"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <circle
                  cx="70"
                  cy="89"
                  r="3.5"
                  fill="#0284C7"
                  stroke="#0369A1"
                  strokeWidth="1.2"
                />
              </g>
            )}

            {/* COSTUME 2: CHEMISTRY / PHYSICS — Safety Goggles */}
            {derivedCostume === 'lab-science' && (
              <g>
                <rect
                  x="35"
                  y="49"
                  width="70"
                  height="24"
                  rx="7"
                  fill="rgba(56, 189, 248, 0.28)"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                />
                <line
                  x1="70"
                  y1="49"
                  x2="70"
                  y2="73"
                  stroke="#0284C7"
                  strokeWidth="2"
                />
                {/* Goggle shine */}
                <line
                  x1="42"
                  y1="54"
                  x2="49"
                  y2="54"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="54"
                  x2="87"
                  y2="54"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* COSTUME 3: FOCUS SPRINT — Red Focus Headband + Brass Stopwatch */}
            {derivedCostume === 'focus-sprint' && (
              <g>
                {/* Red Paper Headband */}
                <polygon
                  points="35,44 105,44 108,52 32,52"
                  fill="#EF4444"
                  stroke="#991B1B"
                  strokeWidth="1.8"
                />
                {/* Headband Knot Tails */}
                <polygon
                  points="106,46 125,40 120,49"
                  fill="#EF4444"
                  stroke="#991B1B"
                  strokeWidth="1.4"
                />
                <polygon
                  points="106,49 124,54 117,59"
                  fill="#DC2626"
                  stroke="#991B1B"
                  strokeWidth="1.4"
                />
                {/* Brass Stopwatch around neck */}
                <polyline
                  points="55,84 70,108 85,84"
                  fill="none"
                  stroke="#B45309"
                  strokeWidth="2"
                />
                <circle
                  cx="70"
                  cy="112"
                  r="10"
                  fill="#FDE047"
                  stroke="#92400E"
                  strokeWidth="2"
                />
                <line
                  x1="70"
                  y1="112"
                  x2="70"
                  y2="106"
                  stroke="#1E293B"
                  strokeWidth="1.6"
                />
                <line
                  x1="70"
                  y1="112"
                  x2="75"
                  y2="112"
                  stroke="#EF4444"
                  strokeWidth="1.4"
                />
              </g>
            )}

            {/* COSTUME 4: REVISION TEST — Graduation Mortarboard Cap */}
            {derivedCostume === 'revision-test' && (
              <g>
                <polygon
                  points="70,12 118,26 70,40 22,26"
                  fill="#1E293B"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                <rect
                  x="48"
                  y="33"
                  width="44"
                  height="9"
                  rx="2"
                  fill="#334155"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                />
                {/* Gold Tassel */}
                <polyline
                  points="70,26 106,32 108,52"
                  fill="none"
                  stroke="#FDE047"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="70" cy="26" r="3" fill="#FDE047" />
              </g>
            )}

            {/* Origami Paper Feet */}
            <polygon
              points="48,136 58,136 53,145"
              fill="#F59E0B"
              stroke="#5D4037"
              strokeWidth="1.5"
            />
            <polygon
              points="82,136 92,136 87,145"
              fill="#F59E0B"
              stroke="#5D4037"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-[10px] font-mono text-slate-600 font-semibold -mt-1">
            {COSTUME_LABELS[derivedCostume].split(':')[0]} Mode
          </span>
        </motion.div>

        {/* Unrolling Paper Scroll Dialogue Box */}
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={speechText.slice(0, 24)}
              initial={{ opacity: 0.7, scaleY: 0.94 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.25 }}
              className="barnaby-scroll-surface relative rounded-xl border-2 border-[#C8AE8D] p-3.5 text-[#1E293B]"
            >
              {/* Wooden Scroll Rollers Left & Right */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8D6E63] font-bold flex items-center gap-1.5">
                  <Volume2
                    className={`w-3.5 h-3.5 ${
                      isSpeaking && !audioMuted
                        ? 'text-[#10B981] animate-pulse'
                        : 'text-slate-400'
                    }`}
                  />
                  {isSpeaking
                    ? '8-Bit Chiptune Voice Streaming...'
                    : 'Unrolled Socratic Scroll'}
                </span>
                <button
                  id="barnaby-replay-voice-btn"
                  onClick={replaySpeech}
                  className="text-[10px] font-mono text-slate-600 hover:text-[#1A2E26] flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E6D5B8]/60 hover:bg-[#E6D5B8] transition-colors cursor-pointer"
                  title="Replay Scroll & 8-Bit Chiptune Audio"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  Replay Scroll
                </button>
              </div>

              {/* Clean, natural human English prose (NEVER literal beep-boop text) */}
              <p className="text-xs sm:text-sm leading-relaxed text-[#1E293B] font-normal">
                {displayedText}
                {isSpeaking && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#10B981] animate-pulse align-middle" />
                )}
              </p>

              {/* Socratic Guiding Question Highlight */}
              <div className="mt-3 pt-2.5 border-t border-[#E5D5BC] flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] text-[10px] font-mono font-bold uppercase shrink-0 mt-0.5">
                  Socratic Prompt
                </span>
                <p className="text-xs sm:text-[13px] font-semibold text-[#1A2E26] italic">
                  &ldquo;{socraticQuestion}&rdquo;
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
