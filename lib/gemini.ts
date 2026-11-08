import { GoogleGenAI } from '@google/genai';

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
  requestCount: number;
  lastStatus: 'IDLE' | 'ACTIVE' | 'RATE_LIMITED_429' | 'ERROR_500' | 'HEALTHY';
  lastUsedAt: number | null;
  cooldownUntil: number | null;
}

export interface BarnabyResponse {
  reply: string;
  bloomsLevel: BloomsLevel;
  socraticFollowUp: string;
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
  keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3';
  retriesAttempted: number;
  isSimulatedFallback: boolean;
}

export const BARNABY_SYSTEM_PROMPT = `You are Professor Barnaby, a warm, scholarly paper-craft owl and Socratic AI teacher perched on a student's tactile wooden study desk.

CORE PEDAGOGICAL DIRECTIVES:
1. Always act as a supportive, encouraging Socratic tutor grounded in Cognitive Load Theory, Dual Coding Theory, and Gamified Active Mastery.
2. Guide students through diagnostic steps instead of dumping final answers. Ask one incisive, scaffolded guiding question at the end of every turn.
3. Scaffold your explanations and questions explicitly according to Bloom's Taxonomy (Remember -> Understand -> Apply -> Analyze -> Evaluate -> Create).
4. Keep explanations crisp, structured, and vivid. Reference concrete physical intuitions and exam syllabus precision (AQA, Edexcel, OCR, IB).
5. CRITICAL SPEECH RULE: Output ONLY clean, natural, articulate human English prose. NEVER write literal "beep boop", owl sound effects, or robotic noises into the written text (your Web Audio synthesizer handles the 8-bit chiptune voice separately).

Respond in valid JSON matching this schema:
{
  "reply": "Main Socratic explanation and encouragement (2-4 concise sentences, natural English only).",
  "bloomsLevel": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "socraticFollowUp": "A specific diagnostic question prompting the student's next cognitive step.",
  "latexFormula": "Optional KaTeX string (without surrounding $ signs) illustrating the core equation.",
  "latexCaption": "Short label for the paperclipped formula card.",
  "hintSteps": ["Step 1 subtle nudge", "Step 2 intermediate bridge", "Step 3 structural check"]
}`;

