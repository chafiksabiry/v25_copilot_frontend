import { useCallback } from 'react';
import { TwilioCallService } from '../services/twilioCallService';

export const useCallStorage = () => {
  const storeCall = useCallback(async (callSid: string, agentId: string) => {
    if (!callSid || !agentId) {
      console.warn('Missing callSid or agentId for call storage');
      return;
    }

    try {
      await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId: agentId, // Using agentId as leadId for now
        userId: "6807abfc2c1ca099fe2b13c5" // Hardcoded for now
      });
    } catch (error) {
      console.error('Failed to store call in database:', error);
    }
  }, []);

  return { storeCall };
}; 