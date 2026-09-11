import { PARTE_POR_ID } from '../data/parts'
import type { BoltState, PartState, VeiculoEstado } from '../data/types'

export interface Runtime {
  ligado: boolean
  rpm: number
  temperatura: number
  pedalAcelerador: number
  pedalEmbreagem: number
  pedalFreio: number
}

const num = (v: number | undefined, d: number) => (v === undefined ? d : v)

/** Um fixador esta cumprindo sua funcao? */
export function firme(b: BoltState | undefined): boolean {
  return !!b && (b.status === 'LOCKED' || b.status === 'TIGHTENED')
}

export function faixaDoAjuste(parteId: string, valor: number): 'baixo' | 'ok' | 'alto' {
  const aj = PARTE_POR_ID[parteId]?.ajuste
  if (!aj) return 'ok'
  if (valor < aj.ideal[0]) return 'baixo'
  if (valor > aj.ideal[1]) return 'alto'
  return 'ok'
}

/**
 * Deriva o estado funcional do veiculo a partir do estado fisico das pecas.
 * Toda regra de "o motor pega ou nao" mora aqui.
 */
export function derivarVeiculo(
  parts: Record<string, PartState>,
  bolts: Record<string, BoltState>,
  conexoes: Record<string, boolean>,
  rt: Runtime,
): VeiculoEstado {
  const inst = (id: string) => parts[id]?.status === 'INSTALLED'
  const conn = (id: string) => !!conexoes[id]
  const val = (id: string) => num(parts[id]?.ajuste, 0)

  const falhas: string[] = []
  const avisos: string[] = []

  // ── Energia ──────────────────────────────────────────────────────────────
  const bateriaOk = inst('bateria') && firme(bolts['b-bat-pos']) && firme(bolts['b-bat-neg'])
  if (!inst('bateria')) falhas.push('Bateria removida: o motor de partida nao gira.')
  else if (!bateriaOk) falhas.push('Terminal da bateria solto: sem contato eletrico.')

  // ── Ignicao ──────────────────────────────────────────────────────────────
  const velas = ['vela-1', 'vela-2', 'vela-3', 'vela-4']
  const velasInstaladas = velas.filter(inst).length
  const ign = {
    distribuidor: inst('distribuidor') && inst('tampa-distribuidor') && inst('rotor'),
    velas: velasInstaladas,
    modulo: inst('modulo-ignicao') && conn('c-modulo-bobina'),
    bobina: inst('bobina') && conn('c-bobina-dist'),
    cabos: inst('cabos-vela'),
  }
  if (!inst('distribuidor')) falhas.push('Distribuidor removido: sem centelha.')
  else {
    if (!inst('tampa-distribuidor')) falhas.push('Tampa do distribuidor fora: a alta tensao nao chega aos cabos.')
    if (!inst('rotor')) falhas.push('Rotor fora: a centelha nao e distribuida aos cilindros.')
    if (!firme(bolts['b-dist-fixacao'])) avisos.push('Distribuidor solto: o ponto de ignicao pode variar.')
  }
  if (!inst('bobina')) falhas.push('Bobina removida: sem alta tensao.')
  else if (!conn('c-bobina-dist')) falhas.push('Cabo central da bobina desconectado.')
  if (!inst('modulo-ignicao')) falhas.push('Modulo de ignicao removido: a bobina nao e chaveada.')
  else if (!conn('c-modulo-bobina')) falhas.push('Chicote do modulo de ignicao desconectado.')
  if (!inst('cabos-vela')) falhas.push('Cabos de vela removidos.')
  if (velasInstaladas === 0) falhas.push('Nenhuma vela instalada.')
  else if (velasInstaladas < 4) {
    const faltando = velas.filter((v) => !inst(v)).map((v) => v.split('-')[1])
    avisos.push(`Vela do cilindro ${faltando.join(' e ')} faltando: motor falhando e perda de compressao.`)
  }

  // ── Alimentacao ──────────────────────────────────────────────────────────
  if (!inst('carburador')) falhas.push('Carburador removido: o motor nao admite mistura.')
  else {
    if (!inst('mangueira-combustivel') || !conn('c-combustivel'))
      falhas.push('Combustivel nao chega ao carburador.')
    const parafusosCarb = ['b-carb-1', 'b-carb-2']
    if (!parafusosCarb.every((b) => firme(bolts[b])))
      avisos.push('Base do carburador solta: entrada de ar falso e marcha lenta instavel.')
  }
  if (!inst('filtro-ar')) avisos.push('Sem filtro de ar: poeira entra direto na admissao.')
  else if (!firme(bolts['b-filtro-borboleta'])) avisos.push('Filtro de ar solto sobre o carburador.')

  // ── Refrigeracao ─────────────────────────────────────────────────────────
  if (!inst('correia')) avisos.push('SEM CORREIA: a ventoinha nao gira. O motor superaquece em poucos minutos.')
  else if (faixaDoAjuste('correia', val('correia')) === 'alto')
    avisos.push('Correia frouxa: patina, refrigera mal e nao carrega a bateria.')
  if (!inst('ventoinha')) avisos.push('Ventoinha removida: sem fluxo de ar de refrigeracao.')
  if (!inst('carcaca-ventoinha')) avisos.push('Carcaca removida: o ar nao e direcionado aos cilindros.')

  // ── Carga ────────────────────────────────────────────────────────────────
  const carga = inst('gerador') && conn('c-gerador-eletrica') && inst('correia')
  if (inst('gerador') && !conn('c-gerador-eletrica')) avisos.push('Gerador desconectado: a bateria nao carrega.')
  if (!inst('gerador')) avisos.push('Gerador removido: a bateria vai descarregar.')

  // ── Acelerador ───────────────────────────────────────────────────────────
  const acelPresente = inst('cabo-acelerador') && conn('c-acel-carb') && conn('c-acel-pedal')
  let acelAjuste: VeiculoEstado['acelerador']['ajuste'] = 'ausente'
  if (acelPresente) {
    const f = faixaDoAjuste('cabo-acelerador', val('cabo-acelerador'))
    acelAjuste = f === 'ok' ? 'correto' : f === 'baixo' ? 'tensionado' : 'folgado'
    if (acelAjuste === 'tensionado') avisos.push('Cabo do acelerador tensionado: marcha lenta acelerada.')
    if (acelAjuste === 'folgado') avisos.push('Folga excessiva no acelerador: o motor nao atinge rotacao maxima.')
    if (!firme(bolts['b-presilha-acel'])) avisos.push('Presilha do cabo do acelerador frouxa: o cabo pode escapar.')
  } else if (inst('cabo-acelerador')) {
    avisos.push('Cabo do acelerador desconectado: o motor so mantem marcha lenta.')
  } else {
    avisos.push('Cabo do acelerador ausente: sem comando de aceleracao.')
  }

  // ── Embreagem ────────────────────────────────────────────────────────────
  const embrPresente = inst('cabo-embreagem') && conn('c-embr-alavanca') && conn('c-embr-pedal')
  const folgaEmbr = embrPresente ? val('cabo-embreagem') : 0
  let embrAjuste: VeiculoEstado['embreagem']['ajuste'] = 'ausente'
  if (embrPresente) {
    const f = faixaDoAjuste('cabo-embreagem', folgaEmbr)
    embrAjuste = f === 'ok' ? 'correto' : f === 'baixo' ? 'alta' : 'baixa'
  }
  if (!embrPresente)
    avisos.push('Acionamento da embreagem interrompido: o pedal nao chega ao plato e o disco fica sempre acoplado.')
  if (!inst('conduite-embreagem'))
    avisos.push('Conduite da embreagem ausente: o cabo perde o apoio de reacao e boa parte do curso.')
  if (!inst('garfo-embreagem')) avisos.push('Garfo da embreagem fora: o rolamento nao e empurrado.')
  else if (!conn('c-garfo-rolamento'))
    avisos.push('Garfo desencaixado do rolamento: o pedal move o garfo mas nao chega ao plato.')
  if (!inst('rolamento-embreagem')) avisos.push('Rolamento da embreagem fora do lugar.')
  if (!inst('plato-embreagem')) avisos.push('Plato removido: nada prensa o disco contra o volante.')
  if (!inst('disco-embreagem')) avisos.push('Disco de embreagem removido: o cambio nao recebe torque.')
  else if (parts['disco-embreagem']?.condicao === 'ruim')
    avisos.push('Disco de embreagem no fim da vida util: patina sob carga.')
  if (!inst('volante-motor')) avisos.push('Volante do motor removido: sem superficie de atrito e sem partida.')
  if (embrPresente && folgaEmbr < 6)
    avisos.push('Folga livre quase nula: o rolamento trabalha em carga com o motor ligado.')

  // ── Cambio ───────────────────────────────────────────────────────────────
  if (!inst('alavanca-cambio') || !conn('c-alavanca-haste'))
    avisos.push('Alavanca de cambio sem acoplamento: nao ha como selecionar marcha.')
  else if (!inst('haste-cambio') || !conn('c-haste-seletor'))
    avisos.push('Haste do cambio desligada do mecanismo de selecao.')
  else if (!inst('seletor-marchas')) avisos.push('Mecanismo de selecao do cambio ausente.')
  if (val('caixa-cambio') < 70)
    avisos.push('Oleo do cambio abaixo do bujao: engrenagens e sincronizadores sem lubrificacao adequada.')

  // ── Freios ───────────────────────────────────────────────────────────────
  const nivel = val('reservatorio-freio')
  const folgaPedalFreio = val('pedal-freio')
  const regTras = faixaDoAjuste('regulagem-freio-tras', val('regulagem-freio-tras'))
  let freios: VeiculoEstado['freios']['status'] = 'operacional'
  if (nivel < 20) freios = 'inoperante'
  else if (nivel < 70 || faixaDoAjuste('pedal-freio', folgaPedalFreio) !== 'ok' || regTras !== 'ok')
    freios = 'atencao'

  const podeLigar = falhas.length === 0
  const tempStatus: VeiculoEstado['motor']['tempStatus'] =
    rt.temperatura > 118 ? 'critica' : rt.temperatura > 100 ? 'alta' : 'normal'

  return {
    motor: { ligado: rt.ligado, rpm: Math.round(rt.rpm), temperatura: Math.round(rt.temperatura), tempStatus },
    ignicao: ign,
    acelerador: { cabo: inst('cabo-acelerador'), ajuste: acelAjuste },
    embreagem: { cabo: inst('cabo-embreagem'), ajuste: embrAjuste, folga: folgaEmbr },
    freios: { status: freios, folgaPedal: folgaPedalFreio },
    eletrica: { bateria: bateriaOk, carga },
    falhas,
    avisos,
    podeLigar,
  }
}

