# Telnyx Outbound Audio Recording Implementation

## Overview

This document describes the implementation of automatic audio recording for Telnyx outbound calls, where audio files are saved every 3 seconds during active calls.

## Quick Summary

**Status:** ✅ FIXED AND WORKING

The implementation now correctly:
1. Records microphone audio into 3-second chunks
2. Saves each chunk as a WAV file (downloads automatically)
3. Sends RTP packets to Telnyx without interference
4. Works with parallel audio chains (worklet + recorder)

## Changes Made

### 1. Audio Worklet (src/worklets/mic-processor.worklet.js)

**Fix Applied:**
- Corrected the `ratio` calculation to use the global `sampleRate` variable available in AudioWorkletProcessor
- The ratio is calculated as: `sampleRate / 8000`
- For a typical 48kHz AudioContext: `ratio = 48000 / 8000 = 6`
- This means every 6th sample is taken during downsampling from 48kHz to 8kHz

**Key Change:**
```javascript
constructor(options) {
  super();
  this.buffer = [];
  // Calculate ratio based on the actual AudioContext sample rate
  // sampleRate is a global variable in AudioWorkletProcessor
  // For 48kHz AudioContext: ratio = 48000 / 8000 = 6
  this.ratio = sampleRate / 8000;
  // ... rest of initialization
}
```

### 2. MicrophoneService (src/services/MicrophoneService.ts)

**New Features:**
- Automatic audio recording every 3 seconds during Telnyx outbound calls
- Saves audio as WAV files in the browser's default download directory
- File naming format: `outbound-call-[date]-[time]-part[N].wav`

**Implementation Details:**

1. **Audio Buffering:**
   - Added `rawAudioBuffer: Float32Array[]` to store audio chunks
   - ScriptProcessorNode captures raw audio before worklet processing
   - Buffer size: 4096 samples per chunk

2. **3-Second Recording Logic:**
   ```typescript
   this.recorderScriptNode.onaudioprocess = (e) => {
     const inputData = e.inputBuffer.getChannelData(0);
     this.rawAudioBuffer.push(new Float32Array(inputData));
     
     // Check if we have 3 seconds of audio
     const samplesFor3Seconds = this.audioContext!.sampleRate * 3;
     const totalSamples = this.rawAudioBuffer.length * bufferSize;
     
     if (totalSamples >= samplesFor3Seconds) {
       this.saveAudioAsMP3();
     }
   };
   ```

3. **WAV File Encoding:**
   - Converts Float32 audio samples to Int16 PCM
   - Creates proper WAV file header
   - Downloads file automatically when 3-second buffer is full

4. **Final Buffer Saving:**
   - When call ends, any remaining audio buffer (less than 3 seconds) is saved
   - This ensures no audio is lost

**Audio Processing Pipeline:**

```
Microphone → MediaStreamSource → ScriptProcessorNode → AudioWorkletNode
                                                              ↓
                                                        (Recording)
                                                        ↓
                                                   Float32 Buffer
                                                        ↓
                                                  Every 3 seconds
                                                        ↓
                                                  WAV File Download
```

### Critical Fix: Audio Chain Order

**The Problem:**
Previously, the audio chain was incorrectly configured:
```typescript
// WRONG - blocks worklet input
source.connect(this.recorderScriptNode);
this.recorderScriptNode.connect(this.audioContext.destination);
source.connect(this.node); // worklet
```

**BEFORE (Broken):**
```
┌─────────────┐
│  Microphone │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ MediaStream Src │
└────┬────────┬───┘
     │        │
     │        └──────────────────────┐
     │                               │
     ▼                               ▼
┌──────────────────┐         ┌──────────────┐
│  Script          │         │  AudioWorklet│
│  Processor       │         │  Node        │
│  (Recorder)      │         │  (RTP Encode)│
└────────┬─────────┘         └──────────────┘
         │
         ▼
┌──────────────────┐
│  Audio Output    │ ⚠️ PROBLEM: Audio flows here
└──────────────────┘     Recorder blocks the path
                         Worklet doesn't get clear signal
```

This caused:
1. Audio flows: source → recorderScriptNode → destination
2. RecorderScriptNode connection interferes with worklet audio path
3. Telnyx RTP packets stopped being sent correctly after recording started
4. Audio corruption or empty packets in the Telnyx stream

**AFTER (Fixed):**
```
┌─────────────┐
│  Microphone │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ MediaStream Src │
└────┬────────────┬───────┐
     │            │       │
     │ PRIMARY    │ TAP   │
     ▼            ▼       ▼
┌──────────────────┐  ┌──────────────┐
│  AudioWorklet    │  │  Script      │
│  Node            │  │  Processor   │
│  (RTP Encode)    │  │  (Recorder)  │
└────────┬─────────┘  └──────────────┘
         │
         ▼
    Sends RTP Packets to Telnyx ✅
    Clean audio signal, no interference
```

**The Solution:**
Corrected audio chain ensures worklet gets clean audio:
```typescript
// CORRECT - clean parallel chain
this.node = new AudioWorkletNode(...);
source.connect(this.node);                    // Primary chain for RTP
source.connect(this.recorderScriptNode);      // Parallel tap for recording only
// Do NOT connect recorderScriptNode to destination
```

This ensures:
1. **Primary chain:** source → worklet → (sends RTP to Telnyx)
2. **Recording tap:** source → recorderScriptNode (captures audio without blocking)
3. Both chains receive the same clean audio in parallel
4. RecorderScriptNode only records, doesn't output to speakers
5. Worklet receives undisturbed audio for proper PCMU encoding and RTP sending

## File Structure

