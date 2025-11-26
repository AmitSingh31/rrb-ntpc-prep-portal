import React, { useState, useEffect } from 'react';
import { TestResult, Question, UserResponse, Flashcard, AIAnalysis, Subject } from '../types';
import { generateFlashcards, analyzePerformance } from '../services/geminiService';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, XCircle, MinusCircle, Clock, Award, Target, BookOpen, Sparkles, Loader, Filter, CheckSquare, TrendingUp, TrendingDown, ArrowRight, Brain } from 'lucide-react';

interface ResultAnalysisProps {
  result: TestResult;
  questions: Question[];
  onBackToDashboard: () => void;
}

export const ResultAnalysis: React.FC<ResultAnalysisProps> = ({ result, questions, onBackToDashboard }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'All' | 'Incorrect' | 'Skipped'>('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoadingCards(true);
      
      // Flashcards for wrong answers
      const wrongAnswerTopics = questions
        .filter(q => {
          const res = result.responses[q.id];
          return res && res.selectedOption !== null && res.selectedOption !== q.correctAnswer;
        })
        .map(q => q.topic);
      
      if (wrongAnswerTopics.length > 0) {
        generateFlashcards(wrongAnswerTopics).then(setFlashcards);
      }

      // AI Strategy & Prediction
      const subjects = Array.from(new Set(questions.map(q => q.subject))) as string[];
      const subjectScores: Record<string, number> = {};
      subjects.forEach(sub => {
          const qs = questions.filter(q => q.subject === sub);
          const correct = qs.filter(q => result.responses[q.id]?.selectedOption === q.correctAnswer).length;
          subjectScores[sub] = correct;
      });

      const analysis = await analyzePerformance({
          score: result.score,
          total: result.totalQuestions,
          accuracy: result.accuracy,
          subjectWise: subjectScores
      });
      setAiAnalysis(analysis);

      setLoadingCards(false);
    };

    fetchData();
  }, [questions, result]);
  
  const pieData = [
    { name: 'Correct', value: result.correct, color: '#22c55e' },
    { name: 'Wrong', value: result.wrong, color: '#ef4444' },
    { name: 'Skipped', value: result.totalQuestions - result.attempted, color: '#94a3b8' },
  ];

  const subjects = Array.from(new Set(questions.map(q => q.subject))) as string[];
  const subjectData = subjects.map(subject => {
    const subjectQuestions = questions.filter(q => q.subject === subject);
    const attempted = subjectQuestions.filter(q => result.responses[q.id]?.selectedOption !== null).length;
    const correct = subjectQuestions.filter(q => result.responses[q.id]?.selectedOption === q.correctAnswer).length;
    return {
      name: subject.split(' ')[0], 
      full: subject,
      total: subjectQuestions.length,
      attempted,
      correct,
      score: (correct * 1) - ((attempted - correct) * 0.33)
    };
  });

  const filteredQuestions = questions.filter(q => {
    const res = result.responses[q.id];
    const isCorrect = res?.selectedOption === q.correctAnswer;
    const isAttempted = res?.selectedOption !== null;

    if (reviewFilter === 'Incorrect') return isAttempted && !isCorrect;
    if (reviewFilter === 'Skipped') return !isAttempted;
    return true;
  });

  return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-slate-800 text-white py-12 px-4">
         <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-2">Test Performance Analysis</h2>
            <p className="text-slate-300">Detailed breakdown of your RRB NTPC mock test.</p>
         </div>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium uppercase">Total Score</p>
                  <h3 className="text-3xl font-bold text-slate-800">{result.score.toFixed(2)}</h3>
                  <p className="text-xs text-slate-400">out of {result.totalQuestions}</p>
                </div>
                <Award className="w-10 h-10 text-blue-100" />
             </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium uppercase">Accuracy</p>
                  <h3 className="text-3xl font-bold text-green-600">{result.accuracy}%</h3>
                </div>
                <Target className="w-10 h-10 text-green-100" />
             </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-500">
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium uppercase">Attempted</p>
                  <h3 className="text-3xl font-bold text-slate-800">{result.attempted} / {result.totalQuestions}</h3>
                </div>
                <CheckCircle className="w-10 h-10 text-purple-100" />
             </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-orange-500">
             <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium uppercase">Time Taken</p>
                  <h3 className="text-3xl font-bold text-slate-800">{Math.floor(result.timeTakenSeconds / 60)}m {result.timeTakenSeconds % 60}s</h3>
                </div>
                <Clock className="w-10 h-10 text-orange-100" />
             </div>
          </div>
        </div>

        {/* AI Performance Predictor & Strategy */}
        {aiAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-lg p-6 col-span-1 md:col-span-1">
                    <h3 className="text-lg font-bold flex items-center mb-4"><Sparkles className="w-5 h-5 mr-2" /> AI Predictor</h3>
                    <div className="text-center py-4">
                        <span className="text-5xl font-bold">{aiAnalysis.predictedScore}</span>
                        <span className="text-indigo-200">/100</span>
                        <p className="text-sm mt-2 text-indigo-100">Projected Final Exam Score</p>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2 bg-indigo-500/30 py-2 rounded-lg">
                        {aiAnalysis.improvementTrend === 'Up' ? <TrendingUp className="text-green-300 w-4 h-4" /> : <TrendingDown className="text-red-300 w-4 h-4" />}
                        <span className="text-sm font-medium">Trend: {aiAnalysis.improvementTrend}</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 col-span-1 md:col-span-2 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Brain className="w-5 h-5 mr-2 text-purple-600" /> Exam Strategy Analysis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <h4 className="text-xs font-bold text-green-700 uppercase mb-1">Top Strength</h4>
                            <p className="text-slate-800 font-medium">{aiAnalysis.strengthAreas[0]}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Needs Improvement</h4>
                            <p className="text-slate-800 font-medium">{aiAnalysis.weakAreas[0]}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-700 uppercase mb-1">Next Focus Topic</h4>
                            <p className="text-slate-800 font-medium flex items-center">{aiAnalysis.nextFocusTopic} <ArrowRight className="w-3 h-3 ml-1" /></p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <h4 className="text-xs font-bold text-amber-700 uppercase mb-1">Time Management</h4>
                            <p className="text-slate-800 font-medium text-sm">{aiAnalysis.timeManagementTip}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-lg font-bold text-slate-700 mb-6">Attempt Distribution</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip />
                   <Legend verticalAlign="bottom" height={36}/>
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-lg font-bold text-slate-700 mb-6">Subject Performance</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={subjectData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip />
                   <Legend />
                   <Bar dataKey="correct" stackId="a" fill="#22c55e" name="Correct" />
                   <Bar dataKey="attempted" stackId="a" fill="#3b82f6" name="Total Attempted" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

        {/* AI Flashcards Section */}
        {flashcards.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 text-yellow-500 mr-2" /> 
              Smart Revision Cards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {flashcards.map((card, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{card.topic}</div>
                      <div className="text-slate-800 font-medium mb-3">{card.content}</div>
                      <div className="bg-yellow-50 text-yellow-800 text-sm p-2 rounded border border-yellow-100 italic">
                          💡 {card.keyPoint}
                      </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Detailed Question Review */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-800">Detailed Solutions</h3>
                
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select 
                        value={reviewFilter}
                        onChange={(e) => setReviewFilter(e.target.value as any)}
                        className="bg-white text-[#333333] border border-[#DDDDDD] text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4285F4] outline-none"
                    >
                        <option value="All">All Questions</option>
                        <option value="Incorrect">Incorrect Only</option>
                        <option value="Skipped">Skipped Only</option>
                    </select>
                </div>
            </div>
            
            <div className="divide-y divide-slate-100">
                {filteredQuestions.map((q, idx) => {
                    const res = result.responses[q.id];
                    const isCorrect = res?.selectedOption === q.correctAnswer;
                    const isSkipped = res?.selectedOption === null || res?.selectedOption === undefined;
                    
                    return (
                        <div key={q.id} className="p-6 hover:bg-slate-50 transition">
                            <div className="flex gap-3 mb-3">
                                <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-600 rounded">{q.subject}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isCorrect ? 'bg-green-100 text-green-700' : isSkipped ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                                    {isCorrect ? <CheckCircle className="w-3 h-3"/> : isSkipped ? <MinusCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                                    {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'}
                                </span>
                            </div>
                            
                            <p className="text-slate-800 font-medium mb-4">{q.text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {q.options.map((opt, i) => (
                                    <div key={i} className={`p-3 rounded border text-sm flex items-center justify-between
                                        ${i === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 
                                          (res?.selectedOption === i ? 'bg-red-50 border-red-200 text-red-800 font-bold' : 'bg-white border-slate-200 text-slate-600')}
                                    `}>
                                        <span>{String.fromCharCode(65 + i)}. {opt}</span>
                                        {i === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                                        {res?.selectedOption === i && i !== q.correctAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                                <p className="font-bold text-blue-800 mb-1">Explanation & Short Trick:</p>
                                <p className="text-blue-900">{q.explanation}</p>
                            </div>
                        </div>
                    );
                })}
                {filteredQuestions.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No questions found for this filter.
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex justify-center">
        <button 
            onClick={onBackToDashboard}
            className="px-8 py-3 bg-slate-800 text-white rounded-full font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center transform"
        >
            <ArrowRight className="w-5 h-5 mr-2" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};
