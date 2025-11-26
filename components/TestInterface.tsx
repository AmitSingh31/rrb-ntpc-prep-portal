import React, { useState, useEffect, useRef } from 'react';
import { Question, UserResponse, TestResult, Subject } from '../types';
import { ChevronLeft, ChevronRight, Flag, Clock, AlertTriangle, Play, Pause, Bookmark, SkipForward, History, Filter, Loader, Lightbulb, MessageCircle, X, Send, Brain } from 'lucide-react';
import { getAIHint, solveAIDoubt } from '../services/geminiService';

interface TestInterfaceProps {
  questions: Question[];
  durationMinutes: number;
  onComplete: (result: TestResult) => void;
  onExit: () => void;
  onRequestMore: () => void;
  totalQuestionsConfig: number;
  savedState?: {
    responses: Record<string, UserResponse>;
    timeLeft: number;
  };
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ 
  questions, 
  durationMinutes, 
  onComplete, 
  onExit,
  onRequestMore,
  totalQuestionsConfig,
  savedState
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, UserResponse>>(savedState?.responses || {});
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft || durationMinutes * 60);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState<Subject | 'All'>('All');
  
  // AI Feature States
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [showDoubtChat, setShowDoubtChat] = useState(false);
  const [doubtQuery, setDoubtQuery] = useState('');
  const [doubtHistory, setDoubtHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [loadingDoubt, setLoadingDoubt] = useState(false);

  const paletteRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    if (!isPaused) {
      localStorage.setItem('rrb_current_session', JSON.stringify({
        responses,
        timeLeft,
        timestamp: Date.now()
      }));
    }
  }, [responses, timeLeft, isPaused]);

  // Sync new questions & progressive load handling
  useEffect(() => {
    setResponses(prev => {
      const next = { ...prev };
      let changed = false;
      questions.forEach(q => {
        if (!next[q.id]) {
          next[q.id] = {
            questionId: q.id,
            selectedOption: null,
            status: 'Not Visited',
            timeSpentSeconds: 0,
            visited: false,
            isBookmarked: false
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [questions]);

  // Initial visited mark
  useEffect(() => {
    if (questions.length > 0 && responses[questions[0]?.id]?.status === 'Not Visited') {
       updateStatus(questions[0].id, undefined, true);
    }
  }, [questions.length]); 

  // Reset AI states on question change
  useEffect(() => {
    setActiveHint(null);
    setShowDoubtChat(false);
    setDoubtHistory([]);
  }, [currentQuestionIndex]);

  // Auto-scroll palette
  useEffect(() => {
    if (paletteRef.current) {
      const activeBtn = paletteRef.current.querySelector(`[data-index="${currentQuestionIndex}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentQuestionIndex]);

  // Scroll Chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [doubtHistory, showDoubtChat]);

  // Background Fetch Trigger
  useEffect(() => {
    const threshold = 5;
    if (
      currentQuestionIndex >= questions.length - threshold && 
      questions.length < totalQuestionsConfig
    ) {
      onRequestMore();
    }
  }, [currentQuestionIndex, questions.length, totalQuestionsConfig]);

  // Timer
  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    if (timeLeft <= 0) {
      finishTest();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
      
      if (questions[currentQuestionIndex]) {
        const qId = questions[currentQuestionIndex].id;
        setResponses(prev => ({
          ...prev,
          [qId]: {
            ...prev[qId],
            timeSpentSeconds: (prev[qId]?.timeSpentSeconds || 0) + 1
          }
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, currentQuestionIndex, isPaused]);

  // --- Handlers ---

  const updateStatus = (qId: string, newStatus?: UserResponse['status'], markVisited: boolean = false) => {
    setResponses(prev => {
      const current = prev[qId];
      if (!current) return prev;
      let updatedStatus = newStatus || current.status;
      if (markVisited && current.status === 'Not Visited') {
         updatedStatus = 'Not Answered';
      }
      return {
        ...prev,
        [qId]: {
          ...current,
          status: updatedStatus,
          visited: markVisited ? true : current.visited
        }
      };
    });
  };

  const handleOptionSelect = (optionIndex: number) => {
    const qId = questions[currentQuestionIndex].id;
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: optionIndex,
        status: 'Answered'
      }
    }));
  };

  const handleMarkForReview = () => {
    const qId = questions[currentQuestionIndex].id;
    const currentRes = responses[qId];
    let newStatus: UserResponse['status'] = 'Marked For Review';
    if (currentRes.selectedOption !== null) {
      newStatus = 'Answered & Marked';
    }
    updateStatus(qId, newStatus);
  };

  const handleSkip = () => {
    const qId = questions[currentQuestionIndex].id;
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: null,
        status: 'Not Answered',
        visited: true
      }
    }));
    if (currentQuestionIndex < questions.length - 1) {
      handleNavigate(currentQuestionIndex + 1);
    }
  };

  const handleBookmark = () => {
    const qId = questions[currentQuestionIndex].id;
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        isBookmarked: !prev[qId].isBookmarked
      }
    }));
  };

  const handleClearResponse = () => {
    const qId = questions[currentQuestionIndex].id;
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: null,
        status: 'Not Answered'
      }
    }));
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < totalQuestionsConfig) {
      setCurrentQuestionIndex(index);
      if (questions[index]) {
         updateStatus(questions[index].id, undefined, true);
      }
    }
  };

  const handleGetHint = async () => {
    const q = questions[currentQuestionIndex];
    if (!q) return;

    if (q.cachedHint) {
        setActiveHint(q.cachedHint);
        return;
    }

    setLoadingHint(true);
    const hint = await getAIHint(q);
    
    // Ideally cache this in a real app context, here we just set it local to state
    q.cachedHint = hint; 
    setActiveHint(hint);
    setLoadingHint(false);
  };

  const handleAskDoubt = async () => {
    if (!doubtQuery.trim()) return;
    const userText = doubtQuery;
    setDoubtQuery('');
    setDoubtHistory(prev => [...prev, { role: 'user', text: userText }]);
    
    setLoadingDoubt(true);
    const answer = await solveAIDoubt(questions[currentQuestionIndex], userText);
    setDoubtHistory(prev => [...prev, { role: 'ai', text: answer }]);
    setLoadingDoubt(false);
  };

  const finishTest = () => {
    localStorage.removeItem('rrb_current_session');

    const attempted = Object.values(responses).filter((r: UserResponse) => r.selectedOption !== null).length;
    const correct = questions.reduce((acc, q) => {
      if (!responses[q.id]) return acc;
      return acc + (responses[q.id]?.selectedOption === q.correctAnswer ? 1 : 0);
    }, 0);
    const wrong = attempted - correct;
    const score = parseFloat((correct * 1 - wrong * (1/3)).toFixed(2));
    
    const result: TestResult = {
      totalQuestions: questions.length,
      attempted,
      correct,
      wrong,
      score,
      accuracy: attempted > 0 ? parseFloat(((correct / attempted) * 100).toFixed(2)) : 0,
      timeTakenSeconds: (durationMinutes * 60) - timeLeft,
      responses,
      date: new Date().toISOString()
    };
    
    onComplete(result);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: UserResponse['status'], isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-blue-600 ring-offset-2';
    switch (status) {
      case 'Answered': return 'bg-green-500 text-white';
      case 'Answered & Marked': return 'bg-purple-600 text-white relative after:content-["✓"] after:absolute after:top-0 after:right-1 after:text-xs';
      case 'Marked For Review': return 'bg-purple-400 text-white';
      case 'Not Answered': return 'bg-red-500 text-white';
      case 'Not Visited': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  // --- Render ---

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestion?.id];

  // Skeleton Loader for Progressive Fetching
  const renderSkeleton = () => (
    <div className="flex flex-col animate-pulse h-full">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/6 mb-8"></div>
        <div className="h-12 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded w-full mb-8"></div>
        <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded-xl"></div>
            <div className="h-16 bg-gray-200 rounded-xl"></div>
            <div className="h-16 bg-gray-200 rounded-xl"></div>
            <div className="h-16 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="mt-8 flex justify-center text-slate-500 items-center gap-2">
            <Loader className="animate-spin w-4 h-4" /> Fetching Question...
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 relative">
      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-900/90 z-[60] flex flex-col items-center justify-center text-white backdrop-blur-sm">
           <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
             <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900">
                <Pause className="w-8 h-8 fill-current" />
             </div>
             <h2 className="text-3xl font-bold mb-2">Test Paused</h2>
             <p className="text-slate-400 mb-8">Your progress has been saved securely.</p>
             <button 
               onClick={() => setIsPaused(false)}
               className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition shadow-lg flex items-center justify-center"
             >
               <Play className="w-5 h-5 mr-2 fill-current" /> Resume Test
             </button>
           </div>
        </div>
      )}

      {/* Test Header */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center h-14 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
           <h2 className="font-semibold text-lg text-slate-800 hidden md:block">RRB NTPC Mock</h2>
           {currentQuestion && (
             <span className="md:hidden px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 truncate max-w-[120px]">
                {currentQuestion.subject}
             </span>
           )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
             onClick={() => setIsPaused(true)}
             className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
             title="Pause Test"
          >
             <Pause className="w-5 h-5" />
          </button>

          <div className={`flex items-center px-4 py-1.5 rounded-full font-mono text-xl font-bold border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <Clock className="w-5 h-5 mr-2" />
            {formatTime(timeLeft)}
          </div>
          
          <button 
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-1.5 rounded-full shadow-sm font-medium transition text-sm uppercase tracking-wide"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Question Area (Scrollable Content + Fixed Footer) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 relative">
          
          {/* Scrollable Question Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-4">
            {!currentQuestion ? renderSkeleton() : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[450px] relative">
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Question {currentQuestionIndex + 1}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold">
                      {currentQuestion.subject}
                    </span>
                    {currentQuestion.pyqTag && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded border border-amber-100">
                          <History className="w-3 h-3" />
                          <span>{currentQuestion.pyqTag}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* AI Features Buttons */}
                  <button
                      onClick={handleGetHint}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200 text-xs font-bold transition"
                  >
                      <Lightbulb className="w-3.5 h-3.5" />
                      Hint
                  </button>
                  <button
                      onClick={() => setShowDoubtChat(!showDoubtChat)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 text-xs font-bold transition"
                  >
                      <Brain className="w-3.5 h-3.5" />
                      Ask AI
                  </button>

                  <div className="w-px h-6 bg-slate-200 mx-2"></div>

                  <button 
                    onClick={handleBookmark}
                    className={`p-2 rounded-full transition ${currentResponse?.isBookmarked ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                    title="Bookmark Question"
                  >
                      <Bookmark className={`w-5 h-5 ${currentResponse?.isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Smart Hint Panel */}
              {activeHint && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded animate-fade-in relative">
                    <button onClick={() => setActiveHint(null)} className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800"><X className="w-4 h-4" /></button>
                    <h4 className="text-xs font-bold text-yellow-700 uppercase mb-1 flex items-center"><Lightbulb className="w-3 h-3 mr-1" /> Strategic Hint</h4>
                    <p className="text-slate-700 text-sm font-medium">{activeHint}</p>
                </div>
              )}
              {loadingHint && (
                  <div className="mb-6 p-4 text-center text-slate-500 text-sm bg-slate-50 rounded animate-pulse">
                      Thinking of a clue...
                  </div>
              )}

              <div className="text-lg md:text-xl text-slate-800 font-medium mb-8 leading-relaxed">
                {currentQuestion.text}
              </div>

              <div className="space-y-3 w-full max-w-3xl">
                {currentQuestion.options.map((option, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`
                      p-4 rounded-xl border-2 cursor-pointer transition flex items-start group w-full relative overflow-hidden
                      ${currentResponse?.selectedOption === idx 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center text-sm font-bold mt-0.5 z-10 transition-colors
                      ${currentResponse?.selectedOption === idx 
                        ? 'border-blue-500 bg-blue-500 text-white' 
                        : 'border-slate-300 text-slate-500 group-hover:border-blue-400 group-hover:text-blue-500'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-slate-800 font-medium text-base leading-relaxed flex-1 z-10">{option}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Fixed Footer Action Bar */}
          <div className="p-3 md:p-4 bg-white border-t border-slate-200 z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 flex-wrap flex-1 sm:flex-initial">
                   <button 
                     onClick={handleMarkForReview}
                     className="flex items-center px-3 md:px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-bold text-xs md:text-sm transition border border-purple-100 whitespace-nowrap"
                   >
                     <Flag className="w-3.5 h-3.5 mr-1.5" /> Review
                   </button>
                   <button 
                     onClick={handleSkip}
                     className="flex items-center px-3 md:px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-bold text-xs md:text-sm transition border border-amber-100 whitespace-nowrap"
                   >
                     <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip
                   </button>
                   <button 
                     onClick={handleClearResponse}
                     className="flex items-center px-3 md:px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold text-xs md:text-sm transition border border-slate-200 whitespace-nowrap"
                   >
                     Clear
                   </button>
                </div>
                
                <div className="flex gap-2 ml-auto shrink-0">
                   <button 
                     onClick={() => handleNavigate(currentQuestionIndex - 1)}
                     disabled={currentQuestionIndex === 0}
                     className="flex items-center px-3 md:px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-bold text-xs md:text-sm transition"
                   >
                     <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                   </button>
                   <button 
                     onClick={() => handleNavigate(currentQuestionIndex + 1)}
                     className="flex items-center px-5 md:px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition"
                   >
                     {currentQuestionIndex >= totalQuestionsConfig - 1 ? 'Finish' : 'Next'} 
                     {currentQuestionIndex < totalQuestionsConfig - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                   </button>
                </div>
             </div>
          </div>

          {/* AI Doubt Chat Overlay/Panel */}
          {showDoubtChat && (
            <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 bg-white shadow-2xl border-l border-slate-200 z-30 flex flex-col animate-slide-in-right">
              <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold">AI Doubt Solver</h3>
                  </div>
                  <button onClick={() => setShowDoubtChat(false)} className="hover:bg-slate-700 p-1 rounded"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                  {doubtHistory.length === 0 && (
                      <div className="text-center text-slate-500 mt-10">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Ask me anything about this question!</p>
                      </div>
                  )}
                  {doubtHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm text-slate-700'}`}>
                            {msg.text}
                        </div>
                      </div>
                  ))}
                  {loadingDoubt && (
                      <div className="flex justify-start">
                        <div className="bg-white border shadow-sm p-3 rounded-lg">
                            <Loader className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              <div className="p-3 bg-white border-t">
                  <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={doubtQuery}
                        onChange={(e) => setDoubtQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskDoubt()}
                        placeholder="Type your doubt..."
                        className="flex-1 text-sm bg-white text-[#333333] placeholder-[#999999] border border-[#DDDDDD] rounded-full px-4 py-2 focus:ring-2 focus:ring-[#4285F4] outline-none"
                    />
                    <button 
                      onClick={handleAskDoubt}
                      disabled={!doubtQuery.trim() || loadingDoubt}
                      className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            </div>
          )}

        </div>

        {/* Right: Palette */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 hidden md:flex z-20">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
               Question Palette
               <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">
                  {/* Progressive Loading Indicator */}
                  {questions.length < totalQuestionsConfig ? (
                      <span className="flex items-center gap-1">
                          <Loader className="w-3 h-3 animate-spin" /> {questions.length} Loaded
                      </span>
                  ) : `${questions.length} / ${totalQuestionsConfig}`}
               </span>
            </h3>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-slate-500 mb-4">
               <div className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div> Answered</div>
               <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></div> Unanswered</div>
               <div className="flex items-center"><div className="w-2 h-2 bg-purple-400 rounded-full mr-1.5"></div> Review</div>
               <div className="flex items-center"><div className="w-2 h-2 bg-slate-200 rounded-full mr-1.5"></div> Not Visited</div>
            </div>

            {/* Section Filter */}
            <div className="relative">
              <select 
                value={paletteFilter}
                onChange={(e) => setPaletteFilter(e.target.value as any)}
                className="w-full pl-8 pr-3 py-2 bg-white text-[#333333] border border-[#DDDDDD] rounded-lg text-xs font-bold appearance-none focus:ring-2 focus:ring-[#4285F4] focus:outline-none"
              >
                <option value="All">All Sections</option>
                <option value="Mathematics">Mathematics</option>
                <option value="General Intelligence & Reasoning">Reasoning</option>
                <option value="General Awareness">Gen Awareness</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin bg-slate-50/50" ref={paletteRef}>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: totalQuestionsConfig }).map((_, idx) => {
                const q = questions[idx];
                // Show skeletons for future questions
                if (!q) {
                    if (paletteFilter === 'All') {
                        return (
                            <div key={`ph-${idx}`} className="h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 opacity-50">
                               <span className="text-xs text-slate-400">{idx + 1}</span>
                            </div>
                        );
                    }
                    return null;
                }

                if (paletteFilter !== 'All' && q.subject !== paletteFilter) return null;
                const status = responses[q.id]?.status || 'Not Visited';
                const isMarked = responses[q.id]?.isBookmarked;

                return (
                  <button
                    key={q.id}
                    data-index={idx}
                    onClick={() => handleNavigate(idx)}
                    className={`
                      h-10 rounded-lg font-bold text-sm flex items-center justify-center transition relative border
                      ${getStatusColor(status, currentQuestionIndex === idx)}
                      ${isMarked ? 'border-yellow-400' : 'border-transparent'}
                    `}
                  >
                    {idx + 1}
                    {isMarked && (
                       <div className="absolute -top-1 -right-1">
                          <Bookmark className="w-3 h-3 text-yellow-500 fill-current" />
                       </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 border-t bg-slate-50">
             <button onClick={onExit} className="w-full py-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 font-bold text-sm transition">
               Quit Test
             </button>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-fade-in border border-slate-200">
              <div className="flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mx-auto mb-5 ring-4 ring-yellow-50">
                 <AlertTriangle className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2 text-slate-800">Ready to Submit?</h3>
              <p className="text-slate-500 text-center mb-8 px-4">
                You have answered <span className="text-slate-900 font-bold">{Object.values(responses).filter((r: UserResponse) => r.selectedOption !== null).length}</span> questions.
                <br/>Time remaining: <span className="font-mono text-slate-900 font-bold">{formatTime(timeLeft)}</span>
              </p>
              <div className="flex gap-4">
                 <button 
                   onClick={() => setIsSubmitModalOpen(false)}
                   className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
                 >
                   Return
                 </button>
                 <button 
                   onClick={() => { setIsSubmitModalOpen(false); finishTest(); }}
                   className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-xl transition"
                 >
                   Confirm Submit
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};