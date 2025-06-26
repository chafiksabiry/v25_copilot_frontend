import React from 'react';
import { Lightbulb } from 'lucide-react';

const RecommendationsDetails: React.FC = () => (
  <div className="bg-[#232f47] rounded-xl p-8 w-full min-h-[220px]">
    <div className="text-2xl font-semibold text-white mb-6">AI Recommendations</div>
    <div className="flex items-center text-yellow-400 text-lg font-semibold mb-8">
      <Lightbulb className="w-6 h-6 mr-2" />
      AI Recommendations
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8">
      <Lightbulb className="w-16 h-16 text-slate-500 mb-4" />
      <span className="text-slate-300 text-lg text-center">No recommendations yet</span>
      <span className="text-slate-400 text-base text-center mt-2">AI will provide suggestions during the call</span>
    </div>
  </div>
);

export default RecommendationsDetails; 