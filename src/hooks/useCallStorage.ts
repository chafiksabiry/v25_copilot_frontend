import { useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { TwilioCallService } from '../services/twilioCallService';

export const useCallStorage = () => {
  const { state, dispatch } = useAgent();
  const storeCall = useCallback(async (callSid: string, leadId: string, isRecordingOverride?: boolean) => {
    const agentId = "6807abfc2c1ca099fe2b13c5"; // Hardcoded agent ID for now

    try {
      const callData = await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId,
        userId: agentId,
        isRecording: isRecordingOverride !== undefined ? isRecordingOverride : state.callState.isRecording
      });

      if (callData && callData.recording_url_cloudinary) {
        dispatch({ type: 'SET_RECORDING_URL', url: callData.recording_url_cloudinary });
      }
    } catch (error) {
      console.error('Failed to store call in database:', error);
    }
  }, [state.callState.isRecording]);

  return { storeCall };
}; 
