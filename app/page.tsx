'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DeskHeader } from '@/components/header/DeskHeader';
import { ChalkboardRoadmap } from '@/components/roadmap/ChalkboardRoadmap';
import { WorkbookCanvas } from '@/components/workbook/WorkbookCanvas';
import { StickyNoteDesk } from '@/components/studio/StickyNoteDesk';
import {
  useStudyDeskStore,
  type SubjectName,
  type SyllabusBoard,
} from '@/lib/store';
import { storageAdapter } from '@/lib/storage';

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
    <div className="min-h-screen flex flex-col justify-between desk-wood-surface selection:bg-[#FDE047]">
      {/* Top Tactile Desk Header */}
      <DeskHeader />

      {/* Master 3-Panel Spatial Desk Workspace with Framer Motion Camera Panning */}
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-5 py-4 overflow-x-hidden">
        {cameraPan === 'overview' ? (
          <motion.div
            key="overview-grid"
            initial={{ opacity: 0.85, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
          >
            {/* LEFT PANEL (3 cols): Chalkboard Scheme of Work Roadmap */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="lg:col-span-3"
            >
              <ChalkboardRoadmap />
            </motion.div>

            {/* MIDDLE PANEL (5 cols): Open Workbook Canvas + Professor Barnaby */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="lg:col-span-5"
            >
              <WorkbookCanvas />
            </motion.div>

            {/* RIGHT PANEL (4 cols): 3D Sticky Note Desk & Simulation Studio */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="lg:col-span-4"
            >
              <StickyNoteDesk />
            </motion.div>
          </motion.div>
        ) : (
          /* Focused Spatial Camera Pan View (panToLeft / panToCenter / panToRight) */
          <motion.div
            key={`focused-${cameraPan}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="max-w-4xl mx-auto"
          >
            {cameraPan === 'left' && <ChalkboardRoadmap />}
            {cameraPan === 'center' && <WorkbookCanvas />}
            {cameraPan === 'right' && <StickyNoteDesk />}
          </motion.div>
        )}
      </main>
    </div>
  );
}
