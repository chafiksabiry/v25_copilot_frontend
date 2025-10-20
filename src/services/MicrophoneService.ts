export class MicrophoneService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async startCapture() {
    try {
      // 1) Ensure WebSocket provided and open (we reuse frontend-audio WS)
      if (!this.ws) throw new Error('WebSocket instance not provided');
      if (this.ws.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => { this.ws?.removeEventListener('open', onOpen as any); resolve(); };
          const onError = () => { this.ws?.removeEventListener('error', onError as any); reject(new Error('WebSocket error')); };
          this.ws?.addEventListener('open', onOpen as any);
          this.ws?.addEventListener('error', onError as any);
        });
      }

      // 2) Capture microphone
      // Note: Most browsers don't support 8kHz AudioContext, so we use default (usually 48kHz)
      // and let the worklet handle downsampling to 8kHz
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);

      // 3) Load and create worklet
      const workletUrl = new URL('../worklets/mic-processor.worklet.js', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      this.node = new AudioWorkletNode(this.audioContext, 'mic-processor', { numberOfInputs: 1, numberOfOutputs: 0 });
      source.connect(this.node);

      // 4) Receive PCMU chunks from worklet and send over WS (PCMU direct, no RTP)
      let chunkCount = 0;
      this.node.port.onmessage = (ev: MessageEvent) => {
        const pcmu: Uint8Array = ev.data;
        if (!pcmu || !(pcmu instanceof Uint8Array)) return;
        
        chunkCount++;
        // Log premier chunk et ensuite tous les 50 chunks
        if (chunkCount === 1 || chunkCount % 50 === 0) {
          console.log(`📦 PCMU chunk #${chunkCount}: ${pcmu.length} bytes`);
        }
        
        // Encode PCMU directly to base64 (no RTP header)
        const base64 = this.uint8ToBase64(pcmu);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
          
          // Log premier envoi et ensuite tous les 50 envois
          if (chunkCount === 1 || chunkCount % 50 === 0) {
            console.log(`✅ Sent chunk #${chunkCount} via WebSocket (PCMU: ${pcmu.length} bytes, base64: ${base64.length} chars)`);
          }
        } else {
          console.error(`❌ WebSocket not ready for chunk #${chunkCount}, state: ${this.ws?.readyState}`);
        }
      };

      console.log('🎧 Microphone capture started');
    } catch (err) {
      console.error('❌ Error starting microphone stream:', err);
      await this.stopCapture();
      throw err;
    }
  }

  async stopCapture() {
    console.log('⏹️ Stopping microphone stream');
    try { this.node?.disconnect(); } catch (_) {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { await this.audioContext?.close(); } catch (_) {}
    // We do NOT close the shared WebSocket here; it's managed by the caller

    this.node = null;
    this.stream = null;
    this.audioContext = null;
    // keep ws reference (still owned by caller)
  }

  // Uint8Array -> base64
  private uint8ToBase64(u8: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      const chunk = u8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }
}
