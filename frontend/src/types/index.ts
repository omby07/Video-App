export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  quality: 'lo-res' | 'hd' | 'full-hd';
  background_type?: string;
  background_value?: string;
  filters_applied: string[];
  created_at: string;
  video_data?: string;
  thumbnail?: string;
}

export interface BackgroundImage {
  id: string;
  name: string;
  image_data: string;
  is_predefined: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  is_premium: boolean;
  default_quality: 'lo-res' | 'hd' | 'full-hd';
  max_duration: number;
  updated_at: string;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  smoothing: number;
  level: 'simple' | 'basic' | 'advanced';
}

// Interview Mode Types
export interface InterviewPrompt {
  id: string;
  title: string;
  bullets: string[];
  suggestedDuration: number; // in seconds
  category?: 'sales' | 'graduate' | 'leadership' | 'career-switch' | 'general' | 'custom';
}

export interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompts: InterviewPrompt[];
}

export interface InterviewSession {
  promptId: string;
  recordings: RecordingSegment[];
  currentSegmentIndex: number;
  totalDuration: number;
}

export interface RecordingSegment {
  id: string;
  uri: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// Confidence cue types
export interface ConfidenceCue {
  type: 'posture' | 'eyeline' | 'pace' | 'energy';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

// Strategic Structure - The Golden Framework
export const STRATEGIC_STRUCTURE = {
  sections: [
    { id: 'who', label: 'Who You Are', hint: 'Name, role, years of experience' },
    { id: 'what', label: 'What You Do', hint: 'Key skills, expertise, specialization' },
    { id: 'why', label: 'Why You\'re a Fit', hint: 'Value you bring, alignment with role' },
    { id: 'cta', label: 'Call to Action', hint: 'Next steps, invitation to connect' },
  ],
  timing: {
    who: 15,
    what: 20,
    why: 20,
    cta: 10,
  },
};

// Interview Templates for different career stages
export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'sales',
    name: 'Sales Professional',
    description: 'Highlight your numbers and client wins',
    icon: 'trending-up',
    prompts: [
      {
        id: 'sales-intro',
        title: 'Who You Are',
        category: 'sales',
        bullets: [
          'Your name and current sales role',
          'Years in sales / industry',
          'Types of deals you close (B2B/B2C, deal size)',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'sales-track-record',
        title: 'Your Track Record',
        category: 'sales',
        bullets: [
          'Revenue generated / quota attainment',
          'Notable client wins or logos',
          'YoY growth you\'ve driven',
        ],
        suggestedDuration: 25,
      },
      {
        id: 'sales-approach',
        title: 'Your Sales Approach',
        category: 'sales',
        bullets: [
          'Your methodology (consultative, challenger, etc.)',
          'How you build pipeline',
          'What makes you close deals others can\'t',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'sales-cta',
        title: 'The Close',
        category: 'sales',
        bullets: [
          'Why this opportunity excites you',
          'The value you\'ll bring in 90 days',
          'Clear call to action',
        ],
        suggestedDuration: 15,
      },
    ],
  },
  {
    id: 'graduate',
    name: 'Graduate / Entry Level',
    description: 'Showcase potential over experience',
    icon: 'school',
    prompts: [
      {
        id: 'grad-intro',
        title: 'Who You Are',
        category: 'graduate',
        bullets: [
          'Your name and degree/field of study',
          'University and graduation date',
          'What drew you to this field',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'grad-experience',
        title: 'Relevant Experience',
        category: 'graduate',
        bullets: [
          'Internships, projects, or part-time work',
          'Academic projects that apply here',
          'Transferable skills from any experience',
        ],
        suggestedDuration: 25,
      },
      {
        id: 'grad-potential',
        title: 'Your Potential',
        category: 'graduate',
        bullets: [
          'What you\'re eager to learn',
          'How you approach challenges',
          'Why you\'ll outwork others',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'grad-cta',
        title: 'Your Ask',
        category: 'graduate',
        bullets: [
          'Why this company specifically',
          'What you\'ll contribute from day one',
          'Enthusiasm to take the next step',
        ],
        suggestedDuration: 15,
      },
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership / Executive',
    description: 'Lead with impact and vision',
    icon: 'people',
    prompts: [
      {
        id: 'exec-intro',
        title: 'Who You Are',
        category: 'leadership',
        bullets: [
          'Your name and leadership title',
          'Scope: team size, budget, P&L',
          'Industry expertise and tenure',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'exec-impact',
        title: 'Your Impact',
        category: 'leadership',
        bullets: [
          'Key transformation you\'ve led',
          'Measurable business outcomes',
          'How you developed your team',
        ],
        suggestedDuration: 30,
      },
      {
        id: 'exec-philosophy',
        title: 'Leadership Philosophy',
        category: 'leadership',
        bullets: [
          'How you build high-performing teams',
          'Your approach to change management',
          'How you balance strategy and execution',
        ],
        suggestedDuration: 25,
      },
      {
        id: 'exec-cta',
        title: 'Vision & Fit',
        category: 'leadership',
        bullets: [
          'Why this opportunity at this time',
          'The impact you envision in year one',
          'Invitation to discuss further',
        ],
        suggestedDuration: 15,
      },
    ],
  },
  {
    id: 'career-switch',
    name: 'Career Switch',
    description: 'Bridge your past to your future',
    icon: 'swap-horizontal',
    prompts: [
      {
        id: 'switch-intro',
        title: 'Who You Are',
        category: 'career-switch',
        bullets: [
          'Your name and current/recent role',
          'Your career transition goal',
          'What sparked this change',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'switch-transferable',
        title: 'Transferable Value',
        category: 'career-switch',
        bullets: [
          'Skills that directly apply',
          'Unique perspective you bring',
          'Achievements that translate',
        ],
        suggestedDuration: 25,
      },
      {
        id: 'switch-preparation',
        title: 'How You\'ve Prepared',
        category: 'career-switch',
        bullets: [
          'Learning you\'ve done (courses, certs)',
          'Relevant side projects or volunteering',
          'Industry research and networking',
        ],
        suggestedDuration: 20,
      },
      {
        id: 'switch-cta',
        title: 'Why Take a Chance',
        category: 'career-switch',
        bullets: [
          'Why you\'ll succeed despite the pivot',
          'Your commitment to the new path',
          'What you\'re asking for',
        ],
        suggestedDuration: 15,
      },
    ],
  },
];

// Default prompts - General Purpose (enhanced)
export const DEFAULT_PROMPTS: InterviewPrompt[] = [
  {
    id: 'quick-intro',
    title: 'Quick Introduction',
    category: 'general',
    bullets: [
      'Your name and current role',
      'One sentence on what you do',
      'Why you\'re reaching out',
    ],
    suggestedDuration: 30,
  },
  {
    id: 'full-intro',
    title: 'Full Introduction',
    category: 'general',
    bullets: [
      'Who: Name, role, experience level',
      'What: Your key skills and expertise',
      'Why: Value you bring to this role',
      'CTA: Clear next step invitation',
    ],
    suggestedDuration: 60,
  },
  {
    id: 'experience-story',
    title: 'Experience Story',
    category: 'general',
    bullets: [
      'The situation/challenge',
      'Your specific action',
      'The measurable result',
      'What you learned',
    ],
    suggestedDuration: 75,
  },
  {
    id: 'why-this-role',
    title: 'Why This Role',
    category: 'general',
    bullets: [
      'What attracts you specifically',
      'How your experience aligns',
      'What you\'ll achieve in 90 days',
    ],
    suggestedDuration: 45,
  },
  {
    id: 'custom',
    title: 'Custom Prompt',
    category: 'custom',
    bullets: [
      'Add your own talking points...',
    ],
    suggestedDuration: 60,
  },
];

// Confidence cues that appear during recording
export const CONFIDENCE_CUES: ConfidenceCue[] = [
  { type: 'eyeline', message: 'Look at the camera lens', priority: 'high' },
  { type: 'eyeline', message: 'Eyes on the lens = connection', priority: 'medium' },
  { type: 'posture', message: 'Shoulders back, sit tall', priority: 'medium' },
  { type: 'posture', message: 'Relax your shoulders', priority: 'low' },
  { type: 'pace', message: 'Slow down slightly', priority: 'medium' },
  { type: 'pace', message: 'Pause between points', priority: 'low' },
  { type: 'energy', message: 'Smile - it comes through', priority: 'high' },
  { type: 'energy', message: 'Show enthusiasm', priority: 'medium' },
];

// Helper to get a random confidence cue
export const getRandomCue = (type?: ConfidenceCue['type']): ConfidenceCue => {
  const filtered = type ? CONFIDENCE_CUES.filter(c => c.type === type) : CONFIDENCE_CUES;
  return filtered[Math.floor(Math.random() * filtered.length)];
};
