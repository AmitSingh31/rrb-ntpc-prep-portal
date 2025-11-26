import React, { useState } from 'react';
import { Clock, AlertCircle, BookOpen, CheckSquare } from 'lucide-react';

interface InstructionsProps {
  onStart: () => void;
  onCancel: () => void;
  durationMinutes: number;
  totalQuestions: number;
}

export const Instructions: React.FC<InstructionsProps> = ({ onStart, onCancel, durationMinutes, totalQuestions }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-xl shadow-lg overflow-hidden animate-fade-in">
        <div className="bg-slate-800 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center">
            <BookOpen className="mr-3 text-yellow-400" />
            General Instructions
          </h2>
          <p className="text-slate-300 mt-1">RRB NTPC Graduate Level Mock Test</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center">
              <Clock className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Duration</p>
                <p className="text-xl font-bold text-slate-800">{durationMinutes} Minutes</p>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-center">
              <AlertCircle className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">Questions</p>
                <p className="text-xl font-bold text-slate-800">{totalQuestions} MCQs</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Exam Rules</h3>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>The clock will be set at the server. The countdown timer at the top right corner of the screen will display the remaining time available for you to complete the examination.</li>
              <li>Each question carries <strong>1 mark</strong>.</li>
              <li>There is negative marking of <strong>1/3 mark</strong> for every wrong answer.</li>
              <li>You can click on <strong>"Mark for Review"</strong> to revisit a question later.</li>
              <li>Questions marked for review will NOT be considered for evaluation unless answered.</li>
              <li>You can pause the test, but it is recommended to take it in one sitting for a realistic experience.</li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Do not close the browser window during the test. Your progress is saved locally, but for the best experience, maintain a stable connection.
            </p>
          </div>

          <div className="pt-4 border-t flex flex-col gap-4">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">I have read and understood the instructions.</span>
            </label>

            <div className="flex gap-4 mt-2">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={onStart}
                disabled={!agreed}
                className={`flex-1 py-3 rounded-lg text-white font-bold transition flex items-center justify-center
                  ${agreed ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'bg-slate-300 cursor-not-allowed'}
                `}
              >
                Start Test <CheckSquare className="ml-2 w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};