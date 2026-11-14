# Professor Barnaby's 3D Study Desk (StudywithAI)

A tactile 3-panel Intelligent Tutoring System (ITS) built in **Next.js 15+ (App Router, TypeScript, Tailwind CSS, Framer Motion, KaTeX, Dexie IndexedDB, and Google Gemini 2.0 Flash)**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSenulaTK%2FStudywithAI&env=GEMINI_KEY_1,GEMINI_KEY_2,GEMINI_KEY_3)

## Core Architecture

- **3-Key Gemini 2.0 Flash Rotator (`/lib/gemini.ts`)**: Round-robin API key pool (`GEMINI_KEY_1` / `GEMINI_API_KEY`, `GEMINI_KEY_2`, `GEMINI_KEY_3` via Vercel env or browser Desk Locker) with automatic `429`/`500` failover and strict live-AI responses (no simulated fallback).
- **Professor Barnaby (`/components/barnaby/ProfessorBarnaby.tsx`)**: Tactile paper-craft owl AI tutor with dynamic SVG costumes (*Maths*, *Lab Coat*, *Focus Sprint*, *Revision Mortarboard*) and a Web Audio API 8-bit chiptune voice synthesizer (`/lib/audio.ts`).
- **Left Panel — Chalkboard Roadmap (`/components/roadmap/ChalkboardRoadmap.tsx`)**: User-created notebooks & sequential syllabus topic trees (`General`, `AQA`, `Edexcel`, `OCR`, `IB`, `AP`), Crown mastery badges, real daily streak & XP bar, and drag-and-drop RAG Backpack file drawer.
- **Middle Panel — Open Workbook Canvas (`/components/workbook/WorkbookCanvas.tsx`)**: Spiral-bound workbook with `Socratic`, `Feynman`, and `Exam Mode` toggles, custom paperclipped KaTeX formula cards, study hints, custom Bloom's Taxonomy checkpoint quizzes, and optional Gemini topic kit drafting.
- **Right Panel — 3D Sticky Note Desk & Simulation Studio (`/components/studio/StickyNoteDesk.tsx`)**: User-pinned 3D Post-it flashcards with 180° CSS paper-curl flip animations & SM-2 spaced repetition, explicit per-topic HTML5 Canvas STEM simulations, and blank-slate Cornell Notes persisted locally via Dexie IndexedDB (`/lib/storage/index.ts`) with `.desk` backup/reset support.
