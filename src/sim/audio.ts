/**
 * Som sintetizado do boxer 1500 refrigerado a ar.
 *
 * Os numeros abaixo nao foram estimados: saem da analise espectral de dois
 * videos do motor real em marcha lenta (FFT de 16384 pontos, janela de Hann,
 * media de 24 janelas). O motor girava a ~760 rpm, o que da uma frequencia
 * de explosoes de 25,4 Hz (rpm / 60 x 2 no quatro cilindros de quatro tempos).
 *
 * Duas coisas apareceram na medicao e definem o timbre:
 *
 * 1. A energia NAO esta na frequencia de explosao, e sim na 2a, 3a e 4a ordem
 *    dela. Tomando a 1a ordem como 1,0 a medicao deu 21x, 29x e 18x. As meias
 *    ordens (1,5x / 2,5x / 3,5x) tambem sao fortes: e delas que vem a batida
 *    irregular de um carburado velho.
 * 2. 51% da energia esta acima de 500 Hz, com 24% so na faixa de 4-8 kHz.
 *    Isso e a ventoinha e o tinido dos tuchos, e e o que faz um motor a ar
 *    soar como motor a ar. Um filtro passa-baixa fechado mata justamente isso.
 */

/** Amplitudes medidas, indexadas por meia ordem: indice k = k/2 da explosao. */
const HARMONICOS = [
  0, // DC
  1.04, // 0,5x - 12,7 Hz
  1.0, // 1,0x - frequencia de explosao
  1.81, // 1,5x
  21.07, // 2,0x
  4.36, // 2,5x
  28.63, // 3,0x  <- ordem mais forte
  10.3, // 3,5x
  18.04, // 4,0x
  8.1, // 4,5x
  3.64, // 5,0x
  2.67, // 5,5x
  3.64, // 6,0x
]

/** Raios das polias (m) e numero de pas, iguais aos do modelo 3D. */
const R_VIRABREQUIM = 0.088
const R_GERADOR = 0.054
const PAS_VENTOINHA = 20

let ctx: AudioContext | null = null
let osc: OscillatorNode | null = null
let ganhoOsc: GainNode | null = null
let filtro: BiquadFilterNode | null = null
let ruido: AudioBufferSourceNode | null = null
let ganhoRuido: GainNode | null = null
let filtroRuido: BiquadFilterNode | null = null
let tetoRuido: BiquadFilterNode | null = null
let mestre: GainNode | null = null
/** Fase da oscilacao lenta que da a irregularidade da marcha lenta. */
let faseLenta = 0

function ondaDoMotor(c: AudioContext): PeriodicWave {
  const n = HARMONICOS.length
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  const maior = Math.max(...HARMONICOS)
  for (let i = 1; i < n; i++) imag[i] = HARMONICOS[i] / maior
  return c.createPeriodicWave(real, imag, { disableNormalization: false })
}

function bufferDeRuido(c: AudioContext): AudioBuffer {
  const n = c.sampleRate * 2
  const b = c.createBuffer(1, n, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  return b
}

export function ligarAudio() {
  if (ctx) return
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new AC()

  mestre = ctx.createGain()
  mestre.gain.value = 0
  mestre.connect(ctx.destination)

  // Escapamento: um unico oscilador cuja onda ja carrega o perfil medido.
  // A frequencia base e a MEIA ordem, entao o harmonico k cai exatamente
  // sobre a ordem k/2 da tabela.
  filtro = ctx.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = 900
  filtro.Q.value = 1.2
  ganhoOsc = ctx.createGain()
  ganhoOsc.gain.value = 0.85
  osc = ctx.createOscillator()
  osc.setPeriodicWave(ondaDoMotor(ctx))
  osc.frequency.value = 12.7
  osc.connect(filtro)
  filtro.connect(ganhoOsc)
  ganhoOsc.connect(mestre)

  // Sopro da ventoinha. O filtro e estreito e centrado na frequencia de
  // passagem das pas: ruido de banda larga aqui vira chiado de chuva, nao
  // vento. O teto corta o resto do agudo, que na medicao era em boa parte
  // o proprio ruido do microfone e nao o motor.
  filtroRuido = ctx.createBiquadFilter()
  filtroRuido.type = 'bandpass'
  filtroRuido.frequency.value = 420
  filtroRuido.Q.value = 2.2
  tetoRuido = ctx.createBiquadFilter()
  tetoRuido.type = 'lowpass'
  tetoRuido.frequency.value = 3000
  tetoRuido.Q.value = 0.7
  ganhoRuido = ctx.createGain()
  ganhoRuido.gain.value = 0
  ruido = ctx.createBufferSource()
  ruido.buffer = bufferDeRuido(ctx)
  ruido.loop = true
  ruido.connect(filtroRuido)
  filtroRuido.connect(tetoRuido)
  tetoRuido.connect(ganhoRuido)
  ganhoRuido.connect(mestre)

  osc.start()
  ruido.start()
}

export function desligarAudio() {
  if (!ctx) return
  osc?.stop()
  ruido?.stop()
  void ctx.close()
  ctx = null
  osc = ruido = null
  ganhoOsc = ganhoRuido = mestre = null
  filtro = filtroRuido = tetoRuido = null
}

export function atualizarAudio(ligado: boolean, rpm: number, temperatura: number) {
  if (!ctx || !mestre || !filtro || !osc || !ganhoRuido || !filtroRuido) return
  const agora = ctx.currentTime

  const alvo = ligado ? Math.min(0.18, 0.06 + (rpm / 4000) * 0.12) : 0
  mestre.gain.setTargetAtTime(alvo, agora, 0.12)
  if (!ligado) return

  // Frequencia de explosoes e, dela, a meia ordem que alimenta o oscilador
  const explosoes = (rpm / 60) * 2

  // Marcha lenta de carburador nao e estavel: a medicao mostrou a fundamental
  // passeando entre 24 e 28 Hz com o motor parado em ponto morto. Reproduzo
  // esse passeio, que some conforme o motor sobe de giro.
  faseLenta += 0.21
  const irregular = 1 + Math.sin(faseLenta) * 0.02 * Math.max(0, 1 - rpm / 1600)
  osc.frequency.setTargetAtTime((explosoes / 2) * irregular, agora, 0.06)

  // O passa-baixa abre com o giro: em marcha lenta o escape e abafado,
  // acelerando ele deixa passar as ordens altas.
  filtro.frequency.setTargetAtTime(700 + rpm * 0.55, agora, 0.1)

  // A ventoinha e movida pela correia, girando 1,63x o virabrequim (razao
  // entre as duas polias). Com 20 pas, a frequencia de passagem fica em
  // rpm x 0,543 - ~414 Hz em marcha lenta. E nela que o sopro se centra.
  const giro = Math.min(1, rpm / 3800)
  const passagemPas = rpm * (R_VIRABREQUIM / R_GERADOR) * (PAS_VENTOINHA / 60)
  ganhoRuido.gain.setTargetAtTime(0.06 + giro * 0.12, agora, 0.15)
  filtroRuido.frequency.setTargetAtTime(passagemPas, agora, 0.15)
  if (tetoRuido) {
    tetoRuido.frequency.setTargetAtTime(2400 + giro * 2200 + Math.max(0, temperatura - 95) * 30, agora, 0.2)
  }
}
