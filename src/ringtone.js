// Générer et jouer une sonnerie avec Web Audio API

let audioContext = null;
let gainNode = null;
let isPlaying = false;

// Créer une sonnerie (ton qui sonne comme un téléphone)
export function playRingtone() {
  if (isPlaying) return;

  try {
    // Créer le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Créer les nœuds
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.5; // Volume à 50% (augmenté)

    // Fonction pour jouer un bip
    const playBeep = (frequency, duration) => {
      const osc = audioContext.createOscillator();
      const beepGain = audioContext.createGain();

      osc.connect(beepGain);
      beepGain.connect(gainNode);

      osc.frequency.value = frequency;
      osc.type = 'sine';

      beepGain.gain.setValueAtTime(0.5, audioContext.currentTime);
      beepGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration);
    };

    // Jouer la sonnerie en boucle (2 bips courts, pause, répéter)
    const ringPattern = () => {
      if (!isPlaying) return;

      // Premier bip (440 Hz - La)
      playBeep(440, 0.4);

      // Deuxième bip après 0.5s
      setTimeout(() => {
        if (isPlaying) {
          playBeep(440, 0.4);
        }
      }, 500);

      // Répéter après 2 secondes
      setTimeout(() => {
        if (isPlaying) {
          ringPattern();
        }
      }, 2000);
    };

    isPlaying = true;
    ringPattern();

    console.log('🔔 Sonnerie démarrée');

  } catch (error) {
    console.error('Erreur sonnerie:', error);
  }
}

// Arrêter la sonnerie
export function stopRingtone() {
  if (!isPlaying) return;

  isPlaying = false;

  if (gainNode) {
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  }

  // Nettoyer après un court délai
  setTimeout(() => {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      gainNode = null;
    }
  }, 200);

  console.log('🔕 Sonnerie arrêtée');
}

// Vérifier si la sonnerie est en cours
export function isRingtonePlaying() {
  return isPlaying;
}

