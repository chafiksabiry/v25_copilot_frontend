// Utilitaires pour gérer l'audio PCMU (G.711 µ-law)

const SAMPLE_RATE = 8000; // Hz
const CHUNK_SIZE = 256; // samples (doit être une puissance de 2)

// Table de conversion pour µ-law encoding
// Table de conversion pour A-law encoding
const ALAW_MAX = 0xFFF;
const ALAW_BIAS = 0x84;

// Encoder PCM 16-bit en A-law (PCMA)
function encodeALaw(sample) {
  let mask;
  let sign = (sample >> 8) & 0x80;
  
  if (sign !== 0) sample = -sample;
  if (sample > ALAW_MAX) sample = ALAW_MAX;
  
  if (sample >= 256) {
    mask = 0xD5;
  } else {
    mask = 0x55;
  }
  
  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);
  
  let mantissa = (sample >> ((exponent === 0) ? 4 : (exponent + 3))) & 0x0F;
  let alaw = (sign | (exponent << 4) | mantissa) ^ mask;
  
  return alaw & 0xFF; // Non-inversé à la fin contrairement à u-law
}

// Décoder A-law (PCMA) en PCM 16-bit
function decodeALaw(alaw) {
  alaw ^= 0x55;
  
  let sign = alaw & 0x80;
  let exponent = (alaw >> 4) & 0x07;
  let mantissa = alaw & 0x0F;
  
  let sample;
  if (exponent === 0) {
    sample = (mantissa << 4) + 8;
  } else {
    sample = ((mantissa << 4) + 0x108) << (exponent - 1);
  }
  
  return sign !== 0 ? -sample : sample;
}

// Encoder un buffer PCM Float32 en PCMA
export function encodePCMABuffer(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  
  // Convertir Float32 [-1, 1] en Int16 [-32768, 32767]
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Encoder en A-law
  const pcma = new Uint8Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    pcma[i] = encodeALaw(pcm16[i]);
  }
  
  return pcma;
}

// Décoder un buffer PCMA en PCM Float32
export function decodePCMABuffer(pcmaArray) {
  const pcm16 = new Int16Array(pcmaArray.length);
  
  // Décoder A-law en PCM16
  for (let i = 0; i < pcmaArray.length; i++) {
    pcm16[i] = decodeALaw(pcmaArray[i]);
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
  
  let chunkCount = 0;
  
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    
    // Encoder en PCMA
    const pcmaData = encodePCMABuffer(inputData);
    
    // Convertir en base64 pour transmission
    const base64Audio = btoa(String.fromCharCode.apply(null, pcmaData));
    
    // Log tous les 50 chunks (environ toutes les 2 secondes)
    if (chunkCount % 50 === 0) {
      console.log(`🎙️ Audio capturé: ${pcmaData.length} bytes, base64: ${base64Audio.length} chars`);
    }
    chunkCount++;
    
    // Envoyer au callback
    onAudioData(base64Audio);
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  console.log('✅ Audio processor connecté et prêt');
  
  return { source, processor };
}

// Lire l'audio reçu
export function playAudioChunk(audioContext, base64Audio) {
  try {
    // Décoder base64
    const binaryString = atob(base64Audio);
    const pcmaArray = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      pcmaArray[i] = binaryString.charCodeAt(i);
    }
    
    // Décoder PCMA en Float32
    const float32Data = decodePCMABuffer(pcmaArray);
    
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

