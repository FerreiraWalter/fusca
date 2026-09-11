import { useSim, type CamMode } from '../state/store'
import type { Marcha } from '../data/types'

const SISTEMAS: { rot: string; peca: string; cam: CamMode; raioX?: boolean; visao?: boolean }[] = [
  { rot: 'Motor', peca: 'motor-boxer', cam: 'oficina' },
  { rot: 'Ignicao', peca: 'distribuidor', cam: 'oficina' },
  { rot: 'Freios', peca: 'pedal-freio', cam: 'cabine' },
  { rot: 'Embreagem', peca: 'disco-embreagem', cam: 'cambio', visao: true },
  { rot: 'Cambio', peca: 'seletor-marchas', cam: 'cambio', visao: true },
  { rot: 'Transmissao', peca: 'semieixos', cam: 'geral', visao: true },
  { rot: 'Cabos', peca: 'cabo-acelerador', cam: 'cabine', raioX: true },
  { rot: 'Eletrica', peca: 'bateria', cam: 'cabine', raioX: true },
]

const MARCHAS: Marcha[] = ['R', 'N', '1', '2', '3', '4']

export function ConsoleInferior() {
  const v = useSim((s) => s.veiculo)
  const rt = useSim((s) => s.rt)
  const darPartida = useSim((s) => s.darPartida)
  const desligar = useSim((s) => s.desligarMotor)
  const pisar = useSim((s) => s.pisarPedal)
  const selecionar = useSim((s) => s.selecionar)
  const setCam = useSim((s) => s.setCam)
  const acaoPeca = useSim((s) => s.acaoPeca)
  const parts = useSim((s) => s.parts)
  const raioXOn = useSim((s) => s.raioX)
  const toggleRaioX = useSim((s) => s.toggleRaioX)
  const visaoOn = useSim((s) => s.visaoMecanica)
  const setFiltro = useSim((s) => s.setFiltro)
  const drive = useSim((s) => s.drive)
  const engatar = useSim((s) => s.engatarMarcha)
  const setPainel = useSim((s) => s.setPainel)

  const irPara = (s: (typeof SISTEMAS)[number]) => {
    if (s.cam === 'oficina' && !parts['tampa-motor'].aberto) acaoPeca('tampa-motor', 'abrir')
    if (s.cam === 'dianteiro' && !parts['capo-dianteiro'].aberto) acaoPeca('capo-dianteiro', 'abrir')
    if (s.raioX && !raioXOn) toggleRaioX()
    // Os conjuntos internos so existem visualmente com a visao mecanica.
    if (s.visao && !visaoOn) setFiltro(s.rot === 'Embreagem' ? 'embreagem' : s.rot === 'Cambio' ? 'cambio' : 'transmissao')
    selecionar({ tipo: 'peca', id: s.peca })
    setCam(s.cam)
  }

  return (
    <>
      <div className="instrumento">
        <button className={`btn ${v.motor.ligado ? 'perigo' : 'primario'}`} onClick={v.motor.ligado ? desligar : darPartida}>
          {v.motor.ligado ? 'DESLIGAR' : 'PARTIDA'}
        </button>
        <div className="mostrador">
          <div className={`val ${v.motor.ligado ? 'ok' : ''}`}>{v.motor.rpm}</div>
          <div className="rot">rpm</div>
        </div>
        <div className="mostrador">
          <div
            className={`val ${v.motor.tempStatus === 'critica' ? 'alerta' : v.motor.tempStatus === 'alta' ? 'aviso' : ''}`}
          >
            {v.motor.temperatura}°
          </div>
          <div className="rot">temp</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Lampada rot="bateria" estado={v.eletrica.carga || !v.motor.ligado ? 'off' : 'alerta'} />
          <Lampada rot="temp" estado={v.motor.tempStatus === 'normal' ? 'off' : v.motor.tempStatus === 'alta' ? 'aviso' : 'alerta'} />
          <Lampada rot="falha" estado={v.podeLigar ? 'off' : 'alerta'} />
        </div>
      </div>

      <div className="instrumento">
        <PedalBotao rot="Acelerador" valor={rt.pedalAcelerador} onChange={(x) => pisar('acelerador', x)} />
        <PedalBotao rot="Embreagem" valor={rt.pedalEmbreagem} onChange={(x) => pisar('embreagem', x)} />
        <PedalBotao rot="Freio" valor={rt.pedalFreio} onChange={(x) => pisar('freio', x)} />
      </div>

      <div className="instrumento">
        <div className="mostrador">
          <div className={`val ${drive.marcha === 'N' ? '' : 'ok'}`}>{drive.marcha}</div>
          <div className="rot">marcha</div>
        </div>
        <div className="mostrador">
          <div className="val">{(Math.abs(drive.velocidade) * 3.6).toFixed(0)}</div>
          <div className="rot">km/h</div>
        </div>
        <div className="grupo" style={{ flexWrap: 'wrap', maxWidth: 190 }}>
          {MARCHAS.map((m) => (
            <button
              key={m}
              className={`btn mini${drive.marcha === m ? ' on' : ''}`}
              onClick={() => engatar(m)}
              title={m === 'R' ? 'Re: so parado, com a alavanca pressionada e a embreagem pisada' : undefined}
            >
              {m}
            </button>
          ))}
          <button className="btn mini" onClick={() => setPainel('cabine')}>
            Cabine
          </button>
        </div>
      </div>

      <div className="instrumento" style={{ flex: 1 }}>
        <span className="grupo-rot">Sistemas</span>
        <div className="grupo" style={{ flexWrap: 'wrap' }}>
          {SISTEMAS.map((s) => (
            <button key={s.rot} className="btn" onClick={() => irPara(s)}>
              {s.rot}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function Lampada({ rot, estado }: { rot: string; estado: 'off' | 'aviso' | 'alerta' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span className={`led${estado === 'off' ? '' : ` ${estado}`}`} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--txt-3)', textTransform: 'uppercase' }}>
        {rot}
      </span>
    </div>
  )
}

function PedalBotao({ rot, valor, onChange }: { rot: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="pedal-ctl">
      <label>{rot}</label>
      <button
        className={`btn${valor > 0.05 ? ' on' : ''}`}
        onPointerDown={() => onChange(1)}
        onPointerUp={() => onChange(0)}
        onPointerLeave={() => onChange(0)}
      >
        {valor > 0.05 ? 'pisado' : 'pisar'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
