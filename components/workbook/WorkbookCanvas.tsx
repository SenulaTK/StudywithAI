'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useStudyDeskStore } from '@/lib/store';
import { geminiRotator, type BloomsLevel, type TutorMode } from '@/lib/gemini';
import { chiptuneAudio } from '@/lib/audio';
import { ProfessorBarnaby } from '@/components/barnaby/ProfessorBarnaby';

const MODE_OPTIONS: Array<{
  id: TutorMode;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'socratic',
    label: 'Socratic Guide',
    subtitle: 'Guided first-principles questioning',
    icon: Compass,
  },
  {
    id: 'feynman',
    label: 'Feynman Self-Explanation',
    subtitle: 'Teach Barnaby in plain language',
    icon: MessageSquareQuote,
  },
  {
    id: 'exam',
    label: 'Exam Practice',
    subtitle: 'Mark-scheme precision & M1/A1 checkpoints',
    icon: ClipboardCheck,
  },
];

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  Remember: 'bg-slate-200 text-slate-800 border-slate-300',
  Understand: 'bg-sky-100 text-sky-900 border-sky-300',
  Apply: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Analyze: 'bg-amber-100 text-amber-900 border-amber-300',
  Evaluate: 'bg-purple-100 text-purple-900 border-purple-300',
  Create: 'bg-rose-100 text-rose-900 border-rose-300',
};

