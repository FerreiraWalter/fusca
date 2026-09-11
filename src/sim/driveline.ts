/**
 * Embreagem, cambio e transmissao do Fusca 1500 (1973).
 *
 * Duas camadas, propositalmente separadas:
 *
 *  1. ACIONAMENTO - a cadeia causal mecanica. Pedal -> cabo -> alavanca ->
 *     garfo -> rolamento -> plato -> disco. Cada elo e um numero derivado do
 *     anterior, e nao um estado independente. E isso que a visao mecanica
 *     desenha e o que faz a folga do cabo importar.
 *
 *  2. DINAMICA - o que acontece com o carro. Motor com inercia propria,
 *     embreagem que transmite torque limitado enquanto patina e trava quando
 *     as rotacoes se igualam, e a massa do veiculo refletida pela relacao da
 *     marcha engatada. E dessa combinacao que sai, sozinho, o motor morrer ao
 *     largar o pedal em quarta.
 */

import type { Acionamento, DriveState, Marcha, PartState, Portao, VeiculoEstado } from '../data/types'

/* ─────────────────────────── constantes reais ────────────────────────── */

/** Relacoes do cambio 1973 (4 marchas) e do diferencial. */
export const RELACOES: Record<Marcha, number> = { N: 0, '1': 3.8, '2': 2.06, '3': 1.32, '4': 0.89, R: 3.88 }
export const RELACAO_DIFERENCIAL = 4.375
/** Raio dinamico do pneu 5.60-15, em metros. */
export const RAIO_RODA = 0.3
/** Massa do Fusca com motorista, em kg. */
const MASSA = 870
/** Inercia do conjunto virabrequim + volante do motor, em kg.m2. */
const INERCIA_MOTOR = 0.22
/** Torque maximo que o plato consegue segurar, em Nm (disco novo). */
const TORQUE_PLATO = 135
/** Torque maximo do 1500 (10,5 kgfm a 2600 rpm). */
const TORQUE_MOTOR_PICO = 103
const RPM_TORQUE_PICO = 2600
/** Abaixo disso o motor nao se sustenta e apaga. */
export const RPM_MORTE = 380

/** Curso total do pedal da embreagem, em milimetros. */
export const CURSO_PEDAL = 150
/**
 * Curso util (ja descontada a folga) necessario para o disco soltar por
 * completo. A margem de projeto e estreita de proposito, como no carro real:
 * com a folga de fabrica (10-20 mm) sobram 130-140 mm de curso para 128 mm
 * necessarios. Basta a folga passar de ~25 mm para o pedal chegar ao assoalho
 * antes de o disco soltar - e a "embreagem baixa".
 */
export const CURSO_DESENGATE = 128

/**
 * Abaixo desta fracao de torque o sincronizador consegue trabalhar. Nao e
 * zero: uma sobra minima de arrasto o cambio absorve.
 */
export const ENGATE_LIVRE = 0.05
/** Curso do rolamento contra os dedos do plato, em mm. */
export const CURSO_ROLAMENTO = 8.5
/** Folga abaixo da qual o rolamento ja encosta no plato com o pedal solto. */
const FOLGA_MINIMA = 6

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const relacaoTotal = (m: Marcha) => RELACOES[m] * RELACAO_DIFERENCIAL
/** Sentido de marcha: a re inverte o giro na saida do cambio. */
export const sentidoDaMarcha = (m: Marcha) => (m === 'R' ? -1 : 1)

/** Velocidade (m/s) que corresponde a uma rotacao do primario nesta marcha. */
export function velocidadeDe(rpmPrimario: number, m: Marcha): number {
  const rel = relacaoTotal(m)
  if (!rel) return 0
  return ((rpmPrimario / 60) * 2 * Math.PI * RAIO_RODA * sentidoDaMarcha(m)) / rel
}

/** Rotacao do eixo primario imposta pela velocidade atual do veiculo. */
export function rpmPrimarioDe(velocidade: number, m: Marcha): number {
  const rel = relacaoTotal(m)
  if (!rel) return 0
  return ((velocidade * sentidoDaMarcha(m)) / (2 * Math.PI * RAIO_RODA)) * 60 * rel
}

/* ───────────────────── 1. cadeia causal do acionamento ───────────────── */

export interface PecasEmbreagem {
  cabo: boolean
  conduite: boolean
  alavanca: boolean
  garfo: boolean
  rolamento: boolean
  plato: boolean
  disco: boolean
  volante: boolean
  eixo: boolean
  /** Folga livre do pedal regulada na porca borboleta, em mm. */
  folga: number
  /** Condicao do disco: reduz o torque que a embreagem segura. */
  discoRuim: boolean
  discoDesgastado: boolean
  /** Conduite amassado: o pedal fica duro e come parte do curso. */
  conduiteRuim: boolean
}

