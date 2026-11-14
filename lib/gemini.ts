import { GoogleGenAI } from '@google/genai';
import { CUSTOM_GEMINI_KEYS_STORAGE_KEY } from './storage';

export type BloomsLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create';

export type TutorMode = 'socratic' | 'feynman' | 'exam';

export interface KeySlotStatus {
  id: 'KEY_1' | 'KEY_2' | 'KEY_3';
  envName: string;
  configured: boolean;
  source: 'server-env' | 'browser-key' | 'none';
  requestCount: number;
  lastStatus: 'IDLE' | 'ACTIVE' | 'RATE_LIMITED_429' | 'ERROR_500' | 'HEALTHY';
  lastUsedAt: number | null;
  cooldownUntil: number | null;
}

export interface BarnabyGeneratedQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  socraticExplanation: string;
  bloomsLevel?: BloomsLevel;
}

export interface BarnabyResponse {
  reply: string;
  bloomsLevel: BloomsLevel;
  socraticFollowUp: string;
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
  quizQuestion?: BarnabyGeneratedQuizItem;
  keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3' | 'LOCAL_WEBGPU';
  retriesAttempted: number;
}

export interface AskBarnabyParams {
  userMessage: string;
  subject: string;
  topicTitle: string;
  syllabusBoard: string;
  mode: TutorMode;
  ragContext?: string[];
  conversationHistory?: Array<{ role: 'user' | 'barnaby'; text: string }>;
  customKeys?: [string, string, string];
}

export class GeminiConfigError extends Error {
  public readonly code: 'NO_API_KEY' | 'GEMINI_REQUEST_FAILED';
  public readonly statusCode: number;

  constructor(
    code: 'NO_API_KEY' | 'GEMINI_REQUEST_FAILED',
    message: string,
    statusCode = 400
  ) {
    super(message);
    this.name = 'GeminiConfigError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const GEMINI_MODEL = 'gemini-3.8-flash' as const;

const BARNABY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description:
        'Main Socratic explanation and encouragement (2-4 concise sentences, natural English only). You may use $...$ for inline KaTeX math.',
    },
    bloomsLevel: {
      type: 'string',
      enum: [
        'Remember',
        'Understand',
        'Apply',
        'Analyze',
        'Evaluate',
        'Create',
      ],
    },
    socraticFollowUp: {
      type: 'string',
      description:
        'A specific diagnostic question prompting the student next cognitive step.',
    },
    latexFormula: {
      type: 'string',
      description:
        'Optional KaTeX math formula (without surrounding $ signs) illustrating the core equation if relevant.',
    },
    latexCaption: {
      type: 'string',
      description: 'Short label for the paperclipped formula card.',
    },
    hintSteps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional 1-3 step-by-step study nudges.',
    },
    quizQuestion: {
      type: 'object',
      description:
        'Optional 4-option multiple choice check-for-understanding question for the student.',
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          items: { type: 'string' },
        },
        correctIndex: {
          type: 'integer',
          description: '0-based index of the correct option (0 to 3).',
        },
        socraticExplanation: {
          type: 'string',
          description: 'Why the correct option holds from first principles.',
        },
      },
      required: ['question', 'options', 'correctIndex', 'socraticExplanation'],
    },
  },
  required: ['reply', 'bloomsLevel', 'socraticFollowUp'],
};

interface InteractionTextShape {
  status?: string;
  errors?: Array<{ message?: string }>;
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function extractInteractionText(interaction: InteractionTextShape): string {
  if (
    typeof interaction.output_text === 'string' &&
    interaction.output_text.trim()
  ) {
    return interaction.output_text.trim();
  }
  const collected: string[] = [];
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (const part of step.content) {
      if (part.type === 'text' && typeof part.text === 'string') {
        collected.push(part.text);
      }
    }
  }
  return collected.join('').trim();
}

function parseBarnabyJson(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini 3.8 Flash returned non-object JSON payload.');
  }
  return parsed as Record<string, unknown>;
}