export function WorkbookCanvas() {
  const {
    currentSubject,
    syllabusBoard,
    roadmapState,
    activeTopicId,
    tutorMode,
    backpackFiles,
    workbookDialogues,
    setTutorMode,
    setActiveCallState,
    appendDialogueTurn,
    awardXP,
    unlockOrPromoteTopic,
  } = useStudyDeskStore();

  const activeNode =
    roadmapState.find((n) => n.id === activeTopicId) || roadmapState[0];

  const [studentInput, setStudentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [revealedHintsCount, setRevealedHintsCount] = useState(1);
  const [hintsExpanded, setHintsExpanded] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [quizCompletedIds, setQuizCompletedIds] = useState<
    Record<string, boolean>
  >({});
  const [latestBarnabySpeech, setLatestBarnabySpeech] = useState<{
    reply: string;
    socraticFollowUp: string;
    bloomsLevel: BloomsLevel;
    latexFormula: string;
    latexCaption: string;
    hintSteps: string[];
    keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3';
    trigger: number;
  } | null>(null);

  const topicHistory = workbookDialogues[activeNode.id] || [];

  const currentSpeech = latestBarnabySpeech?.reply || activeNode.initialBarnabyGreeting;
  const currentFollowUp =
    latestBarnabySpeech?.socraticFollowUp || activeNode.initialSocraticQuestion;
  const currentLatex = latestBarnabySpeech?.latexFormula || activeNode.coreLatex;
  const currentLatexCaption =
    latestBarnabySpeech?.latexCaption || activeNode.coreLatexCaption;
  const currentHints = latestBarnabySpeech?.hintSteps || activeNode.initialHints;
  const currentBlooms: BloomsLevel =
    latestBarnabySpeech?.bloomsLevel || 'Analyze';
  const currentKey = latestBarnabySpeech?.keyUsed || 'KEY_1';

  const handleSendToBarnaby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim() || isLoading) return;

    const queryText = studentInput.trim();
    setStudentInput('');
    setIsLoading(true);

    const studentTurnId = `turn-user-${Date.now()}`;
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

    setLatestBarnabySpeech({
      reply: response.reply,
      socraticFollowUp: response.socraticFollowUp,
      bloomsLevel: response.bloomsLevel,
      latexFormula: response.latexFormula || activeNode.coreLatex,
      latexCaption: response.latexCaption || activeNode.coreLatexCaption,
      hintSteps: response.hintSteps || activeNode.initialHints,
      keyUsed: response.keyUsed,
      trigger: Date.now(),
    });

    appendDialogueTurn(activeNode.id, {
      id: `turn-barnaby-${Date.now()}`,
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

      // Check if all diagnostic questions for this topic are now solved -> Unlock next topic!
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

  return (
    <section
      aria-label="Middle Panel: Open Workbook Canvas"
      className="workbook-paper-surface relative rounded-2xl border-2 border-[#C8AE8D] p-4 sm:p-5 flex flex-col justify-between h-full min-h-[760px]"
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
        {/* Top Workbook Header: Active Topic Title & Quick Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#E6D5B8] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1A2E26] text-[#FDE047] font-mono text-xs font-bold">
                {activeNode.code}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {currentSubject} • {syllabusBoard} Workbook Folio
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1E293B] mt-0.5">
              {activeNode.title}
            </h2>
          </div>

          {/* Socratic / Feynman / Exam Practice Mode Toggle Cards */}
          <div
            className="flex items-center gap-1.5 bg-[#F5EBE0] p-1 rounded-xl border border-[#D4B996]"
            role="tablist"
            aria-label="Pedagogical Mode Toggle"
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
                    if (mode.id === 'exam') {
                      setActiveCallState('REVISION_TEST');
                    } else {
                      setActiveCallState('IDLE');
                    }
                    chiptuneAudio.playPaperFlip();
                  }}
                  title={mode.subtitle}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1A2E26] text-[#FDFBF7] shadow-sm'
                      : 'text-slate-700 hover:bg-[#FDFBF7]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>{mode.label}</span>
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

        {/* Paperclipped LaTeX Formula Card & Collapsible Scaffolded Hints */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Paperclipped KaTeX Card */}
          <div className="lg:col-span-7 relative rounded-xl bg-[#FFFDF9] border-2 border-[#D4B996] p-3.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] rotate-[-0.4deg]">
            {/* Metallic Paperclip Graphic */}
            <div className="absolute -top-3 right-5 bg-[#F5EBE0] px-2 py-0.5 rounded-full border border-[#B89972] shadow-xs flex items-center gap-1 text-[10px] font-mono font-bold text-[#5D4037]">
              <Paperclip className="w-3.5 h-3.5 -rotate-45 text-slate-700" />
              PAPERCLIPPED FORMULA CARD
            </div>

            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">
              {currentLatexCaption}
            </p>
            <div className="py-2 px-3 rounded-lg bg-[#F8F4EC] border border-[#E6D5B8] overflow-x-auto text-center">
              <BlockMath math={currentLatex} />
            </div>
            <p className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
              <span>Dual-Coding Symbolic Anchor</span>
              <span className="font-mono text-[10px] text-[#10B981] font-semibold">
                KaTeX Verified
              </span>
            </p>
          </div>

          {/* Step-by-Step Collapsible Socratic Hints Card */}
          <div className="lg:col-span-5 rounded-xl bg-[#FDFBF7] border-2 border-[#D4B996] p-3.5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                  Scaffolded Hints ({revealedHintsCount}/{currentHints.length})
                </span>
                <button
                  id="toggle-hints-collapse-btn"
                  onClick={() => setHintsExpanded(!hintsExpanded)}
                  className="p-1 rounded hover:bg-slate-200/60 text-slate-600 cursor-pointer"
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
                <ol className="mt-2 space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
                  {currentHints
                    .slice(0, revealedHintsCount)
                    .map((hint, idx) => (
                      <li
                        key={idx}
                        className="p-1.5 rounded bg-[#F5EBE0]/70 border border-[#E6D5B8] leading-snug"
                      >
                        {hint}
                      </li>
                    ))}
                </ol>
              )}
            </div>

            {revealedHintsCount < currentHints.length && (
              <button
                id="reveal-next-hint-btn"
                onClick={() => {
                  setRevealedHintsCount((c) =>
                    Math.min(currentHints.length, c + 1)
                  );
                  chiptuneAudio.playPaperFlip();
                }}
                className="mt-2 w-full py-1.5 rounded-lg bg-[#F5EBE0] hover:bg-[#E6D5B8] text-[#1E293B] font-semibold text-xs border border-[#C8AE8D] transition-colors cursor-pointer"
              >
                Unfold Next Diagnostic Hint (+1 Step)
              </button>
            )}
          </div>
        </div>

        {/* Instant Diagnostic Quizzes with Bloom's Taxonomy Stratification */}
        <div className="rounded-xl bg-[#F9F5EB] border-2 border-[#D4B996] p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#1E293B]">
                Instant Diagnostic Mastery Quiz (Bloom&apos;s Taxonomy Stratified)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1">
              <Unlock className="w-3 h-3 text-[#10B981]" />
              Solve all to promote Crown &amp; unlock next Topic Node
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeNode.diagnosticQuestions.map((q, qIdx) => {
              const chosenIdx = selectedAnswers[q.id];
              const isAnswered = chosenIdx !== undefined;
              const isCorrect = chosenIdx === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className="rounded-xl bg-[#FDFBF7] border border-[#D4B996] p-3 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Diagnostic Check #{qIdx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          BLOOMS_COLORS[q.bloomsLevel]
                        }`}
                      >
                        Bloom&apos;s: {q.bloomsLevel}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FDE047]/40 text-amber-950 border border-amber-300 flex items-center gap-1">
                        <Award className="w-3 h-3" />+{q.xpReward} XP
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-[#1E293B]">
                    {q.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isThisSelected = chosenIdx === optIdx;
                      const showRight = isAnswered && optIdx === q.correctIndex;
                      const showWrong =
                        isThisSelected && optIdx !== q.correctIndex;

                      return (
                        <button
                          key={optIdx}
                          id={`quiz-${q.id}-opt-${optIdx}`}
                          onClick={() =>
                            handleSelectQuizOption(
                              q.id,
                              optIdx,
                              q.correctIndex,
                              q.xpReward
                            )
                          }
                          className={`text-left p-2.5 rounded-lg border text-xs font-medium transition-all flex items-start gap-2 cursor-pointer ${
                            showRight
                              ? 'bg-[#10B981]/15 border-[#10B981] text-[#065F46] font-semibold'
                              : showWrong
                                ? 'bg-[#EF4444]/15 border-[#EF4444] text-red-900'
                                : 'bg-white hover:bg-[#F5EBE0]/60 border-slate-300 text-slate-800'
                          }`}
                        >
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
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
        </div>

        {/*Recent Workbook Socratic Dialogue Log */}
        {topicHistory.length > 0 && (
          <div className="rounded-xl bg-[#FDFBF7] border border-[#D4B996] p-3 space-y-2 max-h-44 overflow-y-auto">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              Workbook Ink Transcript ({topicHistory.length} turns)
            </h4>
            {topicHistory.map((turn) => (
              <div
                key={turn.id}
                className={`p-2 rounded-lg text-xs ${
                  turn.role === 'student'
                    ? 'bg-[#F5EBE0] text-[#1E293B] ml-6 border border-[#D4B996]'
                    : 'bg-[#1A2E26] text-[#FDFBF7] mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 font-mono mb-0.5">
                  <span>
                    {turn.role === 'student'
                      ? 'You (Scholar)'
                      : `Professor Barnaby (${turn.keyUsed || 'KEY_1'})`}
                  </span>
                  <span>{turn.timestamp}</span>
                </div>
                <p>{turn.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Interactive Socratic / Feynman Input Bar */}
      <form
        onSubmit={handleSendToBarnaby}
        className="mt-4 pt-3 border-t-2 border-[#E6D5B8] sm:pl-3 flex items-center gap-2"
      >
        <input
          id="barnaby-socratic-input"
          type="text"
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          placeholder={
            tutorMode === 'feynman'
              ? `Explain ${activeNode.title} in your own words as if teaching a 12-year-old...`
              : tutorMode === 'exam'
                ? `Write your ${syllabusBoard} step-by-step derivation or ask about mark-scheme traps...`
                : `Respond to Professor Barnaby's Socratic question on ${activeNode.title}...`
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#C8AE8D] text-xs sm:text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#1A2E26] shadow-inner"
        />
        <button
          id="barnaby-send-btn"
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#1A2E26] hover:bg-[#243F35] disabled:opacity-50 text-[#FDFBF7] text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-[#FDE047]" />
          <span>{isLoading ? 'Thinking...' : 'Ask Barnaby'}</span>
        </button>
      </form>
    </section>
  );
}
