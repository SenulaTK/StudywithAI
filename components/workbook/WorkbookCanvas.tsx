'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BlockMath } from 'react-katex';
import {
  Paperclip,
  Send,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  Compass,
  MessageSquareQuote,
  ClipboardCheck,
  Award,
  Unlock,
  BookOpenText,
  MessagesSquare,
  Plus,
  KeyRound,
  AlertTriangle,
  Trash2,
  Mic,
  MicOff,
  Timer,
  StickyNote,
  Wand2,
} from 'lucide-react';
import { useStudyDeskStore, type WorkbookTab } from '@/lib/store';
import {
  geminiRotator,
  GeminiConfigError,
  type BloomsLevel,
  type TutorMode,
} from '@/lib/gemini';
import { askBarnabyLocal } from '@/lib/localModel';
import { generatePracticeQuestionForTopic } from '@/lib/syllabusGenerator';
import { chiptuneAudio } from '@/lib/audio';
import { ProfessorBarnaby } from '@/components/barnaby/ProfessorBarnaby';
import { PersonaMenuStage } from '@/components/transitions/PersonaSchoolTransition';
import { RichAcademicText } from '@/components/common/RichAcademicText';

let workbookSeq = 0;
function nextWorkbookSeq() {
  workbookSeq += 1;
  return workbookSeq;
}

const MODE_OPTIONS: Array<{
  id: TutorMode;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'socratic',
    label: 'Socratic',
    subtitle: 'Guided first-principles questioning',
    icon: Compass,
  },
  {
    id: 'feynman',
    label: 'Feynman',
    subtitle: 'Teach Barnaby in plain language',
    icon: MessageSquareQuote,
  },
  {
    id: 'exam',
    label: 'Exam Mode',
    subtitle: 'Mark-scheme precision & checkpoints',
    icon: ClipboardCheck,
  },
];

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  Remember: 'bg-slate-200 text-slate-800 border-slate-300',
  Understand: 'bg-sky-100 text-sky-900 border-sky-300',
  Apply: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Analyze: 'bg-amber-100 text-amber-900 border-amber-300',
  Evaluate: 'bg-orange-100 text-orange-950 border-orange-300',
  Create: 'bg-rose-100 text-rose-900 border-rose-300',
};

