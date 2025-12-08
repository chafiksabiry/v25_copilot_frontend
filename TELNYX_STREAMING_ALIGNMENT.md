# Telnyx Media Streaming - Implementation Alignment

This document explains how our implementation aligns with the [Telnyx Media Streaming documentation](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming).

## Overview

Our implementation supports **bidirectional media streaming** over WebSockets:
- **Inbound audio** (Telnyx → Frontend): Received and played in real-time
- **Outbound audio** (Frontend → Telnyx): Captured from microphone and sent in real-time

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ AudioStreamManager│◄────────┤   WebSocket      │          │
│  │  (Inbound Audio) │         │ /frontend-audio  │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              ▲                     │
│         │ Decodes PCMU                 │ Sends RTP           │
│         │ Plays audio                  │ (PCMU base64)       │
│         ▼                              │                     │
│    Speaker/Output              ┌───────┴──────────┐          │
│                                │ MicrophoneService│          │
│                                │ (Outbound Audio) │          │
│                                └───────┬──────────┘          │
│                                        │                     │
│                                        │ Encodes PCMU        │
│                                        │ Creates RTP         │
│                                        ▼                     │
│                               ┌─────────────────┐            │
│                               │ mic-processor   │            │
│                               │   (Worklet)     │            │
│                               └─────────────────┘            │
│                                        ▲                     │
│                                        │                     │
│                                  Microphone Input            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Inbound Audio (Telnyx → Frontend)

### Implementation: `AudioStreamManager.ts`

**Telnyx sends:**
```json
{
  "event": "media",
  "media": {
    "track": "inbound",
    "chunk": "2",
    "timestamp": "5",
    "payload": "base64-encoded-PCMU-audio"
  }
}
```

**Our processing:**
1. Receive WebSocket message with `event: "media"`
2. Extract `media.payload` (base64 string)
3. Decode base64 → `Uint8Array` (PCMU bytes)
4. Decode PCMU (µ-law) → `Float32Array` (PCM samples)
5. Queue chunks in jitter buffer
6. Schedule playback using Web Audio API

**Key specifications:**
- **Codec**: PCMU (G.711 µ-law)
- **Sample Rate**: 8000 Hz
- **Channels**: 1 (mono)
- **Encoding**: Base64

**Code alignment:**
```typescript
// AudioStreamManager.ts - Line 111-118
private base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// AudioStreamManager.ts - Line 122-133
private decodeMuLawByte(muLawByte: number): number {
  // Standard ITU-T G.711 µ-law decoding
  let mu = ~muLawByte & 0xff;
  const sign = (mu & 0x80) ? -1 : 1;
  const exponent = (mu >> 4) & 0x07;
  const mantissa = mu & 0x0f;
  let magnitude = ((mantissa << 3) + 0x84) << (exponent);
  const sample = sign * (magnitude - 0x84);
  return sample < -32768 ? -32768 : sample > 32767 ? 32767 : sample;
}
```

✅ **Fully aligned with Telnyx specification**

## Outbound Audio (Frontend → Telnyx)

### Implementation: `MicrophoneService.ts` + `mic-processor.worklet.js`

**Telnyx expects:**
```json
{
  "event": "media",
  "media": {
    "payload": "base64-encoded-RTP-packet"
  }
}
```

**Our processing:**

#### 1. Audio Capture (`MicrophoneService.ts`)
- Capture microphone using `getUserMedia()`
- Create AudioContext (default sample rate, usually 48kHz)
- Connect to AudioWorkletNode for processing

#### 2. Downsampling & Encoding (`mic-processor.worklet.js`)
- **Input**: Float32 samples at native sample rate (e.g., 48kHz)
- **Downsample**: From native rate → 8kHz using ratio-based resampling
- **Encode**: Float32 → PCMU (µ-law) using ITU-T G.711 algorithm
- **Buffer**: Accumulate 160 samples (20ms @ 8kHz)
- **Output**: `Uint8Array` of PCMU bytes

```javascript
// mic-processor.worklet.js - Line 14-19
for (let i = 0; i < input.length; i += this.ratio) {
  const idx = Math.floor(i);
  const sample = input[idx];
  const mu = this.encodeMuLaw(sample);
  this.buffer.push(mu);
}

// Send in chunks of 160 samples (20 ms @ 8 kHz)
const CHUNK = 160;
while (this.buffer.length >= CHUNK) {
  const frame = this.buffer.splice(0, CHUNK);
  this.port.postMessage(new Uint8Array(frame));
}
```

#### 3. RTP Packetization (`MicrophoneService.ts`)
- Receive PCMU chunks from worklet
- Create RTP header (12 bytes)
- Append PCMU payload
- Encode to base64
- Send via WebSocket

