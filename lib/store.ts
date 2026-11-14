'use client';

import { create } from 'zustand';
import type { LabModelId, TopicKitResponse } from './gemini';
import type {
  StoredBackpackFile,
  StoredCornellNote,
  StoredDiagnosticQuestion,
  StoredDialogueTurn,
  StoredNotebookSubject,
  StoredRoadmapTopicNode,
  StoredStickyNote,
} from './storage';

export type SubjectName = string;
export type SyllabusBoard =
  | 'General'
  | 'AQA'
  | 'Edexcel'
  | 'OCR'
  | 'IB'
  | 'AP';
export type BadgeStatus =
  | 'LOCKED'
  | 'UNLOCKED'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'DIAMOND';

export type ActiveCallState =
  | 'IDLE'
  | 'FOCUS_SPRINT'
  | 'REVISION_TEST';

export type CameraPanTarget = 'overview' | 'left' | 'center' | 'right';
export type WorkbookTab = 'lesson' | 'dialogue' | 'quiz';
export type StudioTab = 'stickies' | 'simulation' | 'cornell';

export type TransitionTheme = 'chalk' | 'sunshine' | 'crimson' | 'mint';

export interface TransitionBannerState {
  id: number;
  kicker: string;
  title: string;
  theme: TransitionTheme;
}

export type NotebookSubject = StoredNotebookSubject;
export type DiagnosticQuestion = StoredDiagnosticQuestion;
export type RoadmapTopicNode = StoredRoadmapTopicNode;
export type WorkbookDialogueTurn = StoredDialogueTurn;

export const LAB_MODEL_OPTIONS: Array<{
  id: Exclude<LabModelId, ''>;
  category: string;
  title: string;
  sliderA: string;
  sliderB: string;
}> = [
  {
    id: 'math-secant',
    category: 'Mathematics',
    title: 'Secant-to-Tangent Limit Explorer',
    sliderA: 'Secant Step h (Δx → 0)',
    sliderB: 'Base Point Coordinate x₀',
  },
  {
    id: 'math-cubic',
    category: 'Mathematics',
    title: 'Cubic Stationary & Inflection Curvature',
    sliderA: 'Probe Coordinate x₀',
    sliderB: 'Cubic Steepness Parameter k',
  },
  {
    id: 'math-riemann',
    category: 'Mathematics',
    title: 'Riemann Integration Area Accumulator',
    sliderA: 'Upper Bound b (∫₀ᵇ x·eˣ dx)',
    sliderB: 'Riemann Sub-Intervals N',
  },
  {
    id: 'math-ode',
    category: 'Mathematics',
    title: 'Separable ODE Phase & Decay Field',
    sliderA: 'Decay Constant k (dy/dt = -ky)',
    sliderB: 'Initial Condition Amplitude y(0)',
  },
  {
    id: 'phys-projectile',
    category: 'Physics',
    title: 'Ballistic Parabolic Trajectory',
    sliderA: 'Launch Angle θ (15° → 80°)',
    sliderB: 'Initial Launch Velocity v₀ (m/s)',
  },
  {
    id: 'phys-shm',
    category: 'Physics',
    title: 'Simple Harmonic Oscillator & Damping',
    sliderA: 'Angular Frequency ω (rad/s)',
    sliderB: 'Damping Ratio ζ (Light → Heavy)',
  },
  {
    id: 'phys-orbit',
    category: 'Physics',
    title: 'Gravitational Equipotential & Orbit',
    sliderA: 'Orbital Radius r / R₀',
    sliderB: 'Central Mass M (×10²⁴ kg)',
  },
  {
    id: 'chem-lechatelier',
    category: 'Chemistry',
    title: 'Le Chatelier Dynamic Equilibrium Shift',
    sliderA: 'System Pressure Perturbation P',
    sliderB: 'Forward Rate Constant k_f',
  },
  {
    id: 'chem-boltzmann',
    category: 'Chemistry',
    title: 'Maxwell-Boltzmann & Catalyst Barrier',
    sliderA: 'Temperature T (Kelvin)',
    sliderB: 'Activation Barrier E_a',
  },
];

