'use client';

import { create } from 'zustand';
import type { BloomsLevel, TutorMode } from './gemini';
import type {
  StoredBackpackFile,
  StoredCornellNote,
  StoredStickyNote,
} from './storage';

export type SubjectName = 'Mathematics' | 'Physics' | 'Chemistry';
export type SyllabusBoard = 'AQA' | 'Edexcel' | 'OCR' | 'IB';
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
  | 'REVISION_TEST'
  | 'SQUAD_LIVE';

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

export interface DiagnosticQuestion {
  id: string;
  bloomsLevel: BloomsLevel;
  question: string;
  formulaLatex?: string;
  options: string[];
  correctIndex: number;
  socraticExplanation: string;
  xpReward: number;
}

export interface RoadmapTopicNode {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  subject: SubjectName;
  status: BadgeStatus;
  spacedDue?: boolean;
  weakPoint?: boolean;
  coreLatex: string;
  coreLatexCaption: string;
  initialBarnabyGreeting: string;
  initialSocraticQuestion: string;
  initialHints: string[];
  diagnosticQuestions: DiagnosticQuestion[];
}

export interface WorkbookDialogueTurn {
  id: string;
  role: 'barnaby' | 'student';
  text: string;
  socraticFollowUp?: string;
  bloomsLevel?: BloomsLevel;
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
  keyUsed?: 'KEY_1' | 'KEY_2' | 'KEY_3';
  timestamp: string;
}

