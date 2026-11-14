'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  RotateCw,
  ShieldCheck,
  Shirt,
  ChevronDown,
} from 'lucide-react';
import { useStudyDeskStore } from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import type { BloomsLevel } from '@/lib/gemini';

export type BarnabyCostume =
  | 'scholar'
  | 'lab-coat'
  | 'focus-sprint'
  | 'revision-test';

interface ProfessorBarnabyProps {
  speechText: string;
  socraticQuestion: string;
  bloomsLevel?: BloomsLevel;
  keyUsed?: 'KEY_1' | 'KEY_2' | 'KEY_3' | null;
  isStreamingTrigger?: number;
}

const COSTUME_LABELS: Record<BarnabyCostume, string> = {
  scholar: 'Classic Scholar (Bowtie + Glasses)',
  'lab-coat': 'Lab Coat (Coat + Goggles)',
  'focus-sprint': 'Focus Sprint (Headband)',
  'revision-test': 'Exam Mode (Mortarboard)',
};

export function ProfessorBarnaby({
  speechText,
  socraticQuestion,
  bloomsLevel = 'Analyze',
  keyUsed = null,
  isStreamingTrigger = 0,
}: ProfessorBarnabyProps) {
  const { activeCallState, audioMuted, geminiHasKey } = useStudyDeskStore();
  const [manualCostume, setManualCostume] = useState<BarnabyCostume | null>(
    null
  );
  const [outfitMenuOpen, setOutfitMenuOpen] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const streamKey = `${speechText}::${isStreamingTrigger}::${replayCount}`;
  const [streamState, setStreamState] = useState<{
    forKey: string;
    text: string;
    speaking: boolean;
  }>({
    forKey: '',
    text: '',
    speaking: false,
  });

  const displayedText =
    streamState.forKey === streamKey ? streamState.text : '';
  const isSpeaking =
    streamState.forKey === streamKey ? streamState.speaking : false;

  // Derive active costume from mode unless manually selected
  const derivedCostume: BarnabyCostume = manualCostume
    ? manualCostume
    : activeCallState === 'FOCUS_SPRINT'
      ? 'focus-sprint'
      : activeCallState === 'REVISION_TEST'
        ? 'revision-test'
        : 'scholar';

  // Stream text with synchronized 8-bit chiptune Web Audio oscillator syllables
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let index = 0;
    const interval = setInterval(() => {
      if (prefersReducedMotion) {
        setStreamState({
          forKey: streamKey,
          text: speechText,
          speaking: false,
        });
        clearInterval(interval);
        return;
      }

      index += 2;
      if (index >= speechText.length) {
        setStreamState({
          forKey: streamKey,
          text: speechText,
          speaking: false,
        });
        clearInterval(interval);
        return;
      }

      const nextSlice = speechText.slice(0, index);
      setStreamState({
        forKey: streamKey,
        text: nextSlice,
        speaking: true,
      });

      // Trigger soft 8-bit chiptune blip every 3rd character
      if (index % 3 === 0) {
        const ch = speechText[index - 1] || 'a';
        chiptuneAudio.playSyllableBlip(index, ch);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [speechText, streamKey]);

  const replaySpeech = () => {
    setReplayCount((c) => c + 1);
  };

  return (
    <div className="relative rounded-2xl border-2 border-[#B89972] bg-gradient-to-b from-[#FAF4E8] to-[#F3E7D3] p-4 shadow-[3px_3px_0px_#C8AE8D]">
      {/* Clean Single-Row Barnaby Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#DFCEB2]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A2E26] text-[#FDFBF7] text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
            Professor Barnaby
          </span>
          {speechText && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#10B981]/15 text-[#065F46] border border-[#10B981]/30 font-semibold">
              Bloom&apos;s: {bloomsLevel}
            </span>
          )}
          {keyUsed ? (
            <span
              className="text-xs font-mono px-2 py-1 rounded-lg bg-[#FDFBF7] text-slate-700 border border-[#D4B996] flex items-center gap-1"
              title="Gemini 3.8 Flash Key Rotator Slot Used"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              {keyUsed}
            </span>
          ) : (
            <span
              className={`text-xs font-mono px-2 py-1 rounded-lg border flex items-center gap-1 ${
                geminiHasKey
                  ? 'bg-[#FDFBF7] text-[#065F46] border-[#10B981]/40'
                  : 'bg-[#F59E0B]/15 text-[#92400E] border-[#F59E0B]/40'
              }`}
              title="Gemini API Status"
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  geminiHasKey ? 'text-[#10B981]' : 'text-[#F59E0B]'
                }`}
              />
              {geminiHasKey === null
                ? 'Checking Keys...'
                : geminiHasKey
                  ? 'Gemini Ready'
                  : 'API Key Needed'}
            </span>
          )}
        </div>

        {/* Compact Outfit Selector Toggle */}
        <div className="relative">
          <button
            type="button"
            id="barnaby-outfit-menu-btn"
            onClick={() => {
              setOutfitMenuOpen((prev) => !prev);
              chiptuneAudio.playPaperFlip();
            }}
            aria-expanded={outfitMenuOpen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FDFBF7] hover:bg-[#E6D5B8]/60 border border-[#B89972] text-xs font-semibold text-[#1E293B] cursor-pointer transition-colors"
          >
            <Shirt className="w-3.5 h-3.5 text-[#5D4037]" />
            <span>Outfit</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                outfitMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {outfitMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, skewX: -2 }}
                animate={{ opacity: 1, y: 0, skewX: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 mt-1.5 w-52 z-30 rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] p-1.5 shadow-[4px_4px_0px_#1E293B] space-y-1"
              >
                {(
                  [
                    { id: 'scholar', label: 'Classic Scholar' },
                    { id: 'lab-coat', label: 'Lab Coat' },
                    { id: 'focus-sprint', label: 'Focus Headband' },
                    { id: 'revision-test', label: 'Grad Mortarboard' },
                  ] as const
                ).map((c) => {
                  const active = derivedCostume === c.id;
                  return (
                    <button
                      key={c.id}
                      id={`barnaby-costume-${c.id}`}
                      type="button"
                      onClick={() => {
                        setManualCostume(c.id === manualCostume ? null : c.id);
                        setOutfitMenuOpen(false);
                        chiptuneAudio.playPaperFlip();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                        active
                          ? 'bg-[#1A2E26] text-[#FDFBF7]'
                          : 'text-slate-700 hover:bg-[#F5EBE0]'
                      }`}
                    >
                      <span>{c.label}</span>
                      {active && (
                        <span className="text-[#FDE047] font-mono">ON</span>
                      )}
                    </button>
                  );
                })}
                {manualCostume && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualCostume(null);
                      setOutfitMenuOpen(false);
                      chiptuneAudio.playPaperFlip();
                    }}
                    className="w-full text-left px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 hover:bg-[#E6D5B8]/60 border-t border-[#E6D5B8] mt-1 pt-1.5 cursor-pointer"
                  >
                    Reset to Auto-Context
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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

            {/* COSTUME OVERLAY: Crisp Paper Lab Coat */}
            {derivedCostume === 'lab-coat' && (
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

            {/* COSTUME 1: CLASSIC SCHOLAR — Round Brass Glasses + Grid-Paper Bowtie */}
            {derivedCostume === 'scholar' && (
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

            {/* COSTUME 2: LAB COAT — Safety Goggles */}
            {derivedCostume === 'lab-coat' && (
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
          <span className="text-xs font-mono text-slate-600 font-semibold -mt-1 text-center">
            {COSTUME_LABELS[derivedCostume].split(' (')[0]}
          </span>
        </motion.div>

        {/* Unrolling Paper Scroll Dialogue Box */}
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={speechText.slice(0, 24)}
              initial={{ opacity: 0.75, scaleY: 0.94 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="barnaby-scroll-surface relative rounded-xl border-2 border-[#C8AE8D] p-3.5 text-[#1E293B]"
            >
              {/* Scroll Header Bar */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wide text-[#8D6E63] font-bold flex items-center gap-1.5">
                  <Volume2
                    className={`w-3.5 h-3.5 ${
                      isSpeaking && !audioMuted
                        ? 'text-[#10B981] animate-pulse'
                        : 'text-slate-400'
                    }`}
                  />
                  {isSpeaking
                    ? 'Chiptune Voice Streaming...'
                    : speechText
                      ? 'Socratic Scroll'
                      : 'Desk Standby'}
                </span>
                {speechText && (
                  <button
                    id="barnaby-replay-voice-btn"
                    type="button"
                    onClick={replaySpeech}
                    className="text-xs font-mono text-slate-700 hover:text-[#1A2E26] flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E6D5B8]/60 hover:bg-[#E6D5B8] transition-colors cursor-pointer"
                    title="Replay Scroll & 8-Bit Chiptune Audio"
                  >
                    <RotateCw className="w-3 h-3" />
                    Replay
                  </button>
                )}
              </div>

              {/* Clean, natural human English prose (NEVER literal beep-boop text) */}
              {speechText ? (
                <p
                  aria-live="polite"
                  className="text-sm leading-relaxed text-[#1E293B] font-normal"
                >
                  {displayedText}
                  {isSpeaking && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#10B981] animate-pulse align-middle" />
                  )}
                </p>
              ) : (
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                  Desk is clean and ready. Open a notebook topic and ask a
                  question below once your Gemini API key is connected.
                </p>
              )}

              {/* Socratic Guiding Question Highlight */}
              {socraticQuestion && (
                <div className="mt-3 pt-2.5 border-t border-[#E5D5BC] flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] text-xs font-mono font-bold uppercase shrink-0 mt-0.5">
                    Prompt
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-[#1A2E26] italic leading-snug">
                    &ldquo;{socraticQuestion}&rdquo;
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
