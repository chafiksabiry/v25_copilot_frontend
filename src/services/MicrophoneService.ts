export class MicrophoneService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  private seq = 0;
  private timestamp = 0;
  private ssrc = Math.floor(Math.random() * 0xffffffff);

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

      // 4) Receive PCMU chunks from worklet and send over WS with RTP
      this.node.port.onmessage = (ev: MessageEvent) => {
        const pcmu: Uint8Array = ev.data;
        if (!pcmu || !(pcmu instanceof Uint8Array)) return;
        const rtp = this.createRtpPacket(pcmu);
        const base64 = this.uint8ToBase64(rtp);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
          this.seq = (this.seq + 1) % 65536;
          this.timestamp += pcmu.length;
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

  // RTP header creation (PT=0 PCMU)
  private createRtpPacket(payload: Uint8Array): Uint8Array {
    const packet = new Uint8Array(12 + payload.length);
    packet[0] = 0x80; // V=2
    packet[1] = 0x00; // PT=0 PCMU
    packet[2] = (this.seq >> 8) & 0xff;
    packet[3] = this.seq & 0xff;
    packet[4] = (this.timestamp >> 24) & 0xff;
    packet[5] = (this.timestamp >> 16) & 0xff;
    packet[6] = (this.timestamp >> 8) & 0xff;
    packet[7] = this.timestamp & 0xff;
    packet[8] = (this.ssrc >> 24) & 0xff;
    packet[9] = (this.ssrc >> 16) & 0xff;
    packet[10] = (this.ssrc >> 8) & 0xff;
    packet[11] = this.ssrc & 0xff;
    packet.set(payload, 12);
    return packet;
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
