import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('authToken')
      }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinCall = (callId: string) => {
    socketRef.current?.emit('join-call', callId);
  };

  const leaveCall = (callId: string) => {
    socketRef.current?.emit('leave-call', callId);
  };

  const sendTranscriptUpdate = (callId: string, data: any) => {
    socketRef.current?.emit('transcript-update', { callId, ...data });
  };

  const sendAudioLevel = (callId: string, level: number) => {
    socketRef.current?.emit('audio-level', { callId, level });
  };

  const onTranscriptUpdate = (callback: (data: any) => void) => {
    socketRef.current?.on('transcript-update', callback);
  };

  const onAudioLevel = (callback: (data: any) => void) => {
    socketRef.current?.on('audio-level', callback);
  };

  const onCallStarted = (callback: (call: any) => void) => {
    socketRef.current?.on('call-started', callback);
  };

  const onCallEnded = (callback: (data: any) => void) => {
    socketRef.current?.on('call-ended', callback);
  };

  const onMetricsUpdated = (callback: (metrics: any) => void) => {
    socketRef.current?.on('metrics-updated', callback);
  };

  const onPhaseUpdated = (callback: (data: any) => void) => {
    socketRef.current?.on('phase-updated', callback);
  };

  const onNewRecommendation = (callback: (recommendation: any) => void) => {
    socketRef.current?.on('new-recommendation', callback);
  };

  return {
    socket: socketRef.current,
    joinCall,
    leaveCall,
    sendTranscriptUpdate,
    sendAudioLevel,
    onTranscriptUpdate,
    onAudioLevel,
    onCallStarted,
    onCallEnded,
    onMetricsUpdated,
    onPhaseUpdated,
    onNewRecommendation
  };
}