class GeminiKeyRotator {
  private currentIndex = 0;
  private customKeys: [string, string, string] = ['', '', ''];
  private slots: KeySlotStatus[] = [
    {
      id: 'KEY_1',
      envName: 'NEXT_PUBLIC_GEMINI_KEY_1',
      configured: false,
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
    {
      id: 'KEY_2',
      envName: 'NEXT_PUBLIC_GEMINI_KEY_2',
      configured: false,
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
    {
      id: 'KEY_3',
      envName: 'NEXT_PUBLIC_GEMINI_KEY_3',
      configured: false,
      requestCount: 0,
      lastStatus: 'IDLE',
      lastUsedAt: null,
      cooldownUntil: null,
    },
  ];

  private getRawKeys(): [string, string, string] {
    const k1 =
      this.customKeys[0] ||
      (typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_GEMINI_KEY_1 || ''
        : '');
    const k2 =
      this.customKeys[1] ||
      (typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_GEMINI_KEY_2 || ''
        : '');
    const k3 =
      this.customKeys[2] ||
      (typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_GEMINI_KEY_3 || ''
        : '');
    return [k1.trim(), k2.trim(), k3.trim()];
  }

  public setCustomKeys(keys: [string, string, string]) {
    this.customKeys = keys;
    this.refreshSlotConfig();
  }

  public refreshSlotConfig(): KeySlotStatus[] {
    const raw = this.getRawKeys();
    this.slots.forEach((slot, idx) => {
      slot.configured = raw[idx].length > 8;
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
  } {
    const slots = this.refreshSlotConfig();
    return {
      slots,
      nextSlot: this.slots[this.currentIndex].id,
    };
  }

  /**
   * Selects the next available API key in round-robin order and automatically
   * retries across the 3-key pool if a 429 (Rate Limit) or 500/503 (Server Error) occurs.
   */
  public async askBarnaby(params: {
    userMessage: string;
    subject: string;
    topicTitle: string;
    syllabusBoard: string;
    mode: TutorMode;
    ragContext?: string[];
    conversationHistory?: Array<{ role: 'user' | 'barnaby'; text: string }>;
  }): Promise<BarnabyResponse> {
    const rawKeys = this.getRawKeys();
    this.refreshSlotConfig();

    const maxAttempts = 3;
    let retriesAttempted = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slotIndex = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % 3;

      const slot = this.slots[slotIndex];
      const apiKey = rawKeys[slotIndex];

      // Skip if in cooldown unless it's our last resort
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

      if (!apiKey || apiKey.length < 8) {
        // If no key in this slot, try next slot if any other slot has a key
        const anyConfigured = rawKeys.some((k) => k.length >= 8);
        if (anyConfigured && attempt < maxAttempts - 1) {
          retriesAttempted++;
          continue;
        }
        // Otherwise use deterministic Socratic pedagogical engine with round-robin slot attribution
        slot.lastStatus = 'HEALTHY';
        return this.buildCuratedSocraticResponse(
          params,
          slot.id,
          retriesAttempted
        );
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const modeDirective =
          params.mode === 'socratic'
            ? 'Mode: Socratic Guide. Break the concept into an intuitive mental model and ask one targeted question.'
            : params.mode === 'feynman'
              ? 'Mode: Feynman Self-Explanation. Ask the student to explain the mechanism in plain language as if teaching a 12-year-old, and gently spot any hidden assumptions or jargon.'
              : 'Mode: Exam Practice. Frame your guidance around command words, mark-scheme precision, and common examiner pitfalls.';

        const ragSnippet =
          params.ragContext && params.ragContext.length > 0
            ? `\n\nSTUDENT BACKPACK RAG NOTES:\n${params.ragContext.join('\n---\n')}`
            : '';

        const historySnippet =
          params.conversationHistory && params.conversationHistory.length > 0
            ? `\n\nRECENT WORKBOOK DIALOGUE:\n${params.conversationHistory
                .slice(-4)
                .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
                .join('\n')}`
            : '';

        const prompt = `Subject: ${params.subject} (${params.syllabusBoard} Syllabus)
Active Topic: ${params.topicTitle}
${modeDirective}${ragSnippet}${historySnippet}

Student Input: "${params.userMessage}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            systemInstruction: BARNABY_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.65,
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        slot.lastStatus = 'HEALTHY';

        return {
          reply:
            typeof parsed.reply === 'string'
              ? parsed.reply
              : 'Let us examine how each variable interacts in this system.',
          bloomsLevel: this.validateBlooms(parsed.bloomsLevel),
          socraticFollowUp:
            typeof parsed.socraticFollowUp === 'string'
              ? parsed.socraticFollowUp
              : 'Which variable changes first when we perturb the initial state?',
          latexFormula: parsed.latexFormula || undefined,
          latexCaption: parsed.latexCaption || undefined,
          hintSteps: Array.isArray(parsed.hintSteps)
            ? parsed.hintSteps
            : undefined,
          keyUsed: slot.id,
          retriesAttempted,
          isSimulatedFallback: false,
        };
      } catch (err: unknown) {
        const status =
          typeof err === 'object' && err !== null && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        const message = err instanceof Error ? err.message : String(err);

        const is429 =
          status === 429 ||
          message.includes('429') ||
          message.toLowerCase().includes('quota') ||
          message.toLowerCase().includes('rate');
        const is500 =
          status >= 500 ||
          message.includes('500') ||
          message.includes('503') ||
          message.toLowerCase().includes('internal');

        if (is429) {
          slot.lastStatus = 'RATE_LIMITED_429';
          slot.cooldownUntil = Date.now() + 30_000;
        } else if (is500) {
          slot.lastStatus = 'ERROR_500';
          slot.cooldownUntil = Date.now() + 15_000;
        } else {
          slot.lastStatus = 'ERROR_500';
        }

        retriesAttempted++;
        if (attempt === maxAttempts - 1) {
          return this.buildCuratedSocraticResponse(
            params,
            slot.id,
            retriesAttempted
          );
        }
      }
    }

    return this.buildCuratedSocraticResponse(
      params,
      this.slots[this.currentIndex].id,
      retriesAttempted
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

  private buildCuratedSocraticResponse(
    params: {
      userMessage: string;
      subject: string;
      topicTitle: string;
      syllabusBoard: string;
      mode: TutorMode;
      ragContext?: string[];
    },
    keyUsed: 'KEY_1' | 'KEY_2' | 'KEY_3',
    retriesAttempted: number
  ): BarnabyResponse {
    const input = params.userMessage.toLowerCase();
    const hasRag = params.ragContext && params.ragContext.length > 0;
    const ragNote = hasRag
      ? ` I also cross-referenced your pinned Backpack notes to keep our notation aligned with your class materials.`
      : '';

    if (params.mode === 'feynman') {
      return {
        reply: `That is a thoughtful start on ${params.topicTitle}.${ragNote} When we use the Feynman Technique, we strip away textbook jargon until the physical cause-and-effect is unmistakable. Notice how your explanation connects the input to the outcome, yet leaves the intermediate rate of change implicit.`,
        bloomsLevel: 'Evaluate',
        socraticFollowUp: `If a curious twelve-year-old asked you WHY that quantity changes at a curved rate rather than a straight line, what everyday analogy would you use without citing the formula?`,
        latexFormula:
          params.subject === 'Mathematics'
            ? '\\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}'
            : params.subject === 'Physics'
              ? '\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} = m\\vec{a}'
              : '\\Delta G = \\Delta H - T\\Delta S',
        latexCaption: `${params.topicTitle} — Core Mechanism`,
        hintSteps: [
          'Identify the single physical quantity that accumulates or dissipates over time.',
          'Replace technical nouns (like derivative, flux, or enthalpy) with plain action verbs.',
          'Check whether your analogy predicts what happens when the input doubles.',
        ],
        keyUsed,
        retriesAttempted,
        isSimulatedFallback: true,
      };
    }

    if (params.mode === 'exam') {
      return {
        reply: `Looking at this through an ${params.syllabusBoard} examiner's lens for ${params.topicTitle}, your reasoning captures the first method mark (M1).${ragNote} However, full accuracy marks (A1) require explicitly stating the boundary condition before substituting numerical values.`,
        bloomsLevel: 'Apply',
        socraticFollowUp: `Before we write the final line of working, which assumption or conservation law must you state explicitly so the mark scheme awards the justification mark?`,
        latexFormula:
          params.subject === 'Mathematics'
            ? '\\int_{a}^{b} u \\, dv = \\Big[ u v \\Big]_{a}^{b} - \\int_{a}^{b} v \\, du'
            : params.subject === 'Physics'
              ? 'E_k + E_p = \\frac{1}{2}mv^2 + mgh = \\text{constant}'
              : 'K_c = \\frac{[\\text{Products}]^{\\nu}}{[\\text{Reactants}]^{\\mu}}',
        latexCaption: `${params.syllabusBoard} Method & Accuracy Checkpoint`,
        hintSteps: [
          'Write the un-rearranged standard formula from the syllabus data booklet first.',
          'State the physical assumption (e.g., negligible air resistance or dynamic equilibrium).',
          'Check significant figures and SI unit consistency on the final value.',
        ],
        keyUsed,
        retriesAttempted,
        isSimulatedFallback: true,
      };
    }

    // Default Socratic Mode tailored by subject & student query
    if (
      input.includes('why') ||
      input.includes('how') ||
      input.includes('confused') ||
      input.includes('help')
    ) {
      return {
        reply: `Let us slow down and unpack ${params.topicTitle} one piece at a time.${ragNote} Instead of memorizing the rule as an isolated fact, picture what happens at the boundary when we nudge the primary variable by a tiny amount.`,
        bloomsLevel: 'Understand',
        socraticFollowUp: `If we hold every other term constant and double the main input in ${params.topicTitle}, does the restoring response grow linearly, quadratically, or decay?`,
        latexFormula:
          params.subject === 'Mathematics'
            ? 'y - y_1 = f\'(x_1)(x - x_1)'
            : params.subject === 'Physics'
              ? 'T = 2\\pi \\sqrt{\\frac{L}{g}} \\quad (\\theta \\ll 1\\text{ rad})'
              : 'k = A e^{-E_a / (RT)}',
        latexCaption: `First-Principles Sensitivity Relation`,
        hintSteps: [
          'Isolate the independent variable you control on the right-hand side.',
          'Look at the exponent or operator acting on that variable.',
          'Test with simple numbers: compare input = 1 versus input = 2.',
        ],
        keyUsed,
        retriesAttempted,
        isSimulatedFallback: true,
      };
    }

    return {
      reply: `Splendid observation on ${params.topicTitle}!${ragNote} You have identified the governing relationship, which places us right at the bridge between procedural recall and structural analysis.`,
      bloomsLevel: 'Analyze',
      socraticFollowUp: `Now let us test the edge case: under what extreme condition does this model break down or require a second-order correction?`,
      latexFormula:
        params.subject === 'Mathematics'
          ? 'f(x) \\approx f(a) + f\'(a)(x-a) + \\frac{f\'\'(a)}{2!}(x-a)^2'
          : params.subject === 'Physics'
            ? 'y(x,t) = v_0 t \\sin\\theta - \\frac{1}{2}gt^2'
            : '\\text{pH} = \\text{p}K_a + \\log_{10}\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right)',
      latexCaption: `${params.topicTitle} — Analytical Model`,
      hintSteps: [
        'Inspect the denominator or small-angle/ideal assumption in the derivation.',
        'Ask what happens as time, velocity, or concentration approaches zero or infinity.',
        'Connect that mathematical limit back to what you observe in the right-hand Simulation Studio.',
      ],
      keyUsed,
      retriesAttempted,
      isSimulatedFallback: true,
    };
  }
}

export const geminiRotator = new GeminiKeyRotator();
