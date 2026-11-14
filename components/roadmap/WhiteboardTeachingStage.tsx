'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BlockMath } from 'react-katex';
import { RotateCw, Presentation, Volume2 } from 'lucide-react';
import type {
  ActiveCallState,
  RoadmapTopicNode,
  WorkbookDialogueTurn,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { RichAcademicText } from '@/components/common/RichAcademicText';

interface TeachingBeat {
  id: string;
  kind: 'title' | 'formula' | 'point' | 'prompt';
  label: string;
  content: string;
  markerColor: string;
  badgeBg: string;
}

function getPointerAngle(
  beatIndex: number,
  totalBeats: number,
  isBlank: boolean
): number {
  if (isBlank) return -6;
  if (totalBeats <= 1) return -22;
  const ratio = beatIndex / (totalBeats - 1);
  // Swing smoothly from -28 deg (top heading) down to +26 deg (lower point)
  return Math.round(-28 + ratio * 54);
}

function TeacherOwlAtBoard({
  activeCallState,
  pointerAngle,
  isTeaching,
  isBlank,
}: {
  activeCallState: ActiveCallState;
  pointerAngle: number;
  isTeaching: boolean;
  isBlank: boolean;
}) {
  return (
    <motion.div
      animate={
        isTeaching
          ? { y: [0, -3.5, 0], rotate: [-0.8, 0.8, -0.8] }
          : { y: [0, -1.5, 0], rotate: 0 }
      }
      transition={{
        duration: isTeaching ? 1.35 : 3.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="w-24 sm:w-28 h-28 sm:h-32 shrink-0 select-none"
    >
      <svg
        viewBox="0 0 155 150"
        className="w-full h-full drop-shadow-[0_6px_10px_rgba(30,41,59,0.16)]"
        aria-label={
          isBlank
            ? 'Professor Barnaby waiting by the blank whiteboard'
            : 'Professor Barnaby pointing at lesson notes on the whiteboard'
        }
      >
        {/* Ground contact shadow on marker tray */}
        <ellipse
          cx="62"
          cy="141"
          rx="36"
          ry="5.5"
          fill="rgba(30, 41, 59, 0.14)"
        />

        {/* Animated Left Gesture Wing */}
        <motion.g
          style={{ transformOrigin: '28px 72px', transformBox: 'view-box' }}
          animate={
            isTeaching
              ? { rotate: [0, -14, -4, -12, 0] }
              : isBlank
                ? { rotate: [0, -10, 0, -10, 0] }
                : { rotate: [0, -3, 0] }
          }
          transition={{
            duration: isTeaching ? 1.6 : 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <polygon
            points="28,64 11,94 23,118 37,110"
            fill="#A97C50"
            stroke="#5D4037"
            strokeWidth="2"
          />
        </motion.g>

        {/* Origami Owl Body */}
        <polygon
          points="27,62 60,35 93,62 98,124 60,135 22,124"
          fill="#C89F72"
          stroke="#5D4037"
          strokeWidth="2"
        />
        <polygon
          points="60,35 93,62 98,124 60,135"
          fill="#B68B5E"
          stroke="#5D4037"
          strokeWidth="1.5"
        />

        {/* Cream Paper Belly + Feathers */}
        <polygon
          points="38,78 60,67 82,78 78,127 60,133 42,127"
          fill="#FDFBF7"
          stroke="#8D6E63"
          strokeWidth="1.4"
        />
        <polyline
          points="47,94 54,99 60,94 66,99 73,94"
          fill="none"
          stroke="#A1887F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <polyline
          points="49,108 55,113 60,108 65,113 71,108"
          fill="none"
          stroke="#A1887F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Origami Ear Tufts */}
        <polygon
          points="25,52 40,26 50,45"
          fill="#8D6E63"
          stroke="#5D4037"
          strokeWidth="2"
        />
        <polygon
          points="95,52 80,26 70,45"
          fill="#795548"
          stroke="#5D4037"
          strokeWidth="2"
        />

        {/* Facial Disc */}
        <polygon
          points="30,49 60,40 90,49 86,82 60,88 34,82"
          fill="#F5EBE0"
          stroke="#5D4037"
          strokeWidth="2"
        />

        {/* Expressive Blinking Eyes (Slightly oriented right toward board) */}
        <motion.g
          style={{ transformOrigin: '60px 62px', transformBox: 'view-box' }}
          animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
          transition={{
            duration: 4.5,
            times: [0, 0.92, 0.95, 0.98, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <circle
            cx="46"
            cy="62"
            r="9.5"
            fill="#FFFDF9"
            stroke="#3E2723"
            strokeWidth="1.8"
          />
          <circle
            cx="74"
            cy="62"
            r="9.5"
            fill="#FFFDF9"
            stroke="#3E2723"
            strokeWidth="1.8"
          />
          <circle cx="48" cy="62" r="4.8" fill="#1E293B" />
          <circle cx="76" cy="62" r="4.8" fill="#1E293B" />
          <circle cx="49.5" cy="59.8" r="1.8" fill="#FFFFFF" />
          <circle cx="77.5" cy="59.8" r="1.8" fill="#FFFFFF" />
        </motion.g>

        {/* Brass Glasses + Grid Bowtie (or Active Headgear) */}
        <circle
          cx="46"
          cy="62"
          r="12"
          fill="none"
          stroke="#B45309"
          strokeWidth="2.1"
        />
        <circle
          cx="74"
          cy="62"
          r="12"
          fill="none"
          stroke="#B45309"
          strokeWidth="2.1"
        />
        <line
          x1="58"
          y1="62"
          x2="62"
          y2="62"
          stroke="#B45309"
          strokeWidth="2.1"
        />
        <polygon
          points="44,83 60,89 44,95"
          fill="#E0F2FE"
          stroke="#0369A1"
          strokeWidth="1.5"
        />
        <polygon
          points="76,83 60,89 76,95"
          fill="#BAE6FD"
          stroke="#0369A1"
          strokeWidth="1.5"
        />
        <circle
          cx="60"
          cy="89"
          r="2.8"
          fill="#0284C7"
          stroke="#0369A1"
          strokeWidth="1"
        />

        {/* Focus Sprint Headband */}
        {activeCallState === 'FOCUS_SPRINT' && (
          <g>
            <polygon
              points="30,45 90,45 93,52 27,52"
              fill="#EF4444"
              stroke="#991B1B"
              strokeWidth="1.6"
            />
          </g>
        )}

        {/* Exam Revision Mortarboard */}
        {activeCallState === 'REVISION_TEST' && (
          <g>
            <polygon
              points="60,15 101,27 60,39 19,27"
              fill="#1E293B"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            <polyline
              points="60,27 92,33 94,50"
              fill="none"
              stroke="#FDE047"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="60" cy="27" r="2.5" fill="#FDE047" />
          </g>
        )}

        {/* Animated Talking Golden Beak */}
        <motion.polygon
          style={{ transformOrigin: '60px 71px', transformBox: 'view-box' }}
          animate={
            isTeaching ? { scaleY: [1, 1.38, 0.9, 1.28, 1] } : { scaleY: 1 }
          }
          transition={{
            duration: 0.72,
            repeat: isTeaching ? Infinity : 0,
            ease: 'easeInOut',
          }}
          points="55,69 65,69 60,80"
          fill="#F59E0B"
          stroke="#5D4037"
          strokeWidth="1.6"
        />

        {/* Origami Feet */}
        <polygon
          points="42,133 50,133 46,141"
          fill="#F59E0B"
          stroke="#5D4037"
          strokeWidth="1.4"
        />
        <polygon
          points="70,133 78,133 74,141"
          fill="#F59E0B"
          stroke="#5D4037"
          strokeWidth="1.4"
        />

        {/* Animated Right Teaching Wing + Wooden Pointer Stick */}
        <motion.g
          style={{ transformOrigin: '89px 80px', transformBox: 'view-box' }}
          animate={
            isTeaching
              ? {
                  rotate: [
                    pointerAngle,
                    pointerAngle - 5,
                    pointerAngle + 2,
                    pointerAngle,
                  ],
                }
              : { rotate: pointerAngle }
          }
          transition={{
            duration: isTeaching ? 1.15 : 0.75,
            repeat: isTeaching ? Infinity : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Wooden Classroom Pointer Stick */}
          <line
            x1="88"
            y1="82"
            x2="148"
            y2="68"
            stroke="#92400E"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle
            cx="148"
            cy="68"
            r="3.2"
            fill="#EF4444"
            stroke="#7F1D1D"
            strokeWidth="1.2"
          />

          {/* Wing Feather Grip over Pointer */}
          <polygon
            points="92,64 111,88 97,108 85,96"
            fill="#976B41"
            stroke="#5D4037"
            strokeWidth="1.8"
          />
        </motion.g>
      </svg>
    </motion.div>
  );
}

export function WhiteboardTeachingStage({
  activeNode,
  activeCallState,
  lastBarnabyTurn,
}: {
  activeNode: RoadmapTopicNode | null;
  activeCallState: ActiveCallState;
  lastBarnabyTurn?: WorkbookDialogueTurn;
}) {
  const formula = lastBarnabyTurn?.latexFormula || activeNode?.coreLatex || '';
  const formulaCaption =
    lastBarnabyTurn?.latexCaption ||
    activeNode?.coreLatexCaption ||
    'Core Formula';
  const mainPoint =
    lastBarnabyTurn?.text || activeNode?.initialHints[0] || '';
  const mainPointLabel = lastBarnabyTurn?.text ? "Barnaby's Lesson" : 'Key Step';
  const promptQuestion =
    lastBarnabyTurn?.socraticFollowUp ||
    activeNode?.initialSocraticQuestion ||
    '';

  const beats: TeachingBeat[] = activeNode
    ? [
        {
          id: 'title',
          kind: 'title',
          label: activeNode.code,
          content: activeNode.title,
          markerColor: '#059669',
          badgeBg: 'bg-emerald-100 text-[#065F46] border-emerald-400',
        },
        ...(formula
          ? [
              {
                id: 'formula',
                kind: 'formula' as const,
                label: formulaCaption,
                content: formula,
                markerColor: '#0284C7',
                badgeBg: 'bg-sky-100 text-sky-900 border-sky-400',
              },
            ]
          : []),
        ...(mainPoint
          ? [
              {
                id: 'point',
                kind: 'point' as const,
                label: mainPointLabel,
                content: mainPoint,
                markerColor: '#D97706',
                badgeBg: 'bg-amber-100 text-amber-950 border-amber-400',
              },
            ]
          : []),
        ...(promptQuestion
          ? [
              {
                id: 'prompt',
                kind: 'prompt' as const,
                label: 'Quick Check',
                content: promptQuestion,
                markerColor: '#DC2626',
                badgeBg: 'bg-rose-100 text-rose-900 border-rose-400',
              },
            ]
          : []),
      ]
    : [];

  const beatsSignature = beats.map((b) => `${b.id}:${b.content}`).join('|');
  const [replayCount, setReplayCount] = useState(0);
  const fullAnimKey = `${activeNode?.id || 'blank'}::${beatsSignature}::${replayCount}`;

  const [animState, setAnimState] = useState<{
    forKey: string;
    activeStep: number;
    maxRevealed: number;
    playing: boolean;
  }>({
    forKey: '',
    activeStep: 0,
    maxRevealed: 0,
    playing: false,
  });

  const beatsLength = beats.length;
  const hasActiveTopic = Boolean(activeNode);

  useEffect(() => {
    if (!hasActiveTopic || beatsLength === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const doneTimer = setTimeout(() => {
        setAnimState({
          forKey: fullAnimKey,
          activeStep: 0,
          maxRevealed: beatsLength - 1,
          playing: false,
        });
      }, 0);
      return () => clearTimeout(doneTimer);
    }

    let step = 0;
    const startTimer = setTimeout(() => {
      setAnimState({
        forKey: fullAnimKey,
        activeStep: 0,
        maxRevealed: 0,
        playing: true,
      });
    }, 80);

    const stepInterval = setInterval(() => {
      step += 1;
      if (step >= beatsLength) {
        setAnimState({
          forKey: fullAnimKey,
          activeStep: beatsLength - 1,
          maxRevealed: beatsLength - 1,
          playing: false,
        });
        clearInterval(stepInterval);
        return;
      }
      setAnimState({
        forKey: fullAnimKey,
        activeStep: step,
        maxRevealed: step,
        playing: true,
      });
    }, 1350);

    return () => {
      clearTimeout(startTimer);
      clearInterval(stepInterval);
    };
  }, [hasActiveTopic, beatsLength, fullAnimKey]);

  const activeStep =
    animState.forKey === fullAnimKey ? animState.activeStep : 0;
  const maxRevealed =
    animState.forKey === fullAnimKey ? animState.maxRevealed : 0;
  const isPlaying =
    animState.forKey === fullAnimKey
      ? animState.playing
      : hasActiveTopic && beatsLength > 0;

  const pointerAngle = getPointerAngle(activeStep, beatsLength, !activeNode);

  return (
    <div className="whiteboard-surface rounded-xl border-2 border-[#64748B] overflow-hidden">
      {/* Whiteboard Top Strip */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#F1F5F9]/90 border-b border-[#CBD5E1]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Presentation className="w-3.5 h-3.5 text-[#059669] shrink-0" />
          <span className="text-xs font-mono font-bold text-[#1E293B] truncate">
            {!activeNode
              ? 'Whiteboard Standby'
              : isPlaying
                ? 'Barnaby is teaching...'
                : 'Lesson Board'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {beats.length > 1 && (
            <div
              className="flex items-center gap-1"
              aria-label="Lesson step selector"
            >
              {beats.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setAnimState({
                      forKey: fullAnimKey,
                      activeStep: idx,
                      maxRevealed: Math.max(maxRevealed, beats.length - 1),
                      playing: false,
                    });
                    chiptuneAudio.playPaperFlip();
                  }}
                  aria-label={`Point to ${b.label}`}
                  className={`w-5 h-5 rounded-full text-xs font-mono font-bold transition-colors cursor-pointer ${
                    activeStep === idx
                      ? 'bg-[#1A2E26] text-[#FDE047]'
                      : 'bg-white border border-[#CBD5E1] text-slate-600 hover:bg-[#FDE047]/40'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}

          {activeNode && (
            <>
              <button
                id="whiteboard-voice-lecture-btn"
                type="button"
                onClick={() => {
                  setReplayCount((c) => c + 1);
                  chiptuneAudio.playPaperFlip();
                  if (
                    typeof window !== 'undefined' &&
                    'speechSynthesis' in window
                  ) {
                    window.speechSynthesis.cancel();
                    const spokenSteps = beats
                      .map((b) =>
                        `${b.label}: ${b.content}`
                          .replace(/\$\$?([^$]+)\$\$?/g, '$1')
                          .replace(/\\[a-zA-Z]+/g, ' ')
                      )
                      .join('. ');
                    const utter = new SpeechSynthesisUtterance(spokenSteps);
                    utter.rate = 1.0;
                    utter.pitch = 1.04;
                    window.speechSynthesis.speak(utter);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#10B981] text-xs font-mono font-bold text-[#065F46] cursor-pointer transition-colors"
                title="Listen to Barnaby narrate the whiteboard steps aloud"
              >
                <Volume2 className="w-3 h-3" />
                Speak
              </button>
              <button
                id="whiteboard-replay-teaching-btn"
                type="button"
                onClick={() => {
                  setReplayCount((c) => c + 1);
                  chiptuneAudio.playPaperFlip();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-[#FDE047]/50 border border-[#CBD5E1] text-xs font-mono font-bold text-[#1E293B] cursor-pointer transition-colors"
                title="Replay owl teaching animation"
              >
                <RotateCw className="w-3 h-3" />
                Replay
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Dry-Erase Canvas: Teaching Owl + Dynamic Lesson Content */}
      <div className="p-3 sm:p-4 flex items-end gap-2.5 sm:gap-3 min-h-[175px]">
        <TeacherOwlAtBoard
          activeCallState={activeCallState}
          pointerAngle={pointerAngle}
          isTeaching={isPlaying}
          isBlank={!activeNode}
        />

        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-center space-y-2 py-0.5">
          {!activeNode ? (
            <div className="space-y-1.5 pl-1">
              <p className="text-xs font-mono font-bold uppercase tracking-wide text-[#059669]">
                Blank Whiteboard
              </p>
              <p className="text-sm font-serif font-bold text-[#1E293B] leading-snug">
                Ready for your lesson
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create a notebook and topic below to watch Professor Barnaby
                illustrate formulas, notes, and prompts here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {beats.map((beat, idx) => {
                if (idx > maxRevealed) return null;
                const isFocused = idx === activeStep;

                return (
                  <motion.div
                    key={`${fullAnimKey}-${beat.id}`}
                    initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
                    transition={{
                      duration: 0.65,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={() => {
                      setAnimState({
                        forKey: fullAnimKey,
                        activeStep: idx,
                        maxRevealed: Math.max(maxRevealed, beats.length - 1),
                        playing: false,
                      });
                    }}
                    className={`rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer ${
                      isFocused
                        ? 'bg-[#FEF9C3]/75 border-[#1E293B] shadow-[2px_2px_0px_#1E293B]'
                        : 'bg-[#F8FAFC]/85 border-[#E2E8F0] hover:border-[#94A3B8]'
                    }`}
                  >
                    {beat.kind === 'title' ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${beat.badgeBg}`}
                          >
                            {beat.label}
                          </span>
                        </div>
                        <p className="text-sm font-serif font-bold text-[#1E293B] leading-snug">
                          {beat.content}
                        </p>
                        {/* Animated Dry-Erase Marker Underline */}
                        <svg
                          viewBox="0 0 180 8"
                          className="w-full max-w-[180px] h-2 mt-0.5 overflow-visible"
                          aria-hidden="true"
                        >
                          <motion.path
                            d="M 2 5 Q 90 1 178 4"
                            fill="none"
                            stroke="#059669"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              duration: 0.85,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </svg>
                      </div>
                    ) : beat.kind === 'formula' ? (
                      <div className="space-y-1">
                        <span
                          className={`inline-block text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${beat.badgeBg}`}
                        >
                          {beat.label}
                        </span>
                        <div className="overflow-x-auto text-center text-[#0F172A] text-xs">
                          <BlockMath
                            math={beat.content}
                            renderError={() => (
                              <code className="font-mono text-xs text-slate-700 break-words">
                                {beat.content}
                              </code>
                            )}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${beat.badgeBg}`}
                        >
                          {beat.label}
                        </span>
                        <div className="text-xs text-[#1E293B] leading-relaxed line-clamp-3">
                          <RichAcademicText text={beat.content} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {beats.length === 1 && (
                <p className="text-xs text-slate-600 px-1 pt-0.5">
                  Add a formula, study hint, or ask Barnaby in the Workbook to
                  animate full lesson steps on this board.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtle Mini Marker Shelf on the Stage Bottom */}
      <div
        aria-hidden="true"
        className="h-2 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] border-t border-[#CBD5E1] px-4 flex items-center justify-end gap-2"
      >
        <span className="w-5 h-1 rounded-full bg-[#059669]" />
        <span className="w-5 h-1 rounded-full bg-[#0284C7]" />
        <span className="w-4 h-1 rounded-full bg-[#DC2626]" />
      </div>
    </div>
  );
}
