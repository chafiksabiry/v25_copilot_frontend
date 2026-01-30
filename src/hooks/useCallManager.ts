import { useState, useEffect, useCallback, useRef } from 'react';
import { CallEvent } from '../types/call';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL_CALL;

export type CallStatus = 'idle' | 'initiating' | 'in-progress' | 'ended' | 'error' | 'call.initiated' | 'call.answered' | 'call.hangup';

export const useCallManager = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Use a ref to keep track of the socket instance
  const socketRef = useRef<Socket | null>(null);

  // Établir la connexion WebSocket (Socket.IO)
  useEffect(() => {
    if (!BACKEND_URL) {
      console.error('VITE_API_URL_CALL is not defined');
      return;
    }

    console.log('🔌 Connecting to Socket.IO:', BACKEND_URL);

    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Connected to call events Socket.IO server', newSocket.id);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
      // Don't set global error immediately to avoid UI disruption on temporary disconnects
      // unless it persists.
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });

    // Handle call status updates from backend
    newSocket.on('call-status', (data: { callControlId: string, status: string, recordingUrl?: string }) => {
      console.log('📞 Received call status update:', data);

      switch (data.status) {
        case 'initiated':
          setCallStatus('call.initiated');
          setCurrentCallId(data.callControlId);
          break;
        case 'ringing':
          console.log('📞 Call ringing...');
          break;
        case 'active':
        case 'answered':
          setCallStatus('call.answered');
          break;
        case 'ended':
        case 'completed':
          setCallStatus('call.hangup');
          setCurrentCallId(null);
          break;
        case 'failed':
          setCallStatus('error');
          setError('Call failed');
          setCurrentCallId(null);
          break;
        case 'recording-saved':
          console.log('💾 Recording saved:', data.recordingUrl);
          break;
        default:
          console.log('Unknown status:', data.status);
      }
    });

    // Handle call initiated confirmation (specific to initiate-call emission)
    newSocket.on('call-initiated', (data: { success: boolean, callControlId: string, status: string }) => {
      console.log('✅ Call initiated event received:', data);
      if (data.success) {
        setCallStatus('call.initiated');
        setCurrentCallId(data.callControlId);
      }
    });

    newSocket.on('call-error', (data: { error: string, details?: any }) => {
      console.error('❌ Call error event:', data);
      setError(data.error);
      setCallStatus('error');
    });

    return () => {
      console.log('🔌 Disconnecting Socket.IO');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const initiateCall = useCallback(async (to: string, from: string, agentId: string) => {
    if (!socketRef.current) {
      const err = 'Socket not initialized';
      console.error(err);
      setError(err);
      return;
    }

    try {
      console.log('📞 Initiating call via Socket.IO:', { to, from, agentId });
      setError(null);
      setCallStatus('initiating');

      // Emit event to backend to start call
      socketRef.current.emit('initiate-call', { to, from, agentId });

    } catch (err) {
      console.error('❌ Error initiating call:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
      setCallStatus('error');
    }
  }, []);

  const endCall = useCallback(async () => {
    if (!currentCallId) {
      const error = 'No active call to end';
      setError(error);
      return;
    }

    if (!socketRef.current) {
      const err = 'Socket not initialized';
      console.error(err);
      setError(err);
      return;
    }

    try {
      console.log('📞 Ending call via Socket.IO:', currentCallId);
      setError(null);

      // Emit event to hangup
      socketRef.current.emit('hangup-call', { callControlId: currentCallId });

      // Optimistically update status
      setCallStatus('call.hangup');
      setCurrentCallId(null);

    } catch (err) {
      console.error('❌ Error ending call:', err);
      setError(err instanceof Error ? err.message : 'Failed to end call');
    }
  }, [currentCallId]);

  return {
    callStatus,
    currentCallId,
    error,
    initiateCall,
    endCall,
    mediaStream,
    isConnected: socketRef.current?.connected ?? false
  };
};
