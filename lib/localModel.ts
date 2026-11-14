import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm';
import {
  BARNABY_SYSTEM_PROMPT,
  rankRelevantRagChunks,
  type AskBarnabyParams,
  type BarnabyResponse,
  type BloomsLevel,
} from './gemini';

export interface LocalModelOption {
  id: string;
  label: string;
  sizeLabel: string;
  description: string;
}

export const LOCAL_MODEL_OPTIONS: LocalModelOption[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B (Fastest)',
    sizeLabel: '~880 MB',
    description: 'Quickest download and lowest VRAM usage for everyday study.',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 1.5B (Balanced)',
    sizeLabel: '~1.1 GB',
    description: 'Stronger structured JSON & STEM reasoning in-browser.',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B (Highest Quality)',
    sizeLabel: '~2.2 GB',
    description: 'Best local Socratic depth; requires ~3 GB+ GPU memory.',
  },
];

export const DEFAULT_LOCAL_MODEL_ID = LOCAL_MODEL_OPTIONS[0].id;

let engineInstance: MLCEngineInterface | null = null;
let loadedModelId: string | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;

export function isWebGPUSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'gpu' in navigator;
}

export function getLoadedLocalModelId(): string | null {
  return loadedModelId;
}

export async function loadLocalModel(
  modelId: string,
  onProgress?: (report: { progress: number; text: string }) => void
): Promise<MLCEngineInterface> {
  if (!isWebGPUSupported()) {
    throw new Error(
      'WebGPU is not supported in this browser. Try Chrome, Edge, or Safari 18+ on a WebGPU-capable device.'
    );
  }

  if (engineInstance && loadedModelId === modelId) {
    return engineInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const webllm = await import('@mlc-ai/web-llm');

    if (engineInstance) {
      await engineInstance.unload().catch(() => {});
      engineInstance = null;
      loadedModelId = null;
    }

    const engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report: InitProgressReport) => {
        onProgress?.({
          progress: Math.round((report.progress || 0) * 100),
          text: report.text || 'Initializing WebGPU model...',
        });
      },
    });

    engineInstance = engine;
    loadedModelId = modelId;
    return engine;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export async function unloadLocalModel(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload().catch(() => {});
    engineInstance = null;
    loadedModelId = null;
  }
}

function validateBlooms(val: unknown): BloomsLevel {
  const valid: BloomsLevel[] = [
    'Remember',
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create',
  ];
  if (typeof val === 'string' && valid.includes(val as BloomsLevel)) {
    return val as BloomsLevel;
  }
  return 'Analyze';
}

function parseLocalJsonOrFallback(rawText: string): {
  reply: string;
  bloomsLevel: BloomsLevel;
  socraticFollowUp: string;
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
  quizQuestion?: BarnabyResponse['quizQuestion'];
} {
  const trimmed = rawText.trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const rawQuiz =
        parsed.quizQuestion &&
        typeof parsed.quizQuestion === 'object' &&
        !Array.isArray(parsed.quizQuestion)
          ? (parsed.quizQuestion as Record<string, unknown>)
          : null;
      const validOptions =
        rawQuiz && Array.isArray(rawQuiz.options)
          ? rawQuiz.options
              .filter(
                (o): o is string => typeof o === 'string' && o.trim().length > 0
              )
              .slice(0, 4)
          : [];
      const quizQuestion =
        rawQuiz &&
        typeof rawQuiz.question === 'string' &&
        rawQuiz.question.trim().length > 0 &&
        validOptions.length >= 2
          ? {
              question: rawQuiz.question.trim(),
              options: validOptions,
              correctIndex: Math.min(
                Math.max(0, Number(rawQuiz.correctIndex) || 0),
                validOptions.length - 1
              ),
              socraticExplanation:
                typeof rawQuiz.socraticExplanation === 'string' &&
                rawQuiz.socraticExplanation.trim()
                  ? rawQuiz.socraticExplanation.trim()
                  : 'Verified from topic principles.',
              bloomsLevel: validateBlooms(parsed.bloomsLevel),
            }
          : undefined;

      return {
        reply:
          typeof parsed.reply === 'string' && parsed.reply.trim()
            ? parsed.reply.trim()
            : 'Let us examine how the key ideas in this topic connect.',
        bloomsLevel: validateBlooms(parsed.bloomsLevel),
        socraticFollowUp:
          typeof parsed.socraticFollowUp === 'string' &&
          parsed.socraticFollowUp.trim()
            ? parsed.socraticFollowUp.trim()
            : 'What reasoning step comes next from here?',
        latexFormula:
          typeof parsed.latexFormula === 'string' && parsed.latexFormula.trim()
            ? parsed.latexFormula.trim()
            : undefined,
        latexCaption:
          typeof parsed.latexCaption === 'string' && parsed.latexCaption.trim()
            ? parsed.latexCaption.trim()
            : undefined,
        hintSteps: Array.isArray(parsed.hintSteps)
          ? parsed.hintSteps.filter((h): h is string => typeof h === 'string')
          : undefined,
        quizQuestion,
      };
    }
  } catch {
    // Small local models occasionally emit plain prose instead of strict JSON.
  }

  return {
    reply:
      trimmed ||
      'Let us break this concept down step by step together.',
    bloomsLevel: 'Understand',
    socraticFollowUp:
      'How would you explain this idea in your own words?',
  };
}

export async function askBarnabyLocal(
  params: AskBarnabyParams,
  modelId: string,
  onProgress?: (report: { progress: number; text: string }) => void
): Promise<BarnabyResponse> {
  const engine = await loadLocalModel(modelId, onProgress);

  const rankedRag = rankRelevantRagChunks(
    params.ragContext || [],
    params.userMessage,
    params.topicTitle,
    3
  );

  const modeDirective =
    params.mode === 'socratic'
      ? 'Mode: Socratic Guide. Break the concept into an intuitive mental model and ask one targeted question.'
      : params.mode === 'feynman'
        ? 'Mode: Feynman Self-Explanation. Ask the student to explain the mechanism in plain language as if teaching a peer.'
        : 'Mode: Exam Practice. Frame your guidance around precision, justification steps, and common pitfalls.';

  const ragSnippet =
    rankedRag.length > 0
      ? `\n\nRELEVANT NOTES:\n${rankedRag.join('\n---\n')}`
      : '';

  const historySnippet =
    params.conversationHistory && params.conversationHistory.length > 0
      ? `\n\nRECENT DIALOGUE:\n${params.conversationHistory
          .slice(-3)
          .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
          .join('\n')}`
      : '';

  const trackLabel = params.syllabusBoard ? ` (${params.syllabusBoard})` : '';
  const userPrompt = `Notebook: ${params.subject}${trackLabel}
Active Topic: ${params.topicTitle}
${modeDirective}${ragSnippet}${historySnippet}

Student Input: "${params.userMessage}"

Respond ONLY with valid JSON.`;

  const completion = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: BARNABY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 700,
    response_format: { type: 'json_object' },
  });

  const rawText = completion.choices?.[0]?.message?.content || '';
  const parsed = parseLocalJsonOrFallback(rawText);

  return {
    ...parsed,
    keyUsed: 'LOCAL_WEBGPU',
    retriesAttempted: 0,
  };
}