const INITIAL_ROADMAP: RoadmapTopicNode[] = [
  // MATHEMATICS
  {
    id: 'math-1',
    code: 'M1.1',
    title: 'First Principles Differentiation',
    subtitle: 'Limits, chords & instantaneous tangent gradients',
    subject: 'Mathematics',
    status: 'GOLD',
    coreLatex:
      "f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}",
    coreLatexCaption: 'Cauchy-Newton Limit Definition of the Derivative',
    initialBarnabyGreeting:
      'Welcome back to the oak desk! Notice how a secant line across two curve points rotates as the horizontal gap h shrinks toward zero.',
    initialSocraticQuestion:
      'Why are we not allowed to simply substitute h = 0 directly into the denominator before simplifying the numerator?',
    initialHints: [
      'Evaluate what happens to both the numerator and denominator at h = 0.',
      'An indeterminate form 0/0 hides a common factor of h waiting to be canceled.',
      'Expand (x + h)^n binomially first, subtract f(x), and factor out h.',
    ],
    diagnosticQuestions: [
      {
        id: 'q-math-1a',
        bloomsLevel: 'Understand',
        question:
          'In the first-principles expression for f(x) = x², what does the term [ (x+h)² - x² ] / h represent geometrically before taking the limit?',
        formulaLatex: 'm_{\\text{sec}} = \\frac{(x+h)^2 - x^2}{h} = 2x + h',
        options: [
          'The gradient of the chord (secant line) joining (x, x²) and (x+h, (x+h)²)',
          'The area bounded beneath the parabola from x to x+h',
          'The y-intercept of the normal line at x',
          'The second derivative concavity at the vertex',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Spot on! Before h approaches zero, the ratio Δy/Δx is the exact gradient of the secant chord spanning the interval [x, x+h].',
        xpReward: 50,
      },
      {
        id: 'q-math-1b',
        bloomsLevel: 'Analyze',
        question:
          'Suppose a function has a sharp corner at x = a, such as f(x) = |x - a|. Why does the first-principles limit fail to exist at x = a?',
        formulaLatex:
          '\\lim_{h \\to 0^-} \\frac{|h|}{h} = -1 \\neq \\lim_{h \\to 0^+} \\frac{|h|}{h} = +1',
        options: [
          'The function is discontinuous at x = a',
          'The left-hand limit (h → 0⁻) and right-hand limit (h → 0⁺) converge to different gradients',
          'The denominator h becomes negative on the left side',
          'Absolute value functions have infinite area',
        ],
        correctIndex: 1,
        socraticExplanation:
          'Brilliant analysis! Differentiability requires the secant gradient from the left (-1) and from the right (+1) to agree.',
        xpReward: 75,
      },
    ],
  },
  {
    id: 'math-2',
    code: 'M1.2',
    title: 'Stationary Points & Concavity',
    subtitle: 'Second derivative test, inflection points & optimization',
    subject: 'Mathematics',
    status: 'SILVER',
    spacedDue: true,
    coreLatex:
      "f'(x_0) = 0 \\;\\;\\text{and}\\;\\; f''(x_0) < 0 \\implies \\text{Local Maximum}",
    coreLatexCaption: 'Second-Order Curvature & Extremum Criterion',
    initialBarnabyGreeting:
      'Today we inspect the peaks, troughs, and inflection saddles of smooth curves. At a stationary point, the tangent is momentarily horizontal.',
    initialSocraticQuestion:
      "If f'(x₀) = 0 AND f''(x₀) = 0, why can we not immediately conclude that x₀ is a point of inflection?",
    initialHints: [
      'Test two simple power functions at x = 0: compare f(x) = x³ against f(x) = x⁴.',
      "Calculate f'(0) and f''(0) for both x³ and x⁴.",
      "Check whether the sign of curvature f''(x) actually flips across x = 0.",
    ],
    diagnosticQuestions: [
      {
        id: 'q-math-2a',
        bloomsLevel: 'Apply',
        question:
          'For the curve y = x³ - 6x² + 9x + 2, at which x-coordinate does the local minimum occur?',
        formulaLatex: "\\frac{dy}{dx} = 3x^2 - 12x + 9 = 3(x-1)(x-3)",
        options: ['x = 1', 'x = 2', 'x = 3', 'x = 0'],
        correctIndex: 2,
        socraticExplanation:
          'At x = 3, dy/dx = 0 and d²y/dx² = 6(3) - 12 = +6 > 0, confirming positive upward concavity and a local minimum!',
        xpReward: 60,
      },
      {
        id: 'q-math-2b',
        bloomsLevel: 'Evaluate',
        question:
          'A student claims that every point where d²y/dx² = 0 is a stationary point. Which counterexample refutes this claim?',
        formulaLatex: 'y = x^3 - 3x \\quad \\text{at } x = 0',
        options: [
          'At x = 0 on y = x³ - 3x, d²y/dx² = 0 but dy/dx = -3 ≠ 0 (non-stationary inflection)',
          'At x = 0 on y = x², d²y/dx² = 2',
          'At x = 0 on y = cos(x), dy/dx = 0',
          'Every cubic polynomial has zero gradient at its inflection point',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Exactly right! An oblique point of inflection has zero curvature (d²y/dx² = 0) while still sloping steeply (dy/dx = -3).',
        xpReward: 85,
      },
    ],
  },
  {
    id: 'math-3',
    code: 'M1.3',
    title: 'Integration by Parts & Kinematics',
    subtitle: 'Product rule inversion, definite bounds & area accumulation',
    subject: 'Mathematics',
    status: 'UNLOCKED',
    weakPoint: true,
    coreLatex:
      '\\int u \\frac{dv}{dx} \\, dx = uv - \\int v \\frac{du}{dx} \\, dx',
    coreLatexCaption: 'Integration by Parts (Reverse Product Rule)',
    initialBarnabyGreeting:
      'Integration by Parts is simply the Product Rule read backwards! Choosing which factor becomes u determines whether the residual integral simplifies.',
    initialSocraticQuestion:
      'When integrating ∫ x · eˣ dx, what happens to the complexity of the remaining integral if you choose u = eˣ instead of u = x?',
    initialHints: [
      'Differentiate u = x to see how the polynomial power drops to a constant.',
      'If instead dv/dx = x, integrating it raises the power to x²/2, making the integrand harder!',
      'Remember the LIATE priority hierarchy: Logs, Inverse trig, Algebraic, Trig, Exponential.',
    ],
    diagnosticQuestions: [
      {
        id: 'q-math-3a',
        bloomsLevel: 'Apply',
        question:
          'When evaluating ∫ x · ln(x) dx using Integration by Parts, which choice of u and dv/dx follows the LIATE reduction strategy?',
        formulaLatex: '\\int x \\ln(x) \\, dx',
        options: [
          'u = ln(x) and dv/dx = x',
          'u = x and dv/dx = ln(x)',
          'u = x·ln(x) and dv/dx = 1',
          'Substitution u = eˣ is mandatory first',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Choosing u = ln(x) gives du/dx = 1/x, which combines cleanly with v = x²/2 to leave a simple polynomial ∫ (x/2) dx!',
        xpReward: 70,
      },
      {
        id: 'q-math-3b',
        bloomsLevel: 'Create',
        question:
          'To pass the Topic Revision Test and unlock Differential Equations: what is the exact value of ∫₀¹ x · eˣ dx?',
        formulaLatex:
          '\\Big[ x e^x \\Big]_0^1 - \\int_0^1 e^x \\, dx = e - (e - 1)',
        options: ['1', 'e - 1', 'e', '2e - 1'],
        correctIndex: 0,
        socraticExplanation:
          'Masterful! [x·eˣ - eˣ] evaluated from 0 to 1 yields (e - e) - (0 - 1) = 1. Topic M1.4 is now unlocked!',
        xpReward: 100,
      },
    ],
  },
  {
    id: 'math-4',
    code: 'M1.4',
    title: 'Separable Differential Equations',
    subtitle: 'First-order rate models, boundary conditions & phase trajectories',
    subject: 'Mathematics',
    status: 'LOCKED',
    coreLatex:
      '\\frac{dy}{dx} = g(x)h(y) \\implies \\int \\frac{1}{h(y)} \\, dy = \\int g(x) \\, dx',
    coreLatexCaption: 'Separation of Variables & Constant of Integration',
    initialBarnabyGreeting:
      'You unlocked Separable Differential Equations! Here we model systems where the rate of change depends simultaneously on time and state.',
    initialSocraticQuestion:
      'Why is it essential to include the constant of integration +C immediately after integrating, BEFORE exponentiating both sides?',
    initialHints: [
      'Compare e^(x + C) = A·eˣ against eˣ + C.',
      'An additive constant in the exponent becomes a multiplicative scaling factor on the solution curve.',
    ],
    diagnosticQuestions: [
      {
        id: 'q-math-4a',
        bloomsLevel: 'Analyze',
        question:
          'For dy/dt = -k·y with initial condition y(0) = y₀, how does the additive integration constant +C transform after taking exponentials?',
        formulaLatex: '\\ln|y| = -kt + C \\implies y(t) = e^C e^{-kt} = y_0 e^{-kt}',
        options: [
          'It becomes the multiplicative initial amplitude y₀ = e^C',
          'It remains an additive shift +y₀ at the end of the formula',
          'It cancels out when t = 0',
          'It changes the decay rate k',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Precisely! Exponentiating turns addition into multiplication: e^(-kt + C) = e^C · e^(-kt) = y₀·e^(-kt).',
        xpReward: 90,
      },
    ],
  },

  // PHYSICS
  {
    id: 'phys-1',
    code: 'P2.1',
    title: 'Projectile Parabolic Kinematics',
    subtitle: 'Orthogonal vector independence, apex time & range symmetry',
    subject: 'Physics',
    status: 'DIAMOND',
    coreLatex:
      'R = \\frac{v_0^2 \\sin(2\\theta)}{g}, \\quad H_{\\max} = \\frac{v_0^2 \\sin^2\\theta}{2g}',
    coreLatexCaption: 'Ballistic Range & Apex Trajectory Equations',
    initialBarnabyGreeting:
      'In my lab goggles mode! Galileo’s great insight was that horizontal velocity and vertical gravitational acceleration act along perpendicular, independent axes.',
    initialSocraticQuestion:
      'At the exact highest point (apex) of a projectile’s arc, what are the values of its vertical velocity v_y and its vertical acceleration a_y?',
    initialHints: [
      'At the apex, the projectile stops rising and is about to begin descending.',
      'Does Earth’s gravitational pull switch off at the top of the flight, or keep pulling downward at g?',
      'If both v_y and a_y were zero at the apex, the ball would hover in mid-air forever!',
    ],
    diagnosticQuestions: [
      {
        id: 'q-phys-1a',
        bloomsLevel: 'Understand',
        question:
          'Two identical spheres are released from the same height H simultaneously: Sphere A is dropped from rest, while Sphere B is launched horizontally at 15 m/s. Neglecting air drag, which hits the level ground first?',
        formulaLatex: 'y(t) = H - \\frac{1}{2}gt^2 \\implies t = \\sqrt{\\frac{2H}{g}}',
        options: [
          'Both spheres strike the ground at the exact same instant',
          'Sphere A hits first because it travels a shorter path',
          'Sphere B hits first because its total speed is higher',
          'It depends on the mass of the spheres',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Galilean independence in action! Both spheres start with v_y(0) = 0 and experience the exact same downward acceleration g.',
        xpReward: 65,
      },
      {
        id: 'q-phys-1b',
        bloomsLevel: 'Analyze',
        question:
          'Why do complementary launch angles θ = 30° and θ = 60° (at the same launch speed v₀ over level ground) produce the exact same horizontal range R?',
        formulaLatex: '\\sin(2 \\times 30^\\circ) = \\sin(60^\\circ) = \\sin(120^\\circ) = \\sin(2 \\times 60^\\circ)',
        options: [
          'The 30° path has higher horizontal speed while the 60° path stays aloft longer; sin(2θ) is symmetric about 45°',
          'Both trajectories reach the same maximum height H_max',
          'Air resistance equalizes their flight times',
          'Their kinetic energies at the apex are identical',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Superb! You can verify this right now in the Live STEM Lab Simulation by dragging the Launch Angle slider between 30° and 60°.',
        xpReward: 85,
      },
    ],
  },
  {
    id: 'phys-2',
    code: 'P2.2',
    title: 'Simple Harmonic Motion & Resonance',
    subtitle: 'Restoring force proportionality, phase portraits & damping',
    subject: 'Physics',
    status: 'UNLOCKED',
    spacedDue: true,
    coreLatex:
      'a = -\\omega^2 x, \\quad x(t) = A \\cos(\\omega t + \\phi)',
    coreLatexCaption: 'Simple Harmonic Oscillator Defining Differential Law',
    initialBarnabyGreeting:
      'Watch the minus sign in a = -ω²x! That negative sign is the heartbeat of every oscillation in physics: acceleration always points back toward equilibrium.',
    initialSocraticQuestion:
      'As an ideal pendulum or mass-spring system passes through the central equilibrium point (x = 0), why doesn’t it stop there if the net restoring force is zero?',
    initialHints: [
      'Distinguish between net force (acceleration) and momentum (velocity).',
      'Where has all the elastic/gravitational potential energy gone when x reaches zero?',
      'At x = 0, acceleration is zero, which means speed has reached its maximum peak!',
    ],
    diagnosticQuestions: [
      {
        id: 'q-phys-2a',
        bloomsLevel: 'Analyze',
        question:
          'If you quadruple the mass m attached to an ideal Hookean spring of stiffness k, how does the natural period T of oscillation change?',
        formulaLatex: 'T = 2\\pi \\sqrt{\\frac{m}{k}}',
        options: [
          'The period T doubles (increases by a factor of 2)',
          'The period T quadruples (increases by a factor of 4)',
          'The period T halves',
          'The period T is independent of mass',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Because T is proportional to √m, multiplying m by 4 multiplies the period by √4 = 2!',
        xpReward: 80,
      },
    ],
  },
  {
    id: 'phys-3',
    code: 'P2.3',
    title: 'Gravitational & Electric Fields',
    subtitle: 'Inverse-square flux, equipotential surfaces & escape velocity',
    subject: 'Physics',
    status: 'LOCKED',
    coreLatex:
      'g(r) = -\\frac{dV_g}{dr} = -\\frac{GM}{r^2}, \\quad v_{\\text{esc}} = \\sqrt{\\frac{2GM}{R}}',
    coreLatexCaption: 'Potential Gradient & Escape Velocity Relation',
    initialBarnabyGreeting:
      'Field lines and equipotential surfaces form an orthogonal web across space. Moving along an equipotential requires zero net work!',
    initialSocraticQuestion:
      'Why is gravitational potential V_g always defined as a negative quantity when zero potential is set at infinity?',
    initialHints: [
      'Gravity is strictly attractive, so an external agent need not push masses together.',
      'To pull a bound mass from radius r out to infinity (where V = 0), you must supply positive energy.',
    ],
    diagnosticQuestions: [
      {
        id: 'q-phys-3a',
        bloomsLevel: 'Apply',
        question:
          'How much work is done by a gravitational field when a satellite moves in a circular orbit of constant radius r around a spherical planet?',
        formulaLatex: 'W = -m \\Delta V_g = 0',
        options: [
          'Zero, because the velocity is always perpendicular to the gravitational force (an equipotential path)',
          'GMm / r',
          '2πr × GMm / r²',
          'Negative work proportional to orbital period',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Circular orbits lie along a constant gravitational equipotential surface (ΔV = 0), so zero work is done!',
        xpReward: 95,
      },
    ],
  },

  // CHEMISTRY
  {
    id: 'chem-1',
    code: 'C3.1',
    title: 'Dynamic Equilibrium & Le Chatelier',
    subtitle: 'Reversible reactions, Kc quotients & Gibbs free energy',
    subject: 'Chemistry',
    status: 'GOLD',
    coreLatex:
      'K_c = \\frac{[\\text{C}]^c [\\text{D}]^d}{[\\text{A}]^a [\\text{B}]^b}, \\quad \\Delta G^\\circ = -RT \\ln K',
    coreLatexCaption: 'Equilibrium Law & Thermodynamic Driving Force',
    initialBarnabyGreeting:
      'Safety goggles adjusted! Remember: at dynamic equilibrium, the forward and reverse reactions have NOT stopped—they occur at equal rates.',
    initialSocraticQuestion:
      'When we increase the total pressure on the Haber process N₂(g) + 3H₂(g) ⇌ 2NH₃(g) at constant temperature, does the equilibrium constant Kc increase, decrease, or remain unchanged?',
    initialHints: [
      'Distinguish between the reaction quotient Q (which shifts momentarily) and the constant Kc.',
      'Which single physical parameter is capable of altering the equilibrium constant Kc?',
      'Pressure shifts equilibrium position to restore the ratio, keeping Kc identical at constant T!',
    ],
    diagnosticQuestions: [
      {
        id: 'q-chem-1a',
        bloomsLevel: 'Evaluate',
        question:
          'For an exothermic forward reaction (ΔH < 0), what happens to BOTH the value of Kc and the rate of attainment of equilibrium when temperature is increased?',
        formulaLatex: '\\ln K = -\\frac{\\Delta H^\\circ}{RT} + \\frac{\\Delta S^\\circ}{R}',
        options: [
          'Kc decreases (shifting left), while the rate of reaching equilibrium increases because both forward and reverse rate constants k rise',
          'Kc increases and rate increases',
          'Kc decreases and reaction rate slows down',
          'Kc remains constant while yield increases',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Exam favorite! Higher temperature always speeds up both directions kinetically, even while shifting the thermodynamic equilibrium position toward the endothermic side.',
        xpReward: 85,
      },
    ],
  },
  {
    id: 'chem-2',
    code: 'C3.2',
    title: 'Arrhenius Kinetics & Activation Energy',
    subtitle: 'Maxwell-Boltzmann distributions, rate-determining steps & catalysts',
    subject: 'Chemistry',
    status: 'UNLOCKED',
    weakPoint: true,
    coreLatex:
      '\\ln k = \\ln A - \\frac{E_a}{R} \\left(\\frac{1}{T}\\right)',
    coreLatexCaption: 'Linearized Arrhenius Plot (ln k vs 1/T)',
    initialBarnabyGreeting:
      'Why does a tiny 10 K rise in temperature often double a reaction rate? It is not because molecules collide much more frequently—it is the exponential tail past E_a!',
    initialSocraticQuestion:
      'If you plot ln(k) on the vertical axis against 1/T (in K⁻¹) on the horizontal axis, how do you extract the activation energy E_a from the straight-line gradient?',
    initialHints: [
      'Compare ln(k) = (-E_a / R)·(1/T) + ln(A) with y = m·x + c.',
      'Notice the negative slope m = -E_a / R.',
      'Multiply the magnitude of the gradient by the molar gas constant R = 8.314 J·mol⁻¹·K⁻¹.',
    ],
    diagnosticQuestions: [
      {
        id: 'q-chem-2a',
        bloomsLevel: 'Apply',
        question:
          'An Arrhenius plot of ln(k) versus 1/T has a gradient of -6,000 K. Taking R = 8.314 J·mol⁻¹·K⁻¹, what is the activation energy E_a in kJ·mol⁻¹?',
        formulaLatex: 'E_a = -\\text{gradient} \\times R = 6000 \\times 8.314\\text{ J\\cdot mol}^{-1}',
        options: [
          '49.9 kJ·mol⁻¹',
          '6.00 kJ·mol⁻¹',
          '721 kJ·mol⁻¹',
          '-49.9 kJ·mol⁻¹',
        ],
        correctIndex: 0,
        socraticExplanation:
          'Spot on! 6,000 × 8.314 = 49,884 J·mol⁻¹ ≈ 49.9 kJ·mol⁻¹. Always convert Joules to kilojoules on exam papers!',
        xpReward: 90,
      },
    ],
  },
];

const INITIAL_STICKY_NOTES: StoredStickyNote[] = [
  {
    id: 'sticky-1',
    subject: 'Mathematics',
    topicId: 'math-1',
    frontPrompt: 'Active Recall: Why does d/dx(eˣ) equal eˣ itself?',
    backAnswer:
      'Because the limit as h→0 of (eʰ - 1)/h equals 1 by definition of Euler’s base e ≈ 2.71828. The gradient matches the height everywhere!',
    color: 'yellow',
    rotationClass: 'rotate-2',
    masteryStatus: 'MASTERED',
    intervalDays: 6,
    easeFactor: 2.6,
    updatedAt: 1762500000000,
  },
  {
    id: 'sticky-2',
    subject: 'Mathematics',
    topicId: 'math-2',
    frontPrompt: 'Spaced Due: Inflection Point vs Stationary Point?',
    backAnswer:
      "Stationary requires f'(x) = 0. Inflection requires f''(x) to change sign (concavity flip). A point can be one, both (y = x³), or neither!",
    color: 'amber',
    rotationClass: '-rotate-1',
    masteryStatus: 'SPACED_DUE',
    intervalDays: 2,
    easeFactor: 2.3,
    updatedAt: 1762510000000,
  },
  {
    id: 'sticky-3',
    subject: 'Mathematics',
    topicId: 'math-3',
    frontPrompt: 'Weak Point Alert: LIATE Rule for Integration by Parts',
    backAnswer:
      'Pick u in order: Logarithmic → Inverse Trig → Algebraic (xⁿ) → Trigonometric → Exponential. Differentiating Logs/Algebraic simplifies them!',
    color: 'coral',
    rotationClass: 'rotate-1',
    masteryStatus: 'WEAK_POINT',
    intervalDays: 1,
    easeFactor: 1.8,
    updatedAt: 1762520000000,
  },
  {
    id: 'sticky-4',
    subject: 'Physics',
    topicId: 'phys-1',
    frontPrompt: 'Active Recall: Horizontal & Vertical Independence',
    backAnswer:
      'Horizontal velocity v_x = v₀ cos(θ) stays constant (a_x = 0). Vertical velocity v_y = v₀ sin(θ) - gt changes linearly with time.',
    color: 'mint',
    rotationClass: '-rotate-2',
    masteryStatus: 'MASTERED',
    intervalDays: 8,
    easeFactor: 2.7,
    updatedAt: 1762530000000,
  },
  {
    id: 'sticky-5',
    subject: 'Physics',
    topicId: 'phys-2',
    frontPrompt: 'Spaced Due: Phase Lead in Simple Harmonic Motion',
    backAnswer:
      'Velocity leads displacement by π/2 rad (90°). Acceleration leads displacement by π rad (180° antiphase: a = -ω²x).',
    color: 'yellow',
    rotationClass: 'rotate-2',
    masteryStatus: 'SPACED_DUE',
    intervalDays: 2,
    easeFactor: 2.2,
    updatedAt: 1762540000000,
  },
  {
    id: 'sticky-6',
    subject: 'Chemistry',
    topicId: 'chem-1',
    frontPrompt: 'Exam Trap: Does a Catalyst Shift Equilibrium Yield?',
    backAnswer:
      'NEVER! A catalyst lowers E_a equally for both forward and reverse pathways, increasing k_f and k_r by the exact same factor. Kc is unchanged.',
    color: 'amber',
    rotationClass: '-rotate-1',
    masteryStatus: 'MASTERED',
    intervalDays: 5,
    easeFactor: 2.5,
    updatedAt: 1762550000000,
  },
];

const INITIAL_BACKPACK_FILES: StoredBackpackFile[] = [
  {
    id: 'rag-1',
    name: 'AQA_Calculus_Formula_Sheet_2026.pdf',
    sizeBytes: 428_500,
    type: 'pdf',
    subject: 'Mathematics',
    chunks: [
      'AQA Pure Mathematics: Differentiation from First Principles requires explicit limit notation lim(h->0) on every line before evaluating h=0.',
      'Integration by Parts standard formula: ∫ u (dv/dx) dx = uv - ∫ v (du/dx) dx. Always include limits on the [uv] bracket for definite integrals.',
    ],
    uploadedAt: 1762400000000,
  },
  {
    id: 'rag-2',
    name: 'Mechanics_Lab_Projectile_Notes.md',
    sizeBytes: 38_200,
    type: 'notes',
    subject: 'Physics',
    chunks: [
      'Projectile range R = (v0^2 sin 2θ)/g holds only when launch height y0 equals landing height. If launched from a cliff h0 > 0, solve the quadratic in t first.',
      'SHM total mechanical energy E = (1/2) m ω^2 A^2 remains constant in undamped motion.',
    ],
    uploadedAt: 1762450000000,
  },
];

interface StudyDeskStore {
  currentSubject: SubjectName;
  syllabusBoard: SyllabusBoard;
  roadmapState: RoadmapTopicNode[];
  activeTopicId: string;
  userXP: number;
  streakCount: number;
  activeCallState: ActiveCallState;
  cameraPan: CameraPanTarget;
  workbookTab: WorkbookTab;
  studioTab: StudioTab;
  tutorMode: TutorMode;
  audioMuted: boolean;
  transitionBanner: TransitionBannerState | null;
  stickyNotes: StoredStickyNote[];
  backpackFiles: StoredBackpackFile[];
  cornellNotes: Record<string, StoredCornellNote>;
  workbookDialogues: Record<string, WorkbookDialogueTurn[]>;

  // Actions
  setSubject: (subject: SubjectName) => void;
  setSyllabusBoard: (board: SyllabusBoard) => void;
  setActiveTopic: (topicId: string) => void;
  setTutorMode: (mode: TutorMode) => void;
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
  addBackpackFile: (file: StoredBackpackFile) => void;
  removeBackpackFile: (id: string) => void;
  saveCornellForTopic: (
    topicId: string,
    cues: string,
    notes: string,
    summary: string
  ) => void;
  hydrateFromArchive: (data: {
    userXP: number;
    streakCount: number;
    currentSubject: SubjectName;
    syllabusBoard: SyllabusBoard;
    topicBadges?: Record<string, string>;
    stickyNotes: StoredStickyNote[];
    backpackFiles: StoredBackpackFile[];
    cornellNotes?: StoredCornellNote[];
  }) => void;
}

export const useStudyDeskStore = create<StudyDeskStore>((set, get) => ({
  currentSubject: 'Mathematics',
  syllabusBoard: 'AQA',
  roadmapState: INITIAL_ROADMAP,
  activeTopicId: 'math-1',
  userXP: 1420,
  streakCount: 14,
  activeCallState: 'IDLE',
  cameraPan: 'overview',
  workbookTab: 'lesson',
  studioTab: 'stickies',
  tutorMode: 'socratic',
  audioMuted: false,
  transitionBanner: null,
  stickyNotes: INITIAL_STICKY_NOTES,
  backpackFiles: INITIAL_BACKPACK_FILES,
  cornellNotes: {
    'math-1': {
      id: 'cornell-math-1',
      subject: 'Mathematics',
      topicId: 'math-1',
      cues: '• Why h → 0?\n• Secant vs Tangent?\n• 0/0 Indeterminate?',
      notes:
        '1. Chord gradient = [f(x+h) - f(x)] / h.\n2. Expand numerator algebraically so all non-h terms cancel.\n3. Factor out h and cancel with denominator before taking limit h → 0.',
      summary:
        'Differentiation from first principles converts a two-point secant slope into an instantaneous single-point tangent gradient via an algebraic limit.',
      updatedAt: 1762560000000,
    },
  },
  workbookDialogues: {},

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

  setSubject: (subject) => {
    const matchingTopics = get().roadmapState.filter(
      (t) => t.subject === subject
    );
    const firstUnlocked =
      matchingTopics.find((t) => t.status !== 'LOCKED') || matchingTopics[0];
    const themeMap: Record<SubjectName, TransitionTheme> = {
      Mathematics: 'sunshine',
      Physics: 'chalk',
      Chemistry: 'mint',
    };
    set({
      currentSubject: subject,
      activeTopicId: firstUnlocked ? firstUnlocked.id : get().activeTopicId,
      transitionBanner: {
        id: Date.now(),
        kicker: `SUBJECT PERIOD // ${get().syllabusBoard}`,
        title: subject.toUpperCase(),
        theme: themeMap[subject],
      },
    });
  },

  setSyllabusBoard: (board) => set({ syllabusBoard: board }),

  setActiveTopic: (topicId) => {
    const node = get().roadmapState.find((n) => n.id === topicId);
    if (!node || node.status === 'LOCKED') return;
    set({ activeTopicId: topicId });
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
    set((state) => ({
      userXP: state.userXP + amount,
    })),

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

      return {
        roadmapState: updated,
        userXP: state.userXP + 120,
      };
    }),

  appendDialogueTurn: (topicId, turn) =>
    set((state) => {
      const existing = state.workbookDialogues[topicId] || [];
      return {
        workbookDialogues: {
          ...state.workbookDialogues,
          [topicId]: [...existing, turn],
        },
      };
    }),

  addStickyNote: (note) =>
    set((state) => ({
      stickyNotes: [
        {
          ...note,
          id: `sticky-${Date.now()}`,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewAt: Date.now() + 86_400_000,
          updatedAt: Date.now(),
        },
        ...state.stickyNotes,
      ],
      userXP: state.userXP + 25,
    })),

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

  addBackpackFile: (file) =>
    set((state) => ({
      backpackFiles: [file, ...state.backpackFiles],
      userXP: state.userXP + 40,
    })),

  removeBackpackFile: (id) =>
    set((state) => ({
      backpackFiles: state.backpackFiles.filter((f) => f.id !== id),
    })),

  saveCornellForTopic: (topicId, cues, notes, summary) =>
    set((state) => ({
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
    })),

  hydrateFromArchive: (data) =>
    set((state) => {
      const updatedRoadmap = data.topicBadges
        ? state.roadmapState.map((n) => {
            const savedBadge = data.topicBadges?.[n.id] as
              | BadgeStatus
              | undefined;
            return savedBadge ? { ...n, status: savedBadge } : n;
          })
        : state.roadmapState;

      const nextCornell = { ...state.cornellNotes };
      if (Array.isArray(data.cornellNotes)) {
        for (const cn of data.cornellNotes) {
          nextCornell[cn.topicId] = cn;
        }
      }

      return {
        userXP: data.userXP,
        streakCount: data.streakCount,
        currentSubject: data.currentSubject,
        syllabusBoard: data.syllabusBoard,
        roadmapState: updatedRoadmap,
        stickyNotes:
          data.stickyNotes && data.stickyNotes.length > 0
            ? data.stickyNotes
            : state.stickyNotes,
        backpackFiles:
          data.backpackFiles && data.backpackFiles.length > 0
            ? data.backpackFiles
            : state.backpackFiles,
        cornellNotes: nextCornell,
      };
    }),
}));
