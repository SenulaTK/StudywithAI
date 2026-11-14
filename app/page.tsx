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
import { useStudyDeskStore } from '@/lib/store';
import { chiptuneAudio } from '@/lib/audio';
import { DESK_SCHEMA_VERSION, storageAdapter } from '@/lib/storage';
import { geminiRotator } from '@/lib/gemini';

const STATION_NAMES = {
  left: 'Chalkboard Roadmap',
  center: 'Open Workbook & Professor Barnaby',
  right: 'Notes & Graph',
} as const;

export default function StudyDeskPage() {
  const {
    cameraPan,
    userXP,
    streakCount,
    lastStudyDate,
    subjects,
    currentSubject,
    syllabusBoard,
    roadmapState,
    activeTopicId,
    workbookDialogues,
    quizCompletedIds,
    selectedAnswers,
    stickyNotes,
    backpackFiles,
    cornellNotes,
    panToOverview,
    setGeminiHasKey,
    hydrateFromArchive,
  } = useStudyDeskStore();

  const [isHydrated, setIsHydrated] = useState(false);

  // Purge legacy pre-production demo DB & hydrate only verified clean-v2 user state
  useEffect(() => {
    let mounted = true;
    async function hydrateWorkspace() {
      try {
        await storageAdapter.purgeLegacyDemoDb();

        const [savedStickies, savedBackpack, savedCornell, savedMeta, keyStatus] =
          await Promise.all([
            storageAdapter.loadStickyNotes(),
            storageAdapter.loadBackpackFiles(),
            storageAdapter.loadCornellNotes(),
            storageAdapter.loadDeskMeta(),
            geminiRotator.fetchServerKeyStatus(),
          ]);

        if (!mounted) return;

        setGeminiHasKey(keyStatus.anyConfigured);

        if (savedMeta && savedMeta.schemaVersion === DESK_SCHEMA_VERSION) {
          hydrateFromArchive({
            userXP: savedMeta.userXP ?? 0,
            streakCount: savedMeta.streakCount ?? 0,
            lastStudyDate: savedMeta.lastStudyDate ?? null,
            currentSubject: savedMeta.currentSubject ?? '',
            syllabusBoard: savedMeta.syllabusBoard ?? '',
            activeTopicId: savedMeta.activeTopicId ?? '',
            subjects: savedMeta.subjects ?? [],
            roadmapState: savedMeta.roadmapState ?? [],
            workbookDialogues: savedMeta.workbookDialogues ?? {},
            quizCompletedIds: savedMeta.quizCompletedIds ?? {},
            selectedAnswers: savedMeta.selectedAnswers ?? {},
            topicBadges: savedMeta.topicBadges,
            stickyNotes: savedStickies,
            backpackFiles: savedBackpack,
            cornellNotes: savedCornell,
          });
        }
      } catch {
        // Fallback to clean empty state if IndexedDB is restricted
      } finally {
        if (mounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrateWorkspace();
    return () => {
      mounted = false;
    };
  }, [hydrateFromArchive, setGeminiHasKey]);

  // Persist user updates to clean IndexedDB after hydration
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
    storageAdapter
      .saveCornellNotes(Object.values(cornellNotes))
      .catch(() => {});
  }, [isHydrated, cornellNotes]);

  useEffect(() => {
    if (!isHydrated) return;
    const topicBadges: Record<string, string> = {};
    roadmapState.forEach((n) => {
      topicBadges[n.id] = n.status;
    });
    storageAdapter
      .saveDeskMeta({
        schemaVersion: DESK_SCHEMA_VERSION,
        userXP,
        streakCount,
        lastStudyDate,
        currentSubject,
        syllabusBoard,
        activeTopicId,
        subjects,
        roadmapState,
        workbookDialogues,
        quizCompletedIds,
        selectedAnswers,
        topicBadges,
      })
      .catch(() => {});
  }, [
    isHydrated,
    userXP,
    streakCount,
    lastStudyDate,
    currentSubject,
    syllabusBoard,
    activeTopicId,
    subjects,
    roadmapState,
    workbookDialogues,
    quizCompletedIds,
    selectedAnswers,
  ]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col justify-between desk-wood-surface selection:bg-[#FDE047]">
        {/* Persona-Style Full-Screen Diagonal School Cut-In Curtain */}
        <PersonaSchoolCurtain />

        {/* Top Tactile Desk Header */}
        <DeskHeader />

        {/* Master 3-Panel Spatial Desk Workspace */}
        <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-5 py-4 overflow-x-clip">
          <PersonaMenuStage stageKey={cameraPan}>
            {cameraPan === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* LEFT PANEL (3 cols): Chalkboard Roadmap */}
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

                {/* RIGHT PANEL (4 cols): 3D Sticky Note Desk & Blank Graph/Cornell Studio */}
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
              /* Focused Station View */
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
