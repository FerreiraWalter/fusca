import { Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Scene } from './three/Scene'
import { CaixaFerramentas, Bancada, Legenda } from './ui/Toolbox'
import { Inspetor } from './ui/Inspector'
import { Tarefas } from './ui/Tasks'
import { Diagnostico } from './ui/Diagnostics'
import { Cabine } from './ui/Cabine'
import { Sintomas } from './ui/Sintomas'
import { ConsoleInferior } from './ui/Console'
import { useSim, type CamMode, type FiltroSistema } from './state/store'
import { atualizarAudio, desligarAudio, ligarAudio } from './sim/audio'
import { PROCEDIMENTO_POR_ID } from './data/procedures'

const CAMERAS: { id: CamMode; rot: string }[] = [
  { id: 'geral', rot: 'Geral' },
  { id: 'oficina', rot: 'Oficina' },
  { id: 'cabine', rot: 'Cabine' },
  { id: 'dirigir', rot: 'Volante' },
  { id: 'cambio', rot: 'Cambio' },
  { id: 'dianteiro', rot: 'Dianteira' },
]


export default function App() {
  return (
    <div className="app">
      <Topo />
      <aside className="esq">
        <CaixaFerramentas />
        <Bancada />
        <Legenda />
      </aside>
      <main className="palco">
        <Canvas shadows camera={{ position: [4.4, 2.5, 4.8], fov: 42, near: 0.05, far: 120 }} dpr={[1, 1.8]}>
          <color attach="background" args={['#0a0d10']} />
          <fog attach="fog" args={['#0a0d10', 12, 34]} />
          <Suspense fallback={null}>
            <Scene />
            <Simulacao />
          </Suspense>
        </Canvas>
        <IndicadorCena />
        <HudPista />
        <Toasts />
      </main>
      <PainelDireito />
      <footer className="base">
        <ConsoleInferior />
      </footer>
    </div>
  )
}

function Topo() {
  const camMode = useSim((s) => s.camMode)
  const setCam = useSim((s) => s.setCam)
  const sel = useSim((s) => s.sel)
  const focar = useSim((s) => s.focar)
  const raioX = useSim((s) => s.raioX)
  const toggleRaioX = useSim((s) => s.toggleRaioX)
  const visao = useSim((s) => s.visaoMecanica)
  const toggleVisao = useSim((s) => s.toggleVisaoMecanica)
  const filtro = useSim((s) => s.filtro)
  const setFiltro = useSim((s) => s.setFiltro)
  const fixadores = useSim((s) => s.mostrarFixadores)
  const toggleFixadores = useSim((s) => s.toggleFixadores)
  const som = useSim((s) => s.som)
  const toggleSom = useSim((s) => s.toggleSom)
  const resetar = useSim((s) => s.resetar)
  const claridade = useSim((s) => s.claridade)
  const setClaridade = useSim((s) => s.setClaridade)

  // Valor atual selecionado no dropdown de Visão
  const visaoAtual = visao ? `mecanica:${filtro}` : raioX ? 'raiox' : 'normal'

  const handleVisaoChange = (val: string) => {
    if (val === 'normal') {
      if (visao) toggleVisao()
      if (raioX) toggleRaioX()
    } else if (val === 'raiox') {
      if (visao) toggleVisao()
      if (!raioX) toggleRaioX()
    } else if (val.startsWith('mecanica:')) {
      const sub = val.split(':')[1] as FiltroSistema
      setFiltro(sub)
    }
  }

  return (
    <header className="topo">
      <div className="marca">
        <b>FUSCA LAB</b>
        <span>VW 1500 · 1973</span>
      </div>

      {/* Dropdown de Câmera */}
      <div className="grupo">
        <span className="grupo-rot">Câmera</span>
        <select
          className="select-topo"
          value={camMode}
          onChange={(e) => setCam(e.target.value as CamMode)}
        >
          {CAMERAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.rot}
            </option>
          ))}
          {camMode === 'foco' && <option value="foco">Componente Focado</option>}
        </select>
        <button
          className={`btn${camMode === 'foco' ? ' on' : ''}`}
          disabled={!sel}
          onClick={() => sel && focar(sel.id)}
          title="Focar no componente selecionado"
        >
          Focar
        </button>
      </div>

      {/* Dropdown de Visão */}
      <div className="grupo">
        <span className="grupo-rot">Visão</span>
        <select
          className="select-topo"
          value={visaoAtual}
          onChange={(e) => handleVisaoChange(e.target.value)}
        >
          <option value="normal">Visão Normal</option>
          <option value="mecanica:todos">Visão Mecânica (Tudo)</option>
          <option value="mecanica:motor">Visão Mecânica (Motor)</option>
          <option value="mecanica:embreagem">Visão Mecânica (Embreagem)</option>
          <option value="mecanica:cambio">Visão Mecânica (Câmbio)</option>
          <option value="mecanica:transmissao">Visão Mecânica (Transmissão)</option>
          <option value="raiox">Raio-X</option>
        </select>
      </div>

      {/* Botão deslizante de Claridade / Iluminação */}
      <div className="grupo claridade-grupo">
        <span className="grupo-rot">Claridade</span>
        <input
          type="range"
          min="0.2"
          max="2.5"
          step="0.05"
          value={claridade}
          onChange={(e) => setClaridade(parseFloat(e.target.value))}
          className="slider-claridade"
          title="Arrastar para ajustar a claridade do ambiente"
        />
        <span className="claridade-val">{Math.round(claridade * 100)}%</span>
      </div>

      {/* Fixadores e Som */}
      <div className="grupo">
        <button className={`btn${fixadores ? ' on' : ''}`} onClick={toggleFixadores}>
          Fixadores
        </button>
        <button className={`btn${som ? ' on' : ''}`} onClick={toggleSom}>
          {som ? 'Som ligado' : 'Som'}
        </button>
      </div>

      <div className="espaco" />
      <button className="btn perigo" onClick={resetar}>
        Restaurar veículo
      </button>
    </header>
  )
}

