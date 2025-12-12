// Utilitaires pour gérer l'audio PCMU (G.711 µ-law)

const SAMPLE_RATE = 8000; // Hz
const CHUNK_SIZE = 256; // samples (doit être une puissance de 2)

// Table de conversion pour µ-law encoding
const MULAW_BIAS = 0x84;
const MULAW_MAX = 0x1FFF;

// Encoder PCM 16-bit en µ-law (PCMU)
function encodePCMUlaw(sample) {
  // Normaliser le sample
  let sign = (sample >> 8) & 0x80;
  if (sign != 0) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;
  
  sample = sample + MULAW_BIAS;
  let exponent = 7;
  
  for (let expMask = 0x4000; (sample & expMask) == 0 && exponent > 0; exponent--, expMask >>= 1);
  
  let mantissa = (sample >> (exponent + 3)) & 0x0F;
  let mulaw = ~(sign | (exponent << 4) | mantissa);
  
  return mulaw & 0xFF;
}

// Décoder µ-law (PCMU) en PCM 16-bit
function decodePCMUlaw(mulaw) {
  mulaw = ~mulaw;
  let sign = mulaw & 0x80;
  let exponent = (mulaw >> 4) & 0x07;
  let mantissa = mulaw & 0x0F;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  
  return sign != 0 ? -sample : sample;
}

// Encoder un buffer PCM Float32 en PCMU
export function encodePCMUBuffer(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  
  // Convertir Float32 [-1, 1] en Int16 [-32768, 32767]
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Encoder en µ-law
  const pcmu = new Uint8Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    pcmu[i] = encodePCMUlaw(pcm16[i]);
  }
  
  return pcmu;
}

// Décoder un buffer PCMU en PCM Float32
export function decodePCMUBuffer(pcmuArray) {
  const pcm16 = new Int16Array(pcmuArray.length);
  
  // Décoder µ-law en PCM16
  for (let i = 0; i < pcmuArray.length; i++) {
    pcm16[i] = decodePCMUlaw(pcmuArray[i]);
  }
  
  // Convertir Int16 en Float32 [-1, 1]
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
  }
  
  return float32;
}

// Créer un contexte audio
export function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  return new AudioContext({ sampleRate: SAMPLE_RATE });
}

// Capturer le microphone
export async function captureMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    console.log('🎤 Microphone capturé');
    return stream;
    
  } catch (error) {
    console.error('❌ Erreur capture microphone:', error);
    throw new Error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
  }
}

// Créer un processeur audio pour encoder en temps réel
export function createAudioProcessor(audioContext, stream, onAudioData) {
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
  
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    
    // Encoder en PCMU
    const pcmuData = encodePCMUBuffer(inputData);
    
    // Convertir en base64 pour transmission
    const base64Audio = btoa(String.fromCharCode.apply(null, pcmuData));
    
    // Envoyer au callback
    onAudioData(base64Audio);
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  return { source, processor };
}

// Lire l'audio reçu
export function playAudioChunk(audioContext, base64Audio) {
  try {
    // Décoder base64
    const binaryString = atob(base64Audio);
    const pcmuArray = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      pcmuArray[i] = binaryString.charCodeAt(i);
    }
    
    // Décoder PCMU en Float32
    const float32Data = decodePCMUBuffer(pcmuArray);
    
    // Créer un buffer audio
    const audioBuffer = audioContext.createBuffer(1, float32Data.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Data);
    
    // Lire le buffer
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    
  } catch (error) {
    console.error('❌ Erreur lecture audio:', error);
  }
}

export { SAMPLE_RATE, CHUNK_SIZE };

