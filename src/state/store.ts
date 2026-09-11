import { create } from 'zustand'
import { PARTES, PARTE_POR_ID } from '../data/parts'
import { PARAFUSOS, PARAFUSO_POR_ID } from '../data/bolts'
import { CONEXOES, CONEXAO_POR_ID } from '../data/connections'
import { FERRAMENTA_POR_ID } from '../data/tools'
import { PROCEDIMENTO_POR_ID } from '../data/procedures'
import { DESAFIO_POR_ID } from '../data/challenges'
import { derivarVeiculo, faixaDoAjuste, passoTermico, type Runtime } from '../sim/vehicle'
import {
  acionamento,
  DRIVE_INICIAL,
  marchaDoPortao,
  pecasEmbreagem,
  podeEngatar,
  PORTAO_DA_MARCHA,
  passoTransmissao,
} from '../sim/driveline'
import type {
  AcaoId,
  Acionamento,
  BoltDef,
  BoltState,
  DriveState,
  EventoTipo,
  Feedback,
  Marcha,
  Nivel,
  PartState,
  Portao,
  SimEvento,
  Sistema,
  Snapshot,
  ToolId,
  VeiculoEstado,
} from '../data/types'

export type Alvo = { tipo: 'peca' | 'parafuso' | 'conexao'; id: string }
export type CamMode = 'geral' | 'oficina' | 'cabine' | 'dianteiro' | 'foco' | 'dirigir' | 'cambio'
/** Filtro da visao mecanica. */
export type FiltroSistema = Sistema | 'todos'
export type AcaoParafuso = 'soltar' | 'remover' | 'instalar' | 'apertar'

export interface ProcRuntime {
  id: string
  inicio: number
  feitos: Record<string, boolean>
  erros: { ferramenta: number; ordem: number; ajuste: number }
  concluido: boolean
  nota: number
  estrelas: number
  duracao: number
  briefing?: string
}

/** Investigacao em curso no modo "diagnostico de sintomas". */
export interface DesafioRuntime {
  id: string
  inicio: number
  /** Verificacoes ja realizadas: id da pista -> descoberta. */
  pistas: Record<string, boolean>
  /** Hipoteses ja submetidas. */
  testadas: Record<string, boolean>
  /** Hipotese correta, depois de confirmada. */
  confirmada: string | null
  /** Defeito efetivamente corrigido no carro. */
  resolvido: boolean
  /** Hipoteses erradas testadas. */
  erros: number
  duracao: number
}

/** Animacao de ferramenta em curso (para a camada 3D). */
export interface AcaoVisual {
  alvo: string
  tipo: 'parafuso' | 'peca' | 'conexao'
  ferramenta: ToolId
  inicio: number
  duracao: number
  giro: 1 | -1
}

let contadorFb = 1

function estadoPartes(): Record<string, PartState> {
  const r: Record<string, PartState> = {}
  for (const p of PARTES) {
    r[p.id] = {
      status: 'INSTALLED',
      condicao: 'bom',
      ajuste: p.ajuste?.padrao ?? 0,
      aberto: false,
      inspecionado: false,
    }
  }
  return r
}

function estadoParafusos(): Record<string, BoltState> {
  const r: Record<string, BoltState> = {}
  for (const b of PARAFUSOS) r[b.id] = { status: 'LOCKED', torqueAplicado: b.torque ?? 0 }
  return r
}

function estadoConexoes(): Record<string, boolean> {
  const r: Record<string, boolean> = {}
  for (const c of CONEXOES) r[c.id] = true
  return r
}

const RT_INICIAL: Runtime = {
  ligado: false,
  rpm: 0,
  temperatura: 22,
  pedalAcelerador: 0,
  pedalEmbreagem: 0,
  pedalFreio: 0,
}

/** A ferramenta selecionada serve para este fixador? */
export function ferramentaServe(tool: ToolId, medidaSel: number, def: BoltDef): boolean {
  const t = FERRAMENTA_POR_ID[tool]
  if (!t) return false
  if (def.tipo === 'presilha') return t.tipos.includes('presilha')
  if (!t.tipos.includes(def.tipo)) return false
  if (def.medida == null) return true
  const medidas = t.selecionavel ? [medidaSel] : t.medidas
  return medidas.includes(def.medida)
}

export interface SimStore {
  parts: Record<string, PartState>
  bolts: Record<string, BoltState>
  conexoes: Record<string, boolean>
  veiculo: VeiculoEstado
  rt: Runtime
  /** Estado vivo da embreagem, do cambio e do movimento do veiculo. */
  drive: DriveState
  eventos: SimEvento[]
  feedbacks: Feedback[]

  ferramenta: ToolId
  medidaSoquete: number
  sel: Alvo | null
  hov: Alvo | null
  camMode: CamMode
  focoAlvo: string | null
  /** Sobe a cada pedido de enquadramento, mesmo repetindo o mesmo modo. */
  camNonce: number
  raioX: boolean
  /** Visao mecanica: carroceria e motor transparentes, internos a mostra. */
  visaoMecanica: boolean
  /** Sistema em destaque na visao mecanica. */
  filtro: FiltroSistema
  mostrarFixadores: boolean
  som: boolean
  /** Intensidade / Brilho da iluminação da cena (1.0 = padrão). */
  claridade: number
  acaoVisual: AcaoVisual | null
  painel: 'tarefas' | 'inspetor' | 'diagnostico' | 'cabine' | 'sintomas'

  proc: ProcRuntime | null
  desafio: DesafioRuntime | null

  setFerramenta: (t: ToolId) => void
  setMedida: (m: number) => void
  selecionar: (a: Alvo | null) => void
  apontar: (a: Alvo | null) => void
  setCam: (m: CamMode, alvo?: string | null) => void
  focar: (id: string) => void
  toggleRaioX: () => void
  toggleVisaoMecanica: () => void
  setFiltro: (f: FiltroSistema) => void
  toggleFixadores: () => void
  toggleSom: () => void
  setClaridade: (v: number) => void
  setPainel: (p: SimStore['painel']) => void

