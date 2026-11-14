import {
  geminiRotator,
  type BloomsLevel,
  type BarnabyGeneratedQuizItem,
} from './gemini';
import { askBarnabyLocal } from './localModel';
import type { StoredDiagnosticQuestion, StoredRoadmapTopicNode } from './storage';

let genSeq = 0;
function nextGenId(prefix: string): string {
  genSeq += 1;
  return `${prefix}-${Date.now()}-${genSeq}`;
}

export interface CurriculumUnitBlueprint {
  code: string;
  title: string;
  subtitle: string;
  coreLatex: string;
  coreLatexCaption: string;
  initialBarnabyGreeting: string;
  initialSocraticQuestion: string;
  initialHints: string[];
  labExpression: string;
  diagnosticQuestions: Array<Omit<StoredDiagnosticQuestion, 'id'>>;
}

function buildDomainBlueprints(
  subject: string,
  board: string
): CurriculumUnitBlueprint[] {
  const lower = `${subject} ${board}`.toLowerCase();
  const trackTag = board ? ` (${board})` : '';

  if (
    lower.includes('calc') ||
    lower.includes('math') ||
    lower.includes('algebra') ||
    lower.includes('trig')
  ) {
    return [
      {
        code: 'U1',
        title: `Limits, Continuity & Rate of Change`,
        subtitle: `Foundational behavior of functions in ${subject}${trackTag}`,
        coreLatex: `f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}`,
        coreLatexCaption: 'First-Principles Derivative Definition',
        initialBarnabyGreeting: `Welcome to ${subject}${trackTag}! Let us inspect how average secant slopes converge into instantaneous tangent slopes as the step $h \\to 0$.`,
        initialSocraticQuestion: `Why can we not simply substitute $h = 0$ directly into $\\frac{f(x+h)-f(x)}{h}$ before simplifying the numerator?`,
        initialHints: [
          'Expand $(x+h)^n$ or rationalize the numerator so the factor $h$ cancels cleanly.',
          'Check whether the left-hand limit and right-hand limit agree at the point of interest.',
          'A function must be continuous at $x = a$ to be differentiable at $x = a$.',
        ],
        labExpression: 'a * x^2 + b * x',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Understand',
            question:
              'What geometric quantity does $\\lim_{h \\to 0} \\frac{f(a+h)-f(a)}{h}$ represent on the graph of $y = f(x)$?',
            options: [
              'The instantaneous slope of the tangent line at $x = a$',
              'The area trapped under $y = f(x)$ from $0$ to $a$',
              'The $y$-intercept of the secant line',
              'The average value of $f(x)$ over $[-a, a]$',
            ],
            correctIndex: 0,
            socraticExplanation:
              'As $h \\to 0$, the secant line through $(a, f(a))$ and $(a+h, f(a+h))$ pivots into the tangent line at $x = a$.',
            xpReward: 50,
          },
          {
            bloomsLevel: 'Apply',
            question:
              'Using first principles or power rule, what is the derivative of $f(x) = 3x^2 - 4x + 7$?',
            options: ['$6x - 4$', '$3x - 4$', '$6x^2 - 4$', '$x^3 - 2x^2 + 7x$'],
            correctIndex: 0,
            socraticExplanation:
              'Differentiating term-by-term via $\\frac{d}{dx}(x^n) = nx^{n-1}$ gives $2 \\cdot 3x - 4 = 6x - 4$.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U2',
        title: `Chain, Product & Quotient Differentiation`,
        subtitle: `Composite rates and stationary point optimization`,
        coreLatex: `\\frac{d}{dx}\\left[f(g(x))\\right] = f'(g(x)) \\cdot g'(x)`,
        coreLatexCaption: 'Chain Rule for Composite Functions',
        initialBarnabyGreeting: `When functions nest inside one another like gears, their rates of change multiply. Let us trace the outer and inner layers of $f(g(x))$.`,
        initialSocraticQuestion: `In $y = \\sin(3x^2)$, which function acts as the outer shell $f(u)$ and which acts as the inner core $u = g(x)$?`,
        initialHints: [
          'Identify the inner expression $u = g(x)$ first, then multiply the outer derivative by $du/dx$.',
          'At a local maximum or minimum, the first derivative satisfies $f\'(x) = 0$.',
          'Use the second derivative $f\'\'(x) < 0$ to confirm a concave-down local maximum.',
        ],
        labExpression: 'a * sin(b * x)',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Apply',
            question:
              'What is the derivative of $y = e^{4x}$ with respect to $x$?',
            options: ['$4e^{4x}$', '$e^{4x}$', '$4xe^{4x-1}$', '$\\frac{1}{4}e^{4x}$'],
            correctIndex: 0,
            socraticExplanation:
              'By the chain rule, $\\frac{d}{dx}(e^{u}) = e^{u} \\cdot \\frac{du}{dx} = 4e^{4x}$.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U3',
        title: `Definite Integrals & Fundamental Theorem`,
        subtitle: `Accumulation, antiderivatives, and bounded area`,
        coreLatex: `\\int_{a}^{b} f(x)\\,dx = F(b) - F(a), \\quad F'(x) = f(x)`,
        coreLatexCaption: 'Fundamental Theorem of Calculus',
        initialBarnabyGreeting: `Integration reverses differentiation—summing infinitely many thin rectangles of width $dx$ into exact net accumulation.`,
        initialSocraticQuestion: `Why does a definite integral $\\int_a^b f(x)\\,dx$ not require a $+C$ constant of integration in the final evaluated difference $F(b) - F(a)$?`,
        initialHints: [
          'Any constant $+C$ in $F(b) + C$ and $F(a) + C$ cancels out when subtracting $[F(b)+C] - [F(a)+C]$.',
          'Check where $f(x)$ crosses the $x$-axis if computing total geometric area rather than signed net area.',
        ],
        labExpression: 'a * x^3 - b * x',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Apply',
            question: 'Evaluate the definite integral $\\int_0^2 3x^2\\,dx$.',
            options: ['$8$', '$6$', '$12$', '$4$'],
            correctIndex: 0,
            socraticExplanation:
              'The antiderivative of $3x^2$ is $x^3$. Evaluating $[x^3]_0^2$ gives $2^3 - 0^3 = 8$.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U4',
        title: `Differential Equations & Exam Synthesis`,
        subtitle: `Separable growth models and multi-step exam problems`,
        coreLatex: `\\frac{dy}{dt} = k y \\implies y(t) = y_0 e^{kt}`,
        coreLatexCaption: 'Exponential Growth & Decay Law',
        initialBarnabyGreeting: `In our final synthesis unit, we combine derivatives and integrals to solve differential equations governing real-world change.`,
        initialSocraticQuestion: `How do you separate variables in $\\frac{dy}{dx} = 2xy$ so that all $y$ terms sit with $dy$ and all $x$ terms sit with $dx$?`,
        initialHints: [
          'Divide both sides by $y$ and multiply by $dx$ to obtain $\\frac{1}{y}\\,dy = 2x\\,dx$ before integrating.',
          'Substitute the initial condition $(x_0, y_0)$ immediately to solve for the constant of integration.',
        ],
        labExpression: 'a * exp(0.4 * b * x)',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Analyze',
            question:
              'If a quantity satisfies $\\frac{dy}{dt} = -0.5y$ with $y(0) = 10$, what happens as $t \\to \\infty$?',
            options: [
              '$y(t)$ decays exponentially toward $0$',
              '$y(t)$ grows without bound',
              '$y(t)$ oscillates between $-10$ and $10$',
              '$y(t)$ remains constant at $10$',
            ],
            correctIndex: 0,
            socraticExplanation:
              'A negative proportionality constant $k = -0.5 < 0$ produces exponential decay $y(t) = 10e^{-0.5t} \\to 0$.',
            xpReward: 60,
          },
        ],
      },
    ];
  }

  if (
    lower.includes('phys') ||
    lower.includes('mech') ||
    lower.includes('electr') ||
    lower.includes('quantum')
  ) {
    return [
      {
        code: 'U1',
        title: `Kinematics & Vector Motion`,
        subtitle: `Displacement, velocity, and constant acceleration in ${subject}${trackTag}`,
        coreLatex: `s = ut + \\frac{1}{2}at^2, \\quad v^2 = u^2 + 2as`,
        coreLatexCaption: 'SUVAT Equations of Uniform Acceleration',
        initialBarnabyGreeting: `Welcome to ${subject}${trackTag}! Every motion problem begins by separating horizontal and vertical vector components.`,
        initialSocraticQuestion: `At the highest point of a projectile's trajectory, what is its vertical velocity $v_y$, and what is its vertical acceleration $a_y$?`,
        initialHints: [
          'Vertical velocity $v_y$ momentarily hits $0\\text{ m/s}$ at the apex, while gravity $g \\approx 9.81\\text{ m/s}^2$ still acts downward.',
          'The gradient of a velocity-time graph gives acceleration; the area under it gives displacement.',
        ],
        labExpression: 'a * x - 0.5 * b * x^2',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Understand',
            question:
              'What does the area enclosed under a velocity–time ($v$–$t$) graph represent?',
            options: [
              'Displacement ($\\Delta s$)',
              'Instantaneous acceleration ($a$)',
              'Kinetic energy ($E_k$)',
              'Impulse ($F\\Delta t$)',
            ],
            correctIndex: 0,
            socraticExplanation:
              'Since $v = \\frac{ds}{dt}$, integrating velocity over time $\\int v\\,dt$ yields net displacement.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U2',
        title: `Newtonian Dynamics & Momentum`,
        subtitle: `Free-body diagrams, net force, and impulse conservation`,
        coreLatex: `\\sum \\vec{F} = \\frac{d\\vec{p}}{dt} = m\\vec{a}`,
        coreLatexCaption: "Newton's Second Law & Momentum Rate",
        initialBarnabyGreeting: `Forces cause changes in momentum, not velocity itself. Let us draw a crisp free-body diagram before writing any equation.`,
        initialSocraticQuestion: `If a car moves at a steady $25\\text{ m/s}$ along a straight road, what must be the net resultant force $\\sum F$ acting on it?`,
        initialHints: [
          'Constant velocity means acceleration $a = 0$, so driving thrust exactly balances drag and friction ($\\sum F = 0$).',
          'Total linear momentum $\\sum m_i \\vec{v}_i$ is conserved in any isolated collision.',
        ],
        labExpression: 'a * x',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Apply',
            question:
              'A $2\\text{ kg}$ cart experiences a net force of $12\\text{ N}$. What is its acceleration?',
            options: [
              '$6\\text{ m/s}^2$',
              '$24\\text{ m/s}^2$',
              '$0.17\\text{ m/s}^2$',
              '$10\\text{ m/s}^2$',
            ],
            correctIndex: 0,
            socraticExplanation:
              'From $F = ma$, we obtain $a = F / m = 12 / 2 = 6\\text{ m/s}^2$.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U3',
        title: `Work, Energy & Power Conservation`,
        subtitle: `Kinetic-potential transformations and efficiency`,
        coreLatex: `E_k = \\frac{1}{2}mv^2, \\quad \\Delta E_p = mg\\Delta h, \\quad W = Fd\\cos\\theta`,
        coreLatexCaption: 'Work-Energy Theorem & Mechanical Energy',
        initialBarnabyGreeting: `Tracking scalar energy conservation often bypasses complex force geometry. Let us equate initial and final energy stores.`,
        initialSocraticQuestion: `When an object doubles its speed from $v$ to $2v$, by what factor does its kinetic energy $E_k = \\frac{1}{2}mv^2$ increase?`,
        initialHints: [
          'Because speed $v$ is squared in $\\frac{1}{2}mv^2$, doubling $v$ quadruples kinetic energy ($2^2 = 4$).',
          'Account for thermal work done against friction $W_f = F_f d$ when mechanical energy is not conserved.',
        ],
        labExpression: '0.5 * a * x^2',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Analyze',
            question:
              'If the speed of a moving mass doubles, its kinetic energy increases by a factor of:',
            options: ['$4$', '$2$', '$\\sqrt{2}$', '$8$'],
            correctIndex: 0,
            socraticExplanation:
              'Since $E_k \\propto v^2$, replacing $v$ with $2v$ multiplies $E_k$ by $(2)^2 = 4$.',
            xpReward: 50,
          },
        ],
      },
      {
        code: 'U4',
        title: `Waves, Fields & Exam Synthesis`,
        subtitle: `Harmonic oscillations, interference, and synoptic problems`,
        coreLatex: `v = f\\lambda, \\quad a = -\\omega^2 x`,
        coreLatexCaption: 'Wave Speed & Simple Harmonic Motion',
        initialBarnabyGreeting: `In our final unit, we connect restoring forces to simple harmonic oscillations and wave superposition.`,
        initialSocraticQuestion: `Why does the minus sign in $a = -\\omega^2 x$ guarantee oscillation rather than runaway exponential growth?`,
        initialHints: [
          'The minus sign means acceleration always points back toward equilibrium ($x = 0$), acting as a restoring force.',
          'Path difference $\\Delta d = n\\lambda$ produces constructive interference ($n \\in \\mathbb{Z}$).',
        ],
        labExpression: 'a * cos(b * x)',
        diagnosticQuestions: [
          {
            bloomsLevel: 'Apply',
            question:
              'A wave has frequency $f = 50\\text{ Hz}$ and wavelength $\\lambda = 6\\text{ m}$. What is its wave speed $v$?',
            options: [
              '$300\\text{ m/s}$',
              '$8.33\\text{ m/s}$',
              '$56\\text{ m/s}$',
              '$0.12\\text{ m/s}$',
            ],
            correctIndex: 0,
            socraticExplanation:
              'Using $v = f\\lambda = 50\\text{ Hz} \\times 6\\text{ m} = 300\\text{ m/s}$.',
            xpReward: 50,
          },
        ],
      },
    ];
  }

  // General rigorous academic 4-unit blueprint for any subject (Chemistry, Biology, CS, Economics, History, etc.)
  return [
    {
      code: 'U1',
      title: `${subject}: Foundational Principles & Models`,
      subtitle: `Core definitions, first principles, and terminology${trackTag}`,
      coreLatex: `\\text{Mastery}(t) = M_0 + \\int_0^t \\text{Practice}(\\tau)\\,d\\tau`,
      coreLatexCaption: `${subject} Core Structural Relationship`,
      initialBarnabyGreeting: `Welcome to your ${subject}${trackTag} notebook! Let us establish the foundational definitions and mental models that anchor the entire course.`,
      initialSocraticQuestion: `In your own words, what is the single most important governing principle or mechanism at the heart of ${subject}?`,
      initialHints: [
        `Start by defining the key variables, actors, or structural terms in ${subject} precisely.`,
        `Distinguish between correlation and the underlying causal mechanism.`,
        `Link each definition to a concrete real-world example or boundary case.`,
      ],
      labExpression: 'a * x + b',
      diagnosticQuestions: [
        {
          bloomsLevel: 'Understand',
          question: `When analyzing a foundational concept in ${subject}, what is the strongest first step for exam-grade explanations?`,
          options: [
            'Define the core principle precisely and identify the governing mechanism',
            'Memorize isolated facts without linking cause and effect',
            'Skip definitions and jump straight to unsupported conclusions',
            'Ignore boundary conditions and assumptions',
          ],
          correctIndex: 0,
          socraticExplanation:
            'Mark schemes reward precise definitions paired with a clear causal chain linking premise to conclusion.',
          xpReward: 50,
        },
      ],
    },
    {
      code: 'U2',
      title: `${subject}: Quantitative & Structural Analysis`,
      subtitle: `Equilibrium, rates, and analytical relationships${trackTag}`,
      coreLatex: `\\Delta G = \\Delta H - T\\Delta S`,
      coreLatexCaption: `Analytical Balance & Driving Forces`,
      initialBarnabyGreeting: `Now that the foundations of ${subject} are in place, let us examine how competing factors balance and shift when conditions change.`,
      initialSocraticQuestion: `When an external constraint or parameter shifts in a ${subject} system, how do you predict the direction of the new equilibrium?`,
      initialHints: [
        `Identify which quantities are conserved or held constant during the transition.`,
        `Check the sign and magnitude of each competing term before predicting the net outcome.`,
        `Sketch a quick trend graph to verify limiting behavior at extreme values.`,
      ],
      labExpression: 'a * x^2 + b',
      diagnosticQuestions: [
        {
          bloomsLevel: 'Analyze',
          question: `How do you test whether a proposed model in ${subject} holds under extreme boundary conditions?`,
          options: [
            'Evaluate the limiting behavior as key parameters approach $0$ or $\\infty$ and check against observations',
            'Assume linear proportionality holds across all scales',
            'Discard any data points that show nonlinear curvature',
            'Only test a single midpoint value',
          ],
          correctIndex: 0,
          socraticExplanation:
            'Checking limiting cases ($0$, $\\infty$, or equilibrium) quickly reveals whether an analytical model is physically and logically sound.',
          xpReward: 50,
        },
      ],
    },
    {
      code: 'U3',
      title: `${subject}: Applied Problem Solving & Case Studies`,
      subtitle: `Multi-step reasoning, data interpretation, and edge cases`,
      coreLatex: `\\text{Efficiency } \\eta = \\frac{\\text{Useful Output}}{\\text{Total Input}} \\times 100\\%`,
      coreLatexCaption: `Applied Performance & Yield Metric`,
      initialBarnabyGreeting: `In Unit 3, we apply ${subject} theory to unfamiliar data sets, experimental setups, and multi-step case studies.`,
      initialSocraticQuestion: `When faced with an unfamiliar problem in ${subject}, how do you break it down into known building blocks?`,
      initialHints: [
        `List the known givens, the target unknown, and the bridge law connecting them.`,
        `Check units, scales, and significant figures at every intermediate step.`,
        `State any simplifying assumptions explicitly for full method marks.`,
      ],
      labExpression: 'a * log(abs(x) + 1) + b',
      diagnosticQuestions: [
        {
          bloomsLevel: 'Apply',
          question: `Why do exam mark schemes in ${subject} award method marks for stating assumptions explicitly?`,
          options: [
            'Because real-world applications depend on boundary assumptions that govern when a model is valid',
            'Only to make answers longer',
            'Assumptions are never graded on final exams',
            'To replace the need for calculations',
          ],
          correctIndex: 0,
          socraticExplanation:
            'Every theoretical law operates within specific validity assumptions; stating them proves deep conceptual mastery.',
          xpReward: 50,
        },
      ],
    },
    {
      code: 'U4',
      title: `${subject}: Synoptic Evaluation & Exam Mastery`,
      subtitle: `Cross-topic synthesis, critique, and mark-scheme precision`,
      coreLatex: `\\text{Score} = \\sum_{i=1}^{n} \\left(\\text{Concept}_i \\times \\text{Justification}_i\\right)`,
      coreLatexCaption: `Synoptic Synthesis & Evaluation`,
      initialBarnabyGreeting: `Our final unit brings every thread of ${subject} together for high-tariff synoptic evaluation and timed exam mastery.`,
      initialSocraticQuestion: `How would you structure a top-band evaluative response in ${subject} that weighs both strengths and limitations of a model?`,
      initialHints: [
        `Pair every claim with direct evidence or a mathematical/structural justification.`,
        `Address counter-examples or limitations before stating your weighed final judgment.`,
      ],
      labExpression: 'a * sin(x) + b * cos(x)',
      diagnosticQuestions: [
        {
          bloomsLevel: 'Evaluate',
          question: `What distinguishes a top-band Level 5/6 evaluation in ${subject} from a basic descriptive answer?`,
          options: [
            'Weighing competing mechanisms with quantitative/empirical evidence and reaching a justified conclusion',
            'Listing definitions without connecting them to the prompt',
            'Repeating the question stem in different words',
            'Providing one-sided assertions without addressing limitations',
          ],
          correctIndex: 0,
          socraticExplanation:
            'Top-band evaluation synthesizes evidence across units, critiques limitations, and justifies the final judgment.',
          xpReward: 60,
        },
      ],
    },
  ];
}