export const BARNABY_SYSTEM_PROMPT = `You are Professor Barnaby, a warm, scholarly paper-craft owl and Socratic AI teacher perched on a student's tactile wooden study desk.

CORE PEDAGOGICAL DIRECTIVES:
1. Always act as a supportive, encouraging Socratic tutor grounded in Cognitive Load Theory, Dual Coding Theory, and Gamified Active Mastery.
2. Guide students through diagnostic steps instead of dumping final answers. Ask one incisive, scaffolded guiding question at the end of every turn.
3. Scaffold your explanations and questions explicitly according to Bloom's Taxonomy (Remember -> Understand -> Apply -> Analyze -> Evaluate -> Create).
4. Keep explanations crisp, structured, and vivid. Use $...$ for inline LaTeX math symbols when referencing variables or equations in prose.
5. CRITICAL SPEECH RULE: Output ONLY clean, natural, articulate human English prose. NEVER write literal owl sound effects or robotic noises into the written text (your Web Audio synthesizer handles the chiptune voice separately).

Respond in valid JSON matching this schema:
{
  "reply": "Main Socratic explanation and encouragement (2-4 concise sentences, natural English only).",
  "bloomsLevel": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "socraticFollowUp": "A specific diagnostic question prompting the student's next cognitive step.",
  "latexFormula": "Optional KaTeX string (without surrounding $ signs) illustrating the core equation if relevant to the topic.",
  "latexCaption": "Short label for the paperclipped formula card.",
  "hintSteps": ["Step 1 subtle nudge", "Step 2 intermediate bridge", "Step 3 structural check"],
  "quizQuestion": {
    "question": "Check-for-understanding question stem",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "socraticExplanation": "Brief explanation of why this option is correct"
  }
}`;

