import { useState, useEffect, useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useLead } from '../../hooks/useLead';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import {
  Phone, Mail, Calendar, Briefcase
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
  const [, setActiveDevice] = useState<Device | null>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const isRecordingRef = useRef(false);

  // Synchronize ref with global state
  useEffect(() => {
    isRecordingRef.current = state.callState.isRecording;
  }, [state.callState.isRecording]);

  // Get leadId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');

  // Use the hook to fetch lead data
  const { lead: apiLead, loading: leadLoading, error: leadError } = useLead(leadId);

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

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      return `${cleanPhone.substring(0, 5)}...`;
    }
    return `+${cleanPhone.substring(0, 4)}...`;
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
      setActiveDevice(newDevice);

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
        setActiveDevice(null);
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
        setActiveDevice(null);

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
    <div className="relative group">
      <div className="glass-card rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between mt-1 mb-2 border border-white/5 hover:border-white/10 transition-all duration-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-harx opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-harx-500/5 rounded-full blur-3xl group-hover:bg-harx-500/10 transition-all duration-1000"></div>
        {/* Avatar + Infos */}
        {/* Avatar + Infos */}
        <div className="flex items-center space-x-6 relative z-10">
          {leadLoading ? (
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 border-2 border-harx-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-transparent border-t-harx-500 rounded-full animate-spin"></div>
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identifying Signal...</span>
            </div>
          ) : leadError ? (
            <div className="text-rose-400 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">Protocol Error: {leadError}</div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gradient-harx flex items-center justify-center p-1 shadow-2xl shadow-harx-500/20 transform group-hover:rotate-3 transition-transform duration-700">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10">
                    {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                    <span className="text-white font-black text-sm tracking-tighter">{contact.name.split(' ').map(n => n[0]).join('')}</span>
                    )}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg font-black text-white tracking-tight">{contact.name}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-2 py-0.5 rounded-full font-black border border-emerald-500/20 uppercase tracking-widest">Priority</span>
                  {gig && (
                    <span className="bg-white/5 text-slate-400 text-[8px] px-2 py-0.5 rounded-full border border-white/10 flex items-center font-black uppercase tracking-widest shadow-inner">
                      <Briefcase className="w-3 h-3 mr-1 text-harx-500" />
                      {gig.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-slate-500 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                  <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span>{contact.email}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  <span>Score: <span className="text-harx-500">{contact.leadScore}</span></span>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Bouton Start Call + Tabs */}
        <div className="flex-1 flex flex-col items-center relative z-10 mx-4">
          {callStatus === 'active' ? (
            <button
              onClick={endCall}
              className="w-48 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-2xl bg-rose-600 hover:bg-rose-700 text-white hover:-translate-y-1 active:scale-95 border border-rose-500/50 shadow-rose-600/20 group/call"
            >
              <div className="p-1.5 bg-white/20 rounded-lg group-hover/call:rotate-12 transition-transform">
                <Phone className="w-4 h-4 fill-white" />
              </div>
              <span>End Call</span>
            </button>
          ) : (
            <button
              onClick={handleStartCall}
              disabled={isCallLoading || callStatus === 'initiating'}
              className={`w-48 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-2xl hover:-translate-y-1 active:scale-95 group/call
                  ${isCallLoading || callStatus === 'initiating' ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5 shadow-none' : 'bg-gradient-harx text-white shadow-harx-500/30 border border-white/20 hover:shadow-harx-500/50'}`}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-500 ${isCallLoading || callStatus === 'initiating' ? 'bg-slate-700' : 'bg-white/20 group-hover/call:rotate-12 transform shadow-inner'}`}>
                {isCallLoading || callStatus === 'initiating' ? (
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <Phone className="w-4 h-4 fill-white" />
                )}
              </div>
              <span>{isCallLoading || callStatus === 'initiating' ? 'Wait...' : 'Initiate Call'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
            <div className="p-0.5 bg-white/5 rounded">
                <Phone className="w-2.5 h-2.5" />
            </div>
            <span>{maskPhone(contact.phone)}</span>
          </div>
        </div >
        {/* Actions à droite */}
        <div className="flex items-center space-x-2 relative z-10">
          <button className="bg-white/5 border border-white/5 text-slate-500 p-2.5 rounded-xl cursor-not-allowed group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-500 shadow-inner" title="Schedule Follow-up">
            <Calendar className="w-4 h-4" />
          </button>
          <button className="bg-gradient-harx text-white p-2.5 rounded-xl shadow-xl shadow-harx-500/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 border border-white/20">
            <Phone className="w-4 h-4 fill-white/20" />
          </button>
          <button className="bg-white/5 border border-white/5 text-slate-500 p-2.5 rounded-xl cursor-not-allowed group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-500 shadow-inner" title="Send Briefing">
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
