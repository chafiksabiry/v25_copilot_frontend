# Fonctionnalités: Transcription Temps Réel, Profil DISC, Script & Phases, Contrôles d’Appel

Ce document décrit en détail quatre capacités clés du frontend:

- Transcription en temps réel d’un appel
- Détermination du profil DISC du lead
- Script suggéré synchronisé avec les phases d’appel (REPS)
- Contrôles d’appel pour l’agent (micro, haut-parleur, arrêt d’enregistrement)

## 1) Transcription en temps réel

Architecture:
- Capture micro via Web Audio API + AudioWorklet (`public/audio-processor.js`).
- Conversion en PCM 16-bit et envoi en continu via WebSocket par `TranscriptionService`.
- Gestion d’état avec `TranscriptionContext`/`useTranscriptionIntegration` (interim vs final).
- Intégration côté UI: démarrage/arrêt couplé au cycle de vie de l’appel.

Extraits clés:

```startLine:11:endLine:28:public/audio-processor.js
// Worklet: buffer → détection audio → conversion PCM → postMessage
process(inputs, outputs) {
  const inputChannel = inputs[0]?.[0];
  // ...
}
```

```startLine:350:endLine:404:src/services/transcriptionService.ts
// Après envoi de la config, création du worklet et envoi des buffers PCM via WebSocket
await this.audioContext!.audioWorklet.addModule('/audio-processor.js');
this.audioProcessor = new AudioWorkletNode(this.audioContext!, 'audio-processor');
this.source!.connect(this.audioProcessor);
this.audioProcessor.port.onmessage = (event) => {
  if (this.ws?.readyState === WebSocket.OPEN && this.isCallActive && this.configSent) {
    const audioData = event.data; // ArrayBuffer
    const view = new DataView(audioData);
    const pcmData = new Int16Array(audioData.byteLength / 2);
    for (let i = 0; i < pcmData.length; i++) { pcmData[i] = view.getInt16(i * 2, true); }
    this.ws!.send(pcmData.buffer);
  }
};
```

```startLine:103:endLine:115:src/components/Dashboard/CallPhasesDisplay.tsx
// Démarrage/arrêt automatiques de la transcription selon l’état de l’appel
useEffect(() => {
  if (isCallActive && mediaStream && phoneNumber && !isTranscriptionActive) {
    startTranscription(mediaStream, phoneNumber);
  } else if (!isCallActive && isTranscriptionActive) {
    stopTranscription();
    setCurrentInterimText('');
  }
}, [isCallActive, mediaStream, phoneNumber, isTranscriptionActive]);
```

Également déclenché après acceptation de l’appel (Twilio):

```startLine:185:endLine:198:src/components/Dashboard/ContactInfo.tsx
const stream = conn.getRemoteStream();
dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: stream });
await startTranscription(stream, contact.phone);
```

## 2) Détermination du profil DISC

Flux:
- Composant: `DiscPersonalityAnalysis`.
- Hook: `usePersonalityAnalysis` appelle `getPersonalityAnalysis(transcription, context, callDuration)`.
- Seuil: déclenchement automatique dès que la transcription dépasse un minimum (30+ caractères) et qu’il y a du nouveau contenu pertinent.
- État global: mise à jour via `UPDATE_PERSONALITY_PROFILE`.

Extraits clés:

```startLine:48:endLine:67:src/components/Dashboard/DiscPersonalityAnalysis.tsx
// Props + hook d’analyse DISC
interface DiscPersonalityAnalysisProps { transcription?: string; context?: any[]; callDuration?: number; }
const { analyzePersonality, personalityProfile, clearAnalysis } = usePersonalityAnalysis();
```

```startLine:93:endLine:100:src/components/Dashboard/DiscPersonalityAnalysis.tsx
// Déclenchement conditionnel
useEffect(() => {
  if (!transcription || transcription.length < 30) { clearAnalysis(); return; }
  // …appel analytiques avec throttling/heuristiques
}, [transcription]);
```

```startLine:192:endLine:196:src/contexts/AgentContext.tsx
// Réception du profil et stockage dans le state global
case 'UPDATE_PERSONALITY_PROFILE':
  return { ...state, personalityProfile: action.profile };
```

## 3) Script suggéré et phases d’appel (REPS)

État actuel:
- Méthodologie REPS avec 9 phases: définie dans `useCallMethodologies` (détection du type d’appel, progression auto selon objectifs/indices).
- Affichage: `CallPhasesDisplay` rend les phases et peut afficher les transcriptions.
- Script: `ScriptPrompter` existe mais n’est pas encore activé dans le dashboard (UI grisée). L’intégration pour piloter le script par phase et par profil DISC reste à faire.

Extraits clés:

```startLine:6:endLine:16:src/hooks/useCallMethodologies.ts
const REPS_METHODOLOGY = { id: 'reps-flow', name: 'REPS Call Flow', /* phases… */ };
```

```startLine:524:endLine:566:src/hooks/useCallMethodologies.ts
// Avancement automatique si objectifs atteints et triggers valides
if (progress >= 80 && currentPhaseIndex < methodology.phases.length - 1) {
  const nextPhase = methodology.phases[currentPhaseIndex + 1];
  dispatch({ type: 'UPDATE_CALL_STRUCTURE_GUIDANCE', guidance: { ...guidance, currentPhase: nextPhase } });
}
```

## 4) Contrôles d’appel (micro/haut-parleur/enregistrement)

- Micro: toggle au niveau des `AudioTrack.enabled`.
- Haut-parleur: état UI local; pour mute effectif, raccorder au `<audio>` de restitution.
- Enregistrement: dans ce frontend, l’enregistrement est associé à la transcription; pour arrêter, invoquer `stopTranscription()` et désactiver tout enregistrement côté backend.

Extraits clés:

```startLine:16:endLine:24:src/components/Dashboard/TopStatusBar.tsx
// Mute/unmute micro
const handleToggleMic = () => {
  state.mediaStream?.getAudioTracks().forEach(track => { track.enabled = !isMicMuted; });
  setIsMicMuted(m => !m);
};
```

```startLine:180:endLine:196:src/components/Dashboard/TopStatusBar.tsx
// Boutons UI
<button onClick={handleToggleMic}>{isMicMuted ? <MicOff/> : <Mic/>}</button>
<button onClick={handleToggleSpeaker}>{isSpeakerMuted ? <VolumeX/> : <Volume2/>}</button>
```

## À faire (suggestions)

- Activer `ScriptPrompter` dans le dashboard et l’alimenter en temps réel par la phase active et le profil DISC.
- Utiliser `recommendations` pour enrichir les prompts contextuels.
- Relier le mute haut-parleur à l’élément `<audio>` de lecture distante.