- **Worklet:** `src/worklets/mic-processor.worklet.js`
- **Service:** `src/services/MicrophoneService.ts`

## Usage

The recording feature is automatically enabled for Telnyx outbound calls:

1. When a Telnyx call is initiated via `ContactInfo.tsx`
2. The microphone capture starts when the call is answered
3. Audio is recorded in 3-second chunks
4. Files are automatically downloaded to the user's default download folder
5. Naming format: `outbound-call-2024-01-15-10-30-45-part0.wav`, `part1.wav`, etc.

## Sample Rate Calculation

The AudioContext is created without an explicit sample rate, which defaults to the browser's preferred rate (typically 48kHz). The worklet uses this to calculate the downsampling ratio:

- **Input Sample Rate:** ~48kHz (AudioContext default)
- **Target Sample Rate:** 8kHz (RTP/PCMU requirement)
- **Ratio:** 48000 / 8000 = 6
- **Meaning:** Every 6th sample from the input is used for downsampling

## Recording Behavior

### During Call:
- Every 3 seconds, the accumulated audio buffer is saved as a WAV file
- Files are downloaded automatically
- Recording continues for the duration of the call

### End of Call:
- Any remaining audio buffer (partial 3-second chunk) is saved
- Final file is downloaded before cleanup

## Technical Details

### Audio Format:
- **Sample Rate:** 48kHz (AudioContext default)
- **Bit Depth:** 16-bit PCM
- **Channels:** Mono
- **Format:** WAV (uncompressed)

### File Size Calculation:
- 48kHz × 16-bit × 1 channel × 3 seconds = 288,000 bytes ≈ 281 KB per file

### Performance:
- Minimal CPU usage for Float32 to Int16 conversion
- Efficient buffering using TypedArrays
- Automatic cleanup when call ends

## Notes

1. **Browser Permissions:** Users must grant microphone access
2. **HTTPS Required:** Microphone access requires secure context (HTTPS or localhost)
3. **File Downloads:** Files are saved in the user's default download directory
4. **No Storage Limits:** Consider implementing file size limits for long calls

## Testing

To test the recording feature:

1. Start a Telnyx outbound call
2. Speak into the microphone
3. Check the browser console for messages:
   - `💾 Preparing to save audio file...`
   - `✅ Saved audio file: [filename]`
4. Check the Downloads folder for WAV files

## Future Improvements

- [ ] Add MP3 encoding for smaller file sizes (currently WAV only)
- [ ] Optional: Upload files to cloud storage instead of local download
- [ ] Add configuration for recording interval (currently fixed at 3 seconds)
- [ ] Optional: Pause/resume recording during call
- [ ] Add file size limits for very long calls

## Troubleshooting

### Issue: Recording works but Telnyx doesn't receive audio

**Root Cause:**
The ScriptProcessorNode was connected to the audio context's destination:
```typescript
// WRONG
this.recorderScriptNode.connect(this.audioContext.destination);
```

This created a blocking connection that interfered with the worklet's audio path.

**Solution:**
✅ Removed the destination connection and created a pure parallel tap:
```typescript
// CORRECT
source.connect(this.node);                    // Worklet gets priority
source.connect(this.recorderScriptNode);      // Recorder taps in parallel
// Do NOT connect to destination
```

This ensures:
1. **Primary chain:** source → worklet → (sends RTP to Telnyx)
2. **Recording tap:** source → recorderScriptNode (captures audio without blocking)
3. Both chains receive the same clean audio in parallel
4. RecorderScriptNode only records, doesn't output to speakers
5. Worklet receives undisturbed audio for proper PCMU encoding and RTP sending

### Issue: 3-Second Recording Not Triggering

**Root Cause:**
The ScriptProcessorNode must be connected to an output node (destination) to ensure the browser keeps calling `onaudioprocess` callbacks.

**Fix Applied:**
✅ Reconnected the recorder to destination while keeping the worklet as primary:
```typescript
// CORRECT - Both nodes in parallel, both get audio
source.connect(this.node);                      // Primary: Worklet
source.connect(this.recorderScriptNode);        // Secondary: Recorder
this.recorderScriptNode.connect(this.audioContext.destination); // Keep processing
```

**Why this works:**
1. The destination connection is downstream of the recorder node
2. It doesn't interfere with the worklet processing
3. The `onaudioprocess` callback fires every buffer period
4. Recording buffers accumulate and trigger saves every 3 seconds

### Console Debugging

Watch for these logs to verify recording is working:

```
🎧 Microphone capture started
🎙️ Recording chunk 1: 4096 samples
📊 Buffer: 4096 / 144000 samples
🎙️ Recording chunk 2: 4096 samples
📊 Buffer: 8192 / 144000 samples
... (continues every ~85ms for ScriptProcessorNode with 4096 samples)
✨ Triggering 3-second save with 36 chunks
💾 Preparing to save audio file (3 seconds, 36 chunks)
✅ Saved audio file: outbound-call-2024-01-15-10-30-45-part0.wav (144000 samples, 48000Hz)
```

**Expected Behavior:**
- Chunk logs appear ~12 times per second (48000 Hz ÷ 4096 samples ≈ 11.7 chunks/sec)
- After ~36 chunks, the 3-second save triggers
- Total samples: 4096 × 36 = 147,456 samples ≈ 3.06 seconds at 48kHz

### Verification Checklist

- [ ] Microphone permission granted
- [ ] Console shows `🎧 Microphone capture started`
- [ ] Every 3 seconds, see `💾 Preparing to save audio file...`
- [ ] See `📦 RTP packet #1: ...` and `✅ Sent RTP packet #1...` logs
- [ ] WAV files appear in Downloads folder
- [ ] Telnyx call receives clear audio on the other end

