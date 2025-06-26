import React from 'react';
import { GraduationCap } from 'lucide-react';

const CoachingDetails: React.FC = () => (
  <div className="bg-[#232f47] rounded-xl p-8 w-full min-h-[300px]">
    <div className="text-2xl font-semibold text-white mb-6">Real-Time Coaching</div>
    <div className="flex items-center text-blue-400 text-lg font-semibold mb-8">
      <GraduationCap className="w-6 h-6 mr-2" />
      DISC-Adaptive Coaching
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8">
      <GraduationCap className="w-16 h-16 text-slate-500 mb-4" />
      <span className="text-slate-300 text-lg text-center">DISC-Adaptive coaching inactive</span>
      <span className="text-slate-400 text-base text-center mt-2">Start a call to receive personality-based coaching</span>
    </div>
  </div>
);

export default CoachingDetails; 