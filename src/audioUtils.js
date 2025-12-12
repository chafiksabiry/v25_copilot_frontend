// Utilitaires pour gérer l'audio PCMU (G.711 µ-law)

const SAMPLE_RATE = 8000; // Hz
const CHUNK_SIZE = 256; // samples (doit être une puissance de 2)

// Table de conversion pour µ-law encoding
// Table A-Law (G.711) - précalculée pour éviter les erreurs algorithmiques
const alawMap = [
  0x2A, 0x2B, 0x28, 0x29, 0x2E, 0x2F, 0x2C, 0x2D, 0x22, 0x23, 0x20, 0x21, 0x26, 0x27, 0x24, 0x25,
  0x3A, 0x3B, 0x38, 0x39, 0x3E, 0x3F, 0x3C, 0x3D, 0x32, 0x33, 0x30, 0x31, 0x36, 0x37, 0x34, 0x35,
  0x0A, 0x0B, 0x08, 0x09, 0x0E, 0x0F, 0x0C, 0x0D, 0x02, 0x03, 0x00, 0x01, 0x06, 0x07, 0x04, 0x05,
  0x1A, 0x1B, 0x18, 0x19, 0x1E, 0x1F, 0x1C, 0x1D, 0x12, 0x13, 0x10, 0x11, 0x16, 0x17, 0x14, 0x15,
  0x6A, 0x6B, 0x68, 0x69, 0x6E, 0x6F, 0x6C, 0x6D, 0x62, 0x63, 0x60, 0x61, 0x66, 0x67, 0x64, 0x65,
  0x7A, 0x7B, 0x78, 0x79, 0x7E, 0x7F, 0x7C, 0x7D, 0x72, 0x73, 0x70, 0x71, 0x76, 0x77, 0x74, 0x75,
  0x4A, 0x4B, 0x48, 0x49, 0x4E, 0x4F, 0x4C, 0x4D, 0x42, 0x43, 0x40, 0x41, 0x46, 0x47, 0x44, 0x45,
  0x5A, 0x5B, 0x58, 0x59, 0x5E, 0x5F, 0x5C, 0x5D, 0x52, 0x53, 0x50, 0x51, 0x56, 0x57, 0x54, 0x55,
  0xAA, 0xAB, 0xA8, 0xA9, 0xAE, 0xAF, 0xAC, 0xAD, 0xA2, 0xA3, 0xA0, 0xA1, 0xA6, 0xA7, 0xA4, 0xA5,
  0xBA, 0xBB, 0xB8, 0xB9, 0xBE, 0xBF, 0xBC, 0xBD, 0xB2, 0xB3, 0xB0, 0xB1, 0xB6, 0xB7, 0xB4, 0xB5,
  0x8A, 0x8B, 0x88, 0x89, 0x8E, 0x8F, 0x8C, 0x8D, 0x82, 0x83, 0x80, 0x81, 0x86, 0x87, 0x84, 0x85,
  0x9A, 0x9B, 0x98, 0x99, 0x9E, 0x9F, 0x9C, 0x9D, 0x92, 0x93, 0x90, 0x91, 0x96, 0x97, 0x94, 0x95,
  0xEA, 0xEB, 0xE8, 0xE9, 0xEE, 0xEF, 0xEC, 0xED, 0xE2, 0xE3, 0xE0, 0xE1, 0xE6, 0xE7, 0xE4, 0xE5,
  0xFA, 0xFB, 0xF8, 0xF9, 0xFE, 0xFF, 0xFC, 0xFD, 0xF2, 0xF3, 0xF0, 0xF1, 0xF6, 0xF7, 0xF4, 0xF5,
  0xCA, 0xCB, 0xC8, 0xC9, 0xCE, 0xCF, 0xCC, 0xCD, 0xC2, 0xC3, 0xC0, 0xC1, 0xC6, 0xC7, 0xC4, 0xC5,
  0xDA, 0xDB, 0xD8, 0xD9, 0xDE, 0xDF, 0xDC, 0xDD, 0xD2, 0xD3, 0xD0, 0xD1, 0xD6, 0xD7, 0xD4, 0xD5
];

// Encoder PCM 16-bit en A-law (PCMA)
function encodeALaw(sample) {
    let mask;
    let cpt;
    let sign;

    if (sample >= 0) {
        sign = 0xD5;
    } else {
        sign = 0x55;
        sample = -sample - 8;
    }

    if (sample > 32767) sample = 32767;

    if (sample < 256) {
        cpt = (sample >> 4);
        mask = 0xA0;
    } else {
        if (sample < 2048) {
            cpt = (sample >> 8);
            mask = 0xB0;
        } else {
            if (sample < 16384) {
                cpt = (sample >> 12);
                mask = 0xC0;
            } else {
                cpt = (sample >> 13);
                mask = 0xD0;
            }
        }
    }
    return (alawMap[(sample >> 4) & 0xFF] ^ sign); // Simplified mapping usage?
    // NOTE: Pour simplifier, on va utiliser une implémentation sans table complète si trop complexe, 
    // mais pour l'instant allons-y avec une version standard connue.
}

// Nouvelle implémentation plus standard et robuste (sans table externe pour l'encodage direct)
function encodeALawRobust(sample) {
    let sign = (sample & 0x8000) >> 8;
    if (sign != 0) sample = -sample;
    if (sample > 32767) sample = 32767;
    
    let exponent = 7;
    let expMask = 0x4000;
    for (; (sample & expMask) == 0 && exponent > 0; exponent--, expMask >>= 1) { }
    
    let mantissa = (sample >> ((exponent == 0) ? 4 : (exponent + 3))) & 0x0F;
    let alaw = (sign | (exponent << 4) | mantissa) ^ 0xD5;
    
    return alaw & 0xFF;
}

// Décoder A-law (PCMA) en PCM 16-bit
function decodeALawRobust(alaw) {
    alaw ^= 0xD5;
    let sign = alaw & 0x80;
    let exponent = (alaw & 0x70) >> 4;
    let data = alaw & 0x0F;
    
    data <<= 4;
    data += 8;
    
    if (exponent != 0) {
        data += 0x100;
        data <<= (exponent - 1);
    }
    
    return (sign == 0) ? data : -data;
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
    pcma[i] = encodeALawRobust(pcm16[i]);
  }
  
  return pcma;
}

// Décoder un buffer PCMA en PCM Float32
export function decodePCMABuffer(pcmaArray) {
  const pcm16 = new Int16Array(pcmaArray.length);
  
  // Décoder A-law en PCM16
  for (let i = 0; i < pcmaArray.length; i++) {
    pcm16[i] = decodeALawRobust(pcmaArray[i]);
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

