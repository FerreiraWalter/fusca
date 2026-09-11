/**
 * Geometria da embreagem, do cambio e do posto de conducao.
 *
 * Nenhuma peca aqui e decorativa: cada uma le o estado calculado em
 * sim/driveline.ts e se move como consequencia. Piso no pedal -> o cabo puxa
 * -> a alavanca gira -> o garfo gira -> o rolamento avanca -> os dedos do
 * plato cedem -> o disco para de acompanhar o volante. A animacao e a propria
 * cadeia causal, nao uma ilustracao dela.
 *
 * Os cursos reais sao minusculos (o rolamento anda 8,5 mm) e ficariam
 * invisiveis na escala do carro, entao alguns deslocamentos sao amplificados
 * por um fator declarado. O que nao e amplificado e a RELACAO entre eles.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, DoubleSide, Vector3, type Group } from 'three'
import { useSim } from '../state/store'
import { COR, M, useEstiloPeca } from './matlib'
import { FATOR_CURSO } from './escala'

/** rpm -> rad/s, ja reduzido para nao virar estroboscopio na tela. */
const ESCALA_GIRO = 0.22
const giroPorSegundo = (rpm: number) => (rpm / 60) * Math.PI * 2 * ESCALA_GIRO

/** Trajeto do conduite pelo tunel central, em coordenadas do veiculo. */
const ROTA_CONDUITE: [number, number, number][] = [
  [0.44, 0.2, 0.6],
  [0.4, 0.15, 0.42],
  [0.22, 0.11, 0.05],
  [0.18, 0.13, -0.55],
  [0.2, 0.3, -0.86],
  [0.27, 0.52, -1.0],
]

/** Rotacao do disco: ele e estriado no eixo primario, nao no volante. */
function rpmDoDisco(): number {
  const s = useSim.getState()
  const { drive, rt } = s
  if (drive.marcha !== 'N' && Math.abs(drive.rpmPrimario) > 1) return drive.rpmPrimario
  // Em neutro o disco e arrastado pelo volante na proporcao do acoplamento.
  return rt.rpm * drive.acionamento.engate
}

/* ────────────────────────── conjunto de embreagem ─────────────────────── */