```typescript
// MicrophoneService.ts - Line 74-90
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
```

**Key specifications:**
- **Codec**: PCMU (G.711 µ-law)
- **Sample Rate**: 8000 Hz
- **Chunk Size**: 160 samples = 20ms @ 8kHz ✅ (within Telnyx's 20ms-30s range)
- **RTP Format**: Standard RTP header (12 bytes) + PCMU payload
- **Encoding**: Base64

✅ **Fully aligned with Telnyx specification**

## WebSocket Message Flow

### Connection Establishment

1. **Frontend connects** to `/frontend-audio` WebSocket
2. **Telnyx sends** connection confirmation:
```json
{
  "event": "connected",
  "version": "1.0.0"
}
```

3. **Telnyx sends** stream start event:
```json
{
  "event": "start",
  "sequence_number": "1",
  "start": {
    "call_control_id": "...",
    "media_format": {
      "encoding": "PCMU",
      "sample_rate": 8000,
      "channels": 1
    }
  },
  "stream_id": "..."
}
```

### During Call

**Bidirectional media exchange:**

**Telnyx → Frontend (Inbound):**
```json
{
  "event": "media",
  "sequence_number": "4",
  "media": {
    "track": "inbound",
    "chunk": "2",
    "timestamp": "5",
    "payload": "base64-PCMU-data"
  }
}
```

**Frontend → Telnyx (Outbound):**
```json
{
  "event": "media",
  "media": {
    "payload": "base64-RTP-packet"
  }
}
```

### Call End

**Telnyx sends:**
```json
{
  "event": "stop",
  "sequence_number": "5",
  "stop": {
    "call_control_id": "..."
  },
  "stream_id": "..."
}
```

## Codec Specifications

### PCMU (G.711 µ-law)

**Encoding (Float32 → PCMU):**
```javascript
encodeMuLaw(sample) {
  const BIAS = 0x84;
  const MAX = 32635;
  const sign = sample < 0 ? 0x80 : 0;
  let s = Math.abs(sample);
  s = Math.min(s, 1.0);
  let s16 = Math.floor(s * 32767);
  if (s16 > MAX) s16 = MAX;
  s16 = s16 + BIAS;
  let exponent = 7;
  for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
  const mantissa = (s16 >> (exponent + 3)) & 0x0F;
  const muLaw = ~(sign | (exponent << 4) | mantissa);
  return muLaw & 0xff;
}
```

**Decoding (PCMU → Int16):**
```typescript
private decodeMuLawByte(muLawByte: number): number {
  let mu = ~muLawByte & 0xff;
  const sign = (mu & 0x80) ? -1 : 1;
  const exponent = (mu >> 4) & 0x07;
  const mantissa = mu & 0x0f;
  let magnitude = ((mantissa << 3) + 0x84) << (exponent);
  const sample = sign * (magnitude - 0x84);
  return sample < -32768 ? -32768 : sample > 32767 ? 32767 : sample;
}
```

✅ **Standard ITU-T G.711 µ-law implementation**

## Performance Optimizations

### Jitter Buffer (Inbound)
- **Purpose**: Smooth playback despite network jitter
- **Implementation**: Queue-based buffering with configurable thresholds
- **Start threshold**: 3 chunks before playback starts
- **Max queue**: 60 chunks (prevents memory overflow)

### Off-Main-Thread Processing (Outbound)
- **AudioWorkletProcessor**: Runs in separate audio thread
- **Benefits**: 
  - No blocking of main UI thread
  - Consistent audio processing
  - Better performance

### Efficient Encoding
- **Downsampling**: Simple ratio-based resampling (fast, low CPU)
- **µ-law encoding**: Optimized bit manipulation
- **Base64**: Chunked conversion to avoid stack overflow

## Testing Checklist

- [x] Inbound audio decoded correctly from PCMU
- [x] Outbound audio encoded to PCMU @ 8kHz
- [x] RTP packets created with proper headers
- [x] Base64 encoding/decoding working
- [x] WebSocket message format matches Telnyx spec
- [x] Chunk size (160 samples = 20ms) within spec
- [x] Jitter buffer prevents audio dropouts
- [x] AudioWorklet prevents main thread blocking

## Conclusion

Our implementation is **fully aligned** with the Telnyx Media Streaming specification:

✅ **Codec**: PCMU (G.711 µ-law) @ 8kHz, mono  
✅ **Format**: RTP packets encoded in base64  
✅ **Chunk size**: 20ms (160 samples @ 8kHz)  
✅ **WebSocket messages**: Correct event structure  
✅ **Bidirectional**: Both inbound and outbound streaming  
✅ **Performance**: Optimized with jitter buffer and worklets  

The implementation follows best practices and is production-ready for real-time voice communication with Telnyx.

