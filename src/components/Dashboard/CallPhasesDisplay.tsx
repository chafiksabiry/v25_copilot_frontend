import React from 'react';

interface CallPhase {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  startTime?: string;
  endTime?: string;
}

interface CallPhasesDisplayProps {
  phases?: CallPhase[];
  currentPhase?: string;
  onPhaseClick?: (phaseId: string) => void;
}

export const CallPhasesDisplay: React.FC<CallPhasesDisplayProps> = ({
  phases = [],
  currentPhase,
  onPhaseClick
}) => {
  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-xl font-semibold mb-4">Call Phases</h2>
      <div className="space-y-2">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`p-4 rounded-lg border ${
              phase.id === currentPhase
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            } ${
              phase.status === 'completed'
                ? 'bg-green-50'
                : phase.status === 'in-progress'
                ? 'bg-yellow-50'
                : 'bg-gray-50'
            }`}
            onClick={() => onPhaseClick?.(phase.id)}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{phase.name}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                phase.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : phase.status === 'in-progress'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {phase.status}
              </span>
            </div>
            {phase.startTime && (
              <p className="text-sm text-gray-500 mt-2">
                Started: {new Date(phase.startTime).toLocaleTimeString()}
              </p>
            )}
            {phase.endTime && (
              <p className="text-sm text-gray-500">
                Ended: {new Date(phase.endTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
