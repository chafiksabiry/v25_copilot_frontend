import { useState, useEffect, useCallback } from 'react';
import { CallEvent } from '../types/call';

const BACKEND_URL = import.meta.env.VITE_API_URL_CALL;
const WS_URL = `${BACKEND_URL?.replace('http', 'ws')}/call-events`;

export type CallStatus = 'idle' | 'initiating' | 'in-progress' | 'ended' | 'error' | 'call.initiated' | 'call.answered' | 'call.hangup';

export const useCallManager = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Établir la connexion WebSocket
  useEffect(() => {
    if (!BACKEND_URL) {
      console.error('VITE_API_URL_CALL is not defined');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', WS_URL);
    const websocket = new WebSocket(WS_URL);

    // Set ws immediately to handle the "not ready" error
    setWs(websocket);

    websocket.onopen = () => {
      console.log('✅ Connected to call events WebSocket');
    };

    websocket.onmessage = (event) => {
      const data: CallEvent = JSON.parse(event.data);
      console.log('📞 Received call event:', data);
      
      switch (data.type) {
        case 'welcome':
          console.log('🤝 WebSocket connection established');
          break;
        
        case 'call.initiated':
          console.log('📞 Call initiated:', data.payload.call_control_id);
          setCallStatus('call.initiated');
          setCurrentCallId(data.payload.call_control_id);
          break;
        
        case 'call.answered':
          console.log('📞 Call answered');
          setCallStatus('call.answered');
          break;
        
        case 'call.hangup':
          console.log('📞 Call ended');
          setCallStatus('call.hangup');
          setCurrentCallId(null);
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('WebSocket connection error');
    };

    websocket.onclose = (event) => {
      console.log('🔌 WebSocket connection closed', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      
      // Ne pas reconnecter si c'est une fermeture intentionnelle (code 1000)
      if (event.code === 1000) {
        console.log('✅ WebSocket closed normally');
        return;
      }
      
      // Tentative de reconnexion seulement pour les erreurs
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        setWs(new WebSocket(WS_URL));
      }, 5000);
    };

    setWs(websocket);

    return () => {
      console.log('🔌 Closing WebSocket connection');
      websocket.close();
    };
  }, []);

  const initiateCall = useCallback(async (to: string, from: string, agentId: string) => {
    try {
      console.log('📞 Initiating call:', { to, from, agentId });
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/calls/telnyx/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, from, agentId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to initiate call';
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: data
        });
        throw new Error(errorMessage);
      }

      console.log('✅ Call initiated:', data);
      
      // Le callId sera reçu via WebSocket dans l'événement call.initiated
      return data;
    } catch (err) {
      console.error('❌ Error initiating call:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
      setCallStatus('error');
      throw err;
    }
  }, []);

  const endCall = useCallback(async () => {
    if (!currentCallId) {
      const error = 'No active call to end';
      setError(error);
      return;
    }

    try {
      console.log('📞 Ending call:', currentCallId);
      setError(null);

       const response = await fetch(`${BACKEND_URL}/api/calls/telnyx/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_control_id: currentCallId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end call');
      }

      const data = await response.json();
      console.log('✅ Call end request sent:', data);
      
      // Le statut sera mis à jour via WebSocket quand l'événement call.hangup sera reçu
      return data;
    } catch (err) {
      console.error('❌ Error ending call:', err);
      setError(err instanceof Error ? err.message : 'Failed to end call');
      throw err;
    }
  }, [currentCallId]);

    return {
    callStatus,
    currentCallId,
    error,
    initiateCall,
    endCall,
    mediaStream,
    isConnected: ws?.readyState === WebSocket.OPEN
  };
};