/**
 * Le o estado fisico das pecas e devolve o que o pedal consegue (ou nao)
 * fazer. Toda a explicacao mecanica da interface sai daqui.
 */
export function acionamento(p: PecasEmbreagem, pedal: number): Acionamento {
  const vazio: Acionamento = {
    cursoPedal: pedal * CURSO_PEDAL,
    folgaLivre: 0,
    cursoCabo: 0,
    anguloAlavanca: 0,
    anguloGarfo: 0,
    cursoRolamento: 0,
    cargaPlato: 0,
    engate: 1,
    rolamentoEmCarga: false,
    desengateIncompleto: true,
    semAcionamento: true,
  }

  // Sem disco, plato ou volante nao existe acoplamento nenhum: o motor gira
  // solto e o cambio nunca recebe torque.
  if (!p.disco || !p.plato || !p.volante || !p.eixo) {
    return { ...vazio, engate: 0, desengateIncompleto: false, semAcionamento: true }
  }
  // Sem cabo, alavanca, garfo ou rolamento o pedal nao chega ao plato: as
  // molas mantem o disco preso ao volante o tempo todo.
  if (!p.cabo || !p.alavanca || !p.garfo || !p.rolamento) return vazio

  const cursoPedal = pedal * CURSO_PEDAL
  // Conduite amassado engole parte do curso e ainda deixa o pedal duro.
  const perdaConduite = p.conduiteRuim || !p.conduite ? 22 : 0
  const folga = Math.max(0, p.folga)
  const folgaLivre = Math.min(cursoPedal, folga)
  const cursoCabo = Math.max(0, cursoPedal - folga - perdaConduite)

  const liberacao = clamp01(cursoCabo / CURSO_DESENGATE)
  // Folga insuficiente: o rolamento ja nasce encostado e alivia as molas.
  const preCarga = folga < FOLGA_MINIMA ? ((FOLGA_MINIMA - folga) / FOLGA_MINIMA) * 0.22 : 0

  let engate = clamp01(1 - liberacao - preCarga)
  // Guarnicao no fim: o que sobra de capacidade fica ABAIXO do torque que o
  // motor entrega com o pedal aberto. So assim o sintoma aparece em qualquer
  // marcha, e nao apenas em rampa - a pista da oficina e plana.
  if (p.discoRuim) engate *= 0.22
  else if (p.discoDesgastado) engate *= 0.72

  const cursoUtilMaximo = Math.max(0, CURSO_PEDAL - folga - perdaConduite)

  return {
    cursoPedal,
    folgaLivre,
    cursoCabo,
    anguloAlavanca: cursoCabo * 0.145,
    anguloGarfo: cursoCabo * 0.13,
    cursoRolamento: liberacao * CURSO_ROLAMENTO,
    cargaPlato: liberacao,
    engate,
    rolamentoEmCarga: preCarga > 0,
    desengateIncompleto: cursoUtilMaximo < CURSO_DESENGATE * 0.99,
    semAcionamento: false,
  }
}

/** Monta a entrada do acionamento a partir do estado bruto do simulador. */
export function pecasEmbreagem(
  parts: Record<string, PartState>,
  conexoes: Record<string, boolean>,
): PecasEmbreagem {
  const inst = (id: string) => parts[id]?.status === 'INSTALLED'
  const cond = (id: string) => parts[id]?.condicao
  return {
    cabo: inst('cabo-embreagem') && !!conexoes['c-embr-alavanca'] && !!conexoes['c-embr-pedal'],
    conduite: inst('conduite-embreagem'),
    alavanca: inst('alavanca-embreagem'),
    garfo: inst('garfo-embreagem') && !!conexoes['c-garfo-rolamento'],
    rolamento: inst('rolamento-embreagem'),
    plato: inst('plato-embreagem'),
    disco: inst('disco-embreagem'),
    volante: inst('volante-motor'),
    eixo: inst('eixo-primario'),
    folga: parts['cabo-embreagem']?.ajuste ?? 15,
    discoRuim: cond('disco-embreagem') === 'ruim',
    discoDesgastado: cond('disco-embreagem') === 'desgastado',
    conduiteRuim: cond('conduite-embreagem') === 'ruim',
  }
}

/* ──────────────────────── 2. selecao de marchas ──────────────────────── */

/** Marcha correspondente a cada posicao do portao em H. */
export function marchaDoPortao(g: Portao): Marcha {
  if (g.y === 0) return 'N'
  if (g.x === -1 && g.y === 1) return g.baixo ? 'R' : '1'
  if (g.x === -1 && g.y === -1) return '2'
  if (g.x === 1 && g.y === 1) return '3'
  if (g.x === 1 && g.y === -1) return '4'
  return 'N'
}