export function VolanteMotor() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += giroPorSegundo(useSim.getState().rt.rpm) * dt
  })
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group ref={g}>
        {/* Massa de aco: e ela que guarda energia entre as explosoes */}
        <mesh castShadow>
          <cylinderGeometry args={[0.112, 0.112, 0.03, 40]} />
          <M color="#6f6a63" metalness={0.72} roughness={0.42} />
        </mesh>
        {/* Face de atrito retificada, voltada para o disco */}
        <mesh position={[0, 0.016, 0]}>
          <cylinderGeometry args={[0.106, 0.106, 0.004, 40]} />
          <M color="#8d8a84" metalness={0.85} roughness={0.22} />
        </mesh>
        {/* Cremalheira do motor de partida */}
        <mesh position={[0, -0.004, 0]}>
          <cylinderGeometry args={[0.122, 0.122, 0.016, 48]} />
          <M color="#4f4c47" metalness={0.7} roughness={0.55} />
        </mesh>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.122, -0.004, Math.sin(a) * 0.122]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.008, 0.016, 0.012]} />
              <M color="#585550" metalness={0.7} roughness={0.55} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export function DiscoEmbreagem() {
  const g = useRef<Group>(null)
  const condicao = useSim((s) => s.parts['disco-embreagem'].condicao)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += giroPorSegundo(rpmDoDisco()) * dt
  })
  // Guarnicao gasta fica fina e escura; nova, clara e com espessura cheia.
  const gasto = condicao === 'ruim' ? 1 : condicao === 'desgastado' ? 0.55 : 0
  const espessura = 0.012 - gasto * 0.006
  const cor = gasto > 0.8 ? '#3b332c' : gasto > 0 ? '#6b5c4c' : '#8a7a63'
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group ref={g}>
        {/* Coroa de material de atrito */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, espessura, 36, 1, true]} />
          <M color={cor} metalness={0.05} roughness={0.95} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.058, 0.1, 36]} />
          <M color={cor} metalness={0.05} roughness={0.95} />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]}>
          <ringGeometry args={[0.058, 0.1, 36]} />
          <M color={cor} metalness={0.05} roughness={0.95} />
        </mesh>
        {/* Cubo estriado com as molas amortecedoras de torcao */}
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 0.034, 18]} />
          <M color="#7d8388" metalness={0.75} roughness={0.4} />
        </mesh>
        {Array.from({ length: 4 }, (_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <mesh key={i} position={[Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045]} rotation={[Math.PI / 2, 0, -a]}>
              <cylinderGeometry args={[0.009, 0.009, 0.026, 10]} />
              <M color="#9aa1a6" metalness={0.8} roughness={0.35} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export function PlatoEmbreagem() {
  const g = useRef<Group>(null)
  const dedos = useRef<Group>(null)
  useFrame((_, dt) => {
    const s = useSim.getState()
    if (g.current) g.current.rotation.y += giroPorSegundo(s.rt.rpm) * dt
    // Os dedos da mola-membrana cedem na medida da carga do rolamento.
    if (dedos.current) {
      const alvo = s.drive.acionamento.cargaPlato * 0.42
      dedos.current.rotation.x += (alvo - dedos.current.rotation.x) * 0.25
    }
  })
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group ref={g}>
        {/* Capa estampada, parafusada ao volante */}
        <mesh castShadow>
          <cylinderGeometry args={[0.114, 0.114, 0.03, 36, 1, true]} />
          <M color="#5b6165" metalness={0.7} roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.014, 0]}>
          <ringGeometry args={[0.07, 0.114, 36]} />
          <M color="#5b6165" metalness={0.7} roughness={0.45} />
        </mesh>
        {/* Placa de pressao que encosta no disco */}
        <mesh position={[0, -0.012, 0]}>
          <cylinderGeometry args={[0.104, 0.104, 0.012, 36]} />
          <M color="#7f8489" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Dedos da mola-membrana: e neles que o rolamento empurra */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <group key={i} rotation={[0, -a, 0]}>
              <group ref={i === 0 ? dedos : undefined} position={[0.062, 0.016, 0]}>
                <mesh position={[-0.018, 0, 0]} rotation={[0, 0, 0.12]}>
                  <boxGeometry args={[0.05, 0.004, 0.012]} />
                  <M color="#9aa1a6" metalness={0.85} roughness={0.28} />
                </mesh>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

export function RolamentoEmbreagem() {
  const g = useRef<Group>(null)
  const anel = useRef<Group>(null)
  useFrame((_, dt) => {
    const s = useSim.getState()
    const acion = s.drive.acionamento
    // Avanco real x FATOR_CURSO: 8,5 mm sumiriam na escala do carro.
    const alvo = -(acion.cursoRolamento / 1000) * FATOR_CURSO
    if (g.current) g.current.position.z += (alvo - g.current.position.z) * 0.28
    // O anel externo so gira quando encosta nos dedos do plato.
    if (anel.current && acion.cargaPlato > 0.02)
      anel.current.rotation.y += giroPorSegundo(s.rt.rpm) * dt
  })
  return (
    <group ref={g}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Luva que desliza sobre a guia do eixo primario */}
        <mesh castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.05, 20]} />
          <M color="#6a7175" metalness={0.75} roughness={0.4} />
        </mesh>
        {/* Rebaixos onde as pontas do garfo se encaixam */}
        {[-1, 1].map((l) => (
          <mesh key={l} position={[l * 0.034, 0.008, 0]}>
            <boxGeometry args={[0.012, 0.02, 0.03]} />
            <M color="#565c60" metalness={0.7} roughness={0.5} />
          </mesh>
        ))}
        <group ref={anel}>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.016, 24]} />
            <M color="#aeb4b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.0395, 0.0395, 0.006, 24]} />
            <M color="#8d9498" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function GarfoEmbreagem() {
  const g = useRef<Group>(null)
  useFrame(() => {
    const acion = useSim.getState().drive.acionamento
    // Giro real do garfo, amplificado no mesmo fator do rolamento.
    const alvo = (acion.anguloGarfo * Math.PI) / 180
    if (g.current) g.current.rotation.x += (alvo - g.current.rotation.x) * 0.25
  })
  return (
    <group ref={g}>
      {/* Eixo transversal apoiado em buchas na carcaca */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, 0.26, 12]} />
        <M color="#5d6367" metalness={0.75} roughness={0.42} />
      </mesh>
      {/* Bracos que abracam a luva do rolamento */}
      {[-1, 1].map((l) => (
        <group key={l} position={[l * 0.05, 0, 0]}>
          <mesh position={[0, 0, -0.022]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.016, 0.012, 0.06]} />
            <M color="#666d71" metalness={0.7} roughness={0.45} />
          </mesh>
          <mesh position={[l * -0.012, 0, -0.05]}>
            <boxGeometry args={[0.02, 0.014, 0.016]} />
            <M color="#767d81" metalness={0.7} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* Braco de entrada, onde a alavanca externa gira o eixo */}
      <mesh position={[0.13, 0.02, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.014, 0.05, 0.012]} />
        <M color="#5d6367" metalness={0.75} roughness={0.42} />
      </mesh>
    </group>
  )
}

