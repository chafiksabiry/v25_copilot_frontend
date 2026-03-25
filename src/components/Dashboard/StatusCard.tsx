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
  <div className={`relative glass-card rounded-2xl shadow-2xl py-6 px-5 w-full h-full flex flex-col justify-between transition-all duration-500 border border-white/5 hover:border-harx-500/30 group ${disabled ? 'opacity-40 grayscale-[0.8]' : 'hover:-translate-y-1'}`}>
    {disabled && (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-2 group-hover:opacity-100 opacity-80 transition-opacity duration-500">
        <div className="absolute inset-0 bg-slate-900/60 rounded-2xl backdrop-blur-[2px]" />
        <span className="relative z-20 bg-slate-900/90 text-harx-500 text-[8px] font-black px-3 py-1 rounded-full border border-harx-500/20 uppercase tracking-[0.2em] shadow-2xl transform rotate-[-5deg] group-hover:rotate-0 transition-transform">
          {disabledTitle}
        </span>
      </div>
    )}
    <div className="flex items-center justify-between relative z-0">
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] border border-white/5 bg-white/5 transition-all duration-500 ${!disabled ? 'group-hover:bg-harx-500/20 group-hover:border-harx-500/40 group-hover:text-harx-400 group-hover:shadow-[0_0_15px_rgba(255,77,77,0.2)]' : ''}`}>
          {icon}
        </div>
        <span className="font-black text-[10px] text-slate-500 uppercase tracking-[0.3em] group-hover:text-slate-300 transition-colors">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-slate-500 hover:text-harx-500 transition-colors" onClick={(e) => { e.stopPropagation(); onToggle?.(); }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
    
    <div className={`font-black mt-5 leading-tight tracking-tight flex-1 flex items-end ${status ? statusColors[status] : 'text-white'}`}>
        <div className="w-full truncate">{value}</div>
    </div>
    
    {subtitle && (
      <div className="text-[9px] font-black text-slate-600 mt-3 uppercase tracking-[0.2em] border-t border-white/5 pt-3 group-hover:text-harx-500/60 transition-colors">{subtitle}</div>
    )}
    
    {children && expanded && !disabled && (
      <div className="mt-4 text-[10px] text-slate-500 font-medium leading-relaxed border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2">
        {children}
      </div>
    )}
  </div>
);

export default StatusCard; 