export const PORTAO_DA_MARCHA: Record<Marcha, Portao> = {
  N: { x: 0, y: 0, baixo: false },
  '1': { x: -1, y: 1, baixo: false },
  '2': { x: -1, y: -1, baixo: false },
  '3': { x: 1, y: 1, baixo: false },
  '4': { x: 1, y: -1, baixo: false },
  R: { x: -1, y: 1, baixo: true },
}

export type ResultadoEngate =
  | { ok: true }
  | { ok: false; motivo: 'arranhou'; texto: string }
  | { ok: false; motivo: 'travado'; texto: string }

/**
 * O cambio do Fusca 1973 tem sincronizadores da 1a a 4a, mas nenhum na re.
 * Engatar com o disco ainda transmitindo torque arranha o sincronizador e
 * simplesmente nao entra na re.
 */
export function podeEngatar(
  destino: Marcha,
  dl: DriveState,
  acion: Acionamento,
  motorLigado: boolean,
  seletorOk: boolean,
  hasteOk: boolean,
): ResultadoEngate {
  if (destino === 'N') return { ok: true }
  if (!hasteOk)
    return { ok: false, motivo: 'travado', texto: 'A alavanca gira solta: a haste do cambio nao esta ligada.' }
  if (!seletorOk)
    return { ok: false, motivo: 'travado', texto: 'O mecanismo de selecao do cambio nao esta montado.' }

  const parado = Math.abs(dl.velocidade) < 0.4
  const discoLivre = acion.engate < ENGATE_LIVRE

  if (destino === 'R') {
    if (!parado)
      return { ok: false, motivo: 'travado', texto: 'A re so entra com o carro parado. Pare antes de tentar.' }
    if (!discoLivre && motorLigado)
      return {
        ok: false,
        motivo: 'arranhou',
        texto: 'CRRRAC. A re nao tem sincronizador: sem desacoplar o disco ela nunca vai entrar.',
      }
    return { ok: true }
  }

  if (!motorLigado) return { ok: true }

  if (!discoLivre) {
    return {
      ok: false,
      motivo: 'arranhou',
      texto: 'CRRRAC. O disco ainda esta transmitindo torque: o sincronizador nao consegue igualar as rotacoes.',
    }
  }

  // Marcha baixa demais para a velocidade: o sincronizador nao da conta.
  const rpmExigido = Math.abs(rpmPrimarioDe(dl.velocidade, destino))
  if (rpmExigido > 5200)
    return {
      ok: false,
      motivo: 'arranhou',
      texto:
        'CRRRAC. Nessa velocidade essa marcha exigiria ' +
        Math.round(rpmExigido) +
        ' rpm no primario. Marcha baixa demais.',
    }

  return { ok: true }
}

/* ────────────────────────── 3. dinamica ──────────────────────────────── */

function torqueBruto(rpm: number): number {
  if (rpm < 60) return 0
  const x = (rpm - RPM_TORQUE_PICO) / RPM_TORQUE_PICO
  return Math.max(0, TORQUE_MOTOR_PICO * (1 - 0.55 * x * x))
}

/** Atrito interno do motor: e o que faz a rotacao cair sozinha. */
const arrastoMotor = (rpm: number) => 5.5 + rpm * 0.0034

/**
 * Torque maximo que o circuito de marcha lenta do carburador consegue
 * entregar. E um furo calibrado: da para vencer o atrito interno do motor e
 * pouco mais que isso. Modelar essa limitacao e o que faz o motor apagar ao
 * largar o pedal da embreagem de uma vez - com um "governador" proporcional
 * no lugar dela, o motor se salvava sozinho de qualquer erro do aluno.
 */
const TORQUE_MARCHA_LENTA = 14

/** rad/s2 -> rpm/s */
const PARA_RPM = 60 / (2 * Math.PI)

export interface PassoDriveline {
  dl: DriveState
  rpm: number
  /** Motor apagou neste passo. */
  apagou: boolean
}

