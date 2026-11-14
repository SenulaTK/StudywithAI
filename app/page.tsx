'use client';

import React, { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DeskHeader } from '@/components/header/DeskHeader';
import { ChalkboardRoadmap } from '@/components/roadmap/ChalkboardRoadmap';
import { WorkbookCanvas } from '@/components/workbook/WorkbookCanvas';
import { StickyNoteDesk } from '@/components/studio/StickyNoteDesk';
import {
  PersonaSchoolCurtain,
  PersonaMenuStage,
} from '@/components/transitions/PersonaSchoolTransition';
import {
  useStudyDeskStore,
  type SubjectName,
  type SyllabusBoard,
} from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { storageAdapter } from '@/lib/storage';

const STATION_NAMES = {
  left: 'Chalkboard Roadmap',
  center: 'Open Workbook & Professor Barnaby',
  right: 'Practice & STEM Lab Studio',
} as const;

export default function StudyDeskPage() {
  const {
    cameraPan,
    userXP,
    streakCount,
    currentSubject,
    syllabusBoard,
    roadmapState,
    stickyNotes,
    backpackFiles,
    panToOverview,
    hydrateFromArchive,
  } = useStudyDeskStore();

  const [isHydrated, setIsHydrated] = useState(false);

  // Step 1: Hydrate saved state from Local-First Dexie IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    async function hydrateFromDexie() {
      try {
        const [savedStickies, savedBackpack, savedCornell, savedMeta] =
          await Promise.all([
            storageAdapter.loadStickyNotes(),
            storageAdapter.loadBackpackFiles(),
            storageAdapter.loadCornellNotes(),
            storageAdapter.loadDeskMeta(),
          ]);

        if (!mounted) return;

        const hasSavedData =
          savedStickies.length > 0 ||
          savedBackpack.length > 0 ||
          savedCornell.length > 0 ||
          savedMeta !== null;

        if (hasSavedData) {
          const stateSnapshot = useStudyDeskStore.getState();
          hydrateFromArchive({
            userXP: savedMeta?.userXP ?? stateSnapshot.userXP,
            streakCount: savedMeta?.streakCount ?? stateSnapshot.streakCount,
            currentSubject:
              (savedMeta?.currentSubject as SubjectName) ??
              stateSnapshot.currentSubject,
            syllabusBoard:
              (savedMeta?.syllabusBoard as SyllabusBoard) ??
              stateSnapshot.syllabusBoard,
            topicBadges: savedMeta?.topicBadges,
            stickyNotes:
              savedStickies.length > 0
                ? savedStickies
                : stateSnapshot.stickyNotes,
            backpackFiles:
              savedBackpack.length > 0
                ? savedBackpack
                : stateSnapshot.backpackFiles,
            cornellNotes: savedCornell,
          });
        }
      } catch {
        // Fallback to default in-memory state if IndexedDB is blocked
      } finally {
        if (mounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrateFromDexie();
    return () => {
      mounted = false;
    };
  }, [hydrateFromArchive]);

  // Step 2: Persist updates to Dexie IndexedDB only AFTER initial hydration completes
  useEffect(() => {
    if (!isHydrated) return;
    storageAdapter.saveStickyNotes(stickyNotes).catch(() => {});
  }, [isHydrated, stickyNotes]);

  useEffect(() => {
    if (!isHydrated) return;
    storageAdapter.saveBackpackFiles(backpackFiles).catch(() => {});
  }, [isHydrated, backpackFiles]);

  useEffect(() => {
    if (!isHydrated) return;
    const topicBadges: Record<string, string> = {};
    roadmapState.forEach((n) => {
      topicBadges[n.id] = n.status;
    });
    storageAdapter
      .saveDeskMeta({
        userXP,
        streakCount,
        currentSubject,
        syllabusBoard,
        topicBadges,
      })
      .catch(() => {});
  }, [isHydrated, userXP, streakCount, currentSubject, syllabusBoard, roadmapState]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col justify-between desk-wood-surface selection:bg-[#FDE047]">
        {/* Persona-Style Full-Screen Diagonal School Cut-In Curtain */}
        <PersonaSchoolCurtain />

        {/* Top Tactile Desk Header */}
        <DeskHeader />

        {/* Master 3-Panel Spatial Desk Workspace with Dramatic Persona Stage Transitions */}
        <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-5 py-4 overflow-x-clip">
          <PersonaMenuStage stageKey={cameraPan}>
            {cameraPan === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* LEFT PANEL (3 cols): Chalkboard Scheme of Work Roadmap */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="lg:col-span-3"
                >
                  <ChalkboardRoadmap />
                </motion.div>

                {/* MIDDLE PANEL (5 cols): Open Workbook Canvas + Professor Barnaby */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="lg:col-span-5"
                >
                  <WorkbookCanvas />
                </motion.div>

                {/* RIGHT PANEL (4 cols): 3D Sticky Note Desk & Simulation Studio */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="lg:col-span-4"
                >
                  <StickyNoteDesk />
                </motion.div>
              </div>
            ) : (
              /* Focused Station View (Chalkboard / Workbook / 3D Studio) */
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => {
                      chiptuneAudio.playMenuSlash();
                      panToOverview();
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FDFBF7] hover:bg-[#FDE047] border-2 border-[#1E293B] text-xs font-bold text-[#1E293B] -skew-x-6 shadow-[3px_3px_0px_#1E293B] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 skew-x-6" />
                    <span className="skew-x-6">Back to 3-Panel Desk</span>
                  </button>

                  <span className="px-3 py-1 rounded-lg bg-[#1A2E26] text-[#FDE047] text-xs font-mono font-bold -skew-x-6">
                    <span className="inline-block skew-x-6">
                      Focused: {STATION_NAMES[cameraPan]}
                    </span>
                  </span>
                </div>

                {cameraPan === 'left' && <ChalkboardRoadmap />}
                {cameraPan === 'center' && <WorkbookCanvas />}
                {cameraPan === 'right' && <StickyNoteDesk />}
              </div>
            )}
          </PersonaMenuStage>
        </main>
      </div>
    </MotionConfig>
  );
}
