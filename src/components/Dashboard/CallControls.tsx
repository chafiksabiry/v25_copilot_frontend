import React, { useState, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';

interface CallControlsProps {
  phoneNumber?: string;
  agentId?: string;
  onCallStatusChange?: (status: string) => void;
  onCallSidChange?: (callSid: string) => void;
}

interface AIAssistantAPI {
  setCallDetails: (callSid: string, agentId: string) => void;
}

interface TokenResponse {
  token: string;
}

// Mock AIAssistantAPI - replace with actual implementation
const AIAssistantAPI: AIAssistantAPI = {
  setCallDetails: (callSid: string, agentId: string) => {
    console.log('Setting call details:', { callSid, agentId });
    // TODO: Implement actual API call
  }
};

export const CallControls: React.FC<CallControlsProps> = ({
  phoneNumber,
  agentId,
  onCallStatusChange,
  onCallSidChange
}) => {
  const { storeCall } = useCallStorage();
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [callSid, setCallSid] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const initiateCall = async () => {
    if (!phoneNumber || !agentId) {
      setError('Phone number and agent ID are required');
      return;
    }

    console.log("Starting call initiation...", { phoneNumber, agentId });
    console.log("Environment variables:", {
      VITE_API_URL_CALL: import.meta.env.VITE_API_URL_CALL,
      NODE_ENV: import.meta.env.NODE_ENV
    });
    
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL_CALL || 'http://localhost:3000';
      const tokenUrl = `${apiUrl}/api/calls/token`;
      console.log("Fetching token from:", tokenUrl);
      
      const response = await axios.get<TokenResponse>(tokenUrl);
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      
      const token = (response.data as TokenResponse).token;
      console.log("Token received:", token ? "Token exists" : "No token");
      
      if (!token) {
        throw new Error("No token received from server");
      }
      
      console.log("Creating Twilio Device...");
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'pcma'] as any,
        edge: ['ashburn', 'dublin', 'sydney']
      });
      console.log("Device created:", newDevice);
      
      console.log("Registering device...");
      await newDevice.register();
      console.log("Device registered successfully");
      
      console.log("Connecting call...");
      const conn = await newDevice.connect({
        params: { 
          To: phoneNumber,
          MediaStream: true,
        },
        rtcConfiguration: { 
          sdpSemantics: "unified-plan",
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        },
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        }
      } as any);
      console.log("Connection established:", conn);

      setConnection(conn);
      setDevice(newDevice);
      setCallStatus("initiating");
      onCallStatusChange?.("initiating");

      // Add device event listeners
      newDevice.on('ready', () => {
        console.log("Device is ready");
      });

      newDevice.on('error', (error: any) => {
        console.error("Device error:", error);
        setError(`Device error: ${error.message}`);
        setCallStatus("error");
        onCallStatusChange?.("error");
      });

      // Connection event listeners
      conn.on('connect', () => {
        console.log("Connection event: connect");
        const callSid = conn.parameters?.CallSid;
        console.log("CallSid:", callSid);
      });

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        const Sid = conn.parameters?.CallSid;
        console.log("CallSid recupéré", Sid);
        setCallSid(Sid);
        onCallSidChange?.(Sid);
        // Set call details in global state
        AIAssistantAPI.setCallDetails(Sid, agentId);
        setCallStatus("active");
        onCallStatusChange?.("active");
      });

      conn.on('disconnect', async () => {
        console.log("Call disconnected");
        setCallStatus("ended");
        onCallStatusChange?.("ended");
        setConnection(null);
        setDevice(null);
        
        // Store call in database when it disconnects
        if (callSid && agentId) {
          await storeCall(callSid, agentId);
        }
      });

      conn.on('error', (error: any) => {
        console.error("Call error:", error);
        setError(`Call error: ${error.message}`);
        setCallStatus("error");
        onCallStatusChange?.("error");
      });

      console.log("Call initiation completed successfully");

    } catch (err: any) {
      console.error("Failed to initiate call:", err);
      setError(`Failed to initiate call: ${err.message}`);
      setCallStatus("error");
      onCallStatusChange?.("error");
    } finally {
      setIsLoading(false);
    }
  };

  const endCall = async () => {
    if (connection) {
      connection.disconnect();
      setConnection(null);
      setDevice(null);
      setCallStatus("ended");
      onCallStatusChange?.("ended");
      
      // Store call in database when it ends
      if (callSid && agentId) {
        await storeCall(callSid, agentId);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'initiating': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'ended': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '📞';
      case 'initiating': return '⏳';
      case 'error': return '❌';
      case 'ended': return '📴';
      default: return '📱';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Call Controls</h2>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getStatusColor(callStatus)}`}>
            {getStatusIcon(callStatus)} {callStatus}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Phone Number:</label>
          <span className="text-sm text-gray-600">{phoneNumber || 'Not set'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Agent ID:</label>
          <span className="text-sm text-gray-600">{agentId || 'Not set'}</span>
        </div>

        {callSid && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Call SID:</label>
            <span className="text-sm text-gray-600 font-mono">{callSid}</span>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <button
            onClick={initiateCall}
            disabled={isLoading || callStatus === 'active' || callStatus === 'initiating'}
            className={`px-4 py-2 rounded text-sm font-medium ${
              isLoading || callStatus === 'active' || callStatus === 'initiating'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isLoading ? 'Initiating...' : 'Start Call'}
          </button>

          <button
            onClick={endCall}
            disabled={!connection || callStatus === 'ended'}
            className={`px-4 py-2 rounded text-sm font-medium ${
              !connection || callStatus === 'ended'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            End Call
          </button>
        </div>
              </div>
      </div>
  );
};
