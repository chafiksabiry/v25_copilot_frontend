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

// Table de conversion u-Law vers PCM (copie de g711.js backend)
const ulawMap = [
  -32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,-23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
  -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,-11900,-11388,-10876,-10364, -9852, -9340, -8828, -8316,
  -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140, -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
  -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004, -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
  -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436, -1372, -1308, -1244, -1180, -1116, -1052,  -988,  -924,
  -876,  -844,  -812,  -780,  -748,  -716,  -684,  -652,  -620,  -588,  -556,  -524,  -492,  -460,  -428,  -396,
  -372,  -356,  -340,  -324,  -308,  -292,  -276,  -260,  -244,  -228,  -212,  -196,  -180,  -164,  -148,  -132,
  -120,  -112,  -104,   -96,   -88,   -80,   -72,   -64,   -56,   -48,   -40,   -32,   -24,   -16,    -8,     0,
  32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956, 23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
  15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412, 11900, 11388, 10876, 10364,  9852,  9340,  8828,  8316,
  7932,  7676,  7420,  7164,  6908,  6652,  6396,  6140,  5884,  5628,  5372,  5116,  4860,  4604,  4348,  4092,
  3900,  3772,  3644,  3516,  3388,  3260,  3132,  3004,  2876,  2748,  2620,  2492,  2364,  2236,  2108,  1980,
  1884,  1820,  1756,  1692,  1628,  1564,  1500,  1436,  1372,  1308,  1244,  1180,  1116,  1052,   988,   924,
  876,   844,   812,   780,   748,   716,   684,   652,   620,   588,   556,   524,   492,   460,   428,   396,
  372,   356,   340,   324,   308,   292,   276,   260,   244,   228,   212,   196,   180,   164,   148,   132,
  120,   112,   104,    96,    88,    80,    72,    64,    56,    48,    40,    32,    24,    16,     8,     0
];

// Encoder PCM 16-bit en u-law (PCMU)
function encodeULaw(pcm_val) {
  const BIAS = 0x84;
  const CLIP = 32635;
  let sign = (pcm_val >> 8) & 0x80;
  
  if (sign !== 0) pcm_val = -pcm_val;
  if (pcm_val > CLIP) pcm_val = CLIP;
  
  pcm_val += BIAS;
  let exponent = 7;
  
  // Determine exponent
  const expMasks = [0x4000, 0x2000, 0x1000, 0x800, 0x400, 0x200, 0x100, 0x80];
  for (let i = 0; i < 8; i++) {
    if (pcm_val & expMasks[i]) {
      exponent = 7 - i;
      break;
    }
  }

  let mantissa = (pcm_val >> (exponent + 3)) & 0x0F;
  let ulaw = ~(sign | (exponent << 4) | mantissa);
  
  return ulaw & 0xFF;
}

// Encoder un buffer PCM Float32 en PCMU
export function encodePCMUBuffer(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  
  // Convertir Float32 [-1, 1] en Int16 [-32768, 32767]
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Encoder en u-law
  const pcmu = new Uint8Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    pcmu[i] = encodeULaw(pcm16[i]);
  }
  
  return pcmu;
}

// Décoder u-law (PCMU) en PCM 16-bit
function decodeULaw(ulaw) {
  return ulawMap[ulaw];
}

