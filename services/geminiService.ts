import { GoogleGenAI } from "@google/genai";
import { Question, Subject, TestConfig, Flashcard, AIAnalysis } from "../types";

// Fallback questions in case API fails or key is missing
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "fb-1",
    text: "If A:B = 3:4 and B:C = 8:9, then find A:C.",
    options: ["1:2", "3:2", "1:3", "2:3"],
    correctAnswer: 3,
    subject: "Mathematics",
    topic: "Ratio & Proportion",
    difficulty: "Easy",
    explanation: "Standard: A/C = (A/B)*(B/C) = (3/4)*(8/9) = 2/3. Shortcut: Write A:B (3:4) and B:C (8:9) below it. Multiply columns: A=3*8=24, C=4*9=36. 24:36 = 2:3.",
    pyqTag: "RRB NTPC 2016 Shift 1"
  },
  {
    id: "fb-2",
    text: "Which vitamin is water soluble?",
    options: ["Vitamin A", "Vitamin D", "Vitamin C", "Vitamin K"],
    correctAnswer: 2,
    subject: "General Awareness",
    topic: "General Science",
    difficulty: "Medium",
    explanation: "Vitamin B and C are water soluble. Mnemonic: 'WBC' -> Water Soluble = B & C. Fat soluble are 'KEDA'.",
    pyqTag: "RRB NTPC 28 Dec 2020"
  },
  {
    id: "fb-3",
    text: "In a certain code, 'ROCKET' is written as 'TCMQKV'. How is 'DRIVER' written in that code?",
    options: ["FTKXGP", "FTKIGT", "FTKXGT", "GUKYHU"],
    correctAnswer: 2,
    subject: "General Intelligence & Reasoning",
    topic: "Coding-Decoding",
    difficulty: "Medium",
    explanation: "Pattern: +2, -2, +2, -2, +2, -2. R(+2)=T, O(-2)=M... Similarly, D(+2)=F, R(-2)=P. Correct Logic: R(+2)=T, O(-2)=M, C(+2)=E, K(-2)=I, E(+2)=G, T(-2)=R.",
    pyqTag: "RRB NTPC CBT-2 2022"
  }
];

export const generateQuestions = async (config: TestConfig, batchSize: number = 5): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found. Returning fallback questions.");
    return FALLBACK_QUESTIONS;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const subjectsStr = config.selectedSubjects.join(", ");
  const topicContext = config.selectedTopic ? `Focus specifically on the topic: ${config.selectedTopic}.` : "Mix the topics based on standard RRB NTPC weightage.";

  // Use gemini-2.5-flash as the standard fast model. 
  const modelName = "gemini-2.5-flash";

  // Safeguard: Ensure batchSize is not excessive. 
  // Truncation causes JSON errors, so we keep batches small.
  const safeBatchSize = Math.min(batchSize, 5);

  const prompt = `
    Act as a senior exam setter for the RRB NTPC Graduate Level Exam. 
    Generate ${safeBatchSize} UNIQUE multiple-choice questions.

    Subjects: ${subjectsStr}
    Context: ${topicContext}

    STRICT JSON OUTPUT RULES:
    1. Do NOT include any markdown formatting or code blocks. Just the raw JSON string.
    2. Explanation MUST be under 20 words to save tokens.
    3. Ensure valid JSON syntax.

    Structure:
    - Realism: Mimic RRB NTPC question style.
    - Tag: Add "pyqTag" (e.g., "RRB NTPC 2021").
    - Math Explanations: ONLY the shortcut formula.
    - Science Explanations: ONLY the mnemonic.
    
    Return JSON Array of objects with fields: text, options (4 strings), correctAnswer (0-3), subject, topic, difficulty, explanation, pyqTag.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text || "";
    
    // Clean up Markdown wrappers if present (Common cause of JSON errors)
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

    // Aggressive JSON extraction: Find the first '[' and the last ']'
    const firstOpen = jsonStr.indexOf('[');
    const lastClose = jsonStr.lastIndexOf(']');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    } else {
      throw new Error("Invalid JSON structure found");
    }

    const questionsData = JSON.parse(jsonStr);
    
    return questionsData.map((q: any) => ({
      ...q,
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

  } catch (error) {
    console.error("Gemini API Error or JSON Parse Error:", error);
    // Return fallback questions to keep app alive
    return FALLBACK_QUESTIONS.slice(0, safeBatchSize);
  }
};

export const generateFlashcards = async (weakTopics: string[]): Promise<Flashcard[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || weakTopics.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey });
  
  const uniqueTopics = Array.from(new Set(weakTopics)).slice(0, 3);
  const topicsStr = uniqueTopics.join(", ");

  const prompt = `
    RRB NTPC Exam Prep.
    Topics: ${topicsStr}.
    Create 3 concise Flashcards.
    JSON Array only.
    Fields: topic, content (max 15 words), keyPoint (max 10 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const firstOpen = jsonStr.indexOf('[');
    const lastClose = jsonStr.lastIndexOf(']');
    if (firstOpen !== -1 && lastClose !== -1) {
        jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    }

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(e);
    return [];
  }
};

// --- NEW AI FEATURES ---

export const getAIHint = async (question: Question): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Hints unavailable without API Key.";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Question: "${question.text}"
    Options: ${question.options.join(", ")}
    Topic: ${question.topic}
    
    Provide a STRATEGIC HINT to solve this. 
    Constraint: Do NOT reveal the answer. 
    Constraint: Keep it under 20 words.
    Style: Coach whispering a clue.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text?.trim() || "Analyze the options carefully.";
  } catch (e) {
    return "Check specific keywords in the question.";
  }
};

export const solveAIDoubt = async (question: Question, userQuery: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Feature unavailable.";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an expert tutor for RRB NTPC exams.
    Context Question: "${question.text}"
    Correct Answer: "${question.options[question.correctAnswer]}"
    Explanation: "${question.explanation}"
    
    Student Doubt: "${userQuery}"
    
    Provide a clear, simple explanation in 50 words or less. Use an example if needed.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text?.trim() || "I couldn't generate an explanation at this moment.";
  } catch (e) {
    return "Connection error. Please try again.";
  }
};

export const analyzePerformance = async (stats: {
  score: number;
  total: number;
  accuracy: number;
  subjectWise: Record<string, number>;
}): Promise<AIAnalysis> => {
  const apiKey = process.env.API_KEY;
  // Default fallback
  const fallback: AIAnalysis = {
    predictedScore: stats.score + 5,
    strengthAreas: ["General Intelligence"],
    weakAreas: ["Mathematics"],
    timeManagementTip: "Spend less time on easy questions.",
    improvementTrend: "Stable",
    nextFocusTopic: "Algebra"
  };

  if (!apiKey) return fallback;

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Analyze this student's RRB NTPC mock test performance:
    Score: ${stats.score}/${stats.total}
    Accuracy: ${stats.accuracy}%
    Subject Scores: ${JSON.stringify(stats.subjectWise)}
    
    Output strictly JSON:
    {
      "predictedScore": (number, predict final exam score out of 100 based on this),
      "strengthAreas": (array of strings, top 2 strengths),
      "weakAreas": (array of strings, top 2 weaknesses),
      "timeManagementTip": (string, max 10 words),
      "improvementTrend": ("Up" | "Down" | "Stable"),
      "nextFocusTopic": (string, single most important topic to study)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const jsonStr = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "";
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1) {
       return JSON.parse(jsonStr.substring(firstOpen, lastClose + 1));
    }
    return fallback;
  } catch (e) {
    console.error(e);
    return fallback;
  }
};