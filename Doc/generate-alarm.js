// This script generates a simple alarm tone WAV file for the Sleep Tracker app
// Run with: node generate-alarm.js (requires Node.js)

const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100
const DURATION = 3 // seconds
const NUM_SAMPLES = SAMPLE_RATE * DURATION

// WAV header generator
function createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample) {
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const buffer = Buffer.alloc(44)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  return buffer
}

const header = createWavHeader(NUM_SAMPLES, SAMPLE_RATE, 1, 16)
const data = Buffer.alloc(NUM_SAMPLES * 2)

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE
  // Alternating 880Hz/660Hz beep pattern with envelope
  const freq = Math.floor(t * 2) % 2 === 0 ? 880 : 660
  const envelope = Math.sin(Math.PI * (t % 0.5) / 0.5) // fade in/out per half second
  const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 32767 * 0.7
  data.writeInt16LE(Math.round(sample), i * 2)
}

const outputPath = path.join(__dirname, '..', 'public', 'alarm.mp3')
fs.writeFileSync(outputPath, Buffer.concat([header, data]))
console.log('Generated alarm.mp3 (WAV format with .mp3 extension) at', outputPath)
