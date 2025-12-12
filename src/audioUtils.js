// Utilitaires pour gérer l'audio PCMU (G.711 µ-law)

const SAMPLE_RATE = 8000; // Hz
const CHUNK_SIZE = 256; // samples (doit être une puissance de 2)

// Table de conversion pour µ-law encoding
// Table de conversion A-Law vers PCM (copie de g711.js backend)
const alawMap = [
  -5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736, -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784,
  -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368, -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392,
  -22016,-20992,-24064,-23040,-17920,-16896,-19968,-18944,-30208,-29184,-32256,-31232,-26112,-25088,-28160,-27136,
  -11008,-10496,-12032,-11520, -8960, -8448, -9984, -9472,-15104,-14592,-16128,-15616,-13056,-12544,-14080,-13568,
  -344,  -328,  -376,  -360,  -280,  -264,  -312,  -296,  -472,  -456,  -504,  -488,  -408,  -392,  -440,  -424,
  -88,   -72,   -120,  -104,  -24,   -8,    -56,   -40,   -216,  -200,  -248,  -232,  -152,  -136,  -184,  -168,
  -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184, -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696,
  -688,  -656,  -752,  -720,  -560,  -528,  -624,  -592,  -944,  -912,  -1008, -976,  -816,  -784,  -880,  -848,
  5504,  5248,  6016,  5760,  4480,  4224,  4992,  4736,  7552,  7296,  8064,  7808,  6528,  6272,  7040,  6784,
  2752,  2624,  3008,  2880,  2240,  2112,  2496,  2368,  3776,  3648,  4032,  3904,  3264,  3136,  3520,  3392,
  22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944, 30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136,
  11008, 10496, 12032, 11520, 8960,  8448,  9984,  9472,  15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568,
  344,   328,   376,   360,   280,   264,   312,   296,   472,   456,   504,   488,   408,   392,   440,   424,
  88,    72,    120,   104,   24,    8,     56,    40,    216,   200,   248,   232,   152,   136,   184,   168,
  1376,  1312,  1504,  1440,  1120,  1056,  1248,  1184,  1888,  1824,  2016,  1952,  1632,  1568,  1760,  1696,
  688,   656,   752,   720,   560,   528,   624,   592,   944,   912,   1008,  976,   816,   784,   880,   848
];

// Encoder PCM 16-bit en A-law (PCMA) - Logic from g711.js
function encodeALaw(pcm_val) {
  let mask;
  let seg;
  let aval;

  if (pcm_val >= 0) {
    mask = 0xD5;
  } else {
    mask = 0x55;
    pcm_val = -pcm_val - 8;
  }

  if (pcm_val < 256) seg = 0;
  else if (pcm_val < 512) seg = 1;
  else if (pcm_val < 1024) seg = 2;
  else if (pcm_val < 2048) seg = 3;
  else if (pcm_val < 4096) seg = 4;
  else if (pcm_val < 8192) seg = 5;
  else if (pcm_val < 16384) seg = 6;
  else seg = 7;

  if (seg >= 8) return (0x7F ^ mask);
  
  aval = (seg << 4) | ((pcm_val >> (seg ? (seg + 3) : 4)) & 0x0F);
  return (aval ^ mask);
}

// Décoder A-law (PCMA) en PCM 16-bit
function decodeALaw(alaw) {
  return alawMap[alaw];
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

