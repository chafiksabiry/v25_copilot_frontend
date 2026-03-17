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
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  info: 'text-cyan-400',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children, disabled, disabledTitle = "Coming Soon"
}) => (
  <div className={`relative glass-card rounded-xl shadow-lg py-5 px-4 w-full h-full flex flex-col justify-between transition-all duration-300 hover:border-harx-500/30 ${disabled ? 'opacity-50 grayscale-[0.5]' : 'harx-glow-hover'}`}>
    {disabled && (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
        <div className="absolute inset-0 bg-harx-500/5 rounded-xl backdrop-blur-[1px]" />
        <span className="relative z-20 bg-slate-900/90 text-harx-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-harx-500/20 uppercase tracking-widest shadow-xl">
          {disabledTitle}
        </span>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-slate-300">
        <span className="w-5 h-5 flex items-center justify-center text-[20px]">{icon}</span>
        <span className="font-bold text-[15px]">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-slate-400" onClick={onToggle}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
    <div className={`text-[18px] font-semibold mt-2 ${status ? statusColors[status] : 'text-white'}`}>{value}</div>
    {subtitle && (
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    )}
    {children && expanded && !disabled && (
      <div className="mt-2 text-xs text-slate-400">{children}</div>
    )}
  </div>
);

export default StatusCard; 