// Décoder un buffer PCMU en PCM Float32
export function decodePCMUBuffer(pcmuArray) {
  const pcm16 = new Int16Array(pcmuArray.length);
  
  // Décoder u-law en PCM16
  for (let i = 0; i < pcmuArray.length; i++) {
    pcm16[i] = decodeULaw(pcmuArray[i]);
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
    
    // Vérifier si c'est du silence
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += Math.abs(inputData[i]);
    }
    const average = sum / inputData.length;
    const silenceThreshold = 0.001; // RÉDUIT de 0.01 à 0.001 pour détecter plus de voix
    
    // Encoder en PCMU (u-Law) - Le backend attend du PCMU
    const pcmuData = encodePCMUBuffer(inputData);
    
    // Convertir en base64 pour transmission
    const base64Audio = btoa(String.fromCharCode.apply(null, pcmuData));
    
    // Log tous les 50 chunks (environ toutes les 2 secondes) avec niveau audio
    if (chunkCount % 50 === 0) {
      if (average > silenceThreshold * 3) {
        console.log(`🎙️ Audio significatif capturé: ${pcmuData.length} bytes, base64: ${base64Audio.length} chars, volume: ${average.toFixed(5)}`);
      } else {
        // Log occasionnel pour le silence (1% des chunks)
        if (Math.random() < 0.02) {
          console.log(`🔇 Silence détecté: volume ${average.toFixed(5)} (seuil: ${silenceThreshold})`);
        }
      }
    }
    chunkCount++;
    
    // TOUJOURS envoyer, même le silence (pour maintenir la connexion)
    onAudioData(base64Audio);
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  console.log('✅ Audio processor connecté et prêt');
  
  return { source, processor };
}

// Système de lecture audio continu avec queue
let audioQueue = [];
let isPlaying = false;
let nextPlayTime = 0;
let totalChunksReceived = 0;

// Lire l'audio reçu avec synchronisation
export function playAudioChunk(audioContext, base64Audio) {
  try {
    // Vérifier que le contexte audio n'est pas suspendu
    if (audioContext.state === 'suspended') {
      console.warn('⚠️ AudioContext suspendu - tentative de reprise...');
      audioContext.resume().then(() => {
        console.log('✅ AudioContext repris');
      }).catch(err => {
        console.error('❌ Erreur reprise AudioContext:', err);
      });
    }
    
    // Décoder base64
    const binaryString = atob(base64Audio);
    const pcmuArray = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      pcmuArray[i] = binaryString.charCodeAt(i);
    }
    
    // Log pour les premiers packets pour diagnostiquer
    if (totalChunksReceived === 0) {
      console.log(`🔊 PREMIER AUDIO REÇU: ${base64Audio.length} chars base64, ${pcmuArray.length} bytes`);
      console.log(`📊 Bytes de test: ${Array.from(pcmuArray.slice(0, 5)).join(', ')}`);
    }
    
    // Décoder PCMU (u-Law) en Float32 - Le backend envoie du PCMU après conversion
    const float32Data = decodePCMUBuffer(pcmuArray);
    
    // Vérifier que les données ne sont pas toutes à zéro (silence complet)
    const maxValue = Math.max(...float32Data.map(Math.abs));
    const avgValue = float32Data.reduce((sum, val) => sum + Math.abs(val), 0) / float32Data.length;
    
    // Log pour les premiers packets pour diagnostiquer
    if (totalChunksReceived < 10) {
      console.log(`🎵 Audio décodé #${totalChunksReceived + 1}: max=${maxValue.toFixed(5)}, avg=${avgValue.toFixed(5)}, samples=${float32Data.length}`);
      
      // Vérifier si les valeurs sont dans une plage raisonnable
      if (maxValue < 0.0001) {
        console.warn(`⚠️ Audio très silencieux (max=${maxValue.toFixed(5)}) - peut-être un problème de conversion`);
      } else if (maxValue > 1.0) {
        console.warn(`⚠️ Audio saturé (max=${maxValue.toFixed(5)}) - peut-être un problème de conversion`);
      }
    }
    
    // Créer un buffer audio
    const audioBuffer = audioContext.createBuffer(1, float32Data.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Data);
    
    totalChunksReceived++;
    
    // La taille du buffer peut varier (160 samples = 20ms pour G.711, 256 samples = 32ms, etc.)
    // C'est normal, pas besoin de warning
    
    // Ajouter à la queue
    audioQueue.push({
      buffer: audioBuffer,
      duration: audioBuffer.duration
    });
    
    // Log tous les chunks pour les 20 premiers, puis tous les 10
    if (totalChunksReceived <= 20 || totalChunksReceived % 10 === 0) {
      const totalDuration = audioQueue.reduce((sum, c) => sum + c.duration, 0);
      console.log(`📥 Audio reçu #${totalChunksReceived} - Queue: ${audioQueue.length} chunks, Durée totale: ${totalDuration.toFixed(2)}s, Buffer: ${float32Data.length} samples (${(float32Data.length / SAMPLE_RATE * 1000).toFixed(1)}ms), Max: ${maxValue.toFixed(5)}`);
    }
    
    // Démarrer la lecture si pas déjà en cours
    if (!isPlaying) {
      console.log(`▶️ Démarrage lecture audio (queue: ${audioQueue.length} chunks, durée: ${audioQueue[0].duration.toFixed(3)}s)`);
      playNextChunk(audioContext);
    }
    
  } catch (error) {
    console.error('❌ Erreur lecture audio:', error);
    console.error('Stack:', error.stack);
  }
}

