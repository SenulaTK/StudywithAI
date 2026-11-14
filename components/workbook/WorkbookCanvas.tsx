'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useStudyDeskStore, type WorkbookTab } from '@/lib/store';
import { geminiRotator, type BloomsLevel, type TutorMode } from '@/lib/gemini';
import { chiptuneAudio } from '@/lib/audio';
import { ProfessorBarnaby } from '@/components/barnaby/ProfessorBarnaby';
import { PersonaMenuStage } from '@/components/transitions/PersonaSchoolTransition';

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
    subtitle: 'Mark-scheme precision & M1/A1 checkpoints',
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
    backpackFiles,
    workbookDialogues,
    setTutorMode,
    setWorkbookTab,
    setActiveCallState,
    appendDialogueTurn,
    awardXP,
    unlockOrPromoteTopic,
  } = useStudyDeskStore();

  const activeNode =
    roadmapState.find((n) => n.id === activeTopicId) || roadmapState[0];

  const [studentInput, setStudentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintsProgress, setHintsProgress] = useState<{
    topicId: string;
    count: number;
  }>({ topicId: 'math-1', count: 1 });
  const [hintsExpanded, setHintsExpanded] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [quizCompletedIds, setQuizCompletedIds] = useState<
    Record<string, boolean>
  >({});
  const [speechOverride, setSpeechOverride] = useState<{
    topicId: string;
    reply: string;
    socraticFollowUp: string;
    bloomsLevel: BloomsLevel;
    latexFormula: string;
    latexCaption: string;
    hintSteps: string[];
    keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3';
    trigger: number;
  } | null>(null);

  const latestBarnabySpeech =
    speechOverride && speechOverride.topicId === activeNode.id
      ? speechOverride
      : null;

  const revealedHintsCount =
    hintsProgress.topicId === activeNode.id ? hintsProgress.count : 1;

  const topicHistory = workbookDialogues[activeNode.id] || [];
  const solvedQuizCount = activeNode.diagnosticQuestions.filter(
    (q) => quizCompletedIds[q.id]
  ).length;
  const totalQuizCount = activeNode.diagnosticQuestions.length;

  const currentSpeech =
    latestBarnabySpeech?.reply || activeNode.initialBarnabyGreeting;
  const currentFollowUp =
    latestBarnabySpeech?.socraticFollowUp || activeNode.initialSocraticQuestion;
  const currentLatex = latestBarnabySpeech?.latexFormula || activeNode.coreLatex;
  const currentLatexCaption =
    latestBarnabySpeech?.latexCaption || activeNode.coreLatexCaption;
  const currentHints =
    latestBarnabySpeech?.hintSteps || activeNode.initialHints;
  const currentBlooms: BloomsLevel =
    latestBarnabySpeech?.bloomsLevel || 'Analyze';
  const currentKey = latestBarnabySpeech?.keyUsed || 'KEY_1';

  const sendMessageToBarnaby = async (rawMessage: string) => {
    const queryText = rawMessage.trim();
    if (!queryText || isLoading) return;

    setStudentInput('');
    setIsLoading(true);

    const userSeq = nextWorkbookSeq();
    const studentTurnId = `turn-user-${userSeq}`;
    appendDialogueTurn(activeNode.id, {
      id: studentTurnId,
      role: 'student',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    const ragChunks = backpackFiles
      .filter((f) => f.subject === currentSubject)
      .flatMap((f) => f.chunks);

    const response = await geminiRotator.askBarnaby({
      userMessage: queryText,
      subject: currentSubject,
      topicTitle: activeNode.title,
      syllabusBoard,
      mode: tutorMode,
      ragContext: ragChunks,
      conversationHistory: topicHistory.map((t) => ({
        role: t.role === 'student' ? 'user' : 'barnaby',
        text: t.text,
      })),
    });

    const replySeq = nextWorkbookSeq();
    setSpeechOverride({
      topicId: activeNode.id,
      reply: response.reply,
      socraticFollowUp: response.socraticFollowUp,
      bloomsLevel: response.bloomsLevel,
      latexFormula: response.latexFormula || activeNode.coreLatex,
      latexCaption: response.latexCaption || activeNode.coreLatexCaption,
      hintSteps: response.hintSteps || activeNode.initialHints,
      keyUsed: response.keyUsed,
      trigger: replySeq,
    });

    appendDialogueTurn(activeNode.id, {
      id: `turn-barnaby-${replySeq}`,
      role: 'barnaby',
      text: response.reply,
      socraticFollowUp: response.socraticFollowUp,
      bloomsLevel: response.bloomsLevel,
      latexFormula: response.latexFormula,
      latexCaption: response.latexCaption,
      hintSteps: response.hintSteps,
      keyUsed: response.keyUsed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    awardXP(30);
    setIsLoading(false);
  };

  const handleSendToBarnaby = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageToBarnaby(studentInput);
  };

  const handleSelectQuizOption = (
    questionId: string,
    optionIdx: number,
    correctIndex: number,
    xpReward: number
  ) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));

    if (optionIdx === correctIndex && !quizCompletedIds[questionId]) {
      setQuizCompletedIds((prev) => ({ ...prev, [questionId]: true }));
      awardXP(xpReward);
      chiptuneAudio.playMasteryFanfare();

      const allSolved = activeNode.diagnosticQuestions.every(
        (q) => q.id === questionId || quizCompletedIds[q.id]
      );
      if (allSolved) {
        unlockOrPromoteTopic(activeNode.id);
      }
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
        {/* Top Workbook Header: Active Topic & Pedagogy Style */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E6D5B8] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] font-mono text-xs font-bold">
                {activeNode.code}
              </span>
              <span className="text-xs font-mono text-slate-600">
                {currentSubject} • {syllabusBoard} Folio
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1E293B] mt-1">
              {activeNode.title}
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
                        stiffness: 430,
                        damping: 30,
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
                      stiffness: 420,
                      damping: 30,
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
              {/* Paperclipped LaTeX Formula Card */}
              <div className="relative rounded-xl bg-[#FFFDF9] border-2 border-[#1E293B] p-4 school-stamp-card rotate-[-0.35deg]">
                <div className="inline-flex items-center gap-1.5 bg-[#F5EBE0] px-2.5 py-0.5 rounded-full border border-[#B89972] text-xs font-mono font-bold text-[#5D4037] mb-2">
                  <Paperclip className="w-3.5 h-3.5 -rotate-45 text-[#1E293B]" />
                  Paperclipped Formula Card
                </div>

                <p className="text-xs font-mono uppercase tracking-wide text-slate-600 font-semibold mb-2">
                  {currentLatexCaption}
                </p>
                <div className="py-3 px-3 rounded-lg bg-[#F8F4EC] border border-[#DFCEB2] overflow-x-auto text-center">
                  <BlockMath math={currentLatex} />
                </div>
                <div className="text-xs text-slate-600 mt-2.5 flex items-center justify-between">
                  <span>Dual-Coding Equation Anchor</span>
                  <span className="font-mono text-[#065F46] font-bold">
                    KaTeX Verified
                  </span>
                </div>
              </div>

              {/* Step-by-Step Collapsible Socratic Hints */}
              <div className="rounded-xl bg-[#FDFBF7] border-2 border-[#C8AE8D] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-serif text-[#1E293B] flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                    Step-by-Step Hints ({revealedHintsCount}/
                    {currentHints.length})
                  </span>
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
                </div>

                {hintsExpanded && (
                  <ol className="space-y-2 text-xs sm:text-sm text-slate-800 list-decimal list-inside">
                    {currentHints
                      .slice(0, revealedHintsCount)
                      .map((hint, idx) => (
                        <li
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#F5EBE0]/75 border border-[#DFCEB2] leading-snug"
                        >
                          {hint}
                        </li>
                      ))}
                  </ol>
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
                          (prev.topicId === activeNode.id ? prev.count : 1) + 1
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
                  Diagnostic Checkpoint Quiz
                </h3>
                <span className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                  Solve all to unlock next Topic
                </span>
              </div>

              {activeNode.diagnosticQuestions.map((q, qIdx) => {
                const chosenIdx = selectedAnswers[q.id];
                const isAnswered = chosenIdx !== undefined;
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

                    <p className="text-sm font-semibold text-[#1E293B] leading-snug">
                      {q.question}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const isThisSelected = chosenIdx === optIdx;
                        const showRight =
                          isAnswered && optIdx === q.correctIndex;
                        const showWrong =
                          isThisSelected && optIdx !== q.correctIndex;

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
                                  : 'bg-white hover:bg-[#F5EBE0]/75 border-[#D4B996] text-slate-800'
                            }`}
                          >
                            <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[#F5EBE0] border border-[#C8AE8D] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1 leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-[#10B981]/10 border-[#10B981] text-[#065F46]'
                            : 'bg-[#F59E0B]/15 border-[#F59E0B] text-amber-950'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold mr-1">
                            {isCorrect
                              ? 'Mastery Verified!'
                              : 'Socratic Redirect:'}
                          </span>
                          {q.socraticExplanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {workbookTab === 'dialogue' && (
            <div className="space-y-3">
              {topicHistory.length === 0 ? (
                <div className="rounded-xl bg-[#FDFBF7] border-2 border-dashed border-[#C8AE8D] p-5 text-center space-y-3">
                  <p className="text-sm font-serif font-bold text-[#1E293B]">
                    Your ink transcript for {activeNode.code} is fresh
                  </p>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Ask Professor Barnaby below, or tap one of these study prompts to begin a Socratic dialogue:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {[
                      `Explain the intuition behind ${activeNode.title}`,
                      `What are the biggest ${syllabusBoard} exam traps here?`,
                      `Quiz me step by step on ${activeNode.code}`,
                    ].map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => sendMessageToBarnaby(starter)}
                        className="px-3 py-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#FDE047] border border-[#1E293B] text-xs font-semibold text-[#1E293B] transition-colors cursor-pointer"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
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
                            : `Professor Barnaby (${turn.keyUsed || 'KEY_1'})`}
                        </span>
                        <span>{turn.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{turn.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </PersonaMenuStage>
      </div>

      {/* Bottom Interactive Socratic / Feynman Input Bar */}
      <form
        onSubmit={handleSendToBarnaby}
        className="mt-5 pt-3 border-t-2 border-[#E6D5B8] sm:pl-3 flex items-center gap-2"
      >
        <input
          id="barnaby-socratic-input"
          type="text"
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          placeholder={
            tutorMode === 'feynman'
              ? `Explain ${activeNode.title} as if teaching a classmate...`
              : tutorMode === 'exam'
                ? `Write your ${syllabusBoard} steps or ask about exam marks...`
                : `Reply to Professor Barnaby on ${activeNode.title}...`
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#C8AE8D] text-xs sm:text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#1A2E26] shadow-inner"
        />
        <button
          id="barnaby-send-btn"
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] disabled:opacity-50 text-[#FDFBF7] text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-[#1E293B] shadow-[3px_3px_0px_#FDE047] transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-[#FDE047]" />
          <span>{isLoading ? 'Thinking...' : 'Ask Barnaby'}</span>
        </button>
      </form>
    </section>
  );
}
