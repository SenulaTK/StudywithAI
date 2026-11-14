'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyDeskStore, type TransitionTheme } from '@/lib/store';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

const THEME_PALETTES: Record<
  TransitionTheme,
  {
    primaryRibbon: string;
    accentRibbon: string;
    paperRibbon: string;
    stampBg: string;
    stampText: string;
    kickerText: string;
  }
> = {
  // Persona 4 Revival Sunshine Highlighter + School Chalkboard
  sunshine: {
    primaryRibbon: 'bg-[#1A2E26]',
    accentRibbon: 'bg-[#FDE047]',
    paperRibbon: 'bg-[#FDFBF7]',
    stampBg: 'bg-[#FDE047] border-[#1E293B]',
    stampText: 'text-[#1E293B]',
    kickerText: 'text-[#1A2E26]',
  },
  // Persona 3 Reload Crisp Chalk Mint + Slate
  mint: {
    primaryRibbon: 'bg-[#1A2E26]',
    accentRibbon: 'bg-[#10B981]',
    paperRibbon: 'bg-[#FDFBF7]',
    stampBg: 'bg-[#10B981] border-[#1E293B]',
    stampText: 'text-[#FDFBF7]',
    kickerText: 'text-[#1A2E26]',
  },
  // Persona 5 Royal Bold Crimson Grading Ink + Cream Paper
  crimson: {
    primaryRibbon: 'bg-[#1E293B]',
    accentRibbon: 'bg-[#EF4444]',
    paperRibbon: 'bg-[#FDFBF7]',
    stampBg: 'bg-[#EF4444] border-[#1E293B]',
    stampText: 'text-[#FDFBF7]',
    kickerText: 'text-[#FDE047]',
  },
  // Deep Forest Chalkboard Slate
  chalk: {
    primaryRibbon: 'bg-[#14241E]',
    accentRibbon: 'bg-[#F59E0B]',
    paperRibbon: 'bg-[#F5EBE0]',
    stampBg: 'bg-[#1A2E26] border-[#FDE047]',
    stampText: 'text-[#FDFBF7]',
    kickerText: 'text-[#FDE047]',
  },
};

/**
 * Full-screen Persona-inspired diagonal ribbon slash & school schedule cut-in transition.
 * Fires smoothly when switching classroom stations or subjects, then clears in ~1120ms.
 */
export function PersonaSchoolCurtain() {
  const { transitionBanner, clearTransition } = useStudyDeskStore();
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (!transitionBanner) return;
    const timeout = setTimeout(() => {
      clearTransition();
    }, reducedMotion ? 220 : 1120);
    return () => clearTimeout(timeout);
  }, [transitionBanner, clearTransition, reducedMotion]);

  if (reducedMotion) return null;

  const palette = transitionBanner
    ? THEME_PALETTES[transitionBanner.theme]
    : null;

  return (
    <AnimatePresence mode="wait">
      {transitionBanner && palette && (
        <motion.div
          key={transitionBanner.id}
          aria-hidden="true"
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          {/* Ribbon 1: Deep Slate Diagonal Sweep */}
          <motion.div
            className={`absolute -inset-y-16 -left-1/4 w-[150%] ${palette.primaryRibbon} -skew-x-12`}
            initial={{ x: '-115%' }}
            animate={{ x: ['-115%', '0%', '0%', '115%'] }}
            transition={{
              duration: 1.05,
              times: [0, 0.34, 0.66, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* Ribbon 2: Accent Diagonal Shard (Highlighter Yellow / Mint / Crimson) */}
          <motion.div
            className={`absolute -inset-y-16 -left-1/4 w-[140%] ${palette.accentRibbon} -skew-x-12 opacity-95`}
            initial={{ x: '-120%' }}
            animate={{ x: ['-120%', '3%', '3%', '120%'] }}
            transition={{
              duration: 0.98,
              delay: 0.08,
              times: [0, 0.35, 0.67, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* Ribbon 3: Crisp Ruled School Paper Slash */}
          <motion.div
            className={`absolute top-1/2 -translate-y-1/2 h-32 w-[140%] ${palette.paperRibbon} border-y-4 border-[#1E293B] -skew-x-12 opacity-90`}
            initial={{ x: '115%' }}
            animate={{ x: ['115%', '-3%', '-3%', '-115%'] }}
            transition={{
              duration: 0.98,
              delay: 0.06,
              times: [0, 0.36, 0.67, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* Center Tilted School Stamp Cut-In */}
          <motion.div
            className={`relative z-10 px-7 py-3.5 border-4 ${palette.stampBg} -skew-x-12 shadow-[8px_8px_0px_#1E293B]`}
            initial={{ scale: 0.76, opacity: 0, x: -44 }}
            animate={{
              scale: [0.76, 1.04, 1, 0.96],
              opacity: [0, 1, 1, 0],
              x: [-44, 0, 0, 52],
            }}
            transition={{
              duration: 1.02,
              times: [0, 0.24, 0.76, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="skew-x-12 text-center">
              <span
                className={`block text-xs font-mono font-bold tracking-[0.22em] uppercase ${palette.kickerText}`}
              >
                {transitionBanner.kicker}
              </span>
              <span
                className={`block text-2xl sm:text-3xl font-serif font-extrabold tracking-tight ${palette.stampText}`}
              >
                {transitionBanner.title}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Unhurried Persona-style angled reveal container for switching internal menus/tabs.
 */
export function PersonaMenuStage({
  stageKey,
  children,
  className = '',
}: {
  stageKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stageKey}
        initial={{ opacity: 0, x: 32, skewX: -2.5, scale: 0.985 }}
        animate={{
          opacity: 1,
          x: 0,
          skewX: 0,
          scale: 1,
          transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
        }}
        exit={{
          opacity: 0,
          x: -24,
          skewX: 1.5,
          scale: 0.99,
          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
