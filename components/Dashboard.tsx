import React, { useState } from 'react';
import { TestConfig, Subject, SUBJECT_TOPICS } from '../types';
import { Book, Clock, Calculator, BarChart2, Settings, Zap } from 'lucide-react';

interface DashboardProps {
  onStartTest: (config: TestConfig) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartTest }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSubject, setCustomSubject] = useState<Subject>('Mathematics');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customCount, setCustomCount] = useState(20);

  const testCards = [
    {
      title: "Full Mock Test (CBT-1)",
      desc: "100 Questions • 90 Minutes",
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      config: { 
        mode: 'Full' as const, 
        totalQuestions: 100, 
        durationMinutes: 90, 
        selectedSubjects: ['Mathematics', 'General Intelligence & Reasoning', 'General Awareness'] as Subject[]
      },
      color: "border-blue-500 hover:bg-blue-50"
    },
    {
      title: "Mathematics Speed Test",
      desc: "30 Questions • 30 Minutes",
      icon: <Calculator className="w-6 h-6 text-green-500" />,
      config: { 
        mode: 'Subject' as const, 
        totalQuestions: 30, 
        durationMinutes: 30, 
        selectedSubjects: ['Mathematics'] as Subject[]
      },
      color: "border-green-500 hover:bg-green-50"
    },
    {
      title: "Reasoning & Intelligence",
      desc: "30 Questions • 30 Minutes",
      icon: <Zap className="w-6 h-6 text-purple-500" />,
      config: { 
        mode: 'Subject' as const, 
        totalQuestions: 30, 
        durationMinutes: 30, 
        selectedSubjects: ['General Intelligence & Reasoning'] as Subject[]
      },
      color: "border-purple-500 hover:bg-purple-50"
    },
    {
      title: "General Awareness Booster",
      desc: "40 Questions • 20 Minutes",
      icon: <Book className="w-6 h-6 text-orange-500" />,
      config: { 
        mode: 'Subject' as const, 
        totalQuestions: 40, 
        durationMinutes: 20, 
        selectedSubjects: ['General Awareness'] as Subject[]
      },
      color: "border-orange-500 hover:bg-orange-50"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome, Aspirant!</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Prepare for RRB NTPC with our AI-powered mock tests. Practice subject-wise, take full mocks, or create your own challenge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
             <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Overall Accuracy</p>
            <p className="text-xl font-bold text-slate-800">76%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
             <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Tests Attempted</p>
            <p className="text-xl font-bold text-slate-800">12</p>
          </div>
        </div>
        {/* Placeholder stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
             <Book className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Questions Solved</p>
            <p className="text-xl font-bold text-slate-800">450+</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Start a New Test</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {testCards.map((card, idx) => (
          <button
            key={idx}
            onClick={() => onStartTest(card.config)}
            className={`
              flex flex-col p-6 rounded-xl bg-white border-l-4 shadow-sm transition-all transform hover:-translate-y-1 hover:shadow-md
              ${card.color}
            `}
          >
            <div className="flex items-center mb-4 w-full">
              {card.icon}
              <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                RECOMMENDED
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-left mb-1">{card.title}</h3>
            <p className="text-slate-500 text-sm">{card.desc}</p>
          </button>
        ))}

        {/* Custom Test Card */}
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex flex-col p-6 rounded-xl bg-white border-l-4 border-slate-400 shadow-sm transition-all transform hover:-translate-y-1 hover:shadow-md hover:bg-slate-50 group"
        >
          <div className="flex items-center mb-4 w-full">
            <Settings className="w-6 h-6 text-slate-500 group-hover:text-slate-700" />
            <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
              CUSTOM
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 text-left mb-1">Custom Test Generator</h3>
          <p className="text-slate-500 text-sm">Select subject, topic & count</p>
        </button>
      </div>

      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full animate-fade-in relative">
            <button 
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Configure Custom Test</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select 
                  className="w-full bg-white text-[#333333] border border-[#DDDDDD] rounded p-2 focus:ring-1 focus:ring-[#4285F4] outline-none"
                  value={customSubject}
                  onChange={(e) => {
                    setCustomSubject(e.target.value as Subject);
                    setCustomTopic(''); // Reset topic when subject changes
                  }}
                >
                  {Object.keys(SUBJECT_TOPICS).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic (Optional)</label>
                <select 
                  className="w-full bg-white text-[#333333] border border-[#DDDDDD] rounded p-2 focus:ring-1 focus:ring-[#4285F4] outline-none"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                >
                  <option value="">Mixed Topics</option>
                  {SUBJECT_TOPICS[customSubject].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Questions</label>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  step="5" 
                  value={customCount}
                  onChange={(e) => setCustomCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5</span>
                  <span className="font-bold text-blue-600 text-lg">{customCount}</span>
                  <span>50</span>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    onStartTest({
                      mode: 'Custom',
                      totalQuestions: customCount,
                      durationMinutes: Math.ceil(customCount * 0.9), // ~54 sec per question
                      selectedSubjects: [customSubject],
                      selectedTopic: customTopic || undefined
                    });
                    setShowCustomModal(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow transition"
                >
                  Start Custom Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};