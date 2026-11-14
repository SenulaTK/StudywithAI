# Professor Barnaby's 3D Study Desk (StudywithAI)

A tactile 3-panel Intelligent Tutoring System (ITS) built in **Next.js 15+ (App Router, TypeScript, Tailwind CSS, Framer Motion, KaTeX, Dexie IndexedDB, and Google Gemini 2.0 Flash)**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSenulaTK%2FStudywithAI&env=GEMINI_KEY_1,GEMINI_KEY_2,GEMINI_KEY_3)

## Core Architecture

- **3-Key Gemini 2.0 Flash Rotator (`/lib/gemini.ts`)**: Round-robin API key pool (`GEMINI_KEY_1` / `GEMINI_API_KEY`, `GEMINI_KEY_2`, `GEMINI_KEY_3` via Vercel env or browser Desk Locker) with automatic `429`/`500` failover and strict live-AI responses.
- **Professor Barnaby (`/components/barnaby/ProfessorBarnaby.tsx`)**: Tactile paper-craft owl AI tutor with dynamic SVG costumes (*Classic Scholar*, *Lab Coat*, *Focus Sprint*, *Revision Mortarboard*) and a Web Audio API 8-bit chiptune voice synthesizer (`/lib/audio.ts`).
- **Left Panel — Classroom Whiteboard (`/components/roadmap/ChalkboardRoadmap.tsx` & `/components/roadmap/WhiteboardTeachingStage.tsx`)**: Clean blank dry-erase whiteboard featuring an animated Professor Barnaby teaching owl that points through active formulas, notes, and prompts as users create their own notebooks, curriculum tags, topic nodes, mastery badges, daily streaks/XP, and drag-and-drop RAG Backpack file chunks.
- **Middle Panel — Open Workbook Canvas (`/components/workbook/WorkbookCanvas.tsx`)**: Spiral-bound workbook with `Socratic`, `Feynman`, and `Exam Mode` toggles, custom paperclipped KaTeX formula cards, study hints, custom Bloom's Taxonomy checkpoint quizzes, and Socratic AI dialogue.
- **Right Panel — 3D Sticky Note Desk & Graph Pad (`/components/studio/StickyNoteDesk.tsx`)**: User-pinned 3D Post-it flashcards with 180° CSS paper-curl flip animations & SM-2 spaced repetition, a blank custom Function Graph Pad (`y = f(x, a, b)` parsed safely in `/lib/mathParser.ts`), and Cornell Notes persisted locally via Dexie IndexedDB (`/lib/storage/index.ts`) with `.desk` backup/reset support.