export function EixoPrimario() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += giroPorSegundo(rpmDoDisco()) * dt
  })
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group ref={g}>
        <mesh castShadow>
          <cylinderGeometry args={[0.017, 0.017, 0.3, 14]} />
          <M color="#8b9297" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* Trecho estriado onde o cubo do disco encaixa */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.021, 0.021, 0.05, 16]} />
          <M color="#9aa1a6" metalness={0.9} roughness={0.22} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.021, -0.12, Math.sin(a) * 0.021]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.004, 0.05, 0.005]} />
              <M color="#7f868b" metalness={0.85} roughness={0.3} />
            </mesh>
          )
        })}
        {/* Luva-guia fixa: e o trilho do rolamento */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.11, 16]} />
          <M color="#63696d" metalness={0.6} roughness={0.55} />
        </mesh>
      </group>
    </group>
  )
}

export function CarcacaEmbreagem() {
  const { ghost, sel } = useEstiloPeca()
  const visao = useSim((s) => s.visaoMecanica)
  // Na visao mecanica o sino fica translucido para nao esconder o conjunto.
  const transparente = visao && !ghost
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.17, 0.165, 0.18, 28, 1, true]} />
        <meshStandardMaterial
          color="#8d9297"
          metalness={0.5}
          roughness={0.62}
          side={DoubleSide}
          transparent
          opacity={ghost ? 0.16 : transparente ? 0.2 : 0.92}
          depthWrite={!transparente}
          wireframe={ghost}
          emissive={sel ? COR.sel : '#000'}
          emissiveIntensity={sel ? 0.4 : 0}
        />
      </mesh>
      {/* Flange de uniao com o motor */}
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.014, 28]} />
        <M color="#7e8388" metalness={0.55} roughness={0.6} transparent opacity={transparente ? 0.35 : 1} />
      </mesh>
      {/* Janela de inspecao da cremalheira */}
      <mesh position={[0, 0.02, 0.168]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.01]} />
        <M color="#4a4f53" metalness={0.5} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ─────────────────────────────── cambio ───────────────────────────────── */

export function CaixaCambio() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.3, 0.34]} />
        <M color="#6d7479" metalness={0.55} roughness={0.65} />
      </mesh>
      {/* Nariz dianteiro, onde entra a haste do cambio */}
      <mesh position={[0, 0.06, 0.2]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.1]} />
        <M color="#666d72" metalness={0.55} roughness={0.65} />
      </mesh>
      {/* Bujoes de nivel e de dreno do SAE 90 */}
      <mesh position={[0.152, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 6]} />
        <M color="#4e5559" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0.152, -0.13, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 6]} />
        <M color="#4e5559" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* Carcaca do diferencial */}
      <mesh position={[0, -0.04, -0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.13, 22]} />
        <M color="#6d7479" metalness={0.55} roughness={0.65} />
      </mesh>
    </group>
  )
}

export function Semieixos() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    const dl = useSim.getState().drive
    // Tubos nao giram; o que gira e o eixo interno, sugerido pela luva.
    if (g.current) g.current.rotation.x += (dl.velocidade / 0.3) * dt * ESCALA_GIRO
  })
  return (
    <group>
      {[-1, 1].map((l) => (
        <group key={l} position={[l * 0.42, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.56, 14]} />
            <M color="#4d5459" metalness={0.6} roughness={0.6} />
          </mesh>
          {/* Coifa de borracha na juncao com o diferencial */}
          <mesh position={[l * -0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.04, 0.06, 14]} />
            <M color={COR.borracha} metalness={0.05} roughness={0.95} />
          </mesh>
        </group>
      ))}
      <group ref={g}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 10]} />
          <M color="#8d9297" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Tampa seletora: o movimento lateral da alavanca escolhe qual dos tres
 * eixos de garfos sera movido; o movimento para frente e para tras engata.
 */
