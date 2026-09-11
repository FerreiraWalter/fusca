/**
 * Posto de conducao e leitura da cadeia de acionamento.
 *
 * O painel tem duas metades com papeis distintos: em cima o que um motorista
 * ve (marcha, rotacao, velocidade), embaixo o que so um mecanico ve - cada
 * elo da transmissao do esforco, com o numero que ele esta produzindo neste
 * instante. E a mesma informacao que a animacao 3D mostra, em forma de
 * medida, para que "a embreagem nao solta" vire "faltam 22 mm de curso".
 */

import { useEffect, useState } from 'react'
import { cadeiaDoSistema, PARTE_POR_ID } from '../data/parts'
import {
  CURSO_DESENGATE,
  CURSO_PEDAL,
  CURSO_ROLAMENTO,
  ENGATE_LIVRE,
  kmh,
  RELACOES,
  relacaoTotal,
  rpmPrimarioDe,
} from '../sim/driveline'
import { useSim } from '../state/store'
import type { Marcha } from '../data/types'

const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100)).toFixed(0)}%`

export function Cabine() {
  const pista = useSim((s) => s.drive.pista)
  return (
    <>
      <Instrumentos />
      {!pista && <EntrarNaPista />}
      {pista && <ControlesDePista />}
      <Alavanca />
      <Pedais />
      <CadeiaAcionamento />
    </>
  )
}

/* ─────────────────────────── instrumentos ─────────────────────────────── */

function Instrumentos() {
  const rt = useSim((s) => s.rt)
  const dl = useSim((s) => s.drive)
  const v = kmh(dl.velocidade)
  const marcha = dl.marcha === 'N' ? 'N' : dl.marcha === 'R' ? 'R' : dl.marcha
  const engate = dl.acionamento.engate

  return (
    <div className="cab">
      <h2>Posto de conducao</h2>
      <div className="meta">Fusca 1500 · cambio de 4 marchas · tracao traseira</div>
      <div className="painel-cabine">
        <div className="mostrador grande">
          <div className={`val ${dl.marcha === 'R' ? 'aviso' : dl.marcha === 'N' ? '' : 'ok'}`}>{marcha}</div>
          <div className="rot">marcha</div>
        </div>
        <div className="mostrador grande">
          <div className={`val ${rt.rpm > 4600 ? 'alerta' : rt.ligado ? 'ok' : ''}`}>{Math.round(rt.rpm)}</div>
          <div className="rot">rpm</div>
        </div>
        <div className="mostrador grande">
          <div className="val">{v.toFixed(0)}</div>
          <div className="rot">km/h</div>
        </div>
      </div>

      <div className="barra-rot">
        <span>embreagem</span>
        <span className={engate > 0.9 ? 'ok' : engate < ENGATE_LIVRE ? 'ciano' : 'aviso'}>
          {engate > 0.9 ? 'acoplada' : engate < ENGATE_LIVRE ? 'desacoplada' : `parcial (${pct(engate)})`}
        </span>
      </div>
      <div className="barra">
        <div className="preenche" style={{ width: pct(engate) }} />
      </div>

      {dl.patinacao > 60 && (
        <p className="nota-alerta">
          Diferenca de {Math.round(dl.patinacao)} rpm entre motor e cambio: o disco esta deslizando e virando
          calor.
        </p>
      )}
      {dl.desgasteDisco > 3 && (
        <div className="linha-dado">
          <span className="k">desgaste do disco nesta sessao</span>
          <span className="v" style={{ color: dl.desgasteDisco > 40 ? 'var(--vermelho)' : 'var(--laranja)' }}>
            {dl.desgasteDisco.toFixed(1)} %
          </span>
        </div>
      )}
    </div>
  )
}

function EntrarNaPista() {
  const entrar = useSim((s) => s.entrarNaPista)
  return (
    <div className="bloco">
      <h4>Pista de oficina</h4>
      <p>
        Uma reta curta para testar o que foi montado. A sequencia e a de sempre: dar partida, pisar a
        embreagem, engatar a primeira, acelerar e soltar o pedal com calma.
      </p>
      <button className="btn primario" onClick={entrar}>
        Entrar na pista
      </button>
    </div>
  )
}

function ControlesDePista() {
  const sair = useSim((s) => s.sairDaPista)
  const repor = useSim((s) => s.reposicionarNaPista)
  const dist = useSim((s) => s.drive.distancia)
  const morreu = useSim((s) => s.drive.morreu)
  const arranhoes = useSim((s) => s.drive.arranhoes)
  return (
    <div className="bloco">
      <h4>Pista de oficina</h4>
      <div className="linha-dado">
        <span className="k">distancia</span>
        <span className="v">{dist.toFixed(1)} m</span>
      </div>
      <div className="linha-dado">
        <span className="k">engates arranhados</span>
        <span className="v" style={{ color: arranhoes ? 'var(--laranja)' : undefined }}>
          {arranhoes}
        </span>
      </div>
      {morreu && (
        <p className="nota-alerta">
          Motor apagou nesta sessao. Investigue o que aconteceu: o painel de acionamento abaixo mostra o que o
          pedal estava fazendo.
        </p>
      )}
      <div className="acoes">
        <button className="btn" onClick={repor}>
          Reposicionar
        </button>
        <button className="btn" onClick={sair}>
          Sair da pista
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────────── alavanca ───────────────────────────────── */

/** Rotulo de cada posicao util do portao em H. */
const GRADE: { x: -1 | 0 | 1; y: -1 | 0 | 1; rot: string; marcha: Marcha }[] = [
  { x: -1, y: 1, rot: '1', marcha: '1' },
  { x: 1, y: 1, rot: '3', marcha: '3' },
  { x: -1, y: 0, rot: '', marcha: 'N' },
  { x: 0, y: 0, rot: 'N', marcha: 'N' },
  { x: 1, y: 0, rot: '', marcha: 'N' },
  { x: -1, y: -1, rot: '2', marcha: '2' },
  { x: 1, y: -1, rot: '4', marcha: '4' },
]

function Alavanca() {
  const dl = useSim((s) => s.drive)
  const mover = useSim((s) => s.moverAlavanca)
  const pressionar = useSim((s) => s.pressionarAlavanca)
  const g = dl.portao

  return (
    <div className="bloco">
      <h4>Alavanca de cambio · portao em H</h4>
      <div className="portao">
        {/* Corredor central: e por ele que se passa de um trilho ao outro */}
        <div className="corredor" />
        {GRADE.map((c) => {
          const aqui = g.x === c.x && g.y === c.y
          const rot = c.x === -1 && c.y === 1 && g.baixo ? 'R' : c.rot
          return (
            <button
              key={`${c.x},${c.y}`}
              className={`slot${aqui ? ' aqui' : ''}${c.y === 0 ? ' neutro' : ''}`}
              style={{ gridColumn: c.x + 2, gridRow: 2 - c.y }}
              onClick={() => mover(c.x, c.y)}
            >
              {rot}
            </button>
          )
        })}
      </div>

      <div className="acoes" style={{ marginTop: 8 }}>
        <button
          className={`btn${g.baixo ? ' on' : ''}`}
          onClick={() => pressionar(!g.baixo)}
          title="No Fusca a re fica a esquerda e a frente, atras de um batente: e preciso pressionar a alavanca para baixo para passar por ele."
        >
          {g.baixo ? 'Alavanca pressionada' : 'Pressionar alavanca (re)'}
        </button>
      </div>
      <p className="dica-inline">
        Trocar de corredor exige passar pelo neutro. A re so entra com o carro parado, com a alavanca
        pressionada e com o disco desacoplado: ela nao tem sincronizador.
      </p>
      <TabelaRelacoes />
    </div>
  )
}

function TabelaRelacoes() {
  const [aberta, setAberta] = useState(false)
  const dl = useSim((s) => s.drive)
  const rt = useSim((s) => s.rt)

  return (
    <>
      <button className="btn mini" onClick={() => setAberta((a) => !a)} style={{ marginTop: 6 }}>
        {aberta ? 'Ocultar relacoes' : 'Ver relacoes do cambio'}
      </button>
      {aberta && (
        <div style={{ marginTop: 6 }}>
          <div className="linha-dado">
            <span className="k">diferencial</span>
            <span className="v">4,375 : 1</span>
          </div>
          {(['1', '2', '3', '4', 'R'] as Marcha[]).map((m) => {
            // A que velocidade a rotacao atual do motor corresponderia nesta marcha.
            const velocidade = (rt.rpm / 60) * 2 * Math.PI * 0.3 * 3.6 / relacaoTotal(m)
            return (
              <div className="linha-dado" key={m}>
                <span className="k" style={{ color: dl.marcha === m ? 'var(--ambar)' : undefined }}>
                  {m === 'R' ? 're' : `${m}a`} · {RELACOES[m].toFixed(2)} : 1
                </span>
                <span className="v">{rt.rpm > 100 ? `${velocidade.toFixed(0)} km/h a ${Math.round(rt.rpm)} rpm` : '—'}</span>
              </div>
            )
          })}
          {dl.marcha !== 'N' && (
            <div className="linha-dado">
              <span className="k">primario agora</span>
              <span className="v">{Math.round(rpmPrimarioDe(dl.velocidade, dl.marcha))} rpm</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

/* ────────────────────────────── pedais ────────────────────────────────── */

function Pedais() {
  const rt = useSim((s) => s.rt)
  const pisar = useSim((s) => s.pisarPedal)
  const ligado = useSim((s) => s.rt.ligado)
  const partida = useSim((s) => s.darPartida)
  const desligar = useSim((s) => s.desligarMotor)

  // O teclado torna a coordenacao possivel: pedal e alavanca ao mesmo tempo.
  useEffect(() => {
    const baixo = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'a' || e.key === 'A') pisar('embreagem', 1)
      if (e.key === 'd' || e.key === 'D') pisar('acelerador', 1)
      if (e.key === 's' || e.key === 'S') pisar('freio', 1)
    }
    const cima = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') pisar('embreagem', 0)
      if (e.key === 'd' || e.key === 'D') pisar('acelerador', 0)
      if (e.key === 's' || e.key === 'S') pisar('freio', 0)
    }
    window.addEventListener('keydown', baixo)
    window.addEventListener('keyup', cima)
    return () => {
      window.removeEventListener('keydown', baixo)
      window.removeEventListener('keyup', cima)
    }
  }, [pisar])

  return (
    <div className="bloco">
      <h4>Pedais</h4>
      <div className="acoes" style={{ marginBottom: 8 }}>
        <button className={`btn ${ligado ? 'perigo' : 'primario'}`} onClick={ligado ? desligar : partida}>
          {ligado ? 'Desligar motor' : 'Dar partida'}
        </button>
      </div>
      <PedalSlider rot="Embreagem" tecla="A" valor={rt.pedalEmbreagem} onChange={(v) => pisar('embreagem', v)} />
      <PedalSlider rot="Freio" tecla="S" valor={rt.pedalFreio} onChange={(v) => pisar('freio', v)} />
      <PedalSlider rot="Acelerador" tecla="D" valor={rt.pedalAcelerador} onChange={(v) => pisar('acelerador', v)} />
      <p className="dica-inline">
        Segure a tecla, arraste a barra ou clique direto no pedal dentro do carro. Soltar a embreagem devagar e
        exatamente arrastar a barra para baixo aos poucos.
      </p>
    </div>
  )
}

function PedalSlider({
  rot,
  tecla,
  valor,
  onChange,
}: {
  rot: string
  tecla: string
  valor: number
  onChange: (v: number) => void
}) {
  return (
    <div className="pedal-linha">
      <label>
        {rot} <kbd>{tecla}</kbd>
      </label>
      <input type="range" min={0} max={1} step={0.02} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="valor">{(valor * 100).toFixed(0)}%</span>
    </div>
  )
}

/* ────────────────────── cadeia causal do acionamento ──────────────────── */

/**
 * Sete linhas, uma por elo. Cada uma mostra o valor que aquele elo esta
 * produzindo AGORA e a fracao do curso disponivel que ja foi usada. E aqui
 * que fica visivel, sem texto explicativo, por que folga demais impede o
 * desengate: as barras de cima enchem e as de baixo nao chegam ao fim.
 */
export function CadeiaAcionamento() {
  const acion = useSim((s) => s.drive.acionamento)
  const selecionar = useSim((s) => s.selecionar)
  const focar = useSim((s) => s.focar)
  const partes = cadeiaDoSistema('embreagem')

  const elos: { id: string; rot: string; valor: string; frac: number; nota?: string }[] = [
    {
      id: 'pedal-embreagem',
      rot: 'Pedal',
      valor: `${acion.cursoPedal.toFixed(0)} mm`,
      frac: acion.cursoPedal / CURSO_PEDAL,
    },
    {
      id: 'cabo-embreagem',
      rot: 'Cabo (curso util)',
      valor: `${acion.cursoCabo.toFixed(0)} mm`,
      frac: acion.cursoCabo / CURSO_DESENGATE,
      nota: acion.folgaLivre > 0 ? `${acion.folgaLivre.toFixed(0)} mm consumidos pela folga livre` : undefined,
    },
    {
      id: 'alavanca-embreagem',
      rot: 'Alavanca',
      valor: `${acion.anguloAlavanca.toFixed(1)}°`,
      frac: acion.anguloAlavanca / 17,
    },
    {
      id: 'garfo-embreagem',
      rot: 'Garfo',
      valor: `${acion.anguloGarfo.toFixed(1)}°`,
      frac: acion.anguloGarfo / 15,
    },
    {
      id: 'rolamento-embreagem',
      rot: 'Rolamento',
      valor: `${acion.cursoRolamento.toFixed(1)} / ${CURSO_ROLAMENTO} mm`,
      frac: acion.cursoRolamento / CURSO_ROLAMENTO,
      nota: acion.rolamentoEmCarga ? 'em carga com o pedal solto' : undefined,
    },
    {
      id: 'plato-embreagem',
      rot: 'Plato (carga nos dedos)',
      valor: pct(acion.cargaPlato),
      frac: acion.cargaPlato,
    },
    {
      id: 'disco-embreagem',
      rot: 'Disco (torque transmitido)',
      valor: pct(acion.engate),
      frac: acion.engate,
      nota:
        acion.engate < ENGATE_LIVRE
          ? 'livre: da para trocar de marcha'
          : acion.cursoPedal > CURSO_PEDAL * 0.95
            ? 'ainda transmite torque com o pedal no assoalho: a marcha vai arranhar'
            : undefined,
    },
  ]

  return (
    <div className="bloco">
      <h4>Cadeia de acionamento</h4>
      {acion.semAcionamento && (
        <p className="nota-alerta">
          A cadeia esta interrompida: o movimento do pedal nao chega ao plato. Percorra os elos abaixo e
          descubra em qual deles o valor para de crescer.
        </p>
      )}
      {acion.desengateIncompleto && !acion.semAcionamento && (
        <p className="nota-alerta">
          Com o pedal no assoalho ainda faltaria curso para soltar o disco por completo.
        </p>
      )}

      <div className="cadeia">
        {elos.map((e, i) => {
          const def = PARTE_POR_ID[e.id]
          return (
            <div key={e.id} className="elo">
              <div className="elo-topo">
                <button
                  className="elo-nome"
                  onClick={() => {
                    selecionar({ tipo: 'peca', id: e.id })
                    focar(e.id)
                  }}
                  title={def?.funcao}
                >
                  {e.rot}
                </button>
                <span className="elo-valor">{e.valor}</span>
              </div>
              <div className="barra fina">
                <div
                  className="preenche"
                  style={{
                    width: pct(e.frac),
                    background: e.frac > 0.98 ? 'var(--verde)' : 'var(--ciano)',
                  }}
                />
              </div>
              {e.nota && <div className="elo-nota">{e.nota}</div>}
              {i < elos.length - 1 && <div className="elo-seta">↓</div>}
            </div>
          )
        })}
      </div>

      <h4 style={{ marginTop: 12 }}>Componentes do conjunto</h4>
      <div className="acoes">
        {partes.map((p) => (
          <button key={p.id} className="btn mini" onClick={() => selecionar({ tipo: 'peca', id: p.id })}>
            {p.nome}
          </button>
        ))}
      </div>
    </div>
  )
}
