import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3, type Mesh } from 'three'
import { CONEXOES } from '../data/connections'
import { PARTE_POR_ID, slotBancada } from '../data/parts'
import { useSim } from '../state/store'
import { CURSO_DESENGATE } from '../sim/driveline'
import { COR } from './matlib'
import type { Vec3 } from '../data/types'

/* Trajeto real dos cabos: do pedal, pelo tunel central, ate o cofre do motor. */
const ROTA_ACELERADOR: Vec3[] = [
  [0.14, 0.23, 0.66],
  [0.13, 0.17, 0.42],
  [0.06, 0.14, 0.0],
  [0.02, 0.15, -0.72],
  [0.03, 0.38, -1.0],
  [0.06, 0.72, -1.2],
  [0.08, 0.92, -1.32],
  [0.09, 1.0, -1.4],
]

const ROTA_EMBREAGEM: Vec3[] = [
  [0.46, 0.23, 0.66],
  [0.42, 0.17, 0.45],
  [0.22, 0.13, 0.05],
  [0.18, 0.15, -0.55],
  [0.2, 0.32, -0.86],
  [0.27, 0.54, -1.01],
  [0.29, 0.62, -1.06],
]

interface CaboProps {
  id: string
  rota: Vec3[]
  conexaoInicio: string
  conexaoFim: string
  /** Quanto o ajuste faz o cabo "barrigar" no meio do trajeto. */
  referencia: number
  escalaFolga: number
  /** Curso util em milimetros: estica o cabo e desloca a ponta. */
  tracao?: number
}