/** Rotacao alvo do motor conforme o pedal e o estado dos comandos. */
export function rpmAlvo(v: VeiculoEstado, parts: Record<string, PartState>, pedal: number): number {
  const lenta = num(parts['carburador']?.ajuste, 875)
  if (!v.motor.ligado) return 0
  if (v.acelerador.ajuste === 'ausente') return lenta
  if (v.acelerador.ajuste === 'tensionado') {
    // Borboleta nao fecha: marcha lenta puxada para cima.
    const extra = (PARTE_POR_ID['cabo-acelerador'].ajuste!.ideal[0] - num(parts['cabo-acelerador']?.ajuste, 2)) * 450
    return Math.max(lenta + extra, lenta) + pedal * 3200
  }
  if (v.acelerador.ajuste === 'folgado') {
    const perda = (num(parts['cabo-acelerador']?.ajuste, 2) - PARTE_POR_ID['cabo-acelerador'].ajuste!.ideal[1]) * 320
    return lenta + pedal * Math.max(3800 - perda * 4, 600)
  }
  return lenta + pedal * 3800
}

/**
 * Evolucao da temperatura do boxer. Separada do resto porque a rotacao passou
 * a ser resolvida pela transmissao (ver sim/driveline.ts), que precisa dela
 * para saber quanto torque a embreagem esta passando.
 */
export function passoTermico(rt: Runtime, parts: Record<string, PartState>, dt: number): number {
  const refrigerando =
    parts['correia']?.status === 'INSTALLED' &&
    parts['ventoinha']?.status === 'INSTALLED' &&
    parts['carcaca-ventoinha']?.status === 'INSTALLED'

  let temperatura = rt.temperatura
  if (rt.ligado) {
    const equilibrio = refrigerando ? 88 + (rt.rpm / 4000) * 12 : 190
    const taxa = refrigerando ? 0.09 : 0.16
    temperatura += (equilibrio - temperatura) * Math.min(1, dt * taxa)
  } else {
    temperatura += (22 - temperatura) * Math.min(1, dt * 0.05)
  }
  return temperatura
}

/** Avanco simplificado usado fora do modo de conducao (bancada e testes). */
export function passoSimulacao(
  rt: Runtime,
  v: VeiculoEstado,
  parts: Record<string, PartState>,
  dt: number,
): Runtime {
  const alvo = rpmAlvo(v, parts, rt.pedalAcelerador)
  const rpm = rt.rpm + (alvo - rt.rpm) * Math.min(1, dt * 3.2)
  return { ...rt, rpm, temperatura: passoTermico(rt, parts, dt) }
}
