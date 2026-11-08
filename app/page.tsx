'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DeskHeader } from '@/components/header/DeskHeader';
import { ChalkboardRoadmap } from '@/components/roadmap/ChalkboardRoadmap';
import { WorkbookCanvas } from '@/components/workbook/WorkbookCanvas';
import { StickyNoteDesk } from '@/components/studio/StickyNoteDesk';
import { useStudyDeskStore } from '@/lib/store';
import { storageAdapter } from '@/lib/storage';

export default function StudyDeskPage() {
  const { cameraPan, stickyNotes, backpackFiles } = useStudyDeskStore();

  // Persist initial or updated state to Local-First Dexie IndexedDB & WebOPFS
  useEffect(() => {
    storageAdapter.saveStickyNotes(stickyNotes).catch(() => {});
    storageAdapter.saveBackpackFiles(backpackFiles).catch(() => {});
  }, [stickyNotes, backpackFiles]);

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