let storeSeq = 0;
function nextId(prefix: string): string {
  storeSeq += 1;
  return `${prefix}-${Date.now()}-${storeSeq}`;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeNextStreak(
  lastDate: string | null,
  currentStreak: number
): { streakCount: number; lastStudyDate: string } {
  const today = getTodayIsoDate();
  if (lastDate === today) {
    return {
      streakCount: Math.max(1, currentStreak),
      lastStudyDate: today,
    };
  }
  if (lastDate) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      return { streakCount: currentStreak + 1, lastStudyDate: today };
    }
  }
  return { streakCount: 1, lastStudyDate: today };
}

interface StudyDeskStore {
  subjects: NotebookSubject[];
  currentSubject: SubjectName;
  syllabusBoard: SyllabusBoard;
  roadmapState: RoadmapTopicNode[];
  activeTopicId: string;
  userXP: number;
  streakCount: number;
  lastStudyDate: string | null;
  activeCallState: ActiveCallState;
  cameraPan: CameraPanTarget;
  workbookTab: WorkbookTab;
  studioTab: StudioTab;
  tutorMode: 'socratic' | 'feynman' | 'exam';
  audioMuted: boolean;
  geminiHasKey: boolean | null;
  transitionBanner: TransitionBannerState | null;
  stickyNotes: StoredStickyNote[];
  backpackFiles: StoredBackpackFile[];
  cornellNotes: Record<string, StoredCornellNote>;
  workbookDialogues: Record<string, WorkbookDialogueTurn[]>;
  quizCompletedIds: Record<string, boolean>;
  selectedAnswers: Record<string, number>;

  // Actions
  setGeminiHasKey: (ready: boolean) => void;
  createNotebook: (name: string, board: SyllabusBoard) => void;
  deleteNotebook: (name: string) => void;
  setSubject: (subject: SubjectName) => void;
  setSyllabusBoard: (board: SyllabusBoard) => void;
  addTopic: (params: {
    subject: string;
    code: string;
    title: string;
    subtitle: string;
    labModel?: LabModelId;
  }) => void;
  deleteTopic: (topicId: string) => void;
  setActiveTopic: (topicId: string) => void;
  updateTopicFormula: (
    topicId: string,
    latexFormula: string,
    latexCaption: string
  ) => void;
  addTopicHint: (topicId: string, hint: string) => void;
  removeTopicHint: (topicId: string, index: number) => void;
  addTopicQuestion: (topicId: string, question: DiagnosticQuestion) => void;
  setTopicLabModel: (topicId: string, labModel: LabModelId) => void;
  applyBarnabyTopicKit: (topicId: string, kit: TopicKitResponse) => void;
  recordQuizAnswer: (
    questionId: string,
    topicId: string,
    optionIdx: number,
    correctIndex: number,
    xpReward: number
  ) => void;
  setTutorMode: (mode: 'socratic' | 'feynman' | 'exam') => void;
  setWorkbookTab: (tab: WorkbookTab) => void;
  setStudioTab: (tab: StudioTab) => void;
  setActiveCallState: (state: ActiveCallState) => void;
  panToLeft: () => void;
  panToCenter: () => void;
  panToRight: () => void;
  panToOverview: () => void;
  triggerTransition: (
    kicker: string,
    title: string,
    theme: TransitionTheme
  ) => void;
  clearTransition: () => void;
  setAudioMuted: (muted: boolean) => void;
  awardXP: (amount: number) => void;
  unlockOrPromoteTopic: (topicId: string, nextBadge?: BadgeStatus) => void;
  appendDialogueTurn: (topicId: string, turn: WorkbookDialogueTurn) => void;
  addStickyNote: (note: Omit<StoredStickyNote, 'id' | 'updatedAt'>) => void;
  updateStickyMastery: (
    id: string,
    status: StoredStickyNote['masteryStatus']
  ) => void;
  deleteStickyNote: (id: string) => void;
  addBackpackFile: (file: StoredBackpackFile) => void;
  removeBackpackFile: (id: string) => void;
  saveCornellForTopic: (
    topicId: string,
    cues: string,
    notes: string,
    summary: string
  ) => void;
  resetAllData: () => void;
  hydrateFromArchive: (data: {
    userXP: number;
    streakCount: number;
    lastStudyDate?: string | null;
    currentSubject: SubjectName;
    syllabusBoard: SyllabusBoard;
    activeTopicId?: string;
    subjects?: NotebookSubject[];
    roadmapState?: RoadmapTopicNode[];
    workbookDialogues?: Record<string, WorkbookDialogueTurn[]>;
    quizCompletedIds?: Record<string, boolean>;
    selectedAnswers?: Record<string, number>;
    topicBadges?: Record<string, string>;
    stickyNotes: StoredStickyNote[];
    backpackFiles: StoredBackpackFile[];
    cornellNotes?: StoredCornellNote[];
  }) => void;
}

