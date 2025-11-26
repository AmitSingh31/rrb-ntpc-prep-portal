export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Subject = 'Mathematics' | 'General Intelligence & Reasoning' | 'General Awareness';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  explanation: string;
  pyqTag?: string; // e.g., "RRB NTPC 28 Dec 2020 Shift-1"
  cachedHint?: string; // Store hint to avoid re-fetching
}

export interface TestConfig {
  mode: 'Full' | 'Subject' | 'Topic' | 'Custom';
  totalQuestions: number;
  durationMinutes: number;
  selectedSubjects: Subject[];
  selectedTopic?: string;
}

export interface UserResponse {
  questionId: string;
  selectedOption: number | null; // null if not answered
  status: 'Answered' | 'Not Answered' | 'Marked For Review' | 'Not Visited' | 'Answered & Marked';
  timeSpentSeconds: number;
  visited: boolean;
  isBookmarked?: boolean;
}

export interface TestResult {
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  score: number;
  accuracy: number;
  timeTakenSeconds: number;
  responses: Record<string, UserResponse>;
  date: string;
  aiAnalysis?: AIAnalysis;
}

export interface AIAnalysis {
  predictedScore: number;
  strengthAreas: string[];
  weakAreas: string[];
  timeManagementTip: string;
  improvementTrend: 'Up' | 'Down' | 'Stable';
  nextFocusTopic: string;
}

export interface Flashcard {
  topic: string;
  content: string;
  keyPoint: string;
}

export const SUBJECT_TOPICS: Record<Subject, string[]> = {
  'Mathematics': [
    'Number System', 'HCF & LCM', 'Decimals & Fractions', 'Percentage', 
    'Ratio & Proportion', 'Time & Work', 'Time & Distance', 
    'Simple & Compound Interest', 'Profit & Loss', 'Mensuration', 
    'Algebra', 'Geometry', 'Trigonometry', 'Data Interpretation'
  ],
  'General Intelligence & Reasoning': [
    'Analogies', 'Classification', 'Series', 'Coding-Decoding', 
    'Blood Relations', 'Puzzles', 'Seating Arrangement', 'Direction Sense', 
    'Syllogism', 'Venn Diagrams', 'Data Sufficiency'
  ],
  'General Awareness': [
    'Current Affairs', 'Indian History', 'Geography', 'Polity', 
    'Economics', 'General Science', 'Indian Railways', 'Sports', 
    'Books & Authors', 'Science & Technology'
  ]
};