# Professor Barnaby's 3D Study Desk (StudywithAI)

A tactile 3-panel Intelligent Tutoring System (ITS) built in **Next.js 15+ (App Router, TypeScript, Tailwind CSS, Framer Motion, KaTeX, Dexie IndexedDB, and Google Gemini 2.0 Flash)**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSenulaTK%2FStudywithAI&env=NEXT_PUBLIC_GEMINI_KEY_1,NEXT_PUBLIC_GEMINI_KEY_2,NEXT_PUBLIC_GEMINI_KEY_3)

## Core Architecture

- **3-Key Gemini 2.0 Flash Rotator (`/lib/gemini.ts`)**: Round-robin API key pool (`NEXT_PUBLIC_GEMINI_KEY_1`, `NEXT_PUBLIC_GEMINI_KEY_2`, `NEXT_PUBLIC_GEMINI_KEY_3`) with automatic `429`/`500` failover and deterministic Socratic fallback.
- **Professor Barnaby (`/components/barnaby/ProfessorBarnaby.tsx`)**: Tactile paper-craft owl AI tutor with dynamic SVG costumes (*Maths*, *Lab Coat*, *Focus Sprint*, *Revision Mortarboard*) and a Web Audio API 8-bit chiptune voice synthesizer (`/lib/audio.ts`).
- **Left Panel — Chalkboard Roadmap (`/components/roadmap/ChalkboardRoadmap.tsx`)**: Sequential syllabus skill tree (`AQA`, `Edexcel`, `OCR`, `IB`), Crown badges, daily streak & XP bar, and drag-and-drop RAG Backpack file drawer.
- **Middle Panel — Open Workbook Canvas (`/components/workbook/WorkbookCanvas.tsx`)**: Spiral-bound workbook with `Socratic Guide`, `Feynman Self-Explanation`, and `Exam Practice` toggles, paperclipped KaTeX formula cards, collapsible hints, and Bloom's Taxonomy diagnostic quizzes.
- **Right Panel — 3D Sticky Note Desk & Simulation Studio (`/components/studio/StickyNoteDesk.tsx`)**: Tilted 3D Post-it notes with 180° CSS paper-curl flip animations, live 60fps HTML5 Canvas STEM simulations with brass/wooden sliders, and Cornell Notes persisted via Dexie IndexedDB (`/lib/storage/index.ts`).
