import { useCallback } from 'react';
import { TwilioCallService } from '../services/twilioCallService';

export const useCallStorage = () => {
  const storeCall = useCallback(async (callSid: string, leadId: string) => {
    const agentId = "6807abfc2c1ca099fe2b13c5"; // Hardcoded agent ID for now

    if (!callSid || !leadId) {
      console.warn('Missing callSid or leadId for call storage');
      return;
    }

    try {
      await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId,
        userId: agentId
      });
    } catch (error) {
      console.error('Failed to store call in database:', error);
    }
  }, []);

  return { storeCall };
}; 