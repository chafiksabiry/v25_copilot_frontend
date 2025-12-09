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

// Référence partagée pour éviter les doubles connexions en mode StrictMode
let sharedWebSocket: WebSocket | null = null;
let sharedWebSocketRefCount = 0;

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

    // Utiliser la connexion partagée si elle existe déjà
    if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.OPEN) {
      console.log('🔌 Reusing existing WebSocket connection');
      setWs(sharedWebSocket);
      sharedWebSocketRefCount++;
    } else if (sharedWebSocket && sharedWebSocket.readyState === WebSocket.CONNECTING) {
      // Attendre que la connexion existante soit établie
      console.log('🔌 Waiting for existing WebSocket connection...');
      const openHandler = () => {
        setWs(sharedWebSocket);
        sharedWebSocketRefCount++;
      };
      sharedWebSocket.addEventListener('open', openHandler, { once: true });
    } else {
      // Créer une nouvelle connexion
      console.log('🔌 Creating new WebSocket connection:', WS_URL);
      sharedWebSocket = new WebSocket(WS_URL);
      sharedWebSocketRefCount = 1;

      sharedWebSocket.onopen = () => {
        console.log('✅ Connected to call events WebSocket');
        setError(null);
        setWs(sharedWebSocket);
      };

      sharedWebSocket.onmessage = (event) => {
        try {
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
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      sharedWebSocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
      };

      sharedWebSocket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed', event.code, event.reason);
        setWs(null);
        sharedWebSocket = null;
        sharedWebSocketRefCount = 0;
        
        // Tentative de reconnexion seulement si ce n'est pas une fermeture intentionnelle
        if (event.code !== 1000) {
          setTimeout(() => {
            if (sharedWebSocketRefCount > 0) {
              console.log('🔄 Attempting to reconnect...');
              // La reconnexion sera gérée par le prochain composant qui monte
            }
          }, 5000);
        }
      };
    }

    return () => {
      sharedWebSocketRefCount--;
      
      // Ne fermer la connexion que si aucun autre composant ne l'utilise
      if (sharedWebSocketRefCount <= 0 && sharedWebSocket) {
        console.log('🔌 Closing shared WebSocket connection (last user)');
        const currentWs = sharedWebSocket;
        currentWs.onclose = null; // Empêcher la reconnexion lors du cleanup
        currentWs.close(1000, 'Component unmounting');
        sharedWebSocket = null;
        sharedWebSocketRefCount = 0;
      } else {
        console.log(`🔌 Keeping WebSocket connection (${sharedWebSocketRefCount} users remaining)`);
      }
      setWs(null);
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
