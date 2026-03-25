import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StatusCardProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info';
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  disabled?: boolean;
  disabledTitle?: string;
}

const statusColors = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-rose-500',
  info: 'text-harx-400',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children, disabled, disabledTitle = "Coming Soon"
}) => (
  <div className={`relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl py-3 px-4 w-full h-full flex flex-col justify-between transition-all duration-500 border border-white/10 hover:border-harx-500/40 group overflow-hidden ${disabled ? 'opacity-60' : 'hover:-translate-y-1 hover:bg-white/[0.05]'}`}>
    {/* Animated background highlights */}
    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] transition-all duration-700 opacity-0 group-hover:opacity-20 ${status ? 'bg-current' : 'bg-harx-500'}`} />
    
    {disabled && (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-2 group-hover:opacity-100 opacity-90 transition-opacity duration-500">
        <div className="absolute inset-0 bg-[#0a0f1a]/80 rounded-2xl backdrop-blur-[4px] border border-white/5" />
        <div className="relative z-20 flex flex-col items-center">
            <span className="bg-gradient-to-r from-harx-500/80 to-harx-alt-500/80 text-white text-[9px] font-black px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,77,77,0.3)] transform rotate-[-3deg] group-hover:rotate-0 transition-transform duration-500">
                {disabledTitle}
            </span>
        </div>
      </div>
    )}
    <div className="flex items-center justify-between relative z-0">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border border-white/10 bg-white/5 transition-all duration-500 shadow-inner ${!disabled ? 'group-hover:bg-gradient-harx group-hover:border-transparent group-hover:text-white group-hover:shadow-[0_0_20px_rgba(255,77,77,0.4)]' : ''}`}>
          {icon}
        </div>
        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors duration-300">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-slate-500 hover:text-harx-500 transition-colors" onClick={(e) => { e.stopPropagation(); onToggle?.(); }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
    
    <div className={`font-black mt-2 leading-tight tracking-tight flex-1 flex items-end ${status ? statusColors[status] : 'text-white'}`}>
        <div className="w-full truncate text-base">{value}</div>
    </div>
    
    {subtitle && (
      <div className="text-[8px] font-black text-slate-600 mt-1 uppercase tracking-widest border-t border-white/5 pt-1 group-hover:text-harx-500/60 transition-colors">{subtitle}</div>
    )}
    
    {children && expanded && !disabled && (
      <div className="mt-4 text-[10px] text-slate-500 font-medium leading-relaxed border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2">
        {children}
      </div>
    )}
  </div>
);

export default StatusCard; 
