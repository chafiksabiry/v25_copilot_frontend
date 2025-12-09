import { useState, useEffect, useCallback } from 'react';
import { CallEvent } from '../types/call';

// En mode standalone, utiliser localhost pour le développement local
const getBackendUrl = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  const isStandalone = typeof window !== 'undefined' && !(window as any).__POWERED_BY_QIANKUN__;
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // Debug logging
  console.log('🔍 [getBackendUrl] Environment check:', {
    VITE_API_URL_CALL: import.meta.env.VITE_API_URL_CALL,
    VITE_RUN_MODE: runMode,
    isStandalone,
    isDev,
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE
  });
  
  // Si VITE_API_URL_CALL est défini explicitement, l'utiliser
  if (import.meta.env.VITE_API_URL_CALL) {
    console.log('🔍 [getBackendUrl] Using VITE_API_URL_CALL:', import.meta.env.VITE_API_URL_CALL);
    return import.meta.env.VITE_API_URL_CALL;
  }
  
  // En mode standalone ou développement, utiliser localhost
  if ((runMode === 'standalone' || isStandalone) && isDev) {
    return 'http://localhost:5006';
  }
  
  // En mode standalone production, utiliser api-dash-calls.harx.ai
  if (runMode === 'standalone' || isStandalone) {
    return 'https://api-dash-calls.harx.ai';
  }
  
  // En mode in-app, utiliser localhost par défaut
  return 'http://localhost:5006';
};

const BACKEND_URL = getBackendUrl();
const WS_URL = BACKEND_URL 
  ? `${BACKEND_URL.replace(/^https?:\/\//, (match) => match === 'https://' ? 'wss://' : 'ws://')}/call-events`
  : '';

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

    let websocket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isIntentionalClose = false;

    const connect = () => {
      console.log('🔌 Connecting to WebSocket:', WS_URL);
      websocket = new WebSocket(WS_URL);

      websocket.onopen = () => {
        console.log('✅ Connected to call events WebSocket');
        setError(null);
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
        console.log('🔌 WebSocket connection closed', event.code, event.reason);
        setWs(null);
        
        // Tentative de reconnexion seulement si ce n'est pas une fermeture intentionnelle
        if (!isIntentionalClose && event.code !== 1000) {
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };

      setWs(websocket);
    };

    connect();

    return () => {
      isIntentionalClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket) {
        console.log('🔌 Closing WebSocket connection');
        websocket.onclose = null; // Empêcher la reconnexion lors du cleanup
        websocket.close(1000, 'Component unmounting');
      }
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

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      const data = await response.json();
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