export function SeletorMarchas() {
  const dedo = useRef<Group>(null)
  const garfos = useRef<Group>(null)
  useFrame(() => {
    const dl = useSim.getState().drive
    if (dedo.current) {
      dedo.current.position.x += (dl.portao.x * 0.028 - dedo.current.position.x) * 0.2
      dedo.current.position.z += (-dl.portao.y * 0.03 - dedo.current.position.z) * 0.2
    }
    if (garfos.current) garfos.current.position.z += (-dl.portao.y * 0.03 - garfos.current.position.z) * 0.2
  })
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.13, 0.05, 0.14]} />
        <M color="#737a7f" metalness={0.55} roughness={0.62} />
      </mesh>
      {/* Dedo seletor: a ponta que a haste do cambio movimenta */}
      <group ref={dedo}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.05, 10]} />
          <M color="#9aa1a6" metalness={0.8} roughness={0.32} />
        </mesh>
      </group>
      {/* Tres eixos de garfos internos: 1a/2a, 3a/4a e re */}
      <group ref={garfos} position={[0, -0.04, 0]}>
        {[-0.04, 0, 0.04].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.14, 8]} />
            <M color="#868d92" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Haste que corre pelo tunel central, da alavanca ate a tampa seletora. */
export function HasteCambio() {
  const g = useRef<Group>(null)
  useFrame(() => {
    const dl = useSim.getState().drive
    if (!g.current) return
    // Girar em torno do proprio eixo = escolher o corredor do H.
    g.current.rotation.z += (dl.portao.x * 0.5 - g.current.rotation.z) * 0.2
    // Deslizar no sentido do comprimento = engatar.
    g.current.position.z += (-dl.portao.y * 0.03 - g.current.position.z) * 0.2
  })
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, 1.15, 10]} />
        <M color="#7d8489" metalness={0.75} roughness={0.4} />
      </mesh>
      {/* Bucha central de apoio no tunel */}
      <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.04, 12]} />
        <M color={COR.borracha} metalness={0.05} roughness={0.95} />
      </mesh>
      {/* Garra de acoplamento na ponta da alavanca */}
      <mesh position={[0, 0.012, 0.56]}>
        <boxGeometry args={[0.03, 0.03, 0.05]} />
        <M color="#8b9297" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Alavanca de cambio. O curso desenha, no espaco, o portao em H. */
export function AlavancaCambio() {
  const g = useRef<Group>(null)
  useFrame(() => {
    const dl = useSim.getState().drive
    if (!g.current) return
    g.current.rotation.z += (-dl.portao.x * 0.3 - g.current.rotation.z) * 0.22
    g.current.rotation.x += (-dl.portao.y * 0.26 - g.current.rotation.x) * 0.22
    g.current.position.y += ((dl.portao.baixo ? -0.022 : 0) - g.current.position.y) * 0.22
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.015, 0.3, 10]} />
        <M color="#2b3034" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Manopla */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.028, 16, 12]} />
        <M color="#17191c" metalness={0.15} roughness={0.75} />
      </mesh>
      {/* Rotula presa ao tunel */}
      <mesh>
        <sphereGeometry args={[0.026, 14, 10]} />
        <M color="#5c6266" metalness={0.7} roughness={0.45} />
      </mesh>
      {/* Coifa de borracha */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.05, 0.032, 0.05, 14, 1, true]} />
        <M color={COR.borracha} metalness={0.05} roughness={0.95} />
      </mesh>
    </group>
  )
}

/* ────────────────────────────── cabine ────────────────────────────────── */

export function VolanteDirecao() {
  return (
    <group rotation={[-0.5, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.15, 0.014, 10, 30]} />
        <M color="#23272b" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Dois raios, como no volante de 1973 */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.075, -0.012, -0.01]} rotation={[0, 0, l * 0.18]}>
          <boxGeometry args={[0.14, 0.012, 0.006]} />
          <M color="#2b3034" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.012]}>
        <cylinderGeometry args={[0.035, 0.035, 0.018, 16]} />
        <M color="#1d2023" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.09]}>
        <cylinderGeometry args={[0.017, 0.017, 0.2, 10]} />
        <M color="#2b3034" metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  )
}

