import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TestInterface } from './components/TestInterface';
import { ResultAnalysis } from './components/ResultAnalysis';
import { Instructions } from './components/Instructions';
import { TestConfig, Question, TestResult, Subject } from './types';
import { generateQuestions } from './services/geminiService';
import { cacheQuestions, getCachedQuestions, clearCache } from './utils/db';
import { Loader2 } from 'lucide-react';

type Screen = 'dashboard' | 'instructions' | 'test' | 'result';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [currentConfig, setCurrentConfig] = useState<TestConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // State for restoring paused sessions
  const [savedSession, setSavedSession] = useState<any>(null);

  // Question Bank (In-Memory + DB Sync happens in background)
  const [questionBank, setQuestionBank] = useState<Record<string, Question[]>>({
    'Mathematics': [],
    'General Intelligence & Reasoning': [],
    'General Awareness': []
  });

  const isFetchingRef = useRef(false);

  // Check for saved session & DB Cache on mount
  useEffect(() => {
    const saved = localStorage.getItem('rrb_current_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
           setSavedSession(parsed);
        } else {
           localStorage.removeItem('rrb_current_session');
        }
      } catch (e) {
        localStorage.removeItem('rrb_current_session');
      }
    }

    // Load cached questions from IndexedDB
    const loadCache = async () => {
       try {
         const cached = await getCachedQuestions(20);
         const grouped: Record<string, Question[]> = {};
         cached.forEach(q => {
            if(!grouped[q.subject]) grouped[q.subject] = [];
            grouped[q.subject].push(q);
         });
         setQuestionBank(prev => ({ ...prev, ...grouped }));
       } catch (e) {
         console.warn("IndexedDB load failed", e);
       }
    };
    loadCache();
    
    // Background preload if cache is empty
    const subjects: Subject[] = ['Mathematics', 'General Intelligence & Reasoning', 'General Awareness'];
    const preloadQuestions = async () => {
       for (const subject of subjects) {
          generateQuestions({
            mode: 'Subject',
            totalQuestions: 10,
            durationMinutes: 10,
            selectedSubjects: [subject]
          }, 5).then(qs => {
             cacheQuestions(qs); // Save to DB
             setQuestionBank(prev => ({
                ...prev,
                [subject]: [...(prev[subject] || []), ...qs]
             }));
          }).catch(console.error);
       }
    };
    preloadQuestions();
  }, []);

  const handleConfigSelect = (config: TestConfig) => {
    setCurrentConfig(config);
    setCurrentScreen('instructions');
  };

  const handleStartTest = async () => {
    if (!currentConfig) return;

    setIsLoading(true);
    setLoadingText('Preparing Question Paper...');
    
    let initialQs: Question[] = [];
    const usedFromBank: Record<string, number> = {};

    // 1. Try to use Bank first (Instant Start)
    if (!currentConfig.selectedTopic) {
        currentConfig.selectedSubjects.forEach(subject => {
            const cached = questionBank[subject] || [];
            if (cached.length > 0) {
                const takeCount = Math.min(cached.length, 5); 
                const subset = cached.slice(0, takeCount);
                if (subset.length > 0) {
                    initialQs = [...initialQs, ...subset];
                    usedFromBank[subject] = takeCount;
                }
            }
        });
    }

    try {
      if (initialQs.length > 0) {
        // Cache Hit: Start immediately
        setQuestionBank(prev => {
           const next = { ...prev };
           Object.keys(usedFromBank).forEach(subj => {
              if (next[subj]) {
                 next[subj] = next[subj].slice(usedFromBank[subj]);
              }
           });
           return next;
        });

        setQuestions(initialQs);
        setCurrentScreen('test');
        setIsLoading(false);

        // Progressive Fetch: Get the rest in background
        if (initialQs.length < currentConfig.totalQuestions) {
          loadMoreQuestions(currentConfig, initialQs.length);
        }

      } else {
        // Cache Miss: Fetch first batch then stream rest
        const fetchedQs = await generateQuestions(currentConfig, 5);
        setQuestions(fetchedQs);
        setCurrentScreen('test');
        setIsLoading(false);
        cacheQuestions(fetchedQs);

        if (fetchedQs.length < currentConfig.totalQuestions) {
          loadMoreQuestions(currentConfig, fetchedQs.length);
        }
      }
    } catch (error) {
      alert("Failed to initialize test. Connection error.");
      setIsLoading(false);
    }
  };

  // Progressive Loading Logic
  const loadMoreQuestions = async (config: TestConfig, currentCount: number) => {
    // Break recursion
    if (currentCount >= config.totalQuestions) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;

    try {
      // Calculate next batch
      const remaining = config.totalQuestions - currentCount;
      const batchSize = Math.min(remaining, 5); // Fetch 5 at a time

      const newQs = await generateQuestions(config, batchSize);
      
      // Update State (Progressive Rendering)
      setQuestions(prev => {
        const existingIds = new Set(prev.map(q => q.id));
        const filteredNew = newQs.filter(q => !existingIds.has(q.id));
        const updated = [...prev, ...filteredNew];
        
        // Trigger next fetch if we still need more
        if (updated.length < config.totalQuestions) {
           setTimeout(() => {
             isFetchingRef.current = false;
             loadMoreQuestions(config, updated.length);
           }, 500); // Small delay to prevent API throttling
        }
        
        return updated;
      });

      // Cache new questions
      cacheQuestions(newQs);

    } catch (e) {
      console.error("Background fetch failed", e);
      isFetchingRef.current = false;
    }
  };

  const handleRequestMoreQuestions = () => {
     // This is a backup trigger called by TestInterface if it runs low
     if (currentConfig && !isFetchingRef.current && questions.length < currentConfig.totalQuestions) {
        loadMoreQuestions(currentConfig, questions.length);
     }
  };

  const handleTestComplete = (result: TestResult) => {
    setTestResult(result);
    setCurrentScreen('result');
    localStorage.removeItem('rrb_current_session'); 
  };

  const handleExitTest = () => {
    if (window.confirm("Quit Test? Progress will be lost.")) {
      setCurrentScreen('dashboard');
      setQuestions([]);
      localStorage.removeItem('rrb_current_session');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header 
        onHome={() => {
           if (currentScreen === 'test') handleExitTest();
           else setCurrentScreen('dashboard');
        }} 
        title={currentScreen === 'test' ? 'CBT Mode: On' : undefined}
      />
      
      <main className="flex-1">
        {isLoading ? (
          <div className="h-[80vh] flex flex-col items-center justify-center">
             <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
             <h2 className="text-xl font-semibold text-slate-700">{loadingText}</h2>
          </div>
        ) : (
          <>
            {currentScreen === 'dashboard' && (
              <Dashboard onStartTest={handleConfigSelect} />
            )}

            {currentScreen === 'instructions' && currentConfig && (
              <Instructions 
                durationMinutes={currentConfig.durationMinutes}
                totalQuestions={currentConfig.totalQuestions}
                onStart={handleStartTest}
                onCancel={() => setCurrentScreen('dashboard')}
              />
            )}
            
            {currentScreen === 'test' && currentConfig && (
              <TestInterface 
                questions={questions}
                durationMinutes={currentConfig.durationMinutes}
                onComplete={handleTestComplete}
                onExit={handleExitTest}
                onRequestMore={handleRequestMoreQuestions}
                totalQuestionsConfig={currentConfig.totalQuestions}
              />
            )}
            
            {currentScreen === 'result' && testResult && (
              <ResultAnalysis 
                result={testResult}
                questions={questions}
                onBackToDashboard={() => setCurrentScreen('dashboard')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}