export function createTopicNodesFromBlueprints(
  subject: string,
  blueprints: CurriculumUnitBlueprint[]
): StoredRoadmapTopicNode[] {
  return blueprints.map((bp, index) => ({
    id: nextGenId('topic'),
    code: bp.code || `U${index + 1}`,
    title: bp.title,
    subtitle: bp.subtitle,
    subject,
    status: index === 0 ? 'UNLOCKED' : 'UNLOCKED',
    coreLatex: bp.coreLatex,
    coreLatexCaption: bp.coreLatexCaption,
    initialBarnabyGreeting: bp.initialBarnabyGreeting,
    initialSocraticQuestion: bp.initialSocraticQuestion,
    initialHints: bp.initialHints,
    labExpression: bp.labExpression,
    diagnosticQuestions: bp.diagnosticQuestions.map((q) => ({
      ...q,
      id: nextGenId('q'),
    })),
  }));
}

/**
 * Generates a 4-unit syllabus for `subject` + `syllabusBoard`.
 * Starts immediately with rich domain blueprints, and if AI is available, enriches the first active unit via Barnaby.
 */
export async function generateSyllabusTopicsWithAI(params: {
  subject: string;
  syllabusBoard: string;
  ragContext?: string[];
  aiEngineMode: 'gemini' | 'local-webgpu';
  localModelId: string;
  geminiHasKey: boolean | null;
  onLocalProgress?: (report: { progress: number; text: string }) => void;
}): Promise<StoredRoadmapTopicNode[]> {
  const baseBlueprints = buildDomainBlueprints(
    params.subject,
    params.syllabusBoard
  );
  const nodes = createTopicNodesFromBlueprints(params.subject, baseBlueprints);

  const canTryAi =
    params.aiEngineMode === 'local-webgpu' || params.geminiHasKey === true;

  if (!canTryAi || nodes.length === 0) {
    return nodes;
  }

  try {
    const prompt = `Create an inspiring opening Socratic lesson for Unit 1 (${nodes[0].title}) of "${params.subject}"${
      params.syllabusBoard ? ` (${params.syllabusBoard})` : ''
    }. Provide a real core LaTeX formula (latexFormula), caption (latexCaption), 3 step-by-step study hints (hintSteps), and 1 multiple-choice diagnostic quizQuestion.`;

    const askPayload = {
      userMessage: prompt,
      subject: params.subject,
      topicTitle: nodes[0].title,
      syllabusBoard: params.syllabusBoard,
      mode: 'socratic' as const,
      ragContext: params.ragContext,
    };

    const res =
      params.aiEngineMode === 'local-webgpu'
        ? await askBarnabyLocal(
            askPayload,
            params.localModelId,
            params.onLocalProgress
          )
        : await geminiRotator.askBarnaby(askPayload);

    nodes[0] = {
      ...nodes[0],
      initialBarnabyGreeting: res.reply || nodes[0].initialBarnabyGreeting,
      initialSocraticQuestion:
        res.socraticFollowUp || nodes[0].initialSocraticQuestion,
      coreLatex: res.latexFormula || nodes[0].coreLatex,
      coreLatexCaption: res.latexCaption || nodes[0].coreLatexCaption,
      initialHints:
        res.hintSteps && res.hintSteps.length > 0
          ? res.hintSteps
          : nodes[0].initialHints,
      diagnosticQuestions: res.quizQuestion
        ? [
            {
              id: nextGenId('q-ai'),
              bloomsLevel: res.quizQuestion.bloomsLevel || res.bloomsLevel,
              question: res.quizQuestion.question,
              options: res.quizQuestion.options,
              correctIndex: res.quizQuestion.correctIndex,
              socraticExplanation: res.quizQuestion.socraticExplanation,
              xpReward: 60,
            },
            ...nodes[0].diagnosticQuestions,
          ]
        : nodes[0].diagnosticQuestions,
    };
  } catch {
    // Keep clean deterministic blueprint if AI call is unavailable or rate-limited
  }

  return nodes;
}

