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
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-harx-500',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children, disabled, disabledTitle = "Coming Soon"
}) => (
  <div className={`relative glass-card rounded-2xl shadow-sm py-2 px-3 w-full h-full flex flex-col justify-between transition-all duration-500 border border-pink-100/30 hover:border-harx-500/30 group ${disabled ? 'opacity-50 grayscale-[0.8]' : 'hover:-translate-y-1 hover:shadow-md'}`}>
    {disabled && (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-2 group-hover:opacity-100 opacity-80 transition-opacity duration-500">
        <div className="absolute inset-0 bg-white/60 rounded-2xl backdrop-blur-[2px]" />
        <span className="relative z-20 bg-white/90 text-harx-500 text-[8px] font-black px-3 py-1 rounded-full border border-harx-500/20 uppercase tracking-[0.2em] shadow-lg transform rotate-[-5deg] group-hover:rotate-0 transition-transform">
          {disabledTitle}
        </span>
      </div>
    )}
    <div className="flex items-center justify-between relative z-0">
      <div className="flex items-center space-x-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm border border-slate-100 bg-slate-50 transition-all duration-500 ${!disabled ? 'group-hover:bg-harx-500/10 group-hover:border-harx-500/20 group-hover:text-harx-500 group-hover:shadow-sm' : ''}`}>
          {icon}
        </div>
        <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors uppercase">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-slate-400 hover:text-harx-500 transition-colors" onClick={(e) => { e.stopPropagation(); onToggle?.(); }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
    
    <div className={`font-black mt-1 leading-tight tracking-tight flex-1 flex items-end ${status ? statusColors[status] : 'text-slate-900'}`}>
        <div className="w-full truncate text-sm">{value}</div>
    </div>
    
    {subtitle && (
      <div className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest border-t border-slate-100 pt-1 group-hover:text-harx-500/60 transition-colors">{subtitle}</div>
    )}
    
    {children && expanded && !disabled && (
      <div className="mt-4 text-[10px] text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-2">
        {children}
      </div>
    )}
  </div>
);

export default StatusCard; 