export function passoTransmissao(
  dl: DriveState,
  rpmAtual: number,
  ligado: boolean,
  acelerador: number,
  freio: number,
  marchaLenta: number,
  acion: Acionamento,
  v: VeiculoEstado,
  dt: number,
): PassoDriveline {
  let rpm = rpmAtual
  let velocidade = dl.velocidade
  let desgaste = dl.desgasteDisco
  let apagou = false

  const acel = clamp01(v.acelerador.ajuste === 'ausente' ? 0 : acelerador)
  // Auxilio da marcha lenta: forte com o motor caindo, nulo acima do ponto de
  // regulagem, e sempre limitado a TORQUE_MARCHA_LENTA.
  const ajudaLenta =
    ligado && rpm < marchaLenta + 200
      ? TORQUE_MARCHA_LENTA * clamp01((marchaLenta + 120 - rpm) / (marchaLenta * 0.6))
      : 0

  const torqueLiquido = ligado
    ? torqueBruto(rpm) * (0.06 + 0.94 * acel) - arrastoMotor(rpm) + ajudaLenta
    : -arrastoMotor(rpm) * 2.5

  // Resistencias do veiculo, em Newtons, sempre contra o movimento.
  const sinal = velocidade === 0 ? 0 : Math.sign(velocidade)
  const rolamento = 0.015 * MASSA * 9.81
  const aero = 0.52 * velocidade * velocidade
  const forcaFreio = freio * (v.freios.status === 'inoperante' ? 250 : v.freios.status === 'atencao' ? 3400 : 6200)
  const resistencia = (rolamento + aero + forcaFreio) * sinal

  const rel = relacaoTotal(dl.marcha)
  const capacidade = TORQUE_PLATO * acion.engate
  const emMarcha = dl.marcha !== 'N' && rel > 0 && capacidade > 0.5

  let acoplado = false
  let patinacao = 0

  if (!emMarcha) {
    // Motor solto: nada liga a arvore de manivelas as rodas.
    rpm += (torqueLiquido / INERCIA_MOTOR) * PARA_RPM * dt
    velocidade -= (resistencia / MASSA) * dt
    if (sinal !== 0 && Math.sign(velocidade) !== sinal) velocidade = 0
  } else {
    const sentido = sentidoDaMarcha(dl.marcha)
    const rpmPrimario = rpmPrimarioDe(velocidade, dl.marcha)
    const delta = rpm - rpmPrimario
    // Inercia do carro vista pelo virabrequim.
    const inerciaVeiculo = MASSA * Math.pow(RAIO_RODA / rel, 2)
    // Resistencia do veiculo vista pelo virabrequim.
    const resistRefletida = (resistencia * RAIO_RODA * sentido) / rel

    const inerciaTotal = INERCIA_MOTOR + inerciaVeiculo
    // Torque que a embreagem teria de passar para os dois lados girarem juntos.
    const torqueNecessario = (inerciaVeiculo * torqueLiquido + INERCIA_MOTOR * resistRefletida) / inerciaTotal

    if (Math.abs(delta) < 22 && Math.abs(torqueNecessario) <= capacidade) {
      // Travado: motor e transmissao formam um so corpo.
      acoplado = true
      const alfa = (torqueLiquido - resistRefletida) / inerciaTotal
      rpm += alfa * PARA_RPM * dt
      if (rpm < 0) rpm = 0
      velocidade = velocidadeDe(rpm, dl.marcha)
    } else {
      // Patinando: a embreagem passa exatamente a sua capacidade.
      const torque = Math.sign(delta || 1) * capacidade
      rpm += ((torqueLiquido - torque) / INERCIA_MOTOR) * PARA_RPM * dt
      const forcaRoda = (torque * rel * sentido) / RAIO_RODA
      velocidade += ((forcaRoda - resistencia) / MASSA) * dt
      patinacao = Math.abs(delta)
      // Energia dissipada no disco: e isso que queima uma embreagem.
      desgaste = Math.min(100, desgaste + (patinacao * capacidade * dt) / 90000)
    }
  }

  if (rpm < 0) rpm = 0
  if (Math.abs(velocidade) < 0.02 && freio > 0.1) velocidade = 0

  if (ligado && rpm < RPM_MORTE) {
    apagou = true
    rpm = 0
  }

  return {
    dl: {
      ...dl,
      velocidade,
      distancia: dl.distancia + velocidade * dt,
      rpmPrimario: emMarcha ? rpmPrimarioDe(velocidade, dl.marcha) : 0,
      patinacao,
      acoplado,
      acionamento: acion,
      desgasteDisco: desgaste,
      morreu: apagou ? true : dl.morreu,
    },
    rpm,
    apagou,
  }
}

/** Velocidade em km/h, para os instrumentos. */
export const kmh = (v: number) => Math.abs(v) * 3.6

export const DRIVE_INICIAL: DriveState = {
  marcha: 'N',
  portao: { x: 0, y: 0, baixo: false },
  velocidade: 0,
  distancia: 0,
  rpmPrimario: 0,
  patinacao: 0,
  acoplado: false,
  acionamento: {
    cursoPedal: 0,
    folgaLivre: 0,
    cursoCabo: 0,
    anguloAlavanca: 0,
    anguloGarfo: 0,
    cursoRolamento: 0,
    cargaPlato: 0,
    engate: 1,
    rolamentoEmCarga: false,
    desengateIncompleto: false,
    semAcionamento: false,
  },
  morreu: false,
  arranhoes: 0,
  desgasteDisco: 0,
  pista: false,
}
