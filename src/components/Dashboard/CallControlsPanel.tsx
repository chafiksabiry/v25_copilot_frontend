import React from 'react';
import { CallControls } from './CallControls';

const CallControlsPanel: React.FC = () => {
  // Mock data - replace with actual data from your app state
  const phoneNumber = "+33623984708"; // Replace with actual phone number
  const agentId = "agent123"; // Replace with actual agent ID

  const handleCallStatusChange = (status: string) => {
    console.log("Call status changed:", status);
  };

  const handleCallSidChange = (callSid: string) => {
    console.log("Call SID changed:", callSid);
  };

  return (
    <div className="mt-4">
      <CallControls
        phoneNumber={phoneNumber}
        agentId={agentId}
        onCallStatusChange={handleCallStatusChange}
        onCallSidChange={handleCallSidChange}
      />
    </div>
  );
};

export default CallControlsPanel; 