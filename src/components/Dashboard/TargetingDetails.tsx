import React from 'react';
import { Target } from 'lucide-react';

const TargetingDetails: React.FC = () => (
  <div className="bg-[#232f47] rounded-xl p-8 w-full min-h-[220px]">
    <div className="text-2xl font-semibold text-white mb-6">Transaction Targeting</div>
    <div className="flex items-center text-cyan-400 text-lg font-semibold mb-8">
      <Target className="w-6 h-6 mr-2" />
      Transaction Intelligence
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8">
      <Target className="w-16 h-16 text-slate-500 mb-4" />
      <span className="text-slate-300 text-lg text-center">Transaction targeting inactive</span>
    </div>
  </div>
);

export default TargetingDetails; 