function Cabo({ id, rota, conexaoInicio, conexaoFim, referencia, escalaFolga, tracao = 0 }: CaboProps) {
  const est = useSim((s) => s.parts[id])
  const ini = useSim((s) => s.conexoes[conexaoInicio])
  const fim = useSim((s) => s.conexoes[conexaoFim])
  const sel = useSim((s) => s.sel?.id === id)
  const hov = useSim((s) => s.hov?.id === id)
  const raioX = useSim((s) => s.raioX)
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)

  const def = PARTE_POR_ID[id]
  const removido = est.status === 'REMOVED'

  const curva = useMemo(() => {
    const pts = rota.map((p) => new Vector3(...p))
    // Sob tracao o cabo estica: a barriga da folga vai sumindo.
    const tensao = Math.min(1, tracao / CURSO_DESENGATE)
    const barriga = (est.ajuste - referencia) * escalaFolga * (1 - tensao)
    for (let i = 1; i < pts.length - 1; i++) {
      const peso = Math.sin((i / (pts.length - 1)) * Math.PI)
      pts[i].y -= barriga * peso
    }
    // E a ponta corre na direcao da alavanca, na proporcao do curso util.
    if (tensao > 0) {
      const n = pts.length - 1
      const dir = pts[n].clone().sub(pts[n - 1]).normalize()
      pts[n].add(dir.multiplyScalar(tensao * 0.035))
    }
    if (!ini) {
      pts[0] = pts[0].clone().add(new Vector3(0.05, -0.13, 0.03))
      pts[1] = pts[1].clone().add(new Vector3(0.02, -0.06, 0))
    }
    if (!fim) {
      const n = pts.length - 1
      pts[n] = pts[n].clone().add(new Vector3(0.06, -0.14, -0.04))
      pts[n - 1] = pts[n - 1].clone().add(new Vector3(0.03, -0.07, 0))
    }
    return new CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
  }, [rota, est.ajuste, referencia, escalaFolga, ini, fim, tracao])

  const corBase = est.condicao === 'ruim' ? '#7a4a2a' : est.condicao === 'novo' ? '#2f3438' : COR.cabo
  const emissive = sel ? COR.sel : hov ? COR.hov : est.condicao === 'ruim' ? COR.alerta : '#000'
  const emissiveIntensity = sel ? 0.6 : hov ? 0.35 : est.condicao === 'ruim' ? 0.3 : 0

  const eventos = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      selecionar({ tipo: 'peca', id })
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      apontar({ tipo: 'peca', id })
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      apontar(null)
      document.body.style.cursor = 'auto'
    },
  }

  if (removido) {
    const slot = slotBancada(def.bancada ?? 0)
    return (
      <group position={slot} {...eventos}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.008, 8, 30]} />
          <meshStandardMaterial color={corBase} roughness={0.85} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
          <meshStandardMaterial color={corBase} roughness={0.85} />
        </mesh>
      </group>
    )
  }

  return (
    <group {...eventos}>
      <mesh>
        <tubeGeometry args={[curva, 60, 0.0085, 6, false]} />
        <meshStandardMaterial
          color={corBase}
          roughness={0.85}
          metalness={0.2}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          transparent={raioX}
          opacity={raioX ? 0.95 : 1}
        />
      </mesh>
      {/* Capa (conduite) na parte central do trajeto */}
      <mesh>
        <tubeGeometry args={[curva, 40, 0.014, 6, false]} />
        <meshStandardMaterial color="#23272a" roughness={0.95} transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

export function Cabos() {
  const cursoCabo = useSim((s) => s.drive.acionamento.cursoCabo)
  return (
    <>
      <Cabo
        id="cabo-acelerador"
        rota={ROTA_ACELERADOR}
        conexaoInicio="c-acel-pedal"
        conexaoFim="c-acel-carb"
        referencia={2}
        escalaFolga={0.012}
      />
      <Cabo
        id="cabo-embreagem"
        rota={ROTA_EMBREAGEM}
        conexaoInicio="c-embr-pedal"
        conexaoFim="c-embr-alavanca"
        referencia={15}
        escalaFolga={0.0035}
        tracao={cursoCabo}
      />
    </>
  )
}

/** Pontos de conexao: clicaveis, verdes quando ligados, ambar quando soltos. */
export function PontosDeConexao() {
  const tampaAberta = useSim((s) => s.parts['tampa-motor'].aberto)
  const capoAberto = useSim((s) => s.parts['capo-dianteiro'].aberto)
  const raioX = useSim((s) => s.raioX)
  const visao = useSim((s) => s.visaoMecanica)
  const camMode = useSim((s) => s.camMode)
  const carcacaFora = useSim((s) => s.parts['carcaca-embreagem']?.status === 'REMOVED')

  return (
    <group>
      {CONEXOES.map((c) => {
        const pa = PARTE_POR_ID[c.a]
        const pb = PARTE_POR_ID[c.b]
        const comp = pa?.compartimento ?? pb?.compartimento
        let visivel = true
        if (comp === 'motor') visivel = tampaAberta || raioX || visao
        if (comp === 'dianteiro') visivel = capoAberto || raioX || visao
        if (comp === 'cabine') visivel = raioX || visao || camMode === 'cabine' || camMode === 'dirigir'
        // Conexao entre pecas internas segue a regra das pecas internas.
        if (pa?.interno || pb?.interno) visivel = visivel && (visao || raioX || carcacaFora)
        if (!visivel) return null
        return <Conexao key={c.id} id={c.id} pos={c.pos} />
      })}
    </group>
  )
}

function Conexao({ id, pos }: { id: string; pos: Vec3 }) {
  const ligada = useSim((s) => s.conexoes[id])
  const sel = useSim((s) => s.sel?.tipo === 'conexao' && s.sel.id === id)
  const hov = useSim((s) => s.hov?.tipo === 'conexao' && s.hov.id === id)
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)
  const m = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!m.current) return
    const p = ligada ? 1 : 1 + Math.sin(clock.elapsedTime * 5) * 0.25
    m.current.scale.setScalar(p * (sel ? 1.5 : hov ? 1.3 : 1))
  })

  return (
    <mesh
      ref={m}
      position={pos}
      onClick={(e) => {
        e.stopPropagation()
        selecionar({ tipo: 'conexao', id })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        apontar({ tipo: 'conexao', id })
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        apontar(null)
        document.body.style.cursor = 'auto'
      }}
    >
      <sphereGeometry args={[0.018, 12, 10]} />
      <meshStandardMaterial
        color={ligada ? COR.ok : '#ff9f2e'}
        emissive={ligada ? COR.ok : '#ff9f2e'}
        emissiveIntensity={ligada ? 0.35 : 0.9}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  )
}