export const useStudyDeskStore = create<StudyDeskStore>((set, get) => ({
  subjects: [],
  currentSubject: '',
  syllabusBoard: 'General',
  roadmapState: [],
  activeTopicId: '',
  userXP: 0,
  streakCount: 0,
  lastStudyDate: null,
  activeCallState: 'IDLE',
  cameraPan: 'overview',
  workbookTab: 'lesson',
  studioTab: 'stickies',
  tutorMode: 'socratic',
  audioMuted: false,
  geminiHasKey: null,
  transitionBanner: null,
  stickyNotes: [],
  backpackFiles: [],
  cornellNotes: {},
  workbookDialogues: {},
  quizCompletedIds: {},
  selectedAnswers: {},

  setGeminiHasKey: (ready) => set({ geminiHasKey: ready }),

  triggerTransition: (kicker, title, theme) =>
    set({
      transitionBanner: {
        id: Date.now(),
        kicker,
        title,
        theme,
      },
    }),

  clearTransition: () => set({ transitionBanner: null }),

  createNotebook: (rawName, board) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;

    const existing = get().subjects.find(
      (s) => s.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      get().setSubject(existing.name);
      return;
    }

    const newSubject: NotebookSubject = {
      id: nextId('subj'),
      name: cleanName,
      syllabusBoard: board,
      createdAt: Date.now(),
    };

    const streak = computeNextStreak(get().lastStudyDate, get().streakCount);

    set((state) => ({
      subjects: [...state.subjects, newSubject],
      currentSubject: newSubject.name,
      syllabusBoard: board,
      activeTopicId: '',
      streakCount: streak.streakCount,
      lastStudyDate: streak.lastStudyDate,
      transitionBanner: {
        id: Date.now(),
        kicker: `NEW NOTEBOOK // ${board}`,
        title: newSubject.name.toUpperCase(),
        theme: 'sunshine',
      },
    }));
  },

  deleteNotebook: (name) =>
    set((state) => {
      const remainingSubjects = state.subjects.filter((s) => s.name !== name);
      const removedTopicIds = new Set(
        state.roadmapState
          .filter((t) => t.subject === name)
          .map((t) => t.id)
      );
      const remainingTopics = state.roadmapState.filter(
        (t) => t.subject !== name
      );
      const remainingStickies = state.stickyNotes.filter(
        (n) => n.subject !== name
      );
      const remainingBackpack = state.backpackFiles.filter(
        (f) => f.subject !== name
      );

      const nextCornell: Record<string, StoredCornellNote> = {};
      for (const [k, v] of Object.entries(state.cornellNotes)) {
        if (!removedTopicIds.has(k) && v.subject !== name) {
          nextCornell[k] = v;
        }
      }

      const nextDialogues: Record<string, WorkbookDialogueTurn[]> = {};
      for (const [k, v] of Object.entries(state.workbookDialogues)) {
        if (!removedTopicIds.has(k)) {
          nextDialogues[k] = v;
        }
      }

      const nextSubject =
        state.currentSubject === name
          ? remainingSubjects[0]?.name || ''
          : state.currentSubject;
      const nextBoard =
        remainingSubjects.find((s) => s.name === nextSubject)?.syllabusBoard ||
        'General';
      const nextTopic =
        remainingTopics.find((t) => t.subject === nextSubject)?.id || '';

      return {
        subjects: remainingSubjects,
        currentSubject: nextSubject,
        syllabusBoard: nextBoard as SyllabusBoard,
        roadmapState: remainingTopics,
        activeTopicId:
          state.currentSubject === name ? nextTopic : state.activeTopicId,
        stickyNotes: remainingStickies,
        backpackFiles: remainingBackpack,
        cornellNotes: nextCornell,
        workbookDialogues: nextDialogues,
      };
    }),

  setSubject: (subject) => {
    const subjRecord = get().subjects.find((s) => s.name === subject);
    if (!subjRecord) return;
    const matchingTopics = get().roadmapState.filter(
      (t) => t.subject === subject
    );
    const firstTopic =
      matchingTopics.find((t) => t.status !== 'LOCKED') || matchingTopics[0];
    const themes: TransitionTheme[] = ['sunshine', 'mint', 'chalk'];
    const idx = get().subjects.findIndex((s) => s.name === subject);
    const chosenTheme = themes[Math.max(0, idx) % themes.length];
    set({
      currentSubject: subject,
      syllabusBoard: (subjRecord.syllabusBoard as SyllabusBoard) || 'General',
      activeTopicId: firstTopic ? firstTopic.id : '',
      transitionBanner: {
        id: Date.now(),
        kicker: `SUBJECT PERIOD // ${subjRecord.syllabusBoard}`,
        title: subject.toUpperCase(),
        theme: chosenTheme,
      },
    });
  },

  setSyllabusBoard: (board) =>
    set((state) => ({
      syllabusBoard: board,
      subjects: state.subjects.map((s) =>
        s.name === state.currentSubject ? { ...s, syllabusBoard: board } : s
      ),
    })),

  addTopic: ({ subject, code, title, subtitle, labModel }) =>
    set((state) => {
      const cleanTitle = title.trim();
      if (!cleanTitle || !subject) return state;

      const existingCount = state.roadmapState.filter(
        (t) => t.subject === subject
      ).length;
      const resolvedCode =
        code.trim() || `T${existingCount + 1}`;
      const newTopic: RoadmapTopicNode = {
        id: nextId('topic'),
        code: resolvedCode.toUpperCase(),
        title: cleanTitle,
        subtitle: subtitle.trim() || `${subject} study module`,
        subject,
        status: 'UNLOCKED',
        coreLatex: '',
        coreLatexCaption: '',
        initialBarnabyGreeting: '',
        initialSocraticQuestion: '',
        initialHints: [],
        diagnosticQuestions: [],
        labModel: labModel || '',
      };

      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);

      return {
        roadmapState: [...state.roadmapState, newTopic],
        activeTopicId: newTopic.id,
        workbookTab: 'lesson',
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  deleteTopic: (topicId) =>
    set((state) => {
      const target = state.roadmapState.find((t) => t.id === topicId);
      const remaining = state.roadmapState.filter((t) => t.id !== topicId);
      const nextActive =
        state.activeTopicId === topicId
          ? remaining.find((t) => t.subject === target?.subject)?.id || ''
          : state.activeTopicId;

      const nextCornell = { ...state.cornellNotes };
      delete nextCornell[topicId];

      const nextDialogues = { ...state.workbookDialogues };
      delete nextDialogues[topicId];

      return {
        roadmapState: remaining,
        activeTopicId: nextActive,
        stickyNotes: state.stickyNotes.filter((n) => n.topicId !== topicId),
        cornellNotes: nextCornell,
        workbookDialogues: nextDialogues,
      };
    }),

  setActiveTopic: (topicId) => {
    const node = get().roadmapState.find((n) => n.id === topicId);
    if (!node || node.status === 'LOCKED') return;
    set({ activeTopicId: topicId });
  },

  updateTopicFormula: (topicId, latexFormula, latexCaption) =>
    set((state) => ({
      roadmapState: state.roadmapState.map((t) =>
        t.id === topicId
          ? {
              ...t,
              coreLatex: latexFormula.trim(),
              coreLatexCaption: latexCaption.trim() || 'Key Equation',
            }
          : t
      ),
    })),

  addTopicHint: (topicId, hint) =>
    set((state) => {
      const clean = hint.trim();
      if (!clean) return state;
      return {
        roadmapState: state.roadmapState.map((t) =>
          t.id === topicId
            ? { ...t, initialHints: [...t.initialHints, clean] }
            : t
        ),
      };
    }),

  removeTopicHint: (topicId, index) =>
    set((state) => ({
      roadmapState: state.roadmapState.map((t) =>
        t.id === topicId
          ? {
              ...t,
              initialHints: t.initialHints.filter((_, idx) => idx !== index),
            }
          : t
      ),
    })),

  addTopicQuestion: (topicId, question) =>
    set((state) => ({
      roadmapState: state.roadmapState.map((t) =>
        t.id === topicId
          ? {
              ...t,
              diagnosticQuestions: [...t.diagnosticQuestions, question],
            }
          : t
      ),
    })),

  setTopicLabModel: (topicId, labModel) =>
    set((state) => ({
      roadmapState: state.roadmapState.map((t) =>
        t.id === topicId ? { ...t, labModel } : t
      ),
    })),

  applyBarnabyTopicKit: (topicId, kit) =>
    set((state) => {
      const hasValidQuestion =
        kit.diagnosticQuestion &&
        kit.diagnosticQuestion.question &&
        kit.diagnosticQuestion.options.length >= 2;

      return {
        roadmapState: state.roadmapState.map((t) => {
          if (t.id !== topicId) return t;
          const nextQuestions = hasValidQuestion
            ? [
                ...t.diagnosticQuestions,
                {
                  id: nextId('q'),
                  bloomsLevel: kit.diagnosticQuestion.bloomsLevel,
                  question: kit.diagnosticQuestion.question,
                  formulaLatex: kit.diagnosticQuestion.formulaLatex,
                  options: kit.diagnosticQuestion.options,
                  correctIndex: kit.diagnosticQuestion.correctIndex,
                  socraticExplanation:
                    kit.diagnosticQuestion.socraticExplanation,
                  xpReward: kit.diagnosticQuestion.xpReward || 75,
                },
              ]
            : t.diagnosticQuestions;

          return {
            ...t,
            initialBarnabyGreeting: kit.greeting || t.initialBarnabyGreeting,
            initialSocraticQuestion:
              kit.socraticQuestion || t.initialSocraticQuestion,
            coreLatex: kit.latexFormula || t.coreLatex,
            coreLatexCaption:
              kit.latexCaption ||
              (kit.latexFormula ? 'Topic Formula Anchor' : t.coreLatexCaption),
            initialHints:
              kit.hintSteps.length > 0 ? kit.hintSteps : t.initialHints,
            labModel: kit.suggestedLabModel || t.labModel || '',
            diagnosticQuestions: nextQuestions,
          };
        }),
      };
    }),

  recordQuizAnswer: (questionId, topicId, optionIdx, correctIndex, xpReward) => {
    const state = get();
    const alreadyCompleted = Boolean(state.quizCompletedIds[questionId]);
    const isCorrect = optionIdx === correctIndex;

    const nextSelected = {
      ...state.selectedAnswers,
      [questionId]: optionIdx,
    };

    if (isCorrect && !alreadyCompleted) {
      const nextCompleted = {
        ...state.quizCompletedIds,
        [questionId]: true,
      };
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);

      set({
        selectedAnswers: nextSelected,
        quizCompletedIds: nextCompleted,
        userXP: state.userXP + xpReward,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      });

      const node = get().roadmapState.find((t) => t.id === topicId);
      if (
        node &&
        node.diagnosticQuestions.length > 0 &&
        node.diagnosticQuestions.every((q) => nextCompleted[q.id])
      ) {
        get().unlockOrPromoteTopic(topicId);
      }
    } else {
      set({ selectedAnswers: nextSelected });
    }
  },

  setTutorMode: (mode) => set({ tutorMode: mode }),
  setWorkbookTab: (tab) => set({ workbookTab: tab }),
  setStudioTab: (tab) => set({ studioTab: tab }),
  setActiveCallState: (state) => set({ activeCallState: state }),

  panToLeft: () =>
    set({
      cameraPan: 'left',
      transitionBanner: {
        id: Date.now(),
        kicker: 'CLASSROOM STATION 02',
        title: 'CHALKBOARD ROADMAP',
        theme: 'chalk',
      },
    }),
  panToCenter: () =>
    set({
      cameraPan: 'center',
      transitionBanner: {
        id: Date.now(),
        kicker: 'CLASSROOM STATION 03',
        title: 'OPEN WORKBOOK',
        theme: 'crimson',
      },
    }),
  panToRight: () =>
    set({
      cameraPan: 'right',
      transitionBanner: {
        id: Date.now(),
        kicker: 'CLASSROOM STATION 04',
        title: 'LAB & RECALL STUDIO',
        theme: 'sunshine',
      },
    }),
  panToOverview: () =>
    set({
      cameraPan: 'overview',
      transitionBanner: {
        id: Date.now(),
        kicker: 'CLASSROOM STATION 01',
        title: 'FULL STUDY DESK',
        theme: 'mint',
      },
    }),

  setAudioMuted: (muted) => set({ audioMuted: muted }),

  awardXP: (amount) =>
    set((state) => {
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);
      return {
        userXP: state.userXP + amount,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  unlockOrPromoteTopic: (topicId, nextBadge) =>
    set((state) => {
      const order: BadgeStatus[] = [
        'LOCKED',
        'UNLOCKED',
        'BRONZE',
        'SILVER',
        'GOLD',
        'DIAMOND',
      ];
      const updated = state.roadmapState.map((node) => {
        if (node.id !== topicId) return node;
        if (nextBadge) return { ...node, status: nextBadge, weakPoint: false };
        const idx = order.indexOf(node.status);
        const promoted =
          idx < order.length - 1 ? order[Math.max(2, idx + 1)] : 'DIAMOND';
        return { ...node, status: promoted, weakPoint: false };
      });

      const currentNode = state.roadmapState.find((n) => n.id === topicId);
      if (currentNode) {
        const subjectNodes = updated.filter(
          (n) => n.subject === currentNode.subject
        );
        const currentIdx = subjectNodes.findIndex((n) => n.id === topicId);
        const nextNode = subjectNodes[currentIdx + 1];
        if (nextNode && nextNode.status === 'LOCKED') {
          const globalIdx = updated.findIndex((n) => n.id === nextNode.id);
          if (globalIdx !== -1) {
            updated[globalIdx] = {
              ...updated[globalIdx],
              status: 'UNLOCKED',
            };
          }
        }
      }

      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);

      return {
        roadmapState: updated,
        userXP: state.userXP + 120,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  appendDialogueTurn: (topicId, turn) =>
    set((state) => {
      const existing = state.workbookDialogues[topicId] || [];
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);
      return {
        workbookDialogues: {
          ...state.workbookDialogues,
          [topicId]: [...existing, turn],
        },
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  addStickyNote: (note) =>
    set((state) => {
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);
      return {
        stickyNotes: [
          {
            ...note,
            id: nextId('sticky'),
            intervalDays: 1,
            easeFactor: 2.5,
            nextReviewAt: Date.now() + 86_400_000,
            updatedAt: Date.now(),
          },
          ...state.stickyNotes,
        ],
        userXP: state.userXP + 25,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  updateStickyMastery: (id, status) =>
    set((state) => {
      const now = Date.now();
      let targetTopicId = '';

      const updatedStickies = state.stickyNotes.map((n) => {
        if (n.id !== id) return n;
        targetTopicId = n.topicId;
        const prevInterval = n.intervalDays || 1;
        const prevEase = n.easeFactor || 2.5;

        const nextEase =
          status === 'MASTERED'
            ? Math.min(3.0, prevEase + 0.15)
            : status === 'WEAK_POINT'
              ? Math.max(1.3, prevEase - 0.3)
              : prevEase;

        const nextInterval =
          status === 'MASTERED'
            ? Math.round(prevInterval * nextEase)
            : status === 'SPACED_DUE'
              ? 2
              : 1;

        return {
          ...n,
          masteryStatus: status,
          intervalDays: nextInterval,
          easeFactor: Number(nextEase.toFixed(2)),
          nextReviewAt: now + nextInterval * 86_400_000,
          updatedAt: now,
        };
      });

      const updatedRoadmap = state.roadmapState.map((node) => {
        if (node.id !== targetTopicId) return node;
        const topicNotes = updatedStickies.filter(
          (s) => s.topicId === node.id
        );
        const hasWeak = topicNotes.some(
          (s) => s.masteryStatus === 'WEAK_POINT'
        );
        const hasDue = topicNotes.some(
          (s) => s.masteryStatus === 'SPACED_DUE'
        );
        return {
          ...node,
          weakPoint: hasWeak,
          spacedDue: hasDue,
        };
      });

      return {
        stickyNotes: updatedStickies,
        roadmapState: updatedRoadmap,
        userXP: status === 'MASTERED' ? state.userXP + 15 : state.userXP,
      };
    }),

  deleteStickyNote: (id) =>
    set((state) => ({
      stickyNotes: state.stickyNotes.filter((s) => s.id !== id),
    })),

  addBackpackFile: (file) =>
    set((state) => {
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);
      return {
        backpackFiles: [file, ...state.backpackFiles],
        userXP: state.userXP + 40,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  removeBackpackFile: (id) =>
    set((state) => ({
      backpackFiles: state.backpackFiles.filter((f) => f.id !== id),
    })),

  saveCornellForTopic: (topicId, cues, notes, summary) =>
    set((state) => {
      const alreadySaved = Boolean(state.cornellNotes[topicId]);
      const streak = computeNextStreak(state.lastStudyDate, state.streakCount);
      return {
        cornellNotes: {
          ...state.cornellNotes,
          [topicId]: {
            id: `cornell-${topicId}`,
            subject: state.currentSubject,
            topicId,
            cues,
            notes,
            summary,
            updatedAt: Date.now(),
          },
        },
        userXP: alreadySaved ? state.userXP : state.userXP + 20,
        streakCount: streak.streakCount,
        lastStudyDate: streak.lastStudyDate,
      };
    }),

  resetAllData: () =>
    set({
      subjects: [],
      currentSubject: '',
      syllabusBoard: 'General',
      roadmapState: [],
      activeTopicId: '',
      userXP: 0,
      streakCount: 0,
      lastStudyDate: null,
      activeCallState: 'IDLE',
      cameraPan: 'overview',
      workbookTab: 'lesson',
      studioTab: 'stickies',
      tutorMode: 'socratic',
      stickyNotes: [],
      backpackFiles: [],
      cornellNotes: {},
      workbookDialogues: {},
      quizCompletedIds: {},
      selectedAnswers: {},
      transitionBanner: {
        id: Date.now(),
        kicker: 'DESK CLEARED',
        title: 'FRESH START',
        theme: 'chalk',
      },
    }),

  hydrateFromArchive: (data) =>
    set(() => {
      const restoredSubjects = Array.isArray(data.subjects)
        ? data.subjects
        : [];
      const rawRoadmap = Array.isArray(data.roadmapState)
        ? data.roadmapState
        : [];
      const updatedRoadmap = data.topicBadges
        ? rawRoadmap.map((n) => {
            const savedBadge = data.topicBadges?.[n.id] as
              | BadgeStatus
              | undefined;
            return savedBadge ? { ...n, status: savedBadge } : n;
          })
        : rawRoadmap;

      const nextCornell: Record<string, StoredCornellNote> = {};
      if (Array.isArray(data.cornellNotes)) {
        for (const cn of data.cornellNotes) {
          nextCornell[cn.topicId] = cn;
        }
      }

      return {
        userXP: data.userXP || 0,
        streakCount: data.streakCount || 0,
        lastStudyDate: data.lastStudyDate ?? null,
        subjects: restoredSubjects,
        currentSubject:
          data.currentSubject || restoredSubjects[0]?.name || '',
        syllabusBoard: (data.syllabusBoard as SyllabusBoard) || 'General',
        roadmapState: updatedRoadmap,
        activeTopicId:
          data.activeTopicId ||
          updatedRoadmap.find((n) => n.subject === data.currentSubject)?.id ||
          updatedRoadmap[0]?.id ||
          '',
        stickyNotes: Array.isArray(data.stickyNotes) ? data.stickyNotes : [],
        backpackFiles: Array.isArray(data.backpackFiles)
          ? data.backpackFiles
          : [],
        cornellNotes: nextCornell,
        workbookDialogues: data.workbookDialogues || {},
        quizCompletedIds: data.quizCompletedIds || {},
        selectedAnswers: data.selectedAnswers || {},
      };
    }),
}));
