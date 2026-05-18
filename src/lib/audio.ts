let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

export function playClick(): void {
  const audioCtx = getContext()
  if (!audioCtx) return

  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }

  const now = audioCtx.currentTime
  const durationSec = 0.04
  const attack = 0.001
  const release = durationSec - attack

  const osc = audioCtx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1100, now)
  osc.frequency.exponentialRampToValueAtTime(700, now + durationSec)

  const oscGain = audioCtx.createGain()
  oscGain.gain.setValueAtTime(0, now)
  oscGain.gain.linearRampToValueAtTime(0.25, now + attack)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release)

  osc.connect(oscGain).connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + durationSec + 0.01)

  const bufferLength = Math.max(1, Math.floor(audioCtx.sampleRate * 0.008))
  const buffer = audioCtx.createBuffer(1, bufferLength, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferLength; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferLength)
  }
  const noise = audioCtx.createBufferSource()
  noise.buffer = buffer
  const noiseGain = audioCtx.createGain()
  noiseGain.gain.value = 0.15
  noise.connect(noiseGain).connect(audioCtx.destination)
  noise.start(now)
}

export function unlockAudio(): void {
  const audioCtx = getContext()
  if (!audioCtx) return
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
}