/**
 * Generates a fresh checkpoint/exam question for a topic using AI (Gemini or Local WebGPU),
 * with a fallback question synthesized from the topic's formula & hints.
 */
export async function generatePracticeQuestionForTopic(params: {
  node: StoredRoadmapTopicNode;
  syllabusBoard: string;
  ragContext?: string[];
  aiEngineMode: 'gemini' | 'local-webgpu';
  localModelId: string;
  geminiHasKey: boolean | null;
  onLocalProgress?: (report: { progress: number; text: string }) => void;
}): Promise<{
  question: StoredDiagnosticQuestion;
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
}> {
  const { node } = params;
  const existingCount = node.diagnosticQuestions.length;
  const bloomsOrder: BloomsLevel[] = [
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create',
  ];
  const targetBlooms = bloomsOrder[existingCount % bloomsOrder.length];

  const canTryAi =
    params.aiEngineMode === 'local-webgpu' || params.geminiHasKey === true;

  if (canTryAi) {
    try {
      const existingStems = node.diagnosticQuestions
        .slice(-3)
        .map((q) => q.question)
        .join(' | ');
      const prompt = `Generate a new ${targetBlooms}-level exam-style multiple-choice question (in quizQuestion) for topic "${node.title}" in "${node.subject}"${
        params.syllabusBoard ? ` (${params.syllabusBoard})` : ''
      }. ${
        existingStems ? `Avoid repeating: ${existingStems}.` : ''
      } Also include a relevant latexFormula, latexCaption, and 3 hintSteps.`;

      const askPayload = {
        userMessage: prompt,
        subject: node.subject,
        topicTitle: node.title,
        syllabusBoard: params.syllabusBoard,
        mode: 'exam' as const,
        ragContext: params.ragContext,
      };

      const res =
        params.aiEngineMode === 'local-webgpu'
          ? await askBarnabyLocal(
              askPayload,
              params.localModelId,
              params.onLocalProgress
            )
          : await geminiRotator.askBarnaby(askPayload);

      if (res.quizQuestion && res.quizQuestion.options.length >= 2) {
        return {
          question: {
            id: nextGenId('q-ai'),
            bloomsLevel: res.quizQuestion.bloomsLevel || res.bloomsLevel || targetBlooms,
            question: res.quizQuestion.question,
            options: res.quizQuestion.options,
            correctIndex: res.quizQuestion.correctIndex,
            socraticExplanation: res.quizQuestion.socraticExplanation,
            xpReward: 60,
          },
          latexFormula: res.latexFormula,
          latexCaption: res.latexCaption,
          hintSteps: res.hintSteps,
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback synthesized exam question grounded in the topic
  const hintFocus =
    node.initialHints[existingCount % Math.max(1, node.initialHints.length)] ||
    `Apply first principles of ${node.title} step by step.`;
  const formulaRef = node.coreLatex
    ? ` given $${node.coreLatex}$`
    : '';

  const fallbackItem: BarnabyGeneratedQuizItem = {
    bloomsLevel: targetBlooms,
    question: `In ${node.title} (${node.code})${formulaRef}, which reasoning step is essential for full exam marks at the ${targetBlooms} level?`,
    options: [
      hintFocus,
      `Ignore boundary conditions and state only a numerical guess`,
      `Treat all variables in ${node.title} as arbitrary constants without justification`,
      `Omit units and intermediate algebraic steps`,
    ],
    correctIndex: 0,
    socraticExplanation: `Full credit in ${node.title} requires explicit justification: ${hintFocus}`,
  };

  return {
    question: {
      id: nextGenId('q-synth'),
      bloomsLevel: fallbackItem.bloomsLevel || targetBlooms,
      question: fallbackItem.question,
      options: fallbackItem.options,
      correctIndex: fallbackItem.correctIndex,
      socraticExplanation: fallbackItem.socraticExplanation,
      xpReward: 50,
    },
  };
}
