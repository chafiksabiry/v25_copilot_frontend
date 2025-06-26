import React from 'react';
import { MapPin, FileText } from 'lucide-react';

const CallStructureGuideDetails: React.FC = () => (
  <div className="bg-[#232f47] rounded-xl p-8 w-full min-h-[300px]">
    <div className="text-2xl font-semibold text-white mb-6">Call Structure Guide</div>
    <div className="flex items-center text-cyan-400 text-lg font-semibold mb-8">
      <MapPin className="w-6 h-6 mr-2" />
      REPS Call Flow Guide
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8">
      <FileText className="w-16 h-16 text-slate-500 mb-4" />
      <span className="text-slate-300 text-lg text-center">Start a call to activate REPS methodology guidance</span>
      <span className="text-slate-400 text-base text-center mt-2">9-phase structured call flow with real-time guidance</span>
    </div>
  </div>
);

export default CallStructureGuideDetails; 