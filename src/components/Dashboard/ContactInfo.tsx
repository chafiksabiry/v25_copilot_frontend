import React, { useState,useEffect,useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useRealTimeFeatures } from '../../hooks/useRealTimeFeatures';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useTwilioMute } from '../../hooks/useTwilioMute';
import { getAgentName } from '../../utils';
import { getAgentIdFromStorage } from '../../utils/agentUtils';
import { useLead } from '../../hooks/useLead';
import { useUrlParam } from '../../hooks/useUrlParams';
import { useGigPhoneNumber } from '../../hooks/useGigPhoneNumber';
import { useCallManager } from '../../hooks/useCallManager';
import { MicrophoneService } from '../../services/MicrophoneService';
import { AudioStreamManager } from '../../services/AudioStreamManager';
import { 
  User, Phone, Mail, MapPin, Clock, 
  Star, Tag, Calendar, MessageSquare, Video,
  PhoneCall, Linkedin, Twitter, Globe, Edit, ChevronDown, ChevronUp, Loader2,
  AlertCircle
} from 'lucide-react';

interface TokenResponse {
  token: string;
}

export function ContactInfo() {
  const { storeCall } = useCallStorage();
  const { setTwilioConnection, clearTwilioConnection } = useTwilioMute();
  
  // Récupérer le leadId depuis l'URL
  const leadId = useUrlParam('leadId');
  
  // Récupérer les données du lead depuis l'API
  const { lead: apiLead, loading: leadLoading, error: leadError } = useLead(leadId);
  
  // Utiliser le contexte de transcription global
  const { 
    startTranscription, 
    stopTranscription, 
    isActive: isTranscriptionActive
  } = useTranscription();
  
  const { state, dispatch } = useAgent();
  const [expanded, setExpanded] = useState(true);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [callStatus, setCallStatus] = useState<string>('idle'); // 'idle', 'initiating', 'active', 'ended', 'error'
  const [currentCallSid, setCurrentCallSid] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [outboundStreamUrl, setOutboundStreamUrl] = useState<string | null>(null);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [microphoneService, setMicrophoneService] = useState<MicrophoneService | null>(null);
  const audioManagerRef = useRef<AudioStreamManager | null>(null);
  
  // Hook for gig phone number management
  const { 
    checkPhoneNumber, 
    configureVoiceFeature, 
    isLoading: isPhoneNumberLoading,
    error: phoneNumberCheckError,
    phoneNumberData
  } = useGigPhoneNumber();

  // Fallback contact data when no lead is provided or while loading
  const fallbackContact = {
    id: '65d7f6a9e8f3e4a5c6d1e456',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+212693223005', // Default Moroccan number per memory
    company: 'TechCorp Solutions',
    title: 'VP of Operations',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    status: 'qualified' as 'qualified',
    source: 'website' as 'website',
    priority: 'high' as 'high',
    lastContact: new Date(Date.now() - 86400000 * 3), // 3 days ago
    nextFollowUp: new Date(Date.now() + 86400000), // Tomorrow
    notes: 'Interested in enterprise solution. Budget approved. Decision maker identified.',
    tags: ['Enterprise', 'Hot Lead', 'Q4 Target'],
    value: 0,
    assignedAgent: getAgentName(),
    timezone: 'EST',
    preferredContactMethod: 'phone' as 'phone',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      twitter: 'https://twitter.com/sarahj'
    },
    leadScore: 0,
    interests: ['Automation', 'Cost Reduction', 'Scalability'],
    painPoints: ['Manual processes', 'High operational costs', 'Limited scalability'],
    budget: {
      min: 50000,
      max: 100000,
      currency: 'USD'
    },
    timeline: 'Q4 2024',
    decisionMakers: ['Sarah Johnson (VP Operations)', 'Mike Chen (CTO)', 'Lisa Rodriguez (CFO)'],
    competitors: ['CompetitorA', 'CompetitorB'],
    previousInteractions: [
      {
        date: new Date(Date.now() - 86400000 * 7),
        type: 'email',
        outcome: 'Positive response',
        notes: 'Expressed interest in demo'
      },
      {
        date: new Date(Date.now() - 86400000 * 14),
        type: 'call',
        outcome: 'Qualified lead',
        notes: 'Budget confirmed, timeline established'
      }
    ] as { date: Date; type: 'call' | 'email' | 'meeting' | 'demo'; outcome: string; notes: string; }[]
  };

  // Transform API lead data to contact format
  const getContactFromApiLead = (lead: any) => {
    return {
      ...fallbackContact,
      id: lead._id || lead.id || fallbackContact.id,
      name: lead.Deal_Name || 'Unknown Lead',
      email: lead.Email_1 || 'No email provided',
      phone: lead.Phone || fallbackContact.phone,
      company: lead.assignedTo?.name || 'Unknown Company',
      title: lead.Stage || 'Lead',
      assignedAgent: getAgentName(),
      leadScore: 0,
      value: 0,
      avatar: undefined, // Force use of default icon
    };
  };

  // Use API lead data if available, otherwise use fallback
  const contact = apiLead ? getContactFromApiLead(apiLead) : fallbackContact;

  // Debug: Log contact data whenever it changes
 /*  console.log("Contact data:", contact);
  console.log("Contact phone:", contact.phone);
  console.log("Call status:", callStatus); */

  const initiateTwilioCall = async (phoneNumber: string) => {
    console.log("Starting Twilio call with number:", phoneNumber);

    setIsCallLoading(true);
    setCallStatus('initiating');
    console.log("Starting Twilio call to:", phoneNumber);

    try {
      // Get Twilio token
      const apiUrl = import.meta.env.VITE_API_URL_CALL || 'http://localhost:3000';
      const tokenUrl = `${apiUrl}/api/calls/token`;
      console.log("Fetching token from:", tokenUrl);
      
      const response = await axios.get<TokenResponse>(tokenUrl);
      const token = response.data.token;
      console.log("Token received:", token ? "Token exists" : "No token");
      
      if (!token) {
        throw new Error("No token received from server");
      }
      
      // Create Twilio Device
      console.log("Creating Twilio Device...");
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'pcma'] as any,
        edge: ['ashburn', 'dublin', 'sydney']
      });
      
      // Register device
      console.log("Registering device...");
      await newDevice.register();
      console.log("Device registered successfully");
      
      // Connect call
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
        },
        // Assurer que les sons d'appel sont audibles
        enableRingingState: true,
        allowIncomingWhileBusy: false
      } as any);
      console.log("Connection established:", conn);

      // Store active connection and device locally
      setActiveConnection(conn);
      setActiveDevice(newDevice);
      
      // Store connection in global state for mute controls
      setTwilioConnection(conn, newDevice);

      // Set up event listeners
      conn.on('connect', () => {
        const callSid = conn.parameters?.CallSid;
        console.log("CallSid on connect:", callSid);
        if (callSid) {
          setCurrentCallSid(callSid);
          console.log("✅ CallSid stored on connect:", callSid);
        }
      });
      
      // Écouter les événements de sonnerie
      conn.on('ringing', () => {
        console.log('🔔 Call is ringing - outbound call audio should be heard');
        setCallStatus('ringing');
        
        // Double check CallSid during ringing
        const callSid = conn.parameters?.CallSid;
        if (callSid && !currentCallSid) {
          setCurrentCallSid(callSid);
          console.log("✅ CallSid stored on ringing:", callSid);
        }
      });

      // Stocker l'ID du contact au début de la connexion
      const contactIdForCall = contact?.id;
      console.log("📞 Starting call with contact ID:", contactIdForCall);

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        const Sid = conn.parameters?.CallSid;
        console.log("CallSid recupéré", Sid);
        setCurrentCallSid(Sid);
        setCallStatus('active');
        
        console.log('🎧 Call connected - setting up audio streams');

        // Ajout : dispatcher l'action START_CALL dans le contexte global
        dispatch({
          type: 'START_CALL',
          participants: [], // tu peux mettre la vraie liste si tu l'as
          contact: contact
        });
        
        // Start transcription when call is accepted
        setTimeout(async () => {
          try {
            const stream = conn.getRemoteStream();
            if (stream) {
              setMediaStream(stream);
              dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: stream });
              
              // Log de debug pour la transcription
              console.log('🌍 Starting transcription with global context');
              
              await startTranscription(stream, contact.phone);
              console.log('🎤 Transcription started for call phases');
            }
          } catch (error) {
            console.error('Failed to start transcription:', error);
          }
        }, 1000);
        
        // Set call details in global state
        console.log('Setting call details:', { callSid: Sid, agentId: contact.id });
      });

      conn.on('disconnect', async () => {
        console.log("📞 Call disconnected - starting cleanup");
        // Get the final CallSid directly from the connection
        const finalCallSid = conn.parameters?.CallSid || currentCallSid;
        console.log("📞 Final CallSid for storage:", finalCallSid);
        
        // Store the call with the CallSid we have right now
        if (finalCallSid && contact?.id) {
          console.log("💾 Storing call with final CallSid:", finalCallSid);
          await storeCall(finalCallSid, contact.id);
        } else {
          console.warn("⚠️ Missing data for initial call storage:", { finalCallSid, contactId: contact?.id });
        }
        
        // Then proceed with cleanup
        await cleanupAndStoreCall();
      });

      conn.on('error', async (error: any) => {
        console.error("❌ Call error:", error);
        await cleanupAndStoreCall();
      });

    } catch (err: any) {
      console.error("Failed to initiate Twilio call:", err);
      setCallStatus('idle'); // Reset to idle on error
    } finally {
      setIsCallLoading(false);
    }
  };

  // Fonction pour gérer la fin d'appel (commune aux deux cas)
  const handleCallEnd = async (callSid: string, contactId: string) => {
    console.log("📞 Handling call end with:", { callSid, contactId });
    
    try {
      // 1. Sauvegarder l'appel AVANT tout nettoyage d'état
      if (callSid && contactId) {
        console.log("💾 Storing call in database:", { callSid, contactId });
        await storeCall(callSid, contactId);
      }
      
      // 2. Arrêter la transcription
      await stopTranscription();
      
      // 3. Nettoyer les états
      setCallStatus('idle');
      setActiveConnection(null);
      setActiveDevice(null);
      setMediaStream(null);
      dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
      clearTwilioConnection();
      
      // 4. Mettre à jour le contexte global
      dispatch({ type: 'END_CALL' });
      
      console.log("✅ Call end handling completed");
    } catch (error) {
      console.error("❌ Error during call end handling:", error);
    }
  };

  // Quand l'agent termine l'appel
  // Fonction pour nettoyer et stocker l'appel
  const cleanupAndStoreCall = async () => {
    console.log("📞 [CLEANUP] Starting call cleanup process...");
    
    // Get CallSid from active connection if available
    const finalCallSid = activeConnection?.parameters?.CallSid || currentCallSid;
    
    console.log("📊 [CLEANUP] Current state:", {
      callSid: finalCallSid,
      storedCallSid: currentCallSid,
      contactId: contact?.id,
      callStatus,
      hasActiveConnection: !!activeConnection,
      hasMediaStream: !!mediaStream,
      isTranscriptionActive
    });
    
    try {
      // 1. Stocker l'appel d'abord
      if (finalCallSid && contact?.id) {
        console.log("💾 [CLEANUP] Storing call in database:", { 
          callSid: finalCallSid, 
          contactId: contact.id 
        });
        await storeCall(finalCallSid, contact.id);
        console.log("✅ [CLEANUP] Call stored successfully");
      } else {
        console.warn("⚠️ [CLEANUP] Missing data for call storage:", {
          finalCallSid,
          storedCallSid: currentCallSid,
          contactId: contact?.id
        });
      }
      
      // 2. Arrêter la transcription
      console.log("🎤 [CLEANUP] Stopping transcription...");
      await stopTranscription();
      console.log("✅ [CLEANUP] Transcription stopped");
      
      // 3. Nettoyer les états
      console.log("🧹 [CLEANUP] Cleaning up states...");
      setActiveConnection(null);
      setActiveDevice(null);
      setCallStatus('idle');
      setMediaStream(null);
      dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
      clearTwilioConnection();
      console.log("✅ [CLEANUP] States cleaned");
      
      // 4. Mettre à jour le contexte global
      console.log("🌍 [CLEANUP] Updating global context...");
      dispatch({ type: 'END_CALL' });
      console.log("✅ [CLEANUP] Global context updated");
      
      console.log("🏁 [CLEANUP] Call cleanup completed successfully");
    } catch (error) {
      console.error("❌ [CLEANUP] Error during cleanup:", error);
      throw error; // Propager l'erreur pour la gérer plus haut si nécessaire
    }
  };

  // Quand l'agent termine l'appel
  const endCall = async () => {
    console.log("🔴 Agent ending call - status:", {
      telnyxStatus: telnyxCallStatus,
      hasTwilioConnection: !!activeConnection,
      currentCallSid
    });

    try {
      // Arrêter la capture micro
      if (microphoneService) {
        console.log('🎤 Arrêt de la capture micro');
        microphoneService.stopCapture();
        setMicrophoneService(null);
      }

      if (activeConnection) {
        // Pour les appels Twilio
        console.log("📞 Ending Twilio call...");
        activeConnection.disconnect();
        
        // Forcer le nettoyage après 1 seconde si la déconnexion est lente
        setTimeout(() => {
          if (callStatus !== 'idle') {
            console.log("⚠️ Forcing call cleanup...");
            cleanupAndStoreCall();
          }
        }, 1000);
      } else if (telnyxCallStatus === 'call.answered') {
        // Pour les appels Telnyx
        console.log("📞 Ending Telnyx call...");
        await endTelnyxCall();
        
        // Mettre à jour l'état immédiatement
        setCallStatus('idle');
        setStreamUrl(null);
        dispatch({ type: 'END_CALL' });
      } else {
        console.log("⚠️ No active call to end");
        // Nettoyer l'état par précaution
        setCallStatus('idle');
        setStreamUrl(null);
        dispatch({ type: 'END_CALL' });
      }
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      setPhoneNumberError('Failed to end call');
      
      // Forcer le nettoyage en cas d'erreur
      setCallStatus('idle');
      setStreamUrl(null);
      dispatch({ type: 'END_CALL' });
    }
  };

  const {
    callStatus: telnyxCallStatus,
    error: telnyxCallError,
    initiateCall: initiateTelnyxCallRaw,
    endCall: endTelnyxCall,
    isConnected: isTelnyxConnected,
    mediaStream: telnyxMediaStream
  } = useCallManager();

  // Effect to sync Telnyx call status with local state
  useEffect(() => {
    if (!activeConnection && telnyxCallStatus) {  // Only update if not a Twilio call
      console.log('📞 Telnyx call status:', telnyxCallStatus);
      switch (telnyxCallStatus) {
        case 'call.initiated':
          console.log('📞 Call initiated');
          setCallStatus('initiating');
          // Set stream URLs when call is initiated
          const baseWsUrl = import.meta.env.VITE_API_URL_CALL?.replace('http://', 'ws://').replace('https://', 'wss://');
          const inboundWsUrl = `${baseWsUrl}/frontend-audio`;
          const outboundWsUrl = `${baseWsUrl}/frontend-audio`;
          
          console.log('🔍 Generated WebSocket URLs:', { inboundWsUrl, outboundWsUrl });
          console.log('🎧 Setting stream URLs for audio streaming');
          setStreamUrl(inboundWsUrl);
          setOutboundStreamUrl(outboundWsUrl);
          break;
        case 'call.answered':
          console.log('📞 Call answered');
          setCallStatus('active');
          dispatch({ type: 'START_CALL', participants: [], contact: contact });
          
          // Démarrer la capture micro quand l'appel est répondu
          startMicrophoneCapture();
          break;
        case 'call.hangup':
          console.log('📞 Call ended');
          setCallStatus('idle');
          setStreamUrl(null); // Clear inbound stream URL when call ends
          setOutboundStreamUrl(null); // Clear outbound stream URL when call ends
          dispatch({ type: 'END_CALL' });
          break;
      }
    }
  }, [telnyxCallStatus, activeConnection]);

  // Fonction pour démarrer le micro
  const startMicrophoneCapture = async () => {
    if (microphoneService) {
      try {
        // Test permissions first
        const permissionTest = await MicrophoneService.testMicrophonePermissions();
        if (!permissionTest.success) {
          console.error('❌ Microphone permission test failed:', permissionTest.error);
          setPhoneNumberError(`Microphone error: ${permissionTest.error}`);
          return;
        }

        await microphoneService.startCapture();
        console.log('🎤 Capture micro démarrée');
      } catch (error) {
        console.error('❌ Erreur démarrage micro:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown microphone error';
        setPhoneNumberError(`Microphone error: ${errorMessage}`);
      }
    }
  };

  // Effect to handle Telnyx errors
  useEffect(() => {
    if (telnyxCallError) {
      console.error('❌ Telnyx call error:', telnyxCallError);
      setPhoneNumberError(telnyxCallError);
      setCallStatus('idle');
    }
  }, [telnyxCallError]);

  // Effect to handle inbound audio stream connection (frontend-audio)
  useEffect(() => {
    if (streamUrl) {
      console.log('🎧 Initializing inbound audio stream manager for URL:', streamUrl);
      
      // Create new AudioStreamManager if not exists
      if (!audioManagerRef.current) {
        audioManagerRef.current = new AudioStreamManager((error) => {
          console.error('Inbound audio stream error:', error);
          setPhoneNumberError(error.message);
        });
      }

      // Connect to the inbound WebSocket
      audioManagerRef.current.connect(streamUrl).catch(error => {
        console.error('Failed to connect to inbound audio stream:', error);
        setPhoneNumberError('Failed to connect to inbound audio stream');
      });

      // Cleanup function
      return () => {
        console.log('🎧 Cleaning up inbound audio stream manager');
        if (audioManagerRef.current) {
          audioManagerRef.current.disconnect();
        }
      };
    }
  }, [streamUrl]);

  // Effect to handle outbound audio stream connection (outbound-audio)
  useEffect(() => {
    if (outboundStreamUrl) {
      console.log('🎤 Initializing outbound audio stream for URL:', outboundStreamUrl);
      
      // Create WebSocket for microphone service (outbound audio)
      const outboundWs = new WebSocket(outboundStreamUrl);
      
      outboundWs.onopen = () => {
        console.log('🎤 Outbound WebSocket connected for microphone');
        // Créer le service micro avec le WebSocket outbound connecté
        const mic = new MicrophoneService(outboundWs);
        setMicrophoneService(mic);
      };

      outboundWs.onerror = (error) => {
        console.error('❌ Erreur outbound WebSocket micro:', error);
        setPhoneNumberError('Failed to connect to outbound audio stream');
      };

      outboundWs.onclose = () => {
        console.log('🎤 Outbound WebSocket closed');
      };

      // Cleanup function
      return () => {
        console.log('🎤 Cleaning up outbound audio stream');
        if (microphoneService) {
          microphoneService.stopCapture();
        }
        if (outboundWs.readyState === WebSocket.OPEN) {
          outboundWs.close();
        }
      };
    }
  }, [outboundStreamUrl]);

  const initiateTelnyxCall = async (phoneNumber: string) => {
    if (!isTelnyxConnected) {
      setPhoneNumberError('WebSocket connection not ready');
      return;
    }

    try {
      setIsCallLoading(true);
      console.log('📞 Initiating Telnyx call:', {
        to: contact.phone,
        from: phoneNumber,
        agentId: getAgentIdFromStorage()
      });
      
      await initiateTelnyxCallRaw(
        contact.phone,           // To number (contact's number)
        phoneNumber,             // From number (our Telnyx number)
        getAgentIdFromStorage()  // Agent ID
      );

    } catch (error) {
      console.error('❌ Failed to initiate Telnyx call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
      setPhoneNumberError(errorMessage);
      setCallStatus('idle');
    } finally {
      setIsCallLoading(false);
    }
  };

  const initiateCall = async () => {
    setPhoneNumberError(null);
    setIsCallLoading(true);
    
    try {
      // Check gig phone number
      const phoneNumberResponse = await checkPhoneNumber();
      
      if (!phoneNumberResponse) {
        throw new Error('Failed to check gig phone number');
      }

      if (!phoneNumberResponse.hasNumber) {
        throw new Error(phoneNumberResponse.message || 'No active phone number found for this gig');
      }

      const { number } = phoneNumberResponse;
      
      if (!number) {
        throw new Error('Phone number not found in response');
      }
      
      // Verify number status and features
      if (number.provider === 'telnyx') {
        console.log('📞 Processing Telnyx number:', {
          status: number.status,
          hasVoice: number.features.voice,
          phoneNumber: number.phoneNumber
        });

        if (number.status != 'success') {
          throw new Error(`Phone number status is ${number.status}, must be success`);
        }

        // Always check and configure voice feature for Telnyx numbers
        if (!number.features.voice) {
          console.log('🔧 Configuring voice feature for Telnyx number:', number);
          
          try {
            const success = await configureVoiceFeature(number);
            if (!success) {
              throw new Error('Failed to configure voice feature for Telnyx number');
            }

            // Voice feature is now configured, proceed with call
            return await initiateTelnyxCall(number.phoneNumber);
          } catch (error) {
            console.error('❌ Error during voice feature configuration:', error);
            throw error;
          }
        }
      }

      // Initiate call based on provider
      if (number.provider == 'twilio') {
        await initiateTwilioCall(number.phoneNumber);
      } else if (number.provider == 'telnyx') {
        await initiateTelnyxCall(number.phoneNumber);
      } else {
        throw new Error(`Unsupported provider: ${number.provider}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
      setPhoneNumberError(errorMessage);
      setCallStatus('idle');
      console.error('Call initiation error:', error);
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleStartCall = () => {
    initiateCall();
  };

  const handleCallNow = () => {
    initiateCall();
  };

  // Fonction pour tester les permissions microphone
  const testMicrophonePermissions = async () => {
    try {
      console.log('🧪 Testing microphone permissions...');
      const result = await MicrophoneService.testMicrophonePermissions();
      
      if (result.success) {
        console.log('✅ Microphone permissions OK');
        setPhoneNumberError(null);
        // Optionally show success message
        alert('✅ Microphone permissions are working correctly!');
      } else {
        console.error('❌ Microphone permissions failed:', result.error);
        setPhoneNumberError(`Microphone test failed: ${result.error}`);
        alert(`❌ Microphone test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error testing microphone permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPhoneNumberError(`Microphone test error: ${errorMessage}`);
      alert(`❌ Microphone test error: ${errorMessage}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-600/20 text-blue-300';
      case 'qualified': return 'bg-green-600/20 text-green-300';
      case 'contacted': return 'bg-yellow-600/20 text-yellow-300';
      case 'interested': return 'bg-purple-600/20 text-purple-300';
      case 'negotiating': return 'bg-orange-600/20 text-orange-300';
      case 'closed': return 'bg-emerald-600/20 text-emerald-300';
      case 'lost': return 'bg-red-600/20 text-red-300';
      default: return 'bg-slate-600/20 text-slate-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'text': return <MessageSquare className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  return (
    <>

      {/* Error states */}
      {(leadError || phoneNumberError) && (
        <div className="w-full bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="w-5 h-5" />
            {leadError && (
              <>
            <span className="text-sm font-medium">Error loading lead:</span>
            <span className="text-sm">{leadError}</span>
              </>
            )}
            {phoneNumberError && (
              <>
                <span className="text-sm font-medium">Call error:</span>
                <span className="text-sm">{phoneNumberError}</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {leadLoading && (
        <div className="w-full flex items-center justify-center py-4 bg-[#1b253a] rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
          <span className="text-slate-300">Loading lead data...</span>
        </div>
      )}
      
      {/* Main content - only show when not loading */}
      {!leadLoading && (
        <div className="bg-[#1b253a] rounded-xl shadow-sm px-8 py-5 flex items-center justify-between mt-4 mb-4">
        {/* Avatar + Infos */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-2xl font-bold">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg font-bold text-white">{contact.name}</span>
              <span className="bg-green-700 text-green-200 text-xs px-2 py-0.5 rounded-full font-semibold">qualified</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 text-sm">
              <span className="text-yellow-400 flex items-center"><Star className="w-4 h-4 mr-1" />{contact.leadScore}/100</span>
            </div>
          </div>
        </div>
        {/* Bouton Start Call + Tabs */}
        <div className="flex-1 flex flex-col items-center">
          {(callStatus === 'active' || telnyxCallStatus === 'call.answered') ? (
            <button
              onClick={endCall}
              className="w-56 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold text-lg transition-all duration-200 shadow-md bg-red-500 hover:bg-red-600 text-white"
            >
              <Phone className="w-5 h-5 mr-2" />
              End Call
            </button>
          ) : (
            <button
              onClick={handleStartCall}
              disabled={isCallLoading || callStatus === 'initiating'}
              className={`w-56 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold text-lg transition-all duration-200 shadow-md
                ${isCallLoading || callStatus === 'initiating' ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              <Phone className="w-5 h-5 mr-2" />
              {isCallLoading || callStatus === 'initiating' ? 'Initiating...' : 'Start Call'}
            </button>
          )}
          <div className="flex items-center space-x-6 mt-3">
            <span className="text-slate-400 text-sm">Transcript <span className="font-bold text-white">0</span> entries</span>
            <span className="flex items-center text-slate-400 text-sm"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19h16M4 15h16M4 11h16M4 7h16" /></svg>Knowledge</span>
          </div>
        </div>
        {/* Actions à droite */}
              <div className="flex items-center space-x-3">
          <button 
            onClick={testMicrophonePermissions}
            className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-lg"
            title="Test Microphone Permissions"
          >
            🎤
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"><Mail className="w-5 h-5" /></button>
          <button className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"><Phone className="w-5 h-5" /></button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg"><Calendar className="w-5 h-5" /></button>
              </div>
        {/* Toggle à droite */}
        <button
          className="ml-4 bg-[#232f47] hover:bg-[#26314a] rounded-lg p-2 text-slate-300 transition-colors"
          onClick={() => setExpanded(e => !e)}
          aria-label="Toggle contact details"
        >
          {expanded ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
        </button>
        </div>
      )}

      {expanded && (
        <div className="w-full mt-2 max-w-[1800px] mx-auto mb-8">
          <div className="bg-[#232f47] rounded-xl p-4 grid grid-cols-3 gap-4 items-center">
            {/* Colonne gauche */}
            <div className="flex flex-col items-start">
              <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold mb-2">
                <User className="w-8 h-8" />
              </div>
              <div className="text-lg font-bold text-white mb-1">{contact.name}</div>
            </div>
            {/* Colonne centre */}
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 text-slate-200">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-sm">{contact.phone}</span>
                <button className="ml-1 text-slate-400 hover:text-blue-400" title="Copy"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Mail className="w-5 h-5 text-green-400" />
                <span className="font-medium text-sm">{contact.email}</span>
                <button className="ml-1 text-slate-400 hover:text-green-400" title="Copy"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-sm">EST Timezone</span>
                </div>
            </div>
            {/* Colonne droite */}
            <div className="flex flex-row items-center justify-between w-full">
              {/* Bloc gauche : badge + score + valeur */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-[240px]">
                  <span className="block bg-[#25594B] text-green-200 py-2 rounded-full text-lg font-medium text-center">Qualified</span>
                </div>
                <div className="mt-2 text-white text-xl font-bold text-center">{contact.leadScore}/100</div>
                <div className="text-slate-300 text-sm text-center">Lead Score</div>
                <div className="mt-2 text-green-400 text-lg font-bold text-center">${contact.value?.toLocaleString() || '0'}</div>
                <div className="text-slate-300 text-sm text-center">Potential Value</div>
                </div>
              {/* Bouton à droite */}
              {(callStatus === 'active' || telnyxCallStatus === 'call.answered') ? (
                <button 
                  onClick={endCall}
                  className="ml-8 flex items-center font-semibold text-lg px-10 py-3 rounded-lg transition shadow-md bg-red-500 hover:bg-red-600 text-white"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  End Call
                </button>
              ) : (
                <button 
                  onClick={handleCallNow}
                  disabled={isCallLoading || callStatus === 'initiating'}
                  className={`ml-8 flex items-center font-semibold text-lg px-10 py-3 rounded-lg transition shadow-md
                    ${isCallLoading || callStatus === 'initiating' ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {isCallLoading || callStatus === 'initiating' ? 'Initiating...' : 'Call Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}