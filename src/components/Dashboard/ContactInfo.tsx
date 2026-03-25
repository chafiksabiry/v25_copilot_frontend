import { useState, useEffect, useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useLead } from '../../hooks/useLead';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import {
  Phone, Mail, Calendar, Briefcase, Target, MessageSquare
} from 'lucide-react';

interface TokenResponse {
  token: string;
}

export function ContactInfo() {
  const { storeCall } = useCallStorage();
  const { profile: agentProfile } = useAgentProfile();

  // Utiliser le contexte de transcription global
  const {
    startTranscription,
    stopTranscription
  } = useTranscription();

  const { dispatch, state } = useAgent();
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const isRecordingRef = useRef(false);

  // Synchronize recording ref with global state
  useEffect(() => {
    isRecordingRef.current = state.callState.isRecording;
  }, [state.callState.isRecording]);

  // Synchronize volume with active connection
  useEffect(() => {
    if (activeConnection && typeof activeConnection.volume === 'function') {
      console.log('🔊 Setting call volume to:', state.volume);
      activeConnection.volume(state.volume);
    }
  }, [state.volume, activeConnection]);

  // Synchronize microphone mute with active connection
  useEffect(() => {
    if (activeConnection && typeof activeConnection.mute === 'function') {
      console.log('🎤 Setting call mute to:', state.isMicMuted);
      activeConnection.mute(state.isMicMuted);
    }
  }, [state.isMicMuted, activeConnection]);

  // Synchronize speaker phone mode with active connection
  useEffect(() => {
    const syncOutputDevice = async () => {
      if (state.availableOutputDevices.length > 0) {
        const headset = state.availableOutputDevices.find(d => 
          d.label.toLowerCase().includes('headset') || 
          d.label.toLowerCase().includes('headphones') || 
          d.label.toLowerCase().includes('casque') ||
          d.label.toLowerCase().includes('hands-free')
        );
        
        const speaker = state.availableOutputDevices.find(d => 
          d.label.toLowerCase().includes('speaker') || 
          d.label.toLowerCase().includes('haut-parleur') || 
          d.label.toLowerCase().includes('internal')
        ) || state.availableOutputDevices[0];

        const targetId = state.isSpeakerPhone ? (speaker?.deviceId || 'default') : (headset?.deviceId || speaker?.deviceId || 'default');
        
        if (deviceRef.current && deviceRef.current.audio && typeof deviceRef.current.audio.speakerDevices?.set === 'function') {
            console.log('🔄 Effect: Switching Twilio output to:', targetId);
            await deviceRef.current.audio.speakerDevices.set([targetId]);
        }
      }
    };
    syncOutputDevice();
  }, [state.isSpeakerPhone, state.availableOutputDevices]);

  // Get leadId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');

  // Use the hook to fetch lead data
  const { lead: apiLead } = useLead(leadId);

  // Populated gig data from lead
  const gig = apiLead?.gigId;


  // Map ApiLead to the contact format expected by the component
  const contact = apiLead ? {
    id: apiLead._id,
    name: apiLead.name || (apiLead.First_Name || apiLead.Last_Name ? `${apiLead.First_Name || ''} ${apiLead.Last_Name || ''}`.trim() : 'Unknown Lead'),
    email: apiLead.email || apiLead.Email_1 || 'No email',
    phone: apiLead.phone || apiLead.Phone || '',
    company: apiLead.company || apiLead.companyId || 'Unknown Company',
    title: apiLead.title || apiLead.Activity_Tag || 'Prospect',
    avatar: apiLead.avatar || '',
    status: (apiLead.status || 'qualified') as 'qualified',
    source: (apiLead.source || 'CRM') as 'website',
    priority: (apiLead.priority || 'high') as 'high',
    lastContact: apiLead.Last_Activity_Time ? new Date(apiLead.Last_Activity_Time) : new Date(),
    nextFollowUp: apiLead.nextFollowUp ? new Date(apiLead.nextFollowUp) : new Date(Date.now() + 86400000),
    notes: apiLead.notes || apiLead.Stage || 'No notes available',
    tags: [apiLead.Pipeline || 'Standard'],
    value: apiLead.value || 0,
    assignedAgent: apiLead.assignedTo?.personalInfo?.name || agentProfile?.personalInfo?.name || 'Agent',
    timezone: apiLead.timezone || 'UTC',
    preferredContactMethod: (apiLead.preferredContactMethod || 'phone') as 'phone',
    socialProfiles: apiLead.socialProfiles || { linkedin: '', twitter: '' },
    leadScore: apiLead.leadScore || 50,
    interests: apiLead.interests || [],
    painPoints: apiLead.painPoints || [],
    budget: apiLead.budget || { min: 0, max: 0, currency: 'USD' },
    timeline: apiLead.timeline || '',
    decisionMakers: apiLead.decisionMakers || [],
    competitors: apiLead.competitors || [],
    previousInteractions: apiLead.previousInteractions || []
  } : {
    id: '65d7f6a9e8f3e4a5c6d1e456',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '',
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
  };



  // Debug: Log contact data whenever it changes
  /*  console.log("Contact data:", contact);
   console.log("Contact phone:", contact.phone);
   console.log("Call status:", callStatus); */

  const initiateTwilioCall = async () => {
    /*  console.log("Contact phone number:", contact.phone);
     console.log("Contact object:", contact);
     console.log("Call status at start:", callStatus); */

    // Ensure we have valid contact data
    const phoneNumber = contact.phone;

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
          LeadId: contact.id, // Pass LeadId for dynamic Caller ID resolution
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

      // Store active connection and device
      setActiveConnection(conn);
      deviceRef.current = newDevice;

      // Handle audio output device switching
      const updateSpeakerDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputDevices = devices.filter(d => d.kind === 'audiooutput');
          dispatch({ type: 'SET_OUTPUT_DEVICES', devices: outputDevices });

          if (outputDevices.length > 0) {
            // Try to find headphones/headset for "casque" mode
            const headset = outputDevices.find(d => 
              d.label.toLowerCase().includes('headset') || 
              d.label.toLowerCase().includes('headphones') || 
              d.label.toLowerCase().includes('casque') ||
              d.label.toLowerCase().includes('hands-free')
            );
            
            // Auto-detect: if a headset is found and not currently in speakerPhone mode, or if we want to be smart:
            if (headset && state.isSpeakerPhone) {
                console.log('🎧 Headset detected at start, switching mode to Headset');
                dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
            }

            // Try to find speakers for "haut-parleur" mode
            const speaker = outputDevices.find(d => 
              d.label.toLowerCase().includes('speaker') || 
              d.label.toLowerCase().includes('haut-parleur') || 
              d.label.toLowerCase().includes('internal')
            ) || outputDevices[0]; // Fallback to first device

            const targetId = state.isSpeakerPhone ? (speaker?.deviceId || 'default') : (headset?.deviceId || speaker?.deviceId || 'default');
            
            console.log(`🔊 Switching output to ${state.isSpeakerPhone ? 'Speaker' : 'Headset'}:`, targetId);
            
            if (newDevice.audio && typeof newDevice.audio.speakerDevices?.set === 'function') {
                await newDevice.audio.speakerDevices.set([targetId]);
            }
          }
        } catch (err) {
          console.error('Failed to update speaker devices:', err);
        }
      };

      // Call immediately and set up effect for future changes
      updateSpeakerDevices();

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
          contact: contact,
          sid: Sid
        });

        // Start transcription when call is accepted
        setTimeout(async () => {
          try {
            const stream = conn.getRemoteStream();
            if (stream) {
              dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: stream });

              // Log de debug pour la transcription
              console.log('🌍 Starting transcription with global context');

              // NEW: Capture local microphone stream for full bidirectional transcription
              try {
                const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('🎤 Local microphone captured for bidirectional transcription');
                await startTranscription(stream, contact.phone, localStream);
              } catch (micError) {
                console.warn('⚠️ Could not capture local microphone, defaulting to remote only:', micError);
                await startTranscription(stream, contact.phone);
              }

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
        deviceRef.current = null;
        dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });

        // Stop transcription
        await stopTranscription();

        // Store call in database when it disconnects
        if (currentCallSid && contact.id) {
          await storeCall(currentCallSid, contact.id, isRecordingRef.current);
        }

        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

      conn.on('error', (error: any) => {
        console.error("Call error:", error);
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        deviceRef.current = null;

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
    deviceRef.current = null;
    setCallStatus('idle'); // Reset to idle instead of 'ended'
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




  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group mb-4">
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-pink-50/30 transition-all duration-1000"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center space-x-6">
          <div className="relative group/avatar">
            <div className="absolute -inset-1 bg-gradient-to-tr from-harx-500 to-harx-alt-500 rounded-2xl opacity-0 group-hover/avatar:opacity-20 blur-sm transition-all duration-500"></div>
            <div className="relative w-20 h-20 bg-slate-50 border-2 border-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden ring-4 ring-slate-50 transition-transform duration-500 group-hover/avatar:scale-105">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-slate-400 leading-none">{contact.name.charAt(0)}</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{contact.name}</h2>
              <span className="px-2.5 py-1 bg-harx-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg shadow-md shadow-harx-500/20">
                Priority
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{contact.email}</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{contact.phone}</span>
              </div>
              <div className="flex items-center space-x-2 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100">
                <Target className="w-3.5 h-3.5 text-harx-500" />
                <span className="text-[10px] font-black text-harx-600 uppercase tracking-widest">Score: {contact.leadScore}</span>
              </div>
              {gig && (
                <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl">
                  <Briefcase className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{gig.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           {state.callState.isActive ? (
             <button
               onClick={endCall}
               className="flex items-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/20 active:scale-95 group/call"
             >
               <Phone className="w-5 h-5 animate-pulse" />
               <span className="font-black text-xs uppercase tracking-[0.2em]">End Session</span>
             </button>
           ) : (
             <button
               onClick={handleStartCall}
               disabled={isCallLoading || callStatus === 'initiating'}
               className={`flex items-center space-x-4 px-10 py-5 rounded-2xl transition-all duration-300 shadow-2xl active:scale-95 group/call
                 ${isCallLoading || callStatus === 'initiating' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-rose-500/30'}`}
             >
               {isCallLoading || callStatus === 'initiating' ? (
                 <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
               ) : (
                 <Phone className="w-6 h-6 group-hover/call:rotate-12 transition-transform" />
               )}
               <span className="font-black text-sm uppercase tracking-[0.3em]">{isCallLoading || callStatus === 'initiating' ? 'Scaling...' : 'Initiate Call'}</span>
             </button>
           )}
           <div className="flex flex-col space-y-2">
             <button className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100 rounded-xl shadow-sm">
               <Calendar className="w-4 h-4" />
             </button>
             <button className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-harx-500 transition-all border border-slate-100 rounded-xl shadow-sm">
               <MessageSquare className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
