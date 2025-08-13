import React, { useState } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useRealTimeFeatures } from '../../hooks/useRealTimeFeatures';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useTwilioMute } from '../../hooks/useTwilioMute';
import { 
  User, Phone, Mail, Building, MapPin, Clock, 
  Star, Tag, Calendar, MessageSquare, Video,
  PhoneCall, Linkedin, Twitter, Globe, Edit, ChevronDown, ChevronUp
} from 'lucide-react';

interface TokenResponse {
  token: string;
}

export function ContactInfo() {
  const { storeCall } = useCallStorage();
  const { setTwilioConnection, clearTwilioConnection } = useTwilioMute();
  
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

  // Store original contact data to prevent it from being overwritten
  const [originalContact] = useState({
    id: '65d7f6a9e8f3e4a5c6d1e456',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+212693223005',
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
    value: 75000,
    assignedAgent: 'Agent Smith',
    timezone: 'EST',
    preferredContactMethod: 'phone' as 'phone',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      twitter: 'https://twitter.com/sarahj'
    },
    leadScore: 85,
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
  });

  // Use original contact data instead of state.callState.contact
  const contact = originalContact;

  // Debug: Log contact data whenever it changes
 /*  console.log("Contact data:", contact);
  console.log("Contact phone:", contact.phone);
  console.log("Call status:", callStatus); */

  const initiateTwilioCall = async () => {
   /*  console.log("Contact phone number:", contact.phone);
    console.log("Contact object:", contact);
    console.log("Call status at start:", callStatus); */
    
    // Ensure we have valid contact data
    const phoneNumber = contact?.phone || '+212693223005'; // Fallback to default
    console.log("Using phone number:", phoneNumber);
    
    if (!phoneNumber) {
      console.error('No phone number available');
      return;
    }

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
        }
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
        console.log("CallSid:", callSid);
      });

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        const Sid = conn.parameters?.CallSid;
        console.log("CallSid recupéré", Sid);
        setCurrentCallSid(Sid);
        setCallStatus('active');

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
        console.log("Call disconnected");
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        setActiveDevice(null);
        setMediaStream(null);
        dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
        
        // Clear Twilio connection from global state
        clearTwilioConnection();
        
        // Stop transcription
        await stopTranscription();
        
        // Store call in database when it disconnects
        if (currentCallSid && contact.id) {
          await storeCall(currentCallSid, contact.id);
        }
        
        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

      conn.on('error', (error: any) => {
        console.error("Call error:", error);
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        setActiveDevice(null);
        
        // Clear Twilio connection from global state
        clearTwilioConnection();
        
        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

    } catch (err: any) {
      console.error("Failed to initiate Twilio call:", err);
      setCallStatus('idle'); // Reset to idle on error
    } finally {
      setIsCallLoading(false);
    }
  };

  const endCall = async () => {
    console.log("Ending call...");
    console.log("Contact before ending call:", contact);
    console.log("Contact phone before ending call:", contact.phone);
    
    if (activeConnection) {
      activeConnection.disconnect();
    }
    
    // Reset call-related states only
    setActiveConnection(null);
    setActiveDevice(null);
    setCallStatus('idle'); // Reset to idle instead of 'ended'
    setMediaStream(null);
    dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
    
    // Stop transcription
    await stopTranscription();
    
    // Store call in database when it ends
    if (currentCallSid && contact.id) {
      await storeCall(currentCallSid, contact.id);
    }
    
    // Ajout : dispatch END_CALL pour mettre à jour le context global
    dispatch({ type: 'END_CALL' });
    
    console.log("Call ended. Contact after ending call:", contact);
    console.log("Contact phone after ending call:", contact.phone);
  };

  const handleStartCall = () => {
    initiateTwilioCall();
  };

  const handleCallNow = () => {
    initiateTwilioCall();
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
      <div className="bg-[#1b253a] rounded-xl shadow-sm px-8 py-5 flex items-center justify-between mt-4 mb-4">
        {/* Avatar + Infos */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-2xl font-bold">
            {contact.avatar ? (
              <img src={contact.avatar} alt={contact.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              contact.name.split(' ').map(n => n[0]).join('')
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg font-bold text-white">{contact.name}</span>
              <span className="bg-green-700 text-green-200 text-xs px-2 py-0.5 rounded-full font-semibold">qualified</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 text-sm">
                <Building className="w-4 h-4" />
              <span>{contact.company}</span>
              <span className="text-yellow-400 flex items-center ml-2"><Star className="w-4 h-4 mr-1" />85/100</span>
            </div>
          </div>
        </div>
        {/* Bouton Start Call + Tabs */}
        <div className="flex-1 flex flex-col items-center">
          {callStatus === 'active' ? (
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
      {expanded && (
        <div className="w-full mt-2 max-w-[1800px] mx-auto mb-8">
          <div className="bg-[#232f47] rounded-xl p-4 grid grid-cols-3 gap-4 items-center">
            {/* Colonne gauche */}
            <div className="flex flex-col items-start">
              <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold mb-2">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  contact.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div className="text-lg font-bold text-white mb-1">{contact.name}</div>
              <div className="text-slate-300 text-sm">VP of Operations</div>
              <div className="text-slate-400 text-sm">TechCorp Solutions</div>
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
                <span className="font-medium text-sm">sarah.johnson@techcorp.com</span>
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
                <div className="mt-2 text-white text-xl font-bold text-center">85/100</div>
                <div className="text-slate-300 text-sm text-center">Lead Score</div>
                <div className="mt-2 text-green-400 text-lg font-bold text-center">$75 000</div>
                <div className="text-slate-300 text-sm text-center">Potential Value</div>
                </div>
              {/* Bouton à droite */}
              {callStatus === 'active' ? (
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