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
}

const statusColors = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  info: 'text-cyan-400',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children
}) => (
  <div className="bg-[#232f47] rounded-xl shadow-lg py-5 px-4 w-full flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-slate-300">
        <span className="w-5 h-5 flex items-center justify-center text-[20px]">{icon}</span>
        <span className="font-bold text-[15px]">{title}</span>
      </div>
      {expandable && (
        <button className="text-slate-400" onClick={onToggle}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
    <div className={`text-[18px] font-semibold mt-2 ${status ? statusColors[status] : 'text-white'}`}>{value}</div>
    {subtitle && (
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    )}
    {children && expanded && (
      <div className="mt-2 text-xs text-slate-400">{children}</div>
    )}
  </div>
);

export default StatusCard; 