export function rankRelevantRagChunks(
  chunks: string[],
  query: string,
  topicTitle: string,
  topK = 4
): string[] {
  if (!chunks || chunks.length <= topK) return chunks || [];
  const terms = `${query} ${topicTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = chunks.map((chunk, idx) => {
    const lower = chunk.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) score += 2;
    }
    return { chunk, score, idx };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.slice(0, topK).map((s) => s.chunk);
}

class GeminiKeyRotator {
  private currentIndex = 0;
  private customKeys: [string, string, string] = ['', '', ''];
  private serverEnvConfigured: [boolean, boolean, boolean] = [false, false, false];
  private slots: KeySlotStatus[] = [
    {
      id: 'KEY_1',
      envName: 'GEMINI_KEY_1 / GEMINI_API_KEY',
      configured: false,
      source: 'none',
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
    {
      id: 'KEY_2',
      envName: 'GEMINI_KEY_2',
      configured: false,
      source: 'none',
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
    {
      id: 'KEY_3',
      envName: 'GEMINI_KEY_3',
      configured: false,
      source: 'none',
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
  ];

  private getRawKeys(
    overrideKeys?: [string, string, string]
  ): [string, string, string] {
    const source = overrideKeys || this.customKeys;
    const env1 =
      typeof process !== 'undefined'
        ? process.env.GEMINI_KEY_1 ||
          process.env.NEXT_PUBLIC_GEMINI_KEY_1 ||
          process.env.GEMINI_API_KEY ||
          ''
        : '';
    const env2 =
      typeof process !== 'undefined'
        ? process.env.GEMINI_KEY_2 ||
          process.env.NEXT_PUBLIC_GEMINI_KEY_2 ||
          ''
        : '';
    const env3 =
      typeof process !== 'undefined'
        ? process.env.GEMINI_KEY_3 ||
          process.env.NEXT_PUBLIC_GEMINI_KEY_3 ||
          ''
        : '';

    const k1 = (source[0] || env1).trim();
    const k2 = (source[1] || env2).trim();
    const k3 = (source[2] || env3).trim();
    return [k1, k2, k3];
  }

  public hydrateCustomKeysFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(CUSTOM_GEMINI_KEYS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3) {
        this.customKeys = [
          String(parsed[0] || '').trim(),
          String(parsed[1] || '').trim(),
          String(parsed[2] || '').trim(),
        ];
        this.refreshSlotConfig();
        return this.customKeys.some((k) => k.length >= 8);
      }
    } catch {
      // Ignore malformed storage
    }
    return false;
  }

  public setCustomKeys(keys: [string, string, string]) {
    this.customKeys = [
      (keys[0] || '').trim(),
      (keys[1] || '').trim(),
      (keys[2] || '').trim(),
    ];
    if (typeof window !== 'undefined') {
      try {
        if (this.customKeys.some((k) => k.length > 0)) {
          window.localStorage.setItem(
            CUSTOM_GEMINI_KEYS_STORAGE_KEY,
            JSON.stringify(this.customKeys)
          );
        } else {
          window.localStorage.removeItem(CUSTOM_GEMINI_KEYS_STORAGE_KEY);
        }
      } catch {
        // Ignore storage restrictions
      }
    }
    this.refreshSlotConfig();
  }

  public clearCustomKeys() {
    this.customKeys = ['', '', ''];
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(CUSTOM_GEMINI_KEYS_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    this.refreshSlotConfig();
  }

  public getCustomKeys(): [string, string, string] {
    return [...this.customKeys] as [string, string, string];
  }

  public setServerEnvStatus(serverConfigured: [boolean, boolean, boolean]) {
    this.serverEnvConfigured = serverConfigured;
    this.refreshSlotConfig();
  }

  public hasAnyConfiguredKey(): boolean {
    const raw = this.getRawKeys();
    return (
      raw.some((k) => k.length >= 8) || this.serverEnvConfigured.some(Boolean)
    );
  }

  public refreshSlotConfig(
    overrideKeys?: [string, string, string]
  ): KeySlotStatus[] {
    const raw = this.getRawKeys(overrideKeys);
    this.slots.forEach((slot, idx) => {
      const hasCustom = raw[idx].length >= 8;
      const hasServer = this.serverEnvConfigured[idx];
      slot.configured = hasCustom || hasServer;
      slot.source = hasCustom
        ? typeof window !== 'undefined' && !overrideKeys
          ? 'browser-key'
          : overrideKeys && overrideKeys[idx]?.trim().length >= 8
            ? 'browser-key'
            : 'server-env'
        : hasServer
          ? 'server-env'
          : 'none';
      if (slot.cooldownUntil !== null && Date.now() > slot.cooldownUntil) {
        slot.cooldownUntil = null;
        slot.lastStatus = 'HEALTHY';
      }
    });
    return this.slots.map((s) => ({ ...s }));
  }

  public getTelemetry(): {
    slots: KeySlotStatus[];
    nextSlot: 'KEY_1' | 'KEY_2' | 'KEY_3';
    anyConfigured: boolean;
  } {
    const slots = this.refreshSlotConfig();
    return {
      slots,
      nextSlot: this.slots[this.currentIndex].id,
      anyConfigured: slots.some((s) => s.configured),
    };
  }

  public async fetchServerKeyStatus(): Promise<{
    anyConfigured: boolean;
    slots: KeySlotStatus[];
  }> {
    if (typeof window === 'undefined') {
      const t = this.getTelemetry();
      return { anyConfigured: t.anyConfigured, slots: t.slots };
    }
    this.hydrateCustomKeysFromStorage();
    try {
      const res = await fetch('/api/barnaby', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as {
          slots?: Array<{ id: string; configured: boolean }>;
        };
        if (Array.isArray(data.slots) && data.slots.length === 3) {
          this.setServerEnvStatus([
            Boolean(data.slots[0]?.configured),
            Boolean(data.slots[1]?.configured),
            Boolean(data.slots[2]?.configured),
          ]);
        }
      }
    } catch {
      // Ignore network inspection failure; rely on local telemetry
    }
    const telemetry = this.getTelemetry();
    return { anyConfigured: telemetry.anyConfigured, slots: telemetry.slots };
  }

  /**
   * Sends a student prompt through the `/api/barnaby` server proxy backed by the Gemini 3.8 Flash Interactions API.
   * Throws GeminiConfigError when no key is available or if all configured keys fail.
   */
  public async askBarnaby(params: AskBarnabyParams): Promise<BarnabyResponse> {
    if (typeof window !== 'undefined') {
      this.hydrateCustomKeysFromStorage();
      const res = await fetch('/api/barnaby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          customKeys: this.customKeys,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errCode =
          data?.code === 'NO_API_KEY' ? 'NO_API_KEY' : 'GEMINI_REQUEST_FAILED';
        throw new GeminiConfigError(
          errCode,
          data?.error || data?.message || 'Gemini request failed.',
          res.status
        );
      }

      const typed = data as BarnabyResponse;
      const slotIdx = this.slots.findIndex((s) => s.id === typed.keyUsed);
      if (slotIdx !== -1) {
        this.slots[slotIdx].requestCount += 1;
        this.slots[slotIdx].lastStatus = 'HEALTHY';
        this.slots[slotIdx].lastUsedAt = Date.now();
      }
      this.currentIndex = (this.currentIndex + 1) % 3;
      return typed;
    }

    return this.executeWithRotator(params);
  }

  /**
   * Executes the 3-key round-robin selector with automated failover retry logic on 429/500 errors.
   */
  public async executeWithRotator(
    params: AskBarnabyParams
  ): Promise<BarnabyResponse> {
    const rawKeys = this.getRawKeys(params.customKeys);
    this.refreshSlotConfig(params.customKeys);

    const anyKeyConfigured = rawKeys.some((k) => k.length >= 8);
    if (!anyKeyConfigured) {
      throw new GeminiConfigError(
        'NO_API_KEY',
        'No Gemini API key is configured. Add a key in Desk Locker or set GEMINI_KEY_1 in Vercel environment variables.',
        401
      );
    }

    const rankedRag = rankRelevantRagChunks(
      params.ragContext || [],
      params.userMessage,
      params.topicTitle,
      4
    );

    const maxAttempts = 3;
    let retriesAttempted = 0;
    let lastErrorMsg = 'All configured Gemini API key slots failed.';
    let lastHttpStatus = 502;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slotIndex = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % 3;

      const slot = this.slots[slotIndex];
      const apiKey = rawKeys[slotIndex];

      if (!apiKey || apiKey.length < 8) {
        retriesAttempted++;
        continue;
      }

      if (
        slot.cooldownUntil &&
        Date.now() < slot.cooldownUntil &&
        attempt < maxAttempts - 1
      ) {
        retriesAttempted++;
        continue;
      }

      slot.requestCount += 1;
      slot.lastUsedAt = Date.now();
      slot.lastStatus = 'ACTIVE';

      try {
        const ai = new GoogleGenAI({ apiKey });
        const modeDirective =
          params.mode === 'socratic'
            ? 'Mode: Socratic Guide. Break the concept into an intuitive mental model and ask one targeted question.'
            : params.mode === 'feynman'
              ? 'Mode: Feynman Self-Explanation. Ask the student to explain the mechanism in plain language as if teaching a peer, and gently spot any hidden assumptions.'
              : 'Mode: Exam Practice. Frame your guidance around precision, justification steps, and common pitfalls.';

        const ragSnippet =
          rankedRag.length > 0
            ? `\n\nTOP RELEVANT UPLOADED NOTES:\n${rankedRag.join('\n---\n')}`
            : '';

        const historySnippet =
          params.conversationHistory && params.conversationHistory.length > 0
            ? `\n\nRECENT WORKBOOK DIALOGUE:\n${params.conversationHistory
                .slice(-4)
                .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
                .join('\n')}`
            : '';

        const trackLabel = params.syllabusBoard
          ? ` (${params.syllabusBoard})`
          : '';
        const prompt = `Notebook: ${params.subject}${trackLabel}
Active Topic: ${params.topicTitle}
${modeDirective}${ragSnippet}${historySnippet}

Student Input: "${params.userMessage}"`;

        const interaction = await ai.interactions.create(
          {
            model: GEMINI_MODEL,
            system_instruction: BARNABY_SYSTEM_PROMPT,
            input: prompt,
            store: false,
            generation_config: {
              thinking_level: 'low',
            },
            response_format: {
              type: 'text',
              mime_type: 'application/json',
              schema: BARNABY_RESPONSE_SCHEMA,
            },
          },
          { retries: { strategy: 'none' } }
        );

        if (
          interaction.status === 'failed' ||
          (interaction.errors && interaction.errors.length > 0)
        ) {
          throw new Error(
            interaction.errors?.[0]?.message ||
              'Gemini 3.8 Flash interaction failed.'
          );
        }

        const text = extractInteractionText(interaction);
        if (!text) {
          throw new Error('Gemini 3.8 Flash returned an empty response.');
        }

        const parsed = parseBarnabyJson(text);
        slot.lastStatus = 'HEALTHY';

        const rawQuiz =
          parsed.quizQuestion &&
          typeof parsed.quizQuestion === 'object' &&
          !Array.isArray(parsed.quizQuestion)
            ? (parsed.quizQuestion as Record<string, unknown>)
            : null;
        const validOptions =
          rawQuiz && Array.isArray(rawQuiz.options)
            ? rawQuiz.options
                .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
                .slice(0, 4)
            : [];
        const parsedQuizQuestion: BarnabyGeneratedQuizItem | undefined =
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
                bloomsLevel: this.validateBlooms(parsed.bloomsLevel),
              }
            : undefined;

        return {
          reply:
            typeof parsed.reply === 'string' && parsed.reply.trim()
              ? parsed.reply.trim()
              : 'Let us examine how the key ideas in this topic connect.',
          bloomsLevel: this.validateBlooms(parsed.bloomsLevel),
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
            ? parsed.hintSteps.filter((h: unknown) => typeof h === 'string')
            : undefined,
          quizQuestion: parsedQuizQuestion,
          keyUsed: slot.id,
          retriesAttempted,
        };
      } catch (err: unknown) {
        const errObj =
          typeof err === 'object' && err !== null
            ? (err as { status?: unknown; statusCode?: unknown })
            : {};
        const status = Number(errObj.status ?? errObj.statusCode ?? 0) || 0;
        const message = err instanceof Error ? err.message : String(err);
        const lowerMessage = message.toLowerCase();

        const is429 =
          status === 429 ||
          message.includes('429') ||
          lowerMessage.includes('quota') ||
          lowerMessage.includes('rate');
        const isAuth =
          status === 401 ||
          status === 403 ||
          lowerMessage.includes('api key') ||
          lowerMessage.includes('api_key') ||
          lowerMessage.includes('permission');

        if (is429) {
          slot.lastStatus = 'RATE_LIMITED_429';
          slot.cooldownUntil = Date.now() + 30_000;
          lastHttpStatus = 429;
          lastErrorMsg =
            'Gemini API rate limit reached on configured keys. Try again shortly or add another key slot in Desk Locker.';
        } else if (isAuth) {
          slot.lastStatus = 'ERROR_500';
          lastHttpStatus = 401;
          lastErrorMsg =
            'Gemini rejected the API key. Check your key in Desk Locker.';
        } else {
          slot.lastStatus = 'ERROR_500';
          slot.cooldownUntil = Date.now() + 15_000;
          lastHttpStatus = status === 400 || status === 404 ? status : 502;
          lastErrorMsg = message || 'Upstream Gemini service error.';
        }

        retriesAttempted++;
      }
    }

    throw new GeminiConfigError(
      'GEMINI_REQUEST_FAILED',
      lastErrorMsg,
      lastHttpStatus
    );
  }

  private validateBlooms(val: unknown): BloomsLevel {
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
}

export const geminiRotator = new GeminiKeyRotator();