function PainelDireito() {
  const painel = useSim((s) => s.painel)
  const setPainel = useSim((s) => s.setPainel)
  const proc = useSim((s) => s.proc)
  const desafio = useSim((s) => s.desafio)
  const marcha = useSim((s) => s.drive.marcha)
  const falhas = useSim((s) => s.veiculo.falhas.length)
  const feitos = proc ? Object.values(proc.feitos).filter(Boolean).length : 0
  const total = proc ? PROCEDIMENTO_POR_ID[proc.id].passos.length : 0

  return (
    <aside className="dir">
      <div className="abas">
        <button className={`aba${painel === 'tarefas' ? ' on' : ''}`} onClick={() => setPainel('tarefas')}>
          Tarefas{proc ? ` ${feitos}/${total}` : ''}
        </button>
        <button className={`aba${painel === 'cabine' ? ' on' : ''}`} onClick={() => setPainel('cabine')}>
          Cabine{marcha !== 'N' ? ` ${marcha}` : ''}
        </button>
        <button className={`aba${painel === 'sintomas' ? ' on' : ''}`} onClick={() => setPainel('sintomas')}>
          Sintomas{desafio && !desafio.resolvido ? ' \u2022' : ''}
        </button>
        <button className={`aba${painel === 'inspetor' ? ' on' : ''}`} onClick={() => setPainel('inspetor')}>
          Inspetor
        </button>
        <button className={`aba${painel === 'diagnostico' ? ' on' : ''}`} onClick={() => setPainel('diagnostico')}>
          Estado{falhas ? ` (${falhas})` : ''}
        </button>
      </div>
      <div className="conteudo">
        {painel === 'tarefas' && <Tarefas />}
        {painel === 'cabine' && <Cabine />}
        {painel === 'sintomas' && <Sintomas />}
        {painel === 'inspetor' && <Inspetor />}
        {painel === 'diagnostico' && <Diagnostico />}
      </div>
    </aside>
  )
}

function IndicadorCena() {
  const camMode = useSim((s) => s.camMode)
  const tampa = useSim((s) => s.parts['tampa-motor'].aberto)
  const raioX = useSim((s) => s.raioX)
  const visao = useSim((s) => s.visaoMecanica)
  const filtro = useSim((s) => s.filtro)
  const pista = useSim((s) => s.drive.pista)
  return (
    <div className="canto-3d">
      {pista ? 'Pista de teste' : 'Oficina virtual'} · camera <b>{camMode}</b>
      {tampa ? ' · cofre aberto' : ''}
      {visao ? ` · visao mecanica${filtro !== 'todos' ? `: ${filtro}` : ''}` : raioX ? ' · raio-x' : ''}
    </div>
  )
}

/** Instrumentos sobrepostos a cena enquanto o carro esta na pista. */
function HudPista() {
  const pista = useSim((s) => s.drive.pista)
  const marcha = useSim((s) => s.drive.marcha)
  const velocidade = useSim((s) => s.drive.velocidade)
  const rpm = useSim((s) => s.rt.rpm)
  const engate = useSim((s) => s.drive.acionamento.engate)
  const ligado = useSim((s) => s.rt.ligado)
  if (!pista) return null
  return (
    <div className="hud">
      <div className="hud-item">
        <b className={marcha === 'N' ? '' : 'ok'}>{marcha}</b>
        <span>marcha</span>
      </div>
      <div className="hud-item">
        <b className={rpm > 4600 ? 'alerta' : ''}>{Math.round(rpm)}</b>
        <span>rpm</span>
      </div>
      <div className="hud-item">
        <b>{(Math.abs(velocidade) * 3.6).toFixed(0)}</b>
        <span>km/h</span>
      </div>
      <div className="hud-item">
        <b className={engate < 0.12 ? 'ciano' : engate > 0.9 ? 'ok' : 'aviso'}>{(engate * 100).toFixed(0)}%</b>
        <span>embreagem</span>
      </div>
      {!ligado && <div className="hud-aviso">motor parado</div>}
    </div>
  )
}

/** Avanca a simulacao termica/rotacional e alimenta o audio. */
function Simulacao() {
  useFrame((_, dt) => {
    const s = useSim.getState()
    s.tick(Math.min(dt, 0.1))
    atualizarAudio(s.rt.ligado, s.rt.rpm, s.rt.temperatura)
  })
  return null
}

function Toasts() {
  const feedbacks = useSim((s) => s.feedbacks)
  const som = useSim((s) => s.som)
  const [, forcar] = useState(0)

  useEffect(() => {
    const t = setInterval(() => forcar((n) => n + 1), 700)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (som) ligarAudio()
    else desligarAudio()
    return () => {
      if (!som) desligarAudio()
    }
  }, [som])

  const agora = Date.now()
  const visiveis = feedbacks.filter((f) => agora - f.t < 7000).slice(-4)

  return (
    <div className="toasts">
      {visiveis.map((f) => (
        <div key={f.id} className={`toast ${f.nivel}`}>
          <span className="mk">{f.nivel === 'ok' ? '✓' : f.nivel === 'erro' ? '✕' : f.nivel === 'aviso' ? '⚠' : 'i'}</span>
          <span>{f.texto}</span>
        </div>
      ))}
    </div>
  )
}