// Jouer le prochain chunk de la queue
let chunkPlayCount = 0;
function playNextChunk(audioContext) {
  if (audioQueue.length === 0) {
    isPlaying = false;
    nextPlayTime = 0;
    if (chunkPlayCount > 0) {
      console.log(`🔇 Queue audio vide, arrêt lecture (${chunkPlayCount} chunks joués)`);
      chunkPlayCount = 0;
    }
    return;
  }
  
  isPlaying = true;
  const chunk = audioQueue.shift();
  chunkPlayCount++;
  
  // Log tous les 10 chunks pour debug
  if (chunkPlayCount % 10 === 0) {
    console.log(`🔊 Lecture chunk audio #${chunkPlayCount} (durée: ${chunk.duration.toFixed(3)}s, queue: ${audioQueue.length})`);
  }
  
  // Calculer le temps de démarrage
  const currentTime = audioContext.currentTime;
  const startTime = Math.max(currentTime, nextPlayTime);
  
  // Créer et démarrer la source avec un gain node pour amplifier le volume
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  // Amplifier le volume (gain de 2.0 = double le volume)
  // Cela devrait aider si le volume est trop faible
  gainNode.gain.value = 2.0;
  
  source.buffer = chunk.buffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Gérer les erreurs de timing
  try {
    source.start(startTime);
    
    // Mettre à jour le temps pour le prochain chunk
    nextPlayTime = startTime + chunk.duration;
    
    // Programmer le prochain chunk immédiatement si la queue n'est pas vide
    // Cela évite les gaps entre les chunks
    source.onended = () => {
      // Jouer le prochain chunk immédiatement
      if (audioQueue.length > 0) {
        playNextChunk(audioContext);
      } else {
        isPlaying = false;
        nextPlayTime = 0;
        if (chunkPlayCount > 0) {
          console.log(`🔇 Fin lecture audio (${chunkPlayCount} chunks joués au total)`);
          chunkPlayCount = 0;
        }
      }
    };
  } catch (error) {
    console.error('❌ Erreur démarrage source audio:', error);
    // En cas d'erreur, essayer de jouer immédiatement
    try {
      source.start(0);
      nextPlayTime = audioContext.currentTime + chunk.duration;
      source.onended = () => {
        if (audioQueue.length > 0) {
          playNextChunk(audioContext);
        } else {
          isPlaying = false;
          nextPlayTime = 0;
        }
      };
    } catch (err2) {
      console.error('❌ Erreur critique lecture audio:', err2);
      // Retirer ce chunk et continuer avec le suivant
      if (audioQueue.length > 0) {
        playNextChunk(audioContext);
      } else {
        isPlaying = false;
        nextPlayTime = 0;
      }
    }
  }
}

// Réinitialiser la queue audio (appelé quand l'appel se termine)
export function resetAudioQueue() {
  console.log(`🔄 Réinitialisation queue audio (${audioQueue.length} chunks restants, ${totalChunksReceived} chunks reçus au total)`);
  audioQueue = [];
  isPlaying = false;
  nextPlayTime = 0;
  totalChunksReceived = 0;
}

export { SAMPLE_RATE, CHUNK_SIZE };