export function WorkbookCanvas() {
  const {
    currentSubject,
    syllabusBoard,
    roadmapState,
    activeTopicId,
    tutorMode,
    workbookTab,
    geminiHasKey,
    aiEngineMode,
    localModelId,
    localModelStatus,
    localModelProgress,
    localModelProgressText,
    backpackFiles,
    workbookDialogues,
    quizCompletedIds,
    selectedAnswers,
    setTutorMode,
    setWorkbookTab,
    setActiveCallState,
    setGeminiHasKey,
    setAiEngineMode,
    setLocalModelState,
    updateTopicFormula,
    addTopicHint,
    removeTopicHint,
    addTopicQuestion,
    syncTopicWithBarnabyResponse,
    recordQuizAnswer,
    appendDialogueTurn,
    addStickyNote,
    awardXP,
  } = useStudyDeskStore();

  const activeNode =
    roadmapState.find((n) => n.id === activeTopicId) || null;

  // Prompting & Gemini API state
  const [studentInput, setStudentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [quickKeyInput, setQuickKeyInput] = useState('');
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  // Timed Exam Simulator state
  const [examModeActive, setExamModeActive] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examSecondsLeft, setExamSecondsLeft] = useState(180);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [pinnedQuestionIds, setPinnedQuestionIds] = useState<
    Record<string, boolean>
  >({});

  // Hints & formula inline editor state
  const [hintsProgress, setHintsProgress] = useState<{
    topicId: string;
    count: number;
  }>({ topicId: '', count: 1 });
  const [hintsExpanded, setHintsExpanded] = useState(true);
  const [formulaEditorTopicId, setFormulaEditorTopicId] = useState<string | null>(
    null
  );
  const [latexInput, setLatexInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [addHintTopicId, setAddHintTopicId] = useState<string | null>(null);
  const [newHintInput, setNewHintInput] = useState('');

  // Custom quiz question builder state
  const [quizBuilderTopicId, setQuizBuilderTopicId] = useState<string | null>(
    null
  );
  const [qPrompt, setQPrompt] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [qBlooms, setQBlooms] = useState<BloomsLevel>('Understand');

  const [speechOverride, setSpeechOverride] = useState<{
    topicId: string;
    reply: string;
    socraticFollowUp: string;
    bloomsLevel: BloomsLevel;
    latexFormula?: string;
    latexCaption?: string;
    hintSteps?: string[];
    keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3' | 'LOCAL_WEBGPU';
    trigger: number;
  } | null>(null);

  // Timed Exam Countdown Timer
  useEffect(() => {
    if (!examModeActive || examSubmitted) return;
    const timer = setInterval(() => {
      setExamSecondsLeft((prev) => {
        if (prev <= 1) {
          setExamSubmitted(true);
          chiptuneAudio.playSchoolBellChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examModeActive, examSubmitted]);

  const topicId = activeNode?.id || '';
  const showFormulaEditor = Boolean(topicId && formulaEditorTopicId === topicId);
  const showAddHint = Boolean(topicId && addHintTopicId === topicId);
  const showQuizBuilder = Boolean(topicId && quizBuilderTopicId === topicId);

  const latestBarnabySpeech =
    speechOverride && speechOverride.topicId === topicId
      ? speechOverride
      : null;

  const topicHistory = topicId ? workbookDialogues[topicId] || [] : [];
  const lastBarnabyTurn = [...topicHistory]
    .reverse()
    .find((t) => t.role === 'barnaby');

  const currentSpeech =
    latestBarnabySpeech?.reply ||
    lastBarnabyTurn?.text ||
    activeNode?.initialBarnabyGreeting ||
    '';
  const currentFollowUp =
    latestBarnabySpeech?.socraticFollowUp ||
    lastBarnabyTurn?.socraticFollowUp ||
    activeNode?.initialSocraticQuestion ||
    '';
  const currentLatex =
    latestBarnabySpeech?.latexFormula ||
    activeNode?.coreLatex ||
    '';
  const currentLatexCaption =
    latestBarnabySpeech?.latexCaption ||
    activeNode?.coreLatexCaption ||
    '';
  const currentHints =
    latestBarnabySpeech?.hintSteps && latestBarnabySpeech.hintSteps.length > 0
      ? latestBarnabySpeech.hintSteps
      : activeNode?.initialHints || [];
  const currentBlooms: BloomsLevel =
    latestBarnabySpeech?.bloomsLevel ||
    lastBarnabyTurn?.bloomsLevel ||
    'Analyze';
  const currentKey =
    latestBarnabySpeech?.keyUsed || lastBarnabyTurn?.keyUsed || null;

  const revealedHintsCount =
    hintsProgress.topicId === topicId ? hintsProgress.count : 1;

  const solvedQuizCount = activeNode
    ? activeNode.diagnosticQuestions.filter((q) => quizCompletedIds[q.id])
        .length
    : 0;
  const totalQuizCount = activeNode ? activeNode.diagnosticQuestions.length : 0;

  const handleSaveQuickKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickKeyInput.trim();
    if (cleaned.length < 8) {
      setApiError({
        code: 'NO_API_KEY',
        message: 'Please enter a valid Gemini API key.',
      });
      return;
    }
    const existing = geminiRotator.getCustomKeys();
    geminiRotator.setCustomKeys([cleaned, existing[1], existing[2]]);
    const status = await geminiRotator.fetchServerKeyStatus();
    setGeminiHasKey(status.anyConfigured);
    setQuickKeyInput('');
    setApiError(null);
    chiptuneAudio.playMasteryFanfare();
  };

  const handleSendToBarnaby = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryText = studentInput.trim();
    if (!queryText || isLoading || !activeNode) return;

    if (aiEngineMode === 'gemini' && geminiHasKey === false) {
      setApiError({
        code: 'NO_API_KEY',
        message:
          'Connect a Gemini API key above (or switch to Local WebGPU) before sending questions to Professor Barnaby.',
      });
      return;
    }

    setApiError(null);
    setIsLoading(true);

    try {
      const ragChunks = backpackFiles
        .filter((f) => f.subject === currentSubject)
        .flatMap((f) => f.chunks);

      const askPayload = {
        userMessage: queryText,
        subject: currentSubject,
        topicTitle: activeNode.title,
        syllabusBoard,
        mode: tutorMode,
        ragContext: ragChunks,
        conversationHistory: topicHistory.map((t) => ({
          role: t.role === 'student' ? ('user' as const) : ('barnaby' as const),
          text: t.text,
        })),
      };

      const response =
        aiEngineMode === 'local-webgpu'
          ? await askBarnabyLocal(askPayload, localModelId, (report) => {
              setLocalModelState({
                status: report.progress >= 100 ? 'ready' : 'loading',
                progress: report.progress,
                text: report.text,
              });
            })
          : await geminiRotator.askBarnaby(askPayload);

      if (aiEngineMode === 'local-webgpu') {
        setLocalModelState({ status: 'ready', progress: 100, text: 'Ready' });
      }

      const userSeq = nextWorkbookSeq();
      appendDialogueTurn(activeNode.id, {
        id: `turn-user-${userSeq}`,
        role: 'student',
        text: queryText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      const replySeq = nextWorkbookSeq();
      const validHints =
        response.hintSteps && response.hintSteps.length > 0
          ? response.hintSteps
          : undefined;
      setSpeechOverride({
        topicId: activeNode.id,
        reply: response.reply,
        socraticFollowUp: response.socraticFollowUp,
        bloomsLevel: response.bloomsLevel,
        latexFormula: response.latexFormula,
        latexCaption: response.latexCaption,
        hintSteps: validHints,
        keyUsed: response.keyUsed,
        trigger: replySeq,
      });

      // Automatically sync new formula, hints, and generated quiz question back into the Topic & Whiteboard
      syncTopicWithBarnabyResponse(activeNode.id, {
        latexFormula: response.latexFormula,
        latexCaption: response.latexCaption,
        hintSteps: validHints,
        quizQuestion: response.quizQuestion
          ? {
              id: `q-barnaby-${replySeq}`,
              bloomsLevel:
                response.quizQuestion.bloomsLevel || response.bloomsLevel,
              question: response.quizQuestion.question,
              options: response.quizQuestion.options,
              correctIndex: response.quizQuestion.correctIndex,
              socraticExplanation: response.quizQuestion.socraticExplanation,
              xpReward: 50,
            }
          : undefined,
      });

      appendDialogueTurn(activeNode.id, {
        id: `turn-barnaby-${replySeq}`,
        role: 'barnaby',
        text: response.reply,
        socraticFollowUp: response.socraticFollowUp,
        bloomsLevel: response.bloomsLevel,
        latexFormula: response.latexFormula,
        latexCaption: response.latexCaption,
        hintSteps: validHints,
        keyUsed: response.keyUsed,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      setStudentInput('');
      if (aiEngineMode === 'gemini') {
        setGeminiHasKey(true);
      }
      awardXP(30);
    } catch (err) {
      if (err instanceof GeminiConfigError) {
        if (err.code === 'NO_API_KEY') {
          setGeminiHasKey(false);
        }
        setApiError({ code: err.code, message: err.message });
      } else {
        setApiError({
          code: 'GEMINI_REQUEST_FAILED',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to reach Gemini API.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAiQuestion = async () => {
    if (!activeNode || isGeneratingQuestion) return;
    setIsGeneratingQuestion(true);
    try {
      const ragChunks = backpackFiles
        .filter((f) => f.subject === currentSubject)
        .flatMap((f) => f.chunks);
      const generated = await generatePracticeQuestionForTopic({
        node: activeNode,
        syllabusBoard,
        ragContext: ragChunks,
        aiEngineMode,
        localModelId,
        geminiHasKey,
        onLocalProgress: (report) => {
          setLocalModelState({
            status: report.progress >= 100 ? 'ready' : 'loading',
            progress: report.progress,
            text: report.text,
          });
        },
      });
      syncTopicWithBarnabyResponse(activeNode.id, {
        latexFormula: generated.latexFormula,
        latexCaption: generated.latexCaption,
        hintSteps: generated.hintSteps,
        quizQuestion: generated.question,
      });
      chiptuneAudio.playMasteryFanfare();
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleStartTimedExam = () => {
    if (!activeNode || activeNode.diagnosticQuestions.length === 0) return;
    setExamAnswers({});
    setExamSubmitted(false);
    setExamSecondsLeft(Math.max(90, activeNode.diagnosticQuestions.length * 75));
    setExamModeActive(true);
    setActiveCallState('REVISION_TEST');
    chiptuneAudio.playSchoolBellChime();
  };

  const handleSubmitTimedExam = () => {
    if (!activeNode) return;
    setExamSubmitted(true);
    activeNode.diagnosticQuestions.forEach((q) => {
      const chosen = examAnswers[q.id];
      if (chosen !== undefined) {
        recordQuizAnswer(q.id, activeNode.id, chosen, q.correctIndex, q.xpReward);
      }
    });
    awardXP(100);
    chiptuneAudio.playMasteryFanfare();
  };

  const handlePinQuestionToFlashcard = (q: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    socraticExplanation: string;
  }) => {
    if (!activeNode || !currentSubject || pinnedQuestionIds[q.id]) return;
    const correctAnswer = q.options[q.correctIndex] || '';
    addStickyNote({
      subject: currentSubject,
      topicId: activeNode.id,
      frontPrompt: q.question,
      backAnswer: `Answer: ${correctAnswer}\n\nWhy: ${q.socraticExplanation}`,
      color: 'coral',
      rotationClass: '-rotate-1',
      masteryStatus: 'WEAK_POINT',
    });
    setPinnedQuestionIds((prev) => ({ ...prev, [q.id]: true }));
    chiptuneAudio.playPaperFlip();
  };

  const handleToggleVoiceMic = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      }; webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      } }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      } }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setApiError({
        code: 'VOICE_UNSUPPORTED',
        message:
          'Browser voice dictation is supported in Chrome, Edge, and Safari.',
      });
      return;
    }

    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      setIsListeningMic(true);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setStudentInput((prev) =>
            prev ? `${prev} ${transcript}` : transcript
          );
        }
      };
      recognition.onend = () => setIsListeningMic(false);
      recognition.onerror = () => setIsListeningMic(false);
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode) return;
    updateTopicFormula(activeNode.id, latexInput, captionInput);
    setSpeechOverride((prev) =>
      prev && prev.topicId === activeNode.id
        ? { ...prev, latexFormula: undefined, latexCaption: undefined }
        : prev
    );
    setFormulaEditorTopicId(null);
    chiptuneAudio.playPaperFlip();
  };

  const handleAddHintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode || !newHintInput.trim()) return;
    addTopicHint(activeNode.id, newHintInput);
    setSpeechOverride((prev) =>
      prev && prev.topicId === activeNode.id
        ? { ...prev, hintSteps: undefined }
        : prev
    );
    setHintsProgress({
      topicId: activeNode.id,
      count: activeNode.initialHints.length + 1,
    });
    setNewHintInput('');
    setAddHintTopicId(null);
    chiptuneAudio.playPaperFlip();
  };

  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode || !qPrompt.trim()) return;
    const options = [qOptA, qOptB, qOptC, qOptD]
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) return;

    const seq = nextWorkbookSeq();
    addTopicQuestion(activeNode.id, {
      id: `q-custom-${seq}`,
      bloomsLevel: qBlooms,
      question: qPrompt.trim(),
      options,
      correctIndex: Math.min(qCorrectIdx, options.length - 1),
      socraticExplanation:
        qExplanation.trim() || 'Reviewed against topic principles.',
      xpReward: 50,
    });
    setQPrompt('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrectIdx(0);
    setQExplanation('');
    setQuizBuilderTopicId(null);
    chiptuneAudio.playMasteryFanfare();
  };

  const handleSelectQuizOption = (
    questionId: string,
    optionIdx: number,
    correctIndex: number,
    xpReward: number
  ) => {
    if (!activeNode) return;
    if (examModeActive && !examSubmitted) {
      setExamAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
      chiptuneAudio.playPaperFlip();
      return;
    }
    recordQuizAnswer(questionId, activeNode.id, optionIdx, correctIndex, xpReward);
    if (optionIdx === correctIndex) {
      chiptuneAudio.playMasteryFanfare();
    } else {
      chiptuneAudio.playPaperFlip();
    }
  };

  const handleSwitchWorkbookTab = (tab: WorkbookTab) => {
    if (tab === workbookTab) return;
    chiptuneAudio.playMenuSlash();
    setWorkbookTab(tab);
  };

  const WORKBOOK_TABS: Array<{
    id: WorkbookTab;
    label: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'lesson',
      label: 'Lesson & Hints',
      icon: BookOpenText,
    },
    {
      id: 'quiz',
      label: 'Mastery Quiz',
      badge: `${solvedQuizCount}/${totalQuizCount}`,
      icon: Sparkles,
    },
    {
      id: 'dialogue',
      label: 'Notebook Log',
      badge: String(topicHistory.length),
      icon: MessagesSquare,
    },
  ];

  return (
    <section
      aria-label="Middle Panel: Open Workbook Canvas"
      className="workbook-paper-surface relative rounded-2xl border-2 border-[#B89972] p-4 sm:p-5 flex flex-col justify-between h-full min-h-[760px]"
    >
      {/* Spiral Wire Binding Rings along the Left Edge */}
      <div
        aria-hidden="true"
        className="hidden sm:flex flex-col justify-around absolute -left-3 top-8 bottom-8 z-20 pointer-events-none"
      >
        {Array.from({ length: 11 }).map((_, idx) => (
          <div
            key={idx}
            className="w-5 h-2.5 rounded-full bg-gradient-to-r from-slate-600 via-slate-300 to-slate-700 border border-slate-800 shadow-sm"
          />
        ))}
      </div>

      <div className="space-y-4 sm:pl-3">
        {/* Top Workbook Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E6D5B8] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] font-mono text-xs font-bold">
                {activeNode ? activeNode.code : 'BLANK'}
              </span>
              <span className="text-xs font-mono text-slate-600">
                {currentSubject
                  ? syllabusBoard
                    ? `${currentSubject} • ${syllabusBoard}`
                    : `${currentSubject} Notebook`
                  : 'Open Workbook'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1E293B] mt-1">
              {activeNode
                ? activeNode.title
                : currentSubject
                  ? `${currentSubject}: Add a Topic`
                  : 'Create a Notebook to Begin'}
            </h2>
          </div>

          {/* Socratic / Feynman / Exam Style Selector */}
          <div
            className="flex items-center gap-1 bg-[#F5EBE0] p-1 rounded-xl border border-[#D4B996]"
            role="tablist"
            aria-label="Tutoring Style"
          >
            {MODE_OPTIONS.map((mode) => {
              const Icon = mode.icon;
              const active = tutorMode === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`workbook-mode-${mode.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTutorMode(mode.id);
                    setActiveCallState(
                      mode.id === 'exam' ? 'REVISION_TEST' : 'IDLE'
                    );
                    chiptuneAudio.playPaperFlip();
                  }}
                  title={mode.subtitle}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'text-[#FDFBF7]'
                      : 'text-slate-700 hover:text-[#1E293B]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="workbook-tutor-mode"
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 24,
                        mass: 1.05,
                      }}
                      className="absolute inset-0 bg-[#1A2E26] rounded-lg -skew-x-6 shadow-[2px_2px_0px_#10B981]"
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5 text-[#10B981]" />
                  <span className="relative z-10">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Professor Barnaby Header (Paper-Craft Owl + 8-Bit Chiptune Scroll) */}
        <ProfessorBarnaby
          speechText={currentSpeech}
          socraticQuestion={currentFollowUp}
          bloomsLevel={currentBlooms}
          keyUsed={currentKey}
          isStreamingTrigger={latestBarnabySpeech?.trigger || 0}
        />

        {/* Inline Gemini API Key Setup Card (only shown in Gemini cloud mode when key is missing) */}
        {aiEngineMode === 'gemini' &&
          ((Boolean(activeNode) && geminiHasKey === false) ||
            apiError?.code === 'NO_API_KEY') && (
            <form
              onSubmit={handleSaveQuickKey}
              className="rounded-xl bg-[#FEF08A]/85 border-2 border-[#1E293B] p-3.5 school-stamp-card space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-[#1E293B] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1E293B]">
                  <span className="font-bold block">
                    Gemini API Key Required for Cloud AI Tutoring
                  </span>
                  <span className="text-slate-800">
                    Paste a Google Gemini API key below, or switch to the free
                    in-browser Local WebGPU model (zero server cost).
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="inline-gemini-key-input"
                  type="password"
                  placeholder="AIzaSy... (stored cleanly in your browser)"
                  value={quickKeyInput}
                  onChange={(e) => setQuickKeyInput(e.target.value)}
                  className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-white border border-[#1E293B] text-xs font-mono focus:outline-none"
                />
                <button
                  id="inline-gemini-key-save-btn"
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#1A2E26] hover:bg-[#243F35] text-[#FDFBF7] text-xs font-bold cursor-pointer shrink-0"
                >
                  Save &amp; Connect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiEngineMode('local-webgpu');
                    setApiError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FDFBF7] hover:bg-[#F5EBE0] text-[#1E293B] border border-[#1E293B] text-xs font-bold cursor-pointer shrink-0"
                >
                  Use Free Local WebGPU
                </button>
              </div>
            </form>
          )}

        {/* In-Browser WebGPU Model Download / Compile Progress */}
        {aiEngineMode === 'local-webgpu' && localModelStatus === 'loading' && (
          <div className="rounded-xl bg-[#ECFDF5] border-2 border-[#10B981] p-3 space-y-1.5 text-xs text-[#065F46]">
            <div className="flex items-center justify-between font-bold">
              <span>Loading In-Browser WebGPU Model...</span>
              <span className="font-mono">{localModelProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#D1FAE5] overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all duration-200"
                style={{ width: `${localModelProgress}%` }}
              />
            </div>
            {localModelProgressText && (
              <p className="text-[11px] text-[#047857] truncate">
                {localModelProgressText}
              </p>
            )}
          </div>
        )}

        {/* Real API Error Alert (Non-Key Failures) */}
        {apiError && apiError.code !== 'NO_API_KEY' && (
          <div className="rounded-xl bg-[#EF4444]/10 border-2 border-[#EF4444] p-3 flex items-start justify-between gap-2 text-xs text-[#7F1D1D]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span>{apiError.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setApiError(null)}
              className="font-bold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {!activeNode ? (
          <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-6 text-center space-y-2">
            <h3 className="text-base font-serif font-bold text-[#1E293B]">
              {currentSubject
                ? `Ready to add your first topic to ${currentSubject}`
                : 'Your workbook desk is clean'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {currentSubject
                ? 'Use "+" on the left Whiteboard to add a chapter or exam module.'
                : 'Create your first Subject Notebook on the left Whiteboard (or via "+ New Notebook" in the top bar) to unlock formulas, quizzes, and AI tutoring.'}
            </p>
          </div>
        ) : (
          <>
            {/* Persona-Style Skewed Highlighter Sub-Menu Bar */}
            <div
              role="tablist"
              aria-label="Workbook Sections"
              className="flex flex-wrap items-center gap-2 border-b-2 border-[#E6D5B8] pb-3"
            >
              {WORKBOOK_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = workbookTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`workbook-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSwitchWorkbookTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'text-[#1E293B]'
                        : 'text-slate-600 hover:text-[#1E293B] bg-[#F5EBE0]/70'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="workbook-subtab-pill"
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 24,
                          mass: 1.05,
                        }}
                        className="absolute inset-0 bg-[#FDE047] border-2 border-[#1E293B] rounded-lg -skew-x-6 shadow-[3px_3px_0px_#1E293B]"
                      />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                    <span className="relative z-10">{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`relative z-10 px-1.5 py-0.5 rounded font-mono text-xs font-bold ${
                          active
                            ? 'bg-[#1A2E26] text-[#FDE047]'
                            : 'bg-[#E6D5B8] text-[#1E293B]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Animated Persona Menu Stage Content */}
            <PersonaMenuStage stageKey={`${activeNode.id}-${workbookTab}`}>
              {workbookTab === 'lesson' && (
                <div className="space-y-4">
                  {/* Paperclipped KaTeX Formula Card */}
                  {currentLatex && !showFormulaEditor ? (
                    <div className="relative rounded-xl bg-[#FFFDF9] border-2 border-[#1E293B] p-4 school-stamp-card rotate-[-0.35deg]">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 bg-[#F5EBE0] px-2.5 py-0.5 rounded-full border border-[#B89972] text-xs font-mono font-bold text-[#5D4037]">
                          <Paperclip className="w-3.5 h-3.5 -rotate-45 text-[#1E293B]" />
                          Paperclipped Formula Card
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLatexInput(currentLatex);
                            setCaptionInput(currentLatexCaption);
                            setFormulaEditorTopicId(activeNode.id);
                          }}
                          className="text-xs font-mono font-bold text-slate-600 hover:text-[#1E293B] cursor-pointer"
                        >
                          Edit Formula
                        </button>
                      </div>

                      {currentLatexCaption && (
                        <p className="text-xs font-mono uppercase tracking-wide text-slate-600 font-semibold mb-2">
                          {currentLatexCaption}
                        </p>
                      )}
                      <div className="py-3 px-3 rounded-lg bg-[#F8F4EC] border border-[#DFCEB2] overflow-x-auto text-center">
                        <BlockMath
                          math={currentLatex}
                          renderError={() => (
                            <code className="font-mono text-xs text-slate-700 break-words">
                              {currentLatex}
                            </code>
                          )}
                        />
                      </div>
                    </div>
                  ) : showFormulaEditor ? (
                    <form
                      onSubmit={handleSaveFormula}
                      className="rounded-xl bg-[#FFFDF9] border-2 border-[#1E293B] p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[#5D4037]">
                          Paperclipped KaTeX Equation
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormulaEditorTopicId(null)}
                          className="text-xs text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Formula title or label (optional)"
                        value={captionInput}
                        onChange={(e) => setCaptionInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#C8AE8D] bg-white text-xs focus:outline-none focus:border-[#1A2E26]"
                      />
                      <input
                        type="text"
                        placeholder="Enter LaTeX equation"
                        value={latexInput}
                        onChange={(e) => setLatexInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#C8AE8D] bg-white text-xs font-mono focus:outline-none focus:border-[#1A2E26]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-[#1A2E26] text-white text-xs font-bold cursor-pointer"
                        >
                          Save Equation
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Paperclip className="w-4 h-4 text-[#5D4037]" />
                        <span>No formula pinned to this topic yet.</span>
                      </div>
                      <button
                        id="add-topic-formula-btn"
                        type="button"
                        onClick={() => {
                          setLatexInput('');
                          setCaptionInput('');
                          setFormulaEditorTopicId(activeNode.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#FDE047] border border-[#1E293B] text-xs font-bold text-[#1E293B] cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Formula
                      </button>
                    </div>
                  )}

                  {/* Step-by-Step Study Hints & Key Points */}
                  <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#C8AE8D] p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold font-serif text-[#1E293B] flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                        Study Hints ({currentHints.length})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          id="workbook-add-hint-toggle"
                          type="button"
                          onClick={() =>
                            setAddHintTopicId((prev) =>
                              prev === activeNode.id ? null : activeNode.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] border border-[#C8AE8D] text-xs font-bold text-[#1E293B] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add Hint
                        </button>
                        {currentHints.length > 0 && (
                          <button
                            id="toggle-hints-collapse-btn"
                            type="button"
                            onClick={() => setHintsExpanded(!hintsExpanded)}
                            className="p-1.5 rounded-lg hover:bg-[#E6D5B8]/60 text-slate-700 cursor-pointer"
                            aria-label="Toggle hints visibility"
                          >
                            {hintsExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {showAddHint && (
                      <form
                        onSubmit={handleAddHintSubmit}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Write a step-by-step reminder or nudge..."
                          value={newHintInput}
                          onChange={(e) => setNewHintInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#C8AE8D] bg-white text-xs focus:outline-none focus:border-[#1A2E26]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </form>
                    )}

                    {currentHints.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No hints recorded for this topic yet.
                      </p>
                    ) : (
                      hintsExpanded && (
                        <ol className="space-y-2 text-xs sm:text-sm text-slate-800 list-decimal list-inside">
                          {currentHints
                            .slice(0, revealedHintsCount)
                            .map((hint, idx) => (
                              <li
                                key={idx}
                                className="p-2.5 rounded-lg bg-[#F5EBE0]/75 border border-[#DFCEB2] leading-snug flex items-start justify-between gap-2"
                              >
                                <span>
                                  {idx + 1}. <RichAcademicText text={hint} />
                                </span>
                                {!(
                                  latestBarnabySpeech?.hintSteps &&
                                  latestBarnabySpeech.hintSteps.length > 0
                                ) && (
                                  <button
                                    type="button"
                                    aria-label="Delete hint"
                                    onClick={() =>
                                      removeTopicHint(activeNode.id, idx)
                                    }
                                    className="text-slate-400 hover:text-[#EF4444] cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </li>
                            ))}
                        </ol>
                      )
                    )}

                    {revealedHintsCount < currentHints.length && (
                      <button
                        id="reveal-next-hint-btn"
                        type="button"
                        onClick={() => {
                          setHintsProgress((prev) => ({
                            topicId: activeNode.id,
                            count: Math.min(
                              currentHints.length,
                              (prev.topicId === activeNode.id
                                ? prev.count
                                : 1) + 1
                            ),
                          }));
                          chiptuneAudio.playPaperFlip();
                        }}
                        className="w-full py-2 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] font-bold text-xs border border-[#B89972] transition-colors cursor-pointer"
                      >
                        Reveal Next Hint (+1 Step)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {workbookTab === 'quiz' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                    <h3 className="text-sm font-bold font-serif text-[#1E293B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#10B981]" />
                      {examModeActive
                        ? 'Timed Exam Paper Simulator'
                        : 'Diagnostic Checkpoint Quiz'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        id="generate-ai-quiz-btn"
                        type="button"
                        disabled={isGeneratingQuestion}
                        onClick={handleGenerateAiQuestion}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#10B981] text-xs font-bold text-[#065F46] cursor-pointer transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>
                          {isGeneratingQuestion
                            ? 'Generating...'
                            : 'AI Question'}
                        </span>
                      </button>

                      {activeNode.diagnosticQuestions.length > 0 && (
                        <button
                          id="toggle-timed-exam-btn"
                          type="button"
                          onClick={() => {
                            if (examModeActive) {
                              setExamModeActive(false);
                              setExamSubmitted(false);
                              setActiveCallState('IDLE');
                            } else {
                              handleStartTimedExam();
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            examModeActive
                              ? 'bg-[#1A2E26] text-[#FDE047] border-[#1E293B]'
                              : 'bg-[#FEF9C3] hover:bg-[#FDE047] text-[#1E293B] border-[#1E293B]'
                          }`}
                        >
                          <Timer className="w-3.5 h-3.5" />
                          <span>
                            {examModeActive ? 'Exit Exam Mode' : 'Timed Exam'}
                          </span>
                        </button>
                      )}

                      <button
                        id="open-quiz-builder-btn"
                        type="button"
                        onClick={() =>
                          setQuizBuilderTopicId((prev) =>
                            prev === activeNode.id ? null : activeNode.id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5EBE0] hover:bg-[#FDE047] border border-[#1E293B] text-xs font-bold text-[#1E293B] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Question
                      </button>
                      <span className="text-xs font-mono text-slate-600 hidden sm:flex items-center gap-1">
                        <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                        {solvedQuizCount}/{totalQuizCount}
                      </span>
                    </div>
                  </div>

                  {/* Timed Exam Simulator Banner & School Report Stamp */}
                  {examModeActive && (
                    <div className="rounded-xl border-2 border-[#1E293B] bg-[#FAF4E8] p-3.5 shadow-[3px_3px_0px_#1E293B] space-y-2.5">
                      {!examSubmitted ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-[#1E293B]">
                            <span className="px-2.5 py-1 rounded-lg bg-[#EF4444] text-white font-mono font-bold flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5" />
                              {String(Math.floor(examSecondsLeft / 60)).padStart(
                                2,
                                '0'
                              )}
                              :
                              {String(examSecondsLeft % 60).padStart(2, '0')}
                            </span>
                            <span className="font-semibold">
                              Exam in progress — explanations hidden until paper
                              submission.
                            </span>
                          </div>
                          <button
                            id="submit-timed-exam-btn"
                            type="button"
                            onClick={handleSubmitTimedExam}
                            className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                          >
                            Submit Exam Paper (+100 XP)
                          </button>
                        </div>
                      ) : (
                        (() => {
                          const total = activeNode.diagnosticQuestions.length;
                          const correct = activeNode.diagnosticQuestions.filter(
                            (q) => examAnswers[q.id] === q.correctIndex
                          ).length;
                          const pct =
                            total > 0 ? Math.round((correct / total) * 100) : 0;
                          const grade =
                            pct >= 90
                              ? 'A*'
                              : pct >= 80
                                ? 'A'
                                : pct >= 70
                                  ? 'B'
                                  : pct >= 60
                                    ? 'C'
                                    : pct >= 50
                                      ? 'D'
                                      : 'U';
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-xl border-2 border-[#991B1B] bg-[#FEE2E2] text-[#991B1B] font-serif font-extrabold text-base -rotate-3 shadow-xs">
                                  GRADE {grade}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-[#1E293B]">
                                    Official School Report: {correct}/{total} (
                                    {pct}%)
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    Review mark-scheme explanations below or pin
                                    missed items to 3D flashcards.
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleStartTimedExam}
                                className="px-3 py-1.5 rounded-lg bg-[#1A2E26] text-[#FDE047] text-xs font-bold cursor-pointer"
                              >
                                Retake Timed Paper
                              </button>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {showQuizBuilder && (
                    <form
                      onSubmit={handleCreateQuestionSubmit}
                      className="rounded-xl bg-[#FDFBF7] border-2 border-[#1E293B] p-4 space-y-2.5 school-stamp-card"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-[#1E293B]">
                          New Practice Question
                        </span>
                        <select
                          aria-label="Bloom's level"
                          value={qBlooms}
                          onChange={(e) =>
                            setQBlooms(e.target.value as BloomsLevel)
                          }
                          className="px-2 py-1 rounded border border-[#C8AE8D] bg-white text-xs font-mono"
                        >
                          {(
                            [
                              'Remember',
                              'Understand',
                              'Apply',
                              'Analyze',
                              'Evaluate',
                              'Create',
                            ] as const
                          ).map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Question prompt..."
                        value={qPrompt}
                        onChange={(e) => setQPrompt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#C8AE8D] bg-white text-xs focus:outline-none focus:border-[#1A2E26]"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { val: qOptA, set: setQOptA, idx: 0, label: 'Option A' },
                          { val: qOptB, set: setQOptB, idx: 1, label: 'Option B' },
                          { val: qOptC, set: setQOptC, idx: 2, label: 'Option C' },
                          { val: qOptD, set: setQOptD, idx: 3, label: 'Option D' },
                        ].map((opt) => (
                          <div key={opt.idx} className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={qCorrectIdx === opt.idx}
                              onChange={() => setQCorrectIdx(opt.idx)}
                              aria-label={`Mark ${opt.label} as correct`}
                            />
                            <input
                              type="text"
                              required={opt.idx < 2}
                              placeholder={opt.label}
                              value={opt.val}
                              onChange={(e) => opt.set(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#C8AE8D] bg-white text-xs focus:outline-none focus:border-[#1A2E26]"
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Explanation shown after answering (optional)..."
                        value={qExplanation}
                        onChange={(e) => setQExplanation(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#C8AE8D] bg-white text-xs focus:outline-none focus:border-[#1A2E26]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setQuizBuilderTopicId(null)}
                          className="px-3 py-1.5 rounded-lg bg-[#E6D5B8] text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-bold cursor-pointer"
                        >
                          Save Question
                        </button>
                      </div>
                    </form>
                  )}

                  {activeNode.diagnosticQuestions.length === 0 ? (
                    <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-5 text-center space-y-2.5">
                      <p className="text-sm font-serif font-bold text-[#1E293B]">
                        No diagnostic questions in {activeNode.code} yet
                      </p>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Click &ldquo;AI Question&rdquo; above to let Professor
                        Barnaby generate an exam checkpoint, or add your own.
                      </p>
                    </div>
                  ) : (
                    activeNode.diagnosticQuestions.map((q, qIdx) => {
                      const chosenIdx =
                        examModeActive && !examSubmitted
                          ? examAnswers[q.id]
                          : examModeActive && examSubmitted
                            ? examAnswers[q.id] ?? selectedAnswers[q.id]
                            : selectedAnswers[q.id];
                      const isAnswered = chosenIdx !== undefined;
                      const showFeedback =
                        isAnswered && (!examModeActive || examSubmitted);
                      const isCorrect = chosenIdx === q.correctIndex;

                      return (
                        <div
                          key={q.id}
                          className="rounded-xl bg-[#FFFDF9] border-2 border-[#C8AE8D] p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-700">
                              Check #{qIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                  BLOOMS_COLORS[q.bloomsLevel]
                                }`}
                              >
                                Bloom&apos;s: {q.bloomsLevel}
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FDE047]/45 text-amber-950 border border-amber-400 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />+{q.xpReward} XP
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-[#1E293B] leading-snug">
                            <RichAcademicText text={q.question} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const isThisSelected = chosenIdx === optIdx;
                              const showRight =
                                showFeedback && optIdx === q.correctIndex;
                              const showWrong =
                                showFeedback &&
                                isThisSelected &&
                                optIdx !== q.correctIndex;

                              return (
                                <button
                                  key={optIdx}
                                  id={`quiz-${q.id}-opt-${optIdx}`}
                                  type="button"
                                  onClick={() =>
                                    handleSelectQuizOption(
                                      q.id,
                                      optIdx,
                                      q.correctIndex,
                                      q.xpReward
                                    )
                                  }
                                  className={`text-left p-2.5 rounded-xl border-2 text-xs font-medium transition-all flex items-start gap-2 cursor-pointer ${
                                    showRight
                                      ? 'bg-[#10B981]/15 border-[#10B981] text-[#065F46] font-bold'
                                      : showWrong
                                        ? 'bg-[#EF4444]/15 border-[#EF4444] text-red-900'
                                        : isThisSelected &&
                                            examModeActive &&
                                            !examSubmitted
                                          ? 'bg-[#FEF9C3] border-[#1E293B] text-[#1E293B] font-bold'
                                          : 'bg-white hover:bg-[#F5EBE0]/75 border-[#D4B996] text-slate-800'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[#F5EBE0] border border-[#C8AE8D] shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 leading-snug">
                                    <RichAcademicText text={opt} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {showFeedback && (
                            <div
                              className={`p-3 rounded-xl border text-xs leading-relaxed flex flex-wrap items-start justify-between gap-2 ${
                                isCorrect
                                  ? 'bg-[#10B981]/10 border-[#10B981] text-[#065F46]'
                                  : 'bg-[#F59E0B]/15 border-[#F59E0B] text-amber-950'
                              }`}
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <span className="font-bold mr-1">
                                    {isCorrect
                                      ? 'Mastery Verified!'
                                      : 'Try Another Angle:'}
                                  </span>
                                  <RichAcademicText
                                    text={q.socraticExplanation}
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={Boolean(pinnedQuestionIds[q.id])}
                                onClick={() => handlePinQuestionToFlashcard(q)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#FEF08A] border border-[#1E293B] text-[#1E293B] text-xs font-bold cursor-pointer shrink-0"
                                title="Pin this question to 3D Spaced Repetition Flashcards"
                              >
                                <StickyNote className="w-3 h-3" />
                                <span>
                                  {pinnedQuestionIds[q.id]
                                    ? 'Pinned to 3D Cards!'
                                    : 'Pin to 3D Cards'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {workbookTab === 'dialogue' && (
                <div className="space-y-3">
                  {topicHistory.length === 0 ? (
                    <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-5 text-center space-y-2">
                      <p className="text-sm font-serif font-bold text-[#1E293B]">
                        No conversation logged for {activeNode.code}
                      </p>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Type your explanation or question below to start a
                        Socratic tutoring thread with Professor Barnaby.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {topicHistory.map((turn) => (
                        <div
                          key={turn.id}
                          className={`p-3 rounded-xl text-xs sm:text-sm ${
                            turn.role === 'student'
                              ? 'bg-[#F5EBE0] text-[#1E293B] ml-6 border border-[#C8AE8D]'
                              : 'bg-[#1A2E26] text-[#FDFBF7] mr-6 border border-[#3E2723]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs opacity-80 font-mono mb-1">
                            <span className="font-bold">
                              {turn.role === 'student'
                                ? 'You'
                                : `Professor Barnaby (${turn.keyUsed || 'Gemini'})`}
                            </span>
                            <span>{turn.timestamp}</span>
                          </div>
                          <div className="leading-relaxed">
                            <RichAcademicText text={turn.text} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PersonaMenuStage>
          </>
        )}
      </div>

      {/* Bottom Interactive Socratic / Feynman Input Bar + Spoken Voice Dictation */}
      <form
        onSubmit={handleSendToBarnaby}
        className="mt-5 pt-3 border-t-2 border-[#E6D5B8] sm:pl-3 flex items-center gap-2"
      >
        <button
          id="barnaby-voice-mic-btn"
          type="button"
          disabled={!activeNode || isLoading}
          onClick={handleToggleVoiceMic}
          title={
            isListeningMic
              ? 'Stop voice dictation'
              : 'Speak your explanation aloud (Feynman / Socratic voice input)'
          }
          aria-label="Voice input microphone"
          className={`p-2.5 rounded-xl border-2 transition-colors cursor-pointer shrink-0 ${
            isListeningMic
              ? 'bg-[#EF4444] text-white border-[#1E293B] animate-pulse'
              : 'bg-[#FDFBF7] hover:bg-[#F5EBE0] text-[#1E293B] border-[#C8AE8D]'
          } disabled:opacity-50`}
        >
          {isListeningMic ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <input
          id="barnaby-socratic-input"
          type="text"
          disabled={!activeNode || isLoading}
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          placeholder={
            !activeNode
              ? 'Create a notebook & topic first to unlock Socratic chat...'
              : tutorMode === 'feynman'
                ? `Explain ${activeNode.title} as if teaching a classmate...`
                : tutorMode === 'exam'
                  ? syllabusBoard
                    ? `Write your ${syllabusBoard} working or ask for a checkpoint...`
                    : 'Write your working or ask for a checkpoint...'
                  : `Ask Professor Barnaby about ${activeNode.title}...`
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white disabled:bg-[#F5EBE0]/60 border-2 border-[#C8AE8D] text-xs sm:text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#1A2E26] shadow-inner"
        />
        <button
          id="barnaby-send-btn"
          type="submit"
          disabled={!activeNode || isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] disabled:opacity-50 text-[#FDFBF7] text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-[#1E293B] shadow-[3px_3px_0px_#FDE047] transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-[#FDE047]" />
          <span>{isLoading ? 'Thinking...' : 'Ask Barnaby'}</span>
        </button>
      </form>
    </section>
  );
}