  acaoParafuso: (id: string, acao: AcaoParafuso) => void
  acaoPeca: (id: string, acao: AcaoId, opts?: { nova?: boolean }) => void
  setAjuste: (id: string, valor: number) => void
  alternarConexao: (id: string) => void

  darPartida: () => void
  desligarMotor: () => void
  pisarPedal: (qual: 'acelerador' | 'embreagem' | 'freio', v: number) => void
  tick: (dt: number) => void

  // ── embreagem, cambio e pista ────────────────────────────────────────
  /** Move a alavanca no portao em H. Passa obrigatoriamente pelo neutro. */
  moverAlavanca: (x: -1 | 0 | 1, y: -1 | 0 | 1) => void
  /** Pressiona a alavanca para baixo: e o que destrava a re no Fusca. */
  pressionarAlavanca: (v: boolean) => void
  /** Atalho: tenta ir direto para uma marcha. */
  engatarMarcha: (m: Marcha) => void
  entrarNaPista: () => void
  sairDaPista: () => void
  reposicionarNaPista: () => void

  iniciarProcedimento: (id: string) => void
  encerrarProcedimento: () => void
  iniciarDesafio: (id: string) => void
  encerrarDesafio: () => void
  testarHipotese: (id: string) => void
  resetar: () => void
  fb: (nivel: Nivel, texto: string) => void
}

interface Patch {
  parts?: Record<string, PartState>
  bolts?: Record<string, BoltState>
  conexoes?: Record<string, boolean>
  rt?: Runtime
  drive?: DriveState
  eventos?: SimEvento[]
  feedbacks?: Feedback[]
  acaoVisual?: AcaoVisual | null
}

/**
 * Acumuladores nao reativos do laco de simulacao. Ficam fora do store porque
 * mudam a 60 Hz e nao devem provocar re-render.
 */
const laco = { patinando: 0, avisouPatinacao: false, saiu: false }

function msg(nivel: Nivel, texto: string): Feedback {
  return { id: contadorFb++, nivel, texto, t: Date.now() }
}