export function BancoMotorista() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.1, 0.42]} />
        <M color="#3b3029" metalness={0.05} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.24, -0.18]} rotation={[0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.45, 0.1]} />
        <M color="#3b3029" metalness={0.05} roughness={0.92} />
      </mesh>
      {/* Trilhos parafusados ao assoalho */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.14, -0.06, 0]}>
          <boxGeometry args={[0.03, 0.02, 0.4]} />
          <M color="#4a5054" metalness={0.7} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Conduite do cabo da embreagem. A geometria e tracada em coordenadas do
 * veiculo, entao o grupo desconta a posicao de encaixe aplicada por <Peca>.
 */
export function ConduiteEmbreagem({ ancora }: { ancora: [number, number, number] }) {
  const condicao = useSim((s) => s.parts['conduite-embreagem'].condicao)
  const amassado = condicao === 'ruim'
  const curva = new CatmullRomCurve3(
    ROTA_CONDUITE.map((p) => new Vector3(...p)),
    false,
    'catmullrom',
    0.4,
  )
  return (
    <group position={[-ancora[0], -ancora[1], -ancora[2]]}>
      <mesh>
        <tubeGeometry args={[curva, 48, 0.016, 8, false]} />
        <M color={amassado ? '#4a3527' : '#23272a'} metalness={0.2} roughness={0.9} />
      </mesh>
      {/* Ponto amassado: a capa deformada e o que engole o curso do cabo */}
      {amassado && (
        <mesh position={[0.2, 0.12, -0.3]} scale={[1.6, 0.5, 1]}>
          <sphereGeometry args={[0.028, 12, 8]} />
          <M color={COR.ferrugem} metalness={0.2} roughness={0.95} />
        </mesh>
      )}
      {/* Terminais de apoio: e contra eles que o cabo faz forca */}
      {[ROTA_CONDUITE[0], ROTA_CONDUITE[ROTA_CONDUITE.length - 1]].map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.022, 0.022, 0.03, 10]} />
          <M color="#4d5459" metalness={0.6} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────────────────────── pista de teste ─────────────────────────── */

/**
 * Pista de oficina. O Fusca fica parado na origem e o cenario e que corre:
 * assim toda a instrumentacao 3D (cofre aberto, raio-x, foco em pecas)
 * continua valendo enquanto o carro "anda".
 */
/** Espacamento dos elementos que se repetem ao longo da pista, em metros. */
const PASSO_FAIXA = 4
const PASSO_CONE = 12
/**
 * A pista comeca bem a frente do carro e termina bem atras dele. O salto do
 * padrao repetido acontece so nas duas pontas: a da frente fica alem do
 * alcance da neblina (34 m) e a de tras fica as costas do motorista.
 */
const FAIXAS = 40
const CONES = 12
const FRENTE_FAIXA = 80
const FRENTE_CONE = 84

export function PistaTeste() {
  const ativo = useSim((s) => s.drive.pista)
  const faixas = useRef<Group>(null)
  const cones = useRef<Group>(null)

  useFrame(() => {
    const d = useSim.getState().drive.distancia
    // O carro fica parado na origem, olhando para +Z: andar para a frente e o
    // cenario vir na direcao dele, ou seja, deslocar-se para -Z. O modulo do
    // espacamento faz o padrao se repetir sem fim.
    const desloca = (passo: number) => -(((d % passo) + passo) % passo)
    if (faixas.current) faixas.current.position.z = desloca(PASSO_FAIXA)
    if (cones.current) cones.current.position.z = desloca(PASSO_CONE)
  })

  if (!ativo) return null

  return (
    <group>
      {/* Asfalto */}
      <mesh position={[0, 0.006, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 180]} />
        <meshStandardMaterial color="#1b1e21" roughness={0.98} />
      </mesh>
      {/* Faixa central tracejada */}
      <group ref={faixas}>
        {Array.from({ length: FAIXAS }, (_, i) => (
          <mesh
            key={i}
            position={[0, 0.012, FRENTE_FAIXA - i * PASSO_FAIXA]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.12, 1.8]} />
            <meshStandardMaterial color="#c9c4ad" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* Bordas */}
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, 0.012, 5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 180]} />
          <meshStandardMaterial color="#8f8a76" roughness={0.9} />
        </mesh>
      ))}
      {/* Cones de referencia a cada 12 m */}
      <group ref={cones}>
        {Array.from({ length: CONES }, (_, i) => (
          <group key={i}>
            {[-2.6, 2.6].map((x) => (
              <mesh key={x} position={[x, 0.13, FRENTE_CONE - i * PASSO_CONE]} castShadow>
                <coneGeometry args={[0.11, 0.26, 12]} />
                <meshStandardMaterial color="#d4541f" roughness={0.7} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  )
}
