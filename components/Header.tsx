import React from 'react';
import { BookOpen } from 'lucide-react';

interface HeaderProps {
  onHome: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onHome, title }) => {
  return (
    <header className="bg-slate-800 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition"
          onClick={onHome}
        >
          <BookOpen className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-xl font-bold leading-tight">RRB NTPC Portal</h1>
            <p className="text-xs text-slate-400">Graduate Level Exam Prep</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {title && <span className="hidden md:block text-slate-200 font-medium">{title}</span>}
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-slate-900 font-bold">
            U
          </div>
        </div>
      </div>
    </header>
  );
};