export const useSim = create<SimStore>()((set, get) => {
  /** Aplica um patch, rederiva o veiculo e avalia o procedimento em curso. */
  function aplicar(patch: Patch) {
    const s = get()
    const parts = patch.parts ?? s.parts
    const bolts = patch.bolts ?? s.bolts
    const conexoes = patch.conexoes ?? s.conexoes
    const rt = patch.rt ?? s.rt
    const eventos = patch.eventos ?? s.eventos
    let feedbacks = patch.feedbacks ?? s.feedbacks
    const veiculo = derivarVeiculo(parts, bolts, conexoes, rt)
    // A cadeia de acionamento e sempre rederivada: qualquer peca removida,
    // conexao solta ou ajuste mexido muda o que o pedal consegue fazer.
    const drive: DriveState = {
      ...(patch.drive ?? s.drive),
      acionamento: acionamento(pecasEmbreagem(parts, conexoes), rt.pedalEmbreagem),
    }
    const snapshot: Snapshot = { parts, bolts, conexoes, veiculo, eventos, drive }

    let proc = s.proc
    if (proc && !proc.concluido) {
      const def = PROCEDIMENTO_POR_ID[proc.id]
      const snap: Snapshot = snapshot
      const feitos = { ...proc.feitos }
      let mudou = false
      for (const passo of def.passos) {
        if (!feitos[passo.id] && passo.check(snap)) {
          feitos[passo.id] = true
          mudou = true
          feedbacks = [...feedbacks, msg('ok', `Etapa concluida: ${passo.titulo}`)]
        }
      }
      if (mudou) {
        const completo = def.passos.every((p) => feitos[p.id])
        if (completo) {
          const duracao = (Date.now() - proc.inicio) / 1000
          const e = proc.erros
          const penalTempo = duracao > def.tempoAlvo ? Math.min(20, ((duracao - def.tempoAlvo) / def.tempoAlvo) * 20) : 0
          const nota = Math.max(
            0,
            Math.round(100 - e.ferramenta * 6 - e.ordem * 8 - e.ajuste * 5 - penalTempo),
          )
          proc = {
            ...proc,
            feitos,
            concluido: true,
            duracao,
            nota,
            estrelas: nota >= 90 ? 3 : nota >= 70 ? 2 : 1,
          }
          feedbacks = [...feedbacks, msg('ok', 'PROCEDIMENTO CONCLUIDO')]
        } else {
          proc = { ...proc, feitos }
        }
      }
    }

    // ── desafio de diagnostico ──────────────────────────────────────────
    let desafio = s.desafio
    if (desafio && !desafio.resolvido) {
      const def = DESAFIO_POR_ID[desafio.id]
      const pistas = { ...desafio.pistas }
      let mudou = false
      for (const pista of def.pistas) {
        if (!pistas[pista.id] && pista.check(snapshot)) {
          pistas[pista.id] = true
          mudou = true
          feedbacks = [...feedbacks, msg('info', `Achado registrado: ${pista.titulo}`)]
        }
      }
      const resolvido = !!desafio.confirmada && def.corrigido(snapshot)
      if (resolvido) {
        feedbacks = [...feedbacks, msg('ok', 'DEFEITO CORRIGIDO. O sintoma desapareceu.')]
        desafio = { ...desafio, pistas, resolvido: true, duracao: (Date.now() - desafio.inicio) / 1000 }
      } else if (mudou) {
        desafio = { ...desafio, pistas }
      }
    }

    set({
      parts,
      bolts,
      conexoes,
      rt,
      drive,
      eventos,
      feedbacks: feedbacks.slice(-40),
      veiculo,
      proc,
      desafio,
      ...(patch.acaoVisual !== undefined ? { acaoVisual: patch.acaoVisual } : {}),
    })
  }

  /** Estado atual da cadeia de acionamento, recalculado na hora. */
  function cadeia(pedal?: number): Acionamento {
    const s = get()
    return acionamento(pecasEmbreagem(s.parts, s.conexoes), pedal ?? s.rt.pedalEmbreagem)
  }

  /** O comando da alavanca chega mesmo ao mecanismo de selecao? */
  function comandoDoCambio() {
    const s = get()
    const inst = (id: string) => s.parts[id]?.status === 'INSTALLED'
    return {
      hasteOk: inst('alavanca-cambio') && inst('haste-cambio') && !!s.conexoes['c-alavanca-haste'],
      seletorOk: inst('seletor-marchas') && !!s.conexoes['c-haste-seletor'],
    }
  }

  /**
   * Tenta levar o cambio para `destino`. Quem decide se entra e o modelo em
   * sim/driveline.ts: aqui so se aplica o resultado e se conta o estrago.
   */
  function tentarEngate(destino: Marcha, portao: Portao) {
    const s = get()
    const acion = cadeia()
    const { hasteOk, seletorOk } = comandoDoCambio()
    const r = podeEngatar(destino, s.drive, acion, s.rt.ligado, seletorOk, hasteOk)

    if (r.ok) {
      const drive = { ...s.drive, marcha: destino, portao }
      aplicar({
        drive,
        eventos: evento('engatar', destino),
        feedbacks:
          destino === 'N'
            ? falar('info', 'Cambio em neutro.')
            : falar('ok', `Marcha ${destino === 'R' ? 're' : destino + 'a'} engatada.`),
      })
      return
    }

    const arranhou = r.motivo === 'arranhou'
    // Marcha que arranha nao entra: a alavanca volta para o corredor neutro.
    const drive: DriveState = {
      ...s.drive,
      marcha: 'N',
      portao: { ...portao, y: 0 },
      arranhoes: s.drive.arranhoes + (arranhou ? 1 : 0),
    }
    aplicar({
      drive,
      eventos: evento(arranhou ? 'arranhar' : 'erro', destino, arranhou ? 'sincronizador' : r.motivo),
      feedbacks: falar('erro', r.texto),
    })
  }

  function evento(tipo: EventoTipo, alvo: string, detalhe?: string, valor?: number): SimEvento[] {
    return [...get().eventos, { t: Date.now(), tipo, alvo, detalhe, valor }].slice(-400)
  }

  function erro(tipo: 'ferramenta' | 'ordem' | 'ajuste') {
    const p = get().proc
    if (p && !p.concluido) set({ proc: { ...p, erros: { ...p.erros, [tipo]: p.erros[tipo] + 1 } } })
  }

  function falar(nivel: Nivel, texto: string): Feedback[] {
    return [...get().feedbacks, msg(nivel, texto)]
  }

  const parts0 = estadoPartes()
  const bolts0 = estadoParafusos()
  const conexoes0 = estadoConexoes()

  return {
    parts: parts0,
    bolts: bolts0,
    conexoes: conexoes0,
    veiculo: derivarVeiculo(parts0, bolts0, conexoes0, RT_INICIAL),
    rt: RT_INICIAL,
    drive: {
      ...DRIVE_INICIAL,
      acionamento: acionamento(pecasEmbreagem(parts0, conexoes0), 0),
    },
    eventos: [],
    feedbacks: [msg('info', 'Oficina pronta. Escolha uma tarefa ou explore o carro livremente.')],

    ferramenta: 'mao',
    medidaSoquete: 13,
    sel: null,
    hov: null,
    camMode: 'geral',
    focoAlvo: null,
    camNonce: 0,
    raioX: false,
    visaoMecanica: false,
    filtro: 'todos',
    mostrarFixadores: true,
    som: false,
    claridade: 1.0,
    acaoVisual: null,
    painel: 'tarefas',
    proc: null,
    desafio: null,

    setFerramenta: (t) => set({ ferramenta: t }),
    setMedida: (m) => set({ medidaSoquete: m }),
    apontar: (a) => set({ hov: a }),
    setCam: (m, alvo = null) => set({ camMode: m, focoAlvo: alvo, camNonce: get().camNonce + 1 }),
    toggleRaioX: () => set((s) => ({ raioX: !s.raioX })),
    toggleVisaoMecanica: () =>
      set((s) => {
        const on = !s.visaoMecanica
        return { visaoMecanica: on, raioX: on ? true : s.raioX, filtro: on ? s.filtro : 'todos' }
      }),
    setFiltro: (f) => set({ filtro: f, visaoMecanica: true, raioX: true }),
    toggleFixadores: () => set((s) => ({ mostrarFixadores: !s.mostrarFixadores })),
    toggleSom: () => set((s) => ({ som: !s.som })),
    setClaridade: (v) => set({ claridade: v }),
    setPainel: (p) => set({ painel: p }),

    selecionar: (a) => {
      set({ sel: a, painel: a ? 'inspetor' : get().painel })
      if (a) aplicar({ eventos: evento('selecionar', a.id) })
    },

    focar: (id) => set({ camMode: 'foco', focoAlvo: id, camNonce: get().camNonce + 1 }),

    // ── Parafusos ─────────────────────────────────────────────────────────
    acaoParafuso: (id, acao) => {
      const s = get()
      const def = PARAFUSO_POR_ID[id]
      const est = s.bolts[id]
      if (!def || !est) return
      const parte = PARTE_POR_ID[def.parte]

      if (!ferramentaServe(s.ferramenta, s.medidaSoquete, def)) {
        const exig =
          def.tipo === 'presilha'
            ? 'a mao ou um alicate'
            : def.medida
              ? `uma chave de ${def.medida} mm`
              : def.tipo === 'phillips'
                ? 'uma chave Phillips'
                : 'uma chave de fenda'
        erro('ferramenta')
        aplicar({
          eventos: evento('ferramenta-errada', id, s.ferramenta),
          feedbacks: falar('erro', `Essa ferramenta nao e adequada para ${def.label}. Use ${exig}.`),
        })
        return
      }

      const st = est.status
      let novo: BoltState['status'] | null = null
      let texto = ''
      let nivel: Nivel = 'ok'

      if (acao === 'soltar') {
        if (st === 'LOCKED' || st === 'TIGHTENED' || st === 'INSTALLED') {
          novo = 'LOOSENED'
          texto = `${def.label}: solto.`
        } else nivel = 'aviso'
      } else if (acao === 'remover') {
        if (st === 'LOOSENED' || (def.tipo === 'presilha' && st === 'LOCKED')) {
          novo = 'REMOVED'
          texto = `${def.label}: retirado.`
        } else if (st === 'LOCKED' || st === 'TIGHTENED') {
          erro('ordem')
          aplicar({
            eventos: evento('ordem-errada', id, 'remover-sem-soltar'),
            feedbacks: falar('erro', `${def.label} ainda esta apertado. Solte antes de remover.`),
          })
          return
        }
      } else if (acao === 'instalar') {
        if (st === 'REMOVED') {
          if (parte && s.parts[def.parte]?.status !== 'INSTALLED') {
            erro('ordem')
            aplicar({
              feedbacks: falar('erro', `Instale antes a peca: ${parte.nome}.`),
              eventos: evento('ordem-errada', id, 'parafuso-sem-peca'),
            })
            return
          }
          novo = 'INSTALLED'
          texto = `${def.label}: colocado no lugar. Falta apertar.`
          nivel = 'aviso'
        }
      } else if (acao === 'apertar') {
        if (st === 'INSTALLED' || st === 'LOOSENED' || st === 'LOCKED') {
          novo = 'TIGHTENED'
          texto = def.torque
            ? `${def.label}: apertado com ${def.torque} Nm.`
            : `${def.label}: apertado.`
        }
      }

      if (!novo) {
        aplicar({ feedbacks: falar(nivel === 'ok' ? 'aviso' : nivel, `${def.label}: acao indisponivel neste estado.`) })
        return
      }

      aplicar({
        bolts: { ...s.bolts, [id]: { ...est, status: novo, torqueAplicado: novo === 'TIGHTENED' ? def.torque ?? 0 : 0 } },
        eventos: evento('parafuso', id, acao),
        feedbacks: falar(nivel, texto),
        acaoVisual: {
          alvo: id,
          tipo: 'parafuso',
          ferramenta: s.ferramenta,
          inicio: performance.now(),
          duracao: 1400,
          giro: acao === 'soltar' || acao === 'remover' ? -1 : 1,
        },
      })
      // A animacao da chave e pequena e dura pouco: sem levar a camera ate o
      // fixador ela acontece fora do enquadramento e o jogador nao ve nada.
      set({ camMode: 'foco', focoAlvo: id, camNonce: get().camNonce + 1 })
    },

    // ── Pecas ─────────────────────────────────────────────────────────────
    acaoPeca: (id, acao, opts) => {
      const s = get()
      const def = PARTE_POR_ID[id]
      const est = s.parts[id]
      if (!def || !est) return

      if (acao === 'inspecionar') {
        const cond =
          est.condicao === 'novo'
            ? 'peca nova, sem uso'
            : est.condicao === 'bom'
              ? 'em bom estado'
              : est.condicao === 'desgastado'
                ? 'desgastada, proxima do fim da vida util'
                : 'RUIM: precisa ser substituida'
        aplicar({
          parts: { ...s.parts, [id]: { ...est, inspecionado: true } },
          eventos: evento('inspecionar', id, est.condicao),
          feedbacks: falar(
            est.condicao === 'ruim' ? 'erro' : est.condicao === 'desgastado' ? 'aviso' : 'ok',
            `${def.nome}: ${cond}.`,
          ),
        })
        return
      }

      if (acao === 'abrir' || acao === 'fechar') {
        const abrir = acao === 'abrir'
        aplicar({
          parts: { ...s.parts, [id]: { ...est, aberto: abrir } },
          eventos: evento(abrir ? 'abrir' : 'fechar', id),
          feedbacks: falar('info', `${def.nome} ${abrir ? 'aberta' : 'fechada'}.`),
        })
        if (abrir && id === 'tampa-motor') set({ camMode: 'oficina' })
        if (abrir && id === 'capo-dianteiro') set({ camMode: 'dianteiro' })
        return
      }

      if (acao === 'limpar') {
        const novaCond = est.condicao === 'ruim' ? 'desgastado' : 'bom'
        aplicar({
          parts: { ...s.parts, [id]: { ...est, condicao: novaCond } },
          eventos: evento('limpar', id),
          feedbacks: falar(
            'ok',
            est.condicao === 'ruim'
              ? `${def.nome} limpa, mas o desgaste continua: o ideal e substituir.`
              : `${def.nome} limpa.`,
          ),
        })
        return
      }

      if (acao === 'testar') {
        testarPeca(id)
        return
      }

      // Remover / instalar exigem ferramenta compativel
      if (acao === 'remover' || acao === 'instalar') {
        if (def.ferramentas.length && !def.ferramentas.includes(s.ferramenta)) {
          const nomes = def.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(' ou ')
          erro('ferramenta')
          aplicar({
            eventos: evento('ferramenta-errada', id, s.ferramenta),
            feedbacks: falar('erro', `Ferramenta inadequada para ${def.nome}. Use: ${nomes}.`),
          })
          return
        }
        if (def.medida && FERRAMENTA_POR_ID[s.ferramenta]?.selecionavel && s.medidaSoquete !== def.medida) {
          erro('ferramenta')
          aplicar({
            eventos: evento('ferramenta-errada', id, `${s.medidaSoquete}mm`),
            feedbacks: falar('erro', `Medida errada: ${def.nome} pede soquete de ${def.medida} mm.`),
          })
          return
        }
      }

      if (acao === 'remover') {
        if (!def.removivel) {
          aplicar({ feedbacks: falar('aviso', `${def.nome} nao e removivel nesta versao do simulador.`) })
          return
        }
        const bloqueios = motivosBloqueio(s, id)
        if (bloqueios.length) {
          erro('ordem')
          aplicar({
            eventos: evento('ordem-errada', id, bloqueios[0]),
            feedbacks: falar('erro', `Nao da para remover ${def.nome} ainda: ${bloqueios.join(' | ')}`),
          })
          return
        }
        aplicar({
          parts: { ...s.parts, [id]: { ...est, status: 'REMOVED' } },
          eventos: evento('remover', id),
          feedbacks: falar('ok', `${def.nome} removida. Foi para a bancada.`),
          acaoVisual: { alvo: id, tipo: 'peca', ferramenta: s.ferramenta, inicio: performance.now(), duracao: 800, giro: -1 },
        })
        return
      }

      if (acao === 'instalar') {
        if (est.status === 'INSTALLED') {
          aplicar({ feedbacks: falar('aviso', `${def.nome} ja esta instalada.`) })
          return
        }
        const bloqueios = motivosBloqueio(s, id, true)
        if (bloqueios.length) {
          erro('ordem')
          aplicar({
            eventos: evento('ordem-errada', id, bloqueios[0]),
            feedbacks: falar('erro', `Ordem de montagem incorreta: ${bloqueios.join(' | ')}`),
          })
          return
        }
        const usarNova = !!opts?.nova && !!def.consumivel
        const condicao = usarNova ? 'novo' : est.condicao
        const feedback: Feedback[] =
          !usarNova && (est.condicao === 'ruim' || est.condicao === 'desgastado')
            ? falar('aviso', `${def.nome} instalada, mas a peca esta ${est.condicao}. Considere substituir.`)
            : falar('ok', `${def.nome} instalada e encaixada corretamente.`)
        aplicar({
          parts: { ...s.parts, [id]: { ...est, status: 'INSTALLED', condicao } },
          eventos: evento('instalar', id, condicao),
          feedbacks: feedback,
          acaoVisual: { alvo: id, tipo: 'peca', ferramenta: s.ferramenta, inicio: performance.now(), duracao: 800, giro: 1 },
        })
        return
      }

      if (acao === 'ajustar') {
        aplicar({ feedbacks: falar('info', `Use o controle de ajuste no painel lateral para ${def.nome}.`) })
      }
    },

    setAjuste: (id, valor) => {
      const s = get()
      const def = PARTE_POR_ID[id]
      const est = s.parts[id]
      if (!def?.ajuste || !est) return
      if (!def.ajuste.ferramentas.includes(s.ferramenta)) {
        const nomes = def.ajuste.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(' ou ')
        erro('ferramenta')
        aplicar({
          eventos: evento('ferramenta-errada', id, s.ferramenta),
          feedbacks: falar('erro', `Para mexer em "${def.ajuste.label}" use: ${nomes}.`),
        })
        return
      }
      if (est.status !== 'INSTALLED') {
        aplicar({ feedbacks: falar('erro', `${def.nome} nao esta instalada: nao ha o que ajustar.`) })
        return
      }
      const v = Math.min(def.ajuste.max, Math.max(def.ajuste.min, valor))
      aplicar({
        parts: { ...s.parts, [id]: { ...est, ajuste: v } },
        eventos: evento('ajustar', id, undefined, v),
      })
    },

    alternarConexao: (id) => {
      const s = get()
      const def = CONEXAO_POR_ID[id]
      if (!def) return
      const conectada = s.conexoes[id]
      if (!def.ferramentas.includes(s.ferramenta)) {
        const nomes = def.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(' ou ')
        erro('ferramenta')
        aplicar({
          eventos: evento('ferramenta-errada', id, s.ferramenta),
          feedbacks: falar('erro', `Para mexer em "${def.label}" use: ${nomes}.`),
        })
        return
      }
      if (!conectada) {
        const faltando = [def.a, def.b].filter((p) => s.parts[p]?.status !== 'INSTALLED')
        if (faltando.length) {
          erro('ordem')
          aplicar({
            eventos: evento('ordem-errada', id, 'peca-ausente'),
            feedbacks: falar(
              'erro',
              `Nao da para conectar: ${faltando.map((f) => PARTE_POR_ID[f].nome).join(' e ')} nao esta instalada.`,
            ),
          })
          return
        }
      }
      aplicar({
        conexoes: { ...s.conexoes, [id]: !conectada },
        eventos: evento(conectada ? 'desconexao' : 'conexao', id),
        feedbacks: falar(conectada ? 'aviso' : 'ok', `${def.label}: ${conectada ? 'desconectada' : 'conectada'}.`),
        acaoVisual: { alvo: id, tipo: 'conexao', ferramenta: s.ferramenta, inicio: performance.now(), duracao: 600, giro: conectada ? -1 : 1 },
      })
    },

    // ── Motor ─────────────────────────────────────────────────────────────
    darPartida: () => {
      const s = get()
      if (s.rt.ligado) {
        aplicar({ feedbacks: falar('aviso', 'O motor ja esta funcionando.') })
        return
      }
      if (!s.veiculo.podeLigar) {
        aplicar({
          eventos: evento('partida', 'motor-boxer', 'falhou'),
          feedbacks: falar('erro', `O motor nao pega. ${s.veiculo.falhas[0]}`),
        })
        return
      }
      const rt = { ...s.rt, ligado: true, rpm: 400 }
      aplicar({
        rt,
        eventos: evento('partida', 'motor-boxer', 'ok'),
        feedbacks: falar('ok', 'Motor funcionando. O boxer pegou.'),
      })
    },

    desligarMotor: () => {
      const s = get()
      aplicar({ rt: { ...s.rt, ligado: false, rpm: 0 }, feedbacks: falar('info', 'Motor desligado.') })
    },

    pisarPedal: (qual, v) => {
      const s = get()
      const campo = qual === 'acelerador' ? 'pedalAcelerador' : qual === 'embreagem' ? 'pedalEmbreagem' : 'pedalFreio'
      const rt = { ...s.rt, [campo]: v }
      if (qual !== 'embreagem') {
        set({ rt })
        return
      }
      // Afundar o pedal ate o batente e uma verificacao de diagnostico:
      // vira evento para que as pistas dos desafios possam reagir a ele.
      const chegouAoFundo = v > 0.95 && s.rt.pedalEmbreagem <= 0.95
      if (chegouAoFundo) {
        aplicar({ rt, eventos: evento('dirigir', 'pedal-embreagem', 'fundo') })
        return
      }
      set({ rt, drive: { ...s.drive, acionamento: cadeia(v) } })
    },

    tick: (dt) => {
      const s = get()
      const parado =
        !s.rt.ligado && s.rt.temperatura <= 23 && s.rt.rpm === 0 && Math.abs(s.drive.velocidade) < 0.01
      if (parado) return

      const acion = cadeia()
      const passo = passoTransmissao(
        s.drive,
        s.rt.rpm,
        s.rt.ligado,
        s.rt.pedalAcelerador,
        s.rt.pedalFreio,
        s.parts['carburador']?.ajuste ?? 875,
        acion,
        s.veiculo,
        dt,
      )
      const temperatura = passoTermico(s.rt, s.parts, dt)
      const rt: Runtime = { ...s.rt, rpm: passo.rpm, temperatura }

      if (rt.ligado && temperatura > 130) {
        aplicar({
          rt: { ...rt, ligado: false, rpm: 0 },
          drive: { ...passo.dl, marcha: passo.dl.marcha },
          feedbacks: falar('erro', 'SUPERAQUECIMENTO: o motor travou. Sem ventilacao um boxer a ar nao dura minutos.'),
        })
        return
      }

      if (passo.apagou) {
        laco.patinando = 0
        laco.avisouPatinacao = false
        aplicar({
          rt: { ...rt, ligado: false, rpm: 0 },
          drive: passo.dl,
          eventos: evento('morrer', 'motor-boxer', s.drive.marcha),
          // O motivo nao e dito: descobrir o que aconteceu e o exercicio.
          feedbacks: [
            ...get().feedbacks,
            msg('erro', 'Motor apagou.'),
            msg('aviso', 'Investigue o que aconteceu.'),
          ],
        })
        return
      }

      // Patinacao prolongada sob aceleracao: e assim que se queima um disco.
      const patinandoAgora = passo.dl.patinacao > 220 && s.rt.pedalAcelerador > 0.25 && s.drive.marcha !== 'N'
      laco.patinando = patinandoAgora ? laco.patinando + dt : 0
      if (laco.patinando > 1.2 && !laco.avisouPatinacao) {
        laco.avisouPatinacao = true
        aplicar({
          rt,
          drive: passo.dl,
          eventos: evento('dirigir', 'disco-embreagem', 'patinando'),
          feedbacks: falar('aviso', 'A rotacao do motor sobe sem o carro acompanhar: o disco esta deslizando.'),
        })
        return
      }

      // Primeira arrancada bem-sucedida da sessao.
      if (!laco.saiu && Math.abs(passo.dl.velocidade) > 1.2) {
        laco.saiu = true
        aplicar({
          rt,
          drive: passo.dl,
          eventos: evento('dirigir', 'veiculo', 'saiu'),
          feedbacks: falar('ok', 'Saiu do lugar sem afogar o motor.'),
        })
        return
      }

      const veiculo = derivarVeiculo(s.parts, s.bolts, s.conexoes, rt)
      set({ rt, veiculo, drive: passo.dl })
    },

    // ── embreagem, cambio e pista ────────────────────────────────────────
    moverAlavanca: (x, y) => {
      const s = get()
      const g = s.drive.portao
      // Sair da marcha e sempre possivel: a alavanca volta para o corredor
      // central. O que o portao em H proibe e atravessar de um trilho para o
      // outro COM marcha engatada - dai a passagem obrigatoria pelo neutro.
      if (y !== 0 && x !== g.x && g.y !== 0) {
        aplicar({
          feedbacks: falar('aviso', 'Volte ao neutro antes de trocar de corredor: o portao em H nao permite atalho.'),
        })
        return
      }
      const portao: Portao = { x, y, baixo: g.baixo }
      tentarEngate(marchaDoPortao(portao), portao)
    },

    pressionarAlavanca: (v) => {
      const s = get()
      if (s.drive.marcha !== 'N') {
        aplicar({ feedbacks: falar('aviso', 'Volte ao neutro antes de pressionar a alavanca para buscar a re.') })
        return
      }
      set({ drive: { ...s.drive, portao: { ...s.drive.portao, baixo: v } } })
    },

    engatarMarcha: (m) => {
      const s = get()
      const destino = PORTAO_DA_MARCHA[m]
      // Trocar de corredor com marcha engatada exige a passagem pelo neutro.
      if (m !== 'N' && s.drive.marcha !== 'N' && destino.x !== s.drive.portao.x) {
        tentarEngate('N', { x: s.drive.portao.x, y: 0, baixo: false })
      }
      tentarEngate(m, destino)
    },

    entrarNaPista: () => {
      const s = get()
      laco.saiu = false
      laco.patinando = 0
      laco.avisouPatinacao = false
      set({
        camMode: 'dirigir',
        painel: 'cabine',
        drive: { ...s.drive, pista: true, distancia: 0, velocidade: 0, morreu: false },
      })
      aplicar({
        feedbacks: falar(
          'info',
          'Pista de oficina. Sequencia: dar partida, pisar a embreagem, engatar a primeira, acelerar e soltar a embreagem devagar.',
        ),
      })
    },

    sairDaPista: () => {
      const s = get()
      set({
        camMode: 'geral',
        painel: 'tarefas',
        rt: { ...s.rt, pedalAcelerador: 0, pedalEmbreagem: 0, pedalFreio: 0 },
        drive: { ...s.drive, pista: false, marcha: 'N', portao: { x: 0, y: 0, baixo: false }, velocidade: 0 },
      })
    },

    reposicionarNaPista: () => {
      const s = get()
      laco.saiu = false
      laco.patinando = 0
      laco.avisouPatinacao = false
      set({
        rt: { ...s.rt, pedalAcelerador: 0, pedalEmbreagem: 0, pedalFreio: 0, rpm: 0, ligado: false },
        drive: {
          ...s.drive,
          velocidade: 0,
          distancia: 0,
          marcha: 'N',
          portao: { x: 0, y: 0, baixo: false },
          morreu: false,
        },
      })
      aplicar({ feedbacks: falar('info', 'Carro reposicionado no inicio da pista.') })
    },

    // ── Procedimentos ─────────────────────────────────────────────────────
    iniciarProcedimento: (id) => {
      const def = PROCEDIMENTO_POR_ID[id]
      if (!def) return
      const parts = estadoPartes()
      const bolts = estadoParafusos()
      const conexoes = estadoConexoes()
      const setup = def.variantes?.length
        ? def.variantes[Math.floor(Math.random() * def.variantes.length)]
        : def.setup
      if (setup) {
        for (const [pid, patch] of Object.entries(setup.parts ?? {})) parts[pid] = { ...parts[pid], ...patch }
        for (const [bid, patch] of Object.entries(setup.bolts ?? {})) bolts[bid] = { ...bolts[bid], ...patch }
        for (const [cid, v] of Object.entries(setup.conexoes ?? {})) conexoes[cid] = v
      }
      const rt = { ...RT_INICIAL }
      laco.saiu = false
      laco.patinando = 0
      laco.avisouPatinacao = false
      set({
        parts,
        bolts,
        conexoes,
        rt,
        drive: { ...DRIVE_INICIAL, acionamento: acionamento(pecasEmbreagem(parts, conexoes), 0) },
        eventos: [],
        veiculo: derivarVeiculo(parts, bolts, conexoes, rt),
        sel: null,
        desafio: null,
        camMode: 'geral',
        painel: 'tarefas',
        feedbacks: [
          msg('info', `Tarefa iniciada: ${def.titulo}`),
          ...(setup?.mensagem ? [msg('aviso', setup.mensagem)] : []),
        ],
        proc: {
          id,
          inicio: Date.now(),
          feitos: {},
          erros: { ferramenta: 0, ordem: 0, ajuste: 0 },
          concluido: false,
          nota: 0,
          estrelas: 0,
          duracao: 0,
          briefing: setup?.mensagem,
        },
      })
    },

    encerrarProcedimento: () => set({ proc: null }),

    // ── diagnostico por sintomas ────────────────────────────────────────
    iniciarDesafio: (id) => {
      const def = DESAFIO_POR_ID[id]
      if (!def) return
      const parts = estadoPartes()
      const bolts = estadoParafusos()
      const conexoes = estadoConexoes()
      for (const [pid, patch] of Object.entries(def.setup.parts ?? {})) parts[pid] = { ...parts[pid], ...patch }
      for (const [bid, patch] of Object.entries(def.setup.bolts ?? {})) bolts[bid] = { ...bolts[bid], ...patch }
      for (const [cid, v] of Object.entries(def.setup.conexoes ?? {})) conexoes[cid] = v
      const rt = { ...RT_INICIAL }
      laco.saiu = false
      laco.patinando = 0
      laco.avisouPatinacao = false
      set({
        parts,
        bolts,
        conexoes,
        rt,
        drive: { ...DRIVE_INICIAL, acionamento: acionamento(pecasEmbreagem(parts, conexoes), 0) },
        eventos: [],
        veiculo: derivarVeiculo(parts, bolts, conexoes, rt),
        sel: null,
        proc: null,
        camMode: 'geral',
        painel: 'sintomas',
        feedbacks: [msg('aviso', `SINTOMA: ${def.sintoma}`), msg('info', 'Investigue. O simulador nao vai dizer a causa.')],
        desafio: {
          id,
          inicio: Date.now(),
          pistas: {},
          testadas: {},
          confirmada: null,
          resolvido: false,
          erros: 0,
          duracao: 0,
        },
      })
    },

    encerrarDesafio: () => set({ desafio: null }),

    testarHipotese: (id) => {
      const s = get()
      if (!s.desafio || s.desafio.resolvido) return
      const def = DESAFIO_POR_ID[s.desafio.id]
      const h = def.hipoteses.find((x) => x.id === id)
      if (!h) return
      const desafio: DesafioRuntime = {
        ...s.desafio,
        testadas: { ...s.desafio.testadas, [id]: true },
        confirmada: h.correta ? id : s.desafio.confirmada,
        erros: s.desafio.erros + (h.correta ? 0 : 1),
      }
      set({ desafio })
      aplicar({
        eventos: evento('hipotese', s.desafio.id, id),
        feedbacks: falar(h.correta ? 'ok' : 'erro', h.resposta),
      })
    },

    resetar: () => {
      const parts = estadoPartes()
      const bolts = estadoParafusos()
      const conexoes = estadoConexoes()
      const rt = { ...RT_INICIAL }
      laco.saiu = false
      laco.patinando = 0
      laco.avisouPatinacao = false
      set({
        parts,
        bolts,
        conexoes,
        rt,
        drive: { ...DRIVE_INICIAL, acionamento: acionamento(pecasEmbreagem(parts, conexoes), 0) },
        eventos: [],
        veiculo: derivarVeiculo(parts, bolts, conexoes, rt),
        proc: null,
        desafio: null,
        sel: null,
        feedbacks: [msg('info', 'Veiculo restaurado ao estado de fabrica.')],
      })
    },

    fb: (nivel, texto) => set((s) => ({ feedbacks: [...s.feedbacks, msg(nivel, texto)].slice(-40) })),
  }

  // ── Testes de componente ────────────────────────────────────────────────
  function testarPeca(id: string) {
    const s = get()
    const def = PARTE_POR_ID[id]
    const est = s.parts[id]
    if (!def || !est) return
    let nivel: Nivel = 'ok'
    let texto = ''
    let detalhe = 'ok'

    const faixa = def.ajuste ? faixaDoAjuste(id, est.ajuste) : 'ok'

    switch (id) {
      case 'cabo-embreagem':
      case 'pedal-embreagem': {
        const v = s.veiculo.embreagem
        if (v.ajuste === 'ausente') {
          nivel = 'erro'
          detalhe = 'ausente'
          texto = 'Pedal da embreagem sem resistencia: o cabo esta desconectado ou ausente.'
        } else if (v.ajuste === 'alta') {
          nivel = 'erro'
          detalhe = 'alta'
          texto = `Folga livre de ${v.folga.toFixed(0)} mm: EMBREAGEM ALTA. Engata no inicio do curso e o rolamento trabalha o tempo todo. Aumente a folga.`
        } else if (v.ajuste === 'baixa') {
          nivel = 'erro'
          detalhe = 'baixa'
          texto = `Folga livre de ${v.folga.toFixed(0)} mm: EMBREAGEM BAIXA. So desengata perto do assoalho e as marchas arranham. Reduza a folga.`
        } else {
          texto = `Folga livre de ${v.folga.toFixed(0)} mm: dentro da faixa de 10 a 20 mm. Acionamento correto.`
        }
        break
      }
      case 'cabo-acelerador':
      case 'pedal-acelerador': {
        const a = s.veiculo.acelerador
        if (a.ajuste === 'ausente') {
          nivel = 'erro'
          detalhe = 'ausente'
          texto = 'O pedal nao move a borboleta: cabo ausente ou desconectado.'
        } else if (a.ajuste === 'tensionado') {
          nivel = 'erro'
          detalhe = 'tensionado'
          texto = 'O cabo esta excessivamente tensionado: a borboleta nao fecha e a marcha lenta fica alta.'
        } else if (a.ajuste === 'folgado') {
          nivel = 'erro'
          detalhe = 'folgado'
          texto = 'Folga excessiva: o pedal chega ao fim do curso sem abrir a borboleta por completo.'
        } else {
          texto = `Folga de ${s.parts['cabo-acelerador'].ajuste.toFixed(1)} mm: curso total do pedal abre a borboleta por inteiro.`
        }
        break
      }
      case 'pedal-freio': {
        const f = s.veiculo.freios
        if (f.status === 'inoperante') {
          nivel = 'erro'
          detalhe = 'inoperante'
          texto = 'Pedal vai ao assoalho: nivel de fluido critico.'
        } else if (faixa !== 'ok' || f.status === 'atencao') {
          nivel = 'aviso'
          detalhe = 'atencao'
          texto = `Pedal com ${est.ajuste} mm de folga livre e regulagem traseira fora do ponto. Curso longo demais.`
        } else {
          texto = `Pedal alto e firme, com ${est.ajuste} mm de folga livre. Freio operacional.`
        }
        break
      }
      case 'bobina': {
        if (est.status !== 'INSTALLED') {
          nivel = 'erro'
          detalhe = 'ausente'
          texto = 'Bobina fora do veiculo.'
        } else {
          texto = 'Teste de bancada: primario 3,2 ohms, secundario 9,4 kohms. Bobina dentro da especificacao.'
        }
        break
      }
      case 'gerador': {
        if (!s.veiculo.eletrica.carga) {
          nivel = 'aviso'
          detalhe = 'sem-carga'
          texto = 'Gerador nao esta carregando: verifique correia e ligacao dos terminais.'
        } else {
          texto = 'Gerador entregando 13,8 V a 2000 rpm. Carga normal.'
        }
        break
      }
      case 'bateria': {
        texto = s.veiculo.eletrica.bateria
          ? 'Bateria com 12,4 V em repouso e terminais firmes.'
          : 'Sem leitura: terminal solto ou bateria removida.'
        if (!s.veiculo.eletrica.bateria) {
          nivel = 'erro'
          detalhe = 'ruim'
        }
        break
      }
      case 'modulo-ignicao': {
        if (est.status !== 'INSTALLED' || !s.conexoes['c-modulo-bobina']) {
          nivel = 'erro'
          detalhe = 'ausente'
          texto = 'Modulo sem alimentacao ou desconectado: nao chaveia a bobina.'
        } else {
          texto = 'Modulo respondendo ao sinal do distribuidor. Centelha presente no cabo central.'
        }
        break
      }
      case 'cabos-vela': {
        if (est.status !== 'INSTALLED') {
          nivel = 'erro'
          detalhe = 'ausente'
          texto = 'Cabos fora do veiculo.'
        } else if (est.condicao === 'desgastado' || est.condicao === 'ruim') {
          nivel = 'aviso'
          detalhe = 'desgastado'
          texto = 'Resistencia acima de 25 kohms e fuga visivel no escuro. Cabos pedem substituicao.'
        } else {
          texto = 'Cabos com resistencia normal, ordem 1-4-3-2 conferida.'
        }
        break
      }
      case 'motor-boxer': {
        const v = s.veiculo
        if (!v.podeLigar) {
          nivel = 'erro'
          detalhe = 'falha'
          texto = `Motor incompleto: ${v.falhas.length} impedimento(s). Veja o diagnostico.`
        } else {
          texto = `Motor apto a funcionar. ${v.avisos.length} observacao(oes) registrada(s).`
          if (v.avisos.length) nivel = 'aviso'
        }
        break
      }
      default: {
        texto = `${def.nome}: ${est.status === 'INSTALLED' ? 'instalada' : 'fora do veiculo'}, condicao ${est.condicao}.`
      }
    }

    if (nivel === 'erro') erro('ajuste')
    aplicar({ eventos: evento('testar', id, detalhe), feedbacks: falar(nivel, texto) })
  }

  /** Por que esta peca ainda nao pode sair (ou entrar)? */
  function motivosBloqueio(s: SimStore, id: string, montando = false): string[] {
    const def = PARTE_POR_ID[id]
    const out: string[] = []
    // Pecas por cima precisam estar fora nos dois sentidos
    for (const r of def.requer) {
      if (s.parts[r]?.status === 'INSTALLED') out.push(`remova antes ${PARTE_POR_ID[r].nome}`)
    }
    if (!montando) {
      const presos = def.parafusos.filter((b) => s.bolts[b]?.status !== 'REMOVED')
      if (presos.length)
        out.push(
          `${presos.length} fixador(es) ainda no lugar (${presos.map((b) => PARAFUSO_POR_ID[b].label).join(', ')})`,
        )
      const ligadas = def.conexoes.filter((c) => s.conexoes[c])
      if (ligadas.length)
        out.push(`desconecte antes: ${ligadas.map((c) => CONEXAO_POR_ID[c].label).join(', ')}`)
    }
    return out
  }
})

/** Lista de motivos que impedem a remocao, para exibicao no inspetor. */
export function bloqueiosDeRemocao(s: SimStore, id: string): string[] {
  const def = PARTE_POR_ID[id]
  if (!def) return []
  const out: string[] = []
  for (const r of def.requer) if (s.parts[r]?.status === 'INSTALLED') out.push(`Remover ${PARTE_POR_ID[r].nome}`)
  for (const b of def.parafusos) if (s.bolts[b]?.status !== 'REMOVED') out.push(`Retirar ${PARAFUSO_POR_ID[b].label}`)
  for (const c of def.conexoes) if (s.conexoes[c]) out.push(`Desconectar ${CONEXAO_POR_ID[c].label}`)
  return out
}

// Acesso ao estado pelo console do navegador durante o desenvolvimento.
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sim = useSim
