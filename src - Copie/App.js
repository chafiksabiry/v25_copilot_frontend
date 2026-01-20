import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { playRingtone, stopRingtone } from './ringtone';
import {
  createAudioContext,
  captureMicrophone,
  createAudioProcessor,
  playAudioChunk,
  resetAudioQueue
} from './audioUtils';
import './App.css';

// Configuration de l'URL de l'API
const API_URL = process.env.REACT_APP_API_URL || '';
const TELNYX_NUMBER = '+33423340775';

function App() {
  const [numbers, setNumbers] = useState([]);
  const [telnyxNumber, setTelnyxNumber] = useState('');
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // États WebSocket Audio
  const [isConnected, setIsConnected] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, active, ended
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStats, setAudioStats] = useState({
    packetsSent: 0,
    packetsReceived: 0,
    lastPacketTime: null
  });
  const [audioDiagnostics, setAudioDiagnostics] = useState({
    isAudioContextSuspended: false,
    outputDevices: [],
    inputDevices: [],
    permissions: { microphone: false }
  });

  const socketRef = useRef(null);
  const callTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const currentCallIdRef = useRef(null); // Pour accès immédiat dans les callbacks

  // Vérifier l'état audio au démarrage
  const checkAudioDiagnostics = useCallback(async () => {
    // Vérifier si le contexte audio est suspendu (requiert une interaction utilisateur)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      console.log('⚠️ AudioContext suspendu - nécessite une interaction utilisateur');
      setAudioDiagnostics(prev => ({ ...prev, isAudioContextSuspended: true }));
    }

    // Lister les périphériques audio
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

      setAudioDiagnostics(prev => ({
        ...prev,
        inputDevices: audioInputs,
        outputDevices: audioOutputs
      }));

      console.log('🎧 Périphériques d\'entrée:', audioInputs.map(d => d.label));
      console.log('🔈 Périphériques de sortie:', audioOutputs.map(d => d.label));
    } catch (error) {
      console.error('❌ Erreur liste périphériques:', error);
    }

    // Vérifier les permissions microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioDiagnostics(prev => ({ ...prev, permissions: { microphone: true } }));
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('⚠️ Permission microphone non accordée:', error);
      setAudioDiagnostics(prev => ({ ...prev, permissions: { microphone: false } }));
    }
  }, []);

  // Fonction pour tester l'audio indépendamment
  const testAudio = async () => {
    try {
      console.log('🎵 Test audio démarré');

      // Créer contexte audio
      const testContext = new (window.AudioContext || window.webkitAudioContext)();

      // Créer un oscillateur pour un son de test
      const oscillator = testContext.createOscillator();
      const gainNode = testContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(testContext.destination);

      oscillator.frequency.value = 440; // La 440 Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.5, testContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, testContext.currentTime + 2);

      oscillator.start(testContext.currentTime);
      oscillator.stop(testContext.currentTime + 2);

      console.log('🔊 Son de test joué (2 secondes, 440 Hz)');
      showMessage('Son de test joué - Vérifiez si vous l\'entendez', 'info');

      // Vérifier le volume de sortie
      setTimeout(() => {
        console.log('🎵 Test terminé - Vérifiez si vous avez entendu le son');
        testContext.close();
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur test audio:', error);
      showMessage('Erreur lors du test audio', 'error');
    }
  };

  const showMessage = useCallback((text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const loadNumbers = useCallback(async () => {
    try {
      console.log('Chargement des numeros depuis:', `${API_URL}/api/numbers`);
      const response = await axios.get(`${API_URL}/api/numbers`);
      console.log('Numeros recus:', response.data);
      console.log('frenchNumbers:', response.data.frenchNumbers);
      setNumbers(response.data.frenchNumbers || []);
      setTelnyxNumber(response.data.telnyxNumber || '');
      console.log('State numbers mis a jour');
    } catch (error) {
      console.error('Erreur chargement numeros:', error);
      console.error('API_URL:', API_URL);
      showMessage('Erreur lors du chargement des numéros', 'error');
      setNumbers([]);
    }
  }, [showMessage]);

  const loadCallHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/call-history`);
      setCallHistory(response.data.calls || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setCallHistory([]);
    }
  }, []);

  const handleCallEnd = useCallback(() => {
    stopRingtone(); // Arrêter la sonnerie
    setCallState('ended');

    // Réinitialiser la queue audio
    resetAudioQueue();

    // Arrêter l'audio
    if (audioProcessorRef.current) {
      audioProcessorRef.current.processor.disconnect();
      audioProcessorRef.current.source.disconnect();
      audioProcessorRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    setTimeout(() => {
      currentCallIdRef.current = null;
      setCallState('idle');
      setCurrentCall(null);
      setIsMuted(false);
      loadCallHistory();
    }, 2000);
  }, [loadCallHistory]);

  const handleCallStatusUpdate = useCallback((data) => {
    const { status } = data;

    switch (status) {
      case 'calling':
        setCallState('calling');
        playRingtone(); // Démarrer la sonnerie
        showMessage('Appel en cours...', 'info');
        break;
      case 'ringing':
        setCallState('ringing');
        playRingtone(); // Continuer la sonnerie
        showMessage('Sonnerie...', 'info');
        break;
      case 'active':
        stopRingtone(); // Arrêter la sonnerie
        setCallState('active');
        showMessage('Appel connecté !', 'success');
        break;
      case 'ended':
        stopRingtone(); // Arrêter la sonnerie
        handleCallEnd();
        break;
      default:
        break;
    }
  }, [handleCallEnd, showMessage]);

  // Fonction pour télécharger automatiquement l'enregistrement
  const downloadRecording = useCallback(async (recordingUrl, recordingId) => {
    try {
      console.log(`📥 Téléchargement de l'enregistrement: ${recordingUrl.substring(0, 100)}...`);
      console.log(`📋 Recording ID: ${recordingId}`);

      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = recordingUrl;
      link.download = `call-recording-${recordingId}-${new Date().toISOString().split('T')[0]}.mp3`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Ajouter au DOM, cliquer, puis retirer
      document.body.appendChild(link);
      link.click();

      // Attendre un peu avant de retirer le lien
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      console.log('✅ Enregistrement téléchargé avec succès');
      showMessage('Enregistrement téléchargé automatiquement', 'success');
    } catch (error) {
      console.error('❌ Erreur téléchargement enregistrement:', error);
      console.error('Détails:', error.stack);
      showMessage('Erreur lors du téléchargement de l\'enregistrement', 'error');
    }
  }, [showMessage]);

  // Initialiser la connexion WebSocket
  const initializeWebSocket = useCallback(() => {
    try {
      console.log('🔄 Connexion au serveur WebSocket...');

      const socket = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Événement : Connexion réussie
      socket.on('connect', () => {
        console.log('✅ WebSocket connecté:', socket.id);
        setIsConnected(true);
        showMessage('Prêt pour les appels', 'success');
      });

      // Événement : Dévénement : Déconnexion
      socket.on('disconnect', () => {
        console.log('🔌 WebSocket déconnecté');
        setIsConnected(false);
      });

      // Événement : Appel initié
      socket.on('call-initiated', (data) => {
        console.log('✅ Appel initié:', data);
        setCurrentCall(data);
        // Mettre à jour la ref immédiatement pour l'audio
        currentCallIdRef.current = data.callControlId;
        console.log(`🔗 CallControlId stocké: ${data.callControlId}`);
        setCallState('calling');
        showMessage('Appel en cours...', 'info');
      });

      // Événement : Mise à jour du statut
      socket.on('call-status', (data) => {
        console.log('📞 Statut appel:', data);

        // Vérifier si c'est un enregistrement sauvegardé
        if (data.status === 'recording-saved' && data.recordingUrl) {
          console.log('💾 Enregistrement disponible:', data.recordingUrl);
          // Télécharger automatiquement l'enregistrement
          downloadRecording(data.recordingUrl, data.recordingId || 'recording');
        }

        handleCallStatusUpdate(data);
      });

      // Événement : Audio reçu
      socket.on('audio-received', (data) => {
        console.log('🎵 Audio reçu:', data.audioChunk ? data.audioChunk.length : 0, 'bytes');
        if (audioContextRef.current && data.audioChunk) {
          try {
            // Décoder et jouer l'audio (toujours, même si micro muté)
            playAudioChunk(audioContextRef.current, data.audioChunk);

            // Mettre à jour les statistiques audio
            setAudioStats(prev => ({
              ...prev,
              packetsReceived: prev.packetsReceived + 1,
              lastPacketTime: new Date()
            }));
          } catch (error) {
            console.error('❌ Erreur lecture audio:', error);
          }
        }
      });

      // Événement : Appel terminé
      socket.on('call-ended', () => {
        console.log('📴 Appel terminé');
        handleCallEnd();
      });

      // Événement : Erreur
      socket.on('call-error', (data) => {
        console.error('❌ Erreur appel:', data);
        console.error('Details erreur:', JSON.stringify(data, null, 2));
        showMessage(data.error || 'Erreur lors de l\'appel', 'error');
        currentCallIdRef.current = null;
        setCallState('idle');
        setLoading(false);
      });

      socketRef.current = socket;

    } catch (error) {
      console.error('❌ Erreur initialisation WebSocket:', error);
      showMessage('Impossible de se connecter au serveur', 'error');
    }
  }, [handleCallEnd, handleCallStatusUpdate, downloadRecording, showMessage]);

  // Charger les numéros et initialiser WebSocket au démarrage
  useEffect(() => {
    loadNumbers();
    loadCallHistory();
    initializeWebSocket();
    checkAudioDiagnostics();

    return () => {
      // Nettoyage lors du démontage
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.processor.disconnect();
        audioProcessorRef.current.source.disconnect();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadNumbers, loadCallHistory, initializeWebSocket, checkAudioDiagnostics]);

  const callStartTimeRef = useRef(null);


  // Timer pour la durée d'appel
  useEffect(() => {
    if (callState === 'active') {
      callStartTimeRef.current = Date.now();
      // Mettre à jour immédiatement
      setCallDuration(0);

      callTimerRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDuration(duration);
        }
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (callState === 'idle') {
        setCallDuration(0);
        callStartTimeRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);






  const makeCall = async (phoneNumber) => {
    if (!isConnected || !socketRef.current) {
      showMessage('Serveur non connecté. Veuillez patienter...', 'error');
      return;
    }

    if (currentCall) {
      showMessage('Un appel est déjà en cours', 'error');
      return;
    }

    setLoading(true);
    setCallState('calling');

    try {
      console.log('📞 Appel vers:', phoneNumber);

      // Démarrer la sonnerie IMMÉDIATEMENT après le clic (interaction utilisateur)
      console.log('🔔 Démarrage sonnerie...');
      playRingtone();

      // Créer le contexte audio
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
        console.log('🎵 Contexte audio créé');
      }

      // Capturer le microphone pour pouvoir parler
      try {
        const stream = await captureMicrophone();
        audioStreamRef.current = stream;
        console.log('🎤 Microphone capturé');

        // Créer le processeur audio pour envoyer votre voix
        let sentCount = 0;
        audioProcessorRef.current = createAudioProcessor(
          audioContextRef.current,
          stream,
          (audioData) => {
            // Envoyer l'audio au serveur via Socket.IO
            // Utiliser currentCallIdRef qui est mis à jour immédiatement
            if (socketRef.current && currentCallIdRef.current) {
              socketRef.current.emit('audio-data', {
                callControlId: currentCallIdRef.current,
                audioChunk: audioData,
                timestamp: Date.now()
              });

              // Mettre à jour les statistiques
              setAudioStats(prev => ({
                ...prev,
                packetsSent: prev.packetsSent + 1
              }));

              // Log tous les 50 packets
              if (sentCount % 50 === 0) {
                console.log(`📤 Audio envoyé au backend (#${sentCount})`);
              }
              sentCount++;
            }
          }
        );

        console.log('✅ Audio processor créé - envoi activé');
      } catch (error) {
        console.error('❌ Erreur microphone:', error);
        showMessage('Impossible d\'accéder au microphone', 'error');
      }

      // Initier l'appel via WebSocket
      socketRef.current.emit('initiate-call', {
        to: phoneNumber,
        from: telnyxNumber || TELNYX_NUMBER
      });

      showMessage(`Appel en cours vers ${phoneNumber}`, 'info');

    } catch (error) {
      console.error('❌ Erreur lors de l\'appel:', error);
      showMessage(error.message || 'Erreur lors de l\'appel', 'error');
      currentCallIdRef.current = null;
      setCallState('idle');
      setCurrentCall(null);
    } finally {
      setLoading(false);
    }
  };

  // Raccrocher
  const hangupCall = () => {
    stopRingtone(); // Arrêter la sonnerie

    if (currentCall && socketRef.current) {
      socketRef.current.emit('hangup-call', {
        callControlId: currentCall.callControlId
      });

      handleCallEnd();
      showMessage('Appel terminé', 'info');
    }
  };

  // Mute/Unmute
  const toggleMute = () => {
    if (currentCall && socketRef.current) {
      const newMutedState = !isMuted;

      socketRef.current.emit('toggle-mute', {
        callControlId: currentCall.callControlId,
        muted: newMutedState
      });

      setIsMuted(newMutedState);
    }
  };


  const formatPhoneNumber = (number) => {
    return number.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="header-icon">📞</div>
          <h1>Telnyx Call Manager</h1>
          <p className="subtitle">Passez des appels vers vos contacts français</p>
          {telnyxNumber && (
            <div className="telnyx-number">
              <span className="label">Votre numéro Telnyx:</span>
              <span className="number">{formatPhoneNumber(telnyxNumber)}</span>
            </div>
          )}
        </header>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Indicateur de connexion WebSocket */}
        <div className={`webrtc-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? '🟢 Serveur Connecté' : '🔴 Serveur Déconnecté'}
        </div>

        {/* Bouton de test audio */}
        <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '10px' }}>
          <button
            onClick={testAudio}
            className="call-button"
            style={{ backgroundColor: '#6c5ce7', fontSize: '14px', padding: '8px 16px' }}
          >
            🎵 Tester l'audio
          </button>
        </div>

        {/* Diagnostics audio (debug) */}
        {audioDiagnostics.isAudioContextSuspended && (
          <div className="message warning" style={{ marginTop: '10px' }}>
            ⚠️ Audio en pause - Cliquez sur "Tester l'audio" pour activer
          </div>
        )}

        {/* Interface d'appel en cours */}
        {currentCall && callState !== 'idle' && callState !== 'ended' && (
          <div className="active-call-overlay">
            <div className="active-call-container">
              <div className="call-status-icon">
                {callState === 'calling' && '📞'}
                {callState === 'ringing' && '🔔'}
                {callState === 'active' && '✅'}
              </div>

              <div className="call-status-text">
                {callState === 'calling' && 'Appel en cours...'}
                {callState === 'ringing' && 'Sonnerie...'}
                {callState === 'active' && 'En communication'}
              </div>

              {callState === 'active' && (
                <div className="call-duration">
                  ⏱️ {formatDuration(callDuration)}
                </div>
              )}

              {currentCall && currentCall.to && (
                <div className="call-number">
                  {formatPhoneNumber(currentCall.to)}
                </div>
              )}

              {/* Statistiques audio (debug) */}
              {callState === 'active' && (
                <div className="audio-stats" style={{
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '10px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <div>📤 Envoyés: {audioStats.packetsSent}</div>
                  <div>📥 Reçus: {audioStats.packetsReceived}</div>
                  {audioStats.lastPacketTime && (
                    <div>🕐 Dernier: {audioStats.lastPacketTime.toLocaleTimeString()}</div>
                  )}
                </div>
              )}

              {/* Bouton Raccrocher - visible pendant tout l'appel */}
              <div className="call-controls">
                {callState === 'active' && (
                  <button
                    className={`control-button ${isMuted ? 'active' : ''}`}
                    onClick={toggleMute}
                    title={isMuted ? 'Activer le micro' : 'Couper le micro'}
                  >
                    {isMuted ? '🔇' : '🎤'}
                  </button>
                )}

                <button
                  className="control-button hangup"
                  onClick={hangupCall}
                  title="Raccrocher"
                >
                  📞
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message de fin d'appel */}
        {callState === 'ended' && (
          <div className="message success" style={{ marginTop: '20px' }}>
            Appel terminé - Durée: {formatDuration(callDuration)}
          </div>
        )}

        <div className="content">
          <section className="contacts-section">
            <h2>📋 Contacts disponibles ({numbers.length})</h2>
            <div className="contacts-grid">
              {numbers && numbers.length > 0 ? numbers.map((number, index) => (
                <div key={index} className="contact-card">
                  <div className="contact-icon">👤</div>
                  <div className="contact-number">{formatPhoneNumber(number)}</div>
                  <button
                    className="call-button"
                    onClick={() => makeCall(number)}
                    disabled={loading}
                  >
                    {loading ? '⏳ Appel...' : '📞 Appeler'}
                  </button>
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  Aucun contact disponible
                </div>
              )}
            </div>
          </section>

          {callHistory.length > 0 && (
            <section className="history-section">
              <h2>📊 Historique des appels</h2>
              <div className="history-list">
                {callHistory.slice().reverse().map((call, index) => (
                  <div key={index} className="history-item">
                    <div className="history-info">
                      <div className="history-number">{formatPhoneNumber(call.to)}</div>
                      <div className="history-time">{formatTime(call.timestamp)}</div>
                      {call.duration !== undefined && (
                        <div className="history-duration">⏱️ {formatDuration(call.duration)}</div>
                      )}
                    </div>
                    <div className={`history-status status-${call.status}`}>
                      {call.status}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

