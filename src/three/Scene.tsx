import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Grid, Html, Lightformer, OrbitControls } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { PARTES, PARTE_POR_ID, slotBancada } from '../data/parts'
import { PARAFUSO_POR_ID } from '../data/bolts'
import { CONEXAO_POR_ID } from '../data/connections'
import { useSim, type CamMode } from '../state/store'
import { Carroceria, Tampas } from './Body'
import { Peca } from './Peca'
import { Parafusos, FerramentaEmAcao, DicaFerramenta } from './Bolts'
import { Cabos, PontosDeConexao } from './Cables'
import { COR } from './matlib'
import {
  AlavancaEmbreagem,
  Bateria,
  Bobina,
  BombaCombustivel,
  FiltroCombustivel,
  LinhaCombustivel,
  CabosVela,
  CarcacaVentoinha,
  ChapasDoCofre,
  Carburador,
  CilindroMestre,
  Correia,
  Distribuidor,
  Escapamento,
  FiltroAr,
  Gerador,
  MangueiraCombustivel,
  ModuloIgnicao,
  MotorBoxer,
  Pedal,
  RegulagemFreio,
  ReservatorioFreio,
  RodaTraseira,
  Rotor,
  TamborFreio,
  TampaDistribuidor,
  TanqueCombustivel,
  Vela,
  Ventoinha,
} from './PartMeshes'
import {
  AlavancaCambio,
  BancoMotorista,
  CaixaCambio,
  CarcacaEmbreagem,
  ConduiteEmbreagem,
  DiscoEmbreagem,
  EixoPrimario,
  GarfoEmbreagem,
  HasteCambio,
  PistaTeste,
  PlatoEmbreagem,
  RolamentoEmbreagem,
  Semieixos,
  SeletorMarchas,
  VolanteDirecao,
  VolanteMotor,
} from './Driveline'

const MESHES: Record<string, ReactNode> = {
  'motor-boxer': <MotorBoxer />,
  'filtro-ar': <FiltroAr />,
  carburador: <Carburador />,
  'carcaca-ventoinha': <CarcacaVentoinha />,
  ventoinha: <Ventoinha />,
  gerador: <Gerador />,
  correia: <Correia />,
  escapamento: <Escapamento />,
  'mangueira-combustivel': <MangueiraCombustivel />,
  'bomba-combustivel': <BombaCombustivel />,
  'filtro-combustivel': <FiltroCombustivel />,
  'tanque-combustivel': <TanqueCombustivel />,
  distribuidor: <Distribuidor />,
  'tampa-distribuidor': <TampaDistribuidor />,
  rotor: <Rotor />,
  'modulo-ignicao': <ModuloIgnicao />,
  bobina: <Bobina />,
  'cabos-vela': <CabosVela />,
  'vela-1': <Vela />,
  'vela-2': <Vela />,
  'vela-3': <Vela />,
  'vela-4': <Vela />,
  bateria: <Bateria />,
  'pedal-acelerador': <Pedal tipo="acelerador" />,
  'pedal-freio': <Pedal tipo="freio" />,
  'pedal-embreagem': <Pedal tipo="embreagem" />,
  'alavanca-embreagem': <AlavancaEmbreagem />,
  'cilindro-mestre': <CilindroMestre />,
  'reservatorio-freio': <ReservatorioFreio />,
  'regulagem-freio-tras': <RegulagemFreio />,
  'tambor-tras-esq': <TamborFreio />,
  'roda-tras-esq': <RodaTraseira />,
  // ── embreagem, cambio e cabine ──
  'conduite-embreagem': <ConduiteEmbreagem ancora={[0.22, 0.15, -0.1]} />,
  'carcaca-embreagem': <CarcacaEmbreagem />,
  'garfo-embreagem': <GarfoEmbreagem />,
  'rolamento-embreagem': <RolamentoEmbreagem />,
  'plato-embreagem': <PlatoEmbreagem />,
  'disco-embreagem': <DiscoEmbreagem />,
  'volante-motor': <VolanteMotor />,
  'eixo-primario': <EixoPrimario />,
  'caixa-cambio': <CaixaCambio />,
  'seletor-marchas': <SeletorMarchas />,
  'haste-cambio': <HasteCambio />,
  'alavanca-cambio': <AlavancaCambio />,
  semieixos: <Semieixos />,
  'volante-direcao': <VolanteDirecao />,
  'banco-motorista': <BancoMotorista />,
}

const FIXAS = new Set([
  'motor-boxer',
  'escapamento',
  'pedal-acelerador',
  'pedal-freio',
  'pedal-embreagem',
  'alavanca-embreagem',
  'cilindro-mestre',
  'reservatorio-freio',
  'tanque-combustivel',
  'regulagem-freio-tras',
  'eixo-primario',
  'caixa-cambio',
  'semieixos',
  'volante-direcao',
  'conduite-embreagem',
])

export function Scene() {
  return (
    <>
      <Iluminacao />
      <Oficina />
      <PistaTeste />
      <group name="fusca">
        <Carroceria />
        <Tampas />
        <PecasDoVeiculo />
        <DecoracaoMotor />
        <Cabos />
        <Parafusos />
        <PontosDeConexao />
        <DicaFerramenta />
        <FerramentaEmAcao />
      </group>
      <Etiqueta />
      <CameraRig />
    </>
  )
}

/** Detalhes fixos do vao do motor que nao sao componentes desmontaveis. */
function DecoracaoMotor() {
  const aberto = useSim((s) => s.parts['tampa-motor'].aberto)
  const capo = useSim((s) => s.parts['capo-dianteiro'].aberto)
  const raioX = useSim((s) => s.raioX)
  const visao = useSim((s) => s.visaoMecanica)
  const filtro = useSim((s) => s.filtro)
  // Estas chapas nao sao pecas: nao respondem ao filtro de sistema e acabariam
  // tapando justamente o que o filtro quer mostrar.
  if (visao && filtro !== 'todos' && filtro !== 'motor') return null
  if (!aberto && !capo && !raioX) return null
  return (
    <>
      {(aberto || raioX) && <ChapasDoCofre />}
      <LinhaCombustivel />
    </>
  )
}

function PecasDoVeiculo() {
  return (
    <>
      {PARTES.filter((p) => MESHES[p.id]).map((p) => (
        <Peca key={p.id} id={p.id} fixa={FIXAS.has(p.id)}>
          {MESHES[p.id]}
        </Peca>
      ))}
    </>
  )
}

function Iluminacao() {
  const claridade = useSim((s) => s.claridade)

  return (
    <>
      {/* Luz ambiente geral suave e uniforme */}
      <ambientLight intensity={0.9 * claridade} color="#edf2f7" />
      {/* Luz hemisférica: ilumina perfeitamente tanto o topo quanto o assoalho/parte inferior */}
      <hemisphereLight args={['#d4e2f0', '#1c2228', 1.0 * claridade]} />

      {/* Luz principal do estúdio lateral em cota suave */}
      <directionalLight
        position={[4, 4, 3]}
        intensity={1.2 * claridade}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />
      {/* Luzes de preenchimento lateral estilo fotográfico (Rim & Fill lights) */}
      <directionalLight position={[-5, 2.5, -3]} intensity={0.7 * claridade} color="#a0c4e8" />
      <directionalLight position={[5, 2.0, -4]} intensity={0.5 * claridade} color="#f5e0c8" />

      {/* Iluminação inferior rebatida para visualização limpa e perfeita do assoalho e mecânica */}
      <directionalLight position={[0, -5, 0]} intensity={0.4 * claridade} color="#b4cbe0" />

      {/* Iluminação sutil do cofre do motor */}
      <pointLight position={[0, 1.4, -1.35]} intensity={0.8 * claridade} color="#e8f0f8" distance={2.5} decay={2} />

      {/* Estúdio virtual com softboxes laterais */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={1.5 * claridade} position={[-6, 3, 0]} scale={[8, 4, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={1.2 * claridade} position={[6, 3, 0]} scale={[8, 4, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.8 * claridade} position={[0, 2, -6]} scale={[6, 3, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.8 * claridade} position={[0, 2, 6]} scale={[6, 3, 1]} target={[0, 0.8, 0]} />
      </Environment>

      <ContactShadows position={[0, 0.002, 0]} opacity={0.45} scale={15} blur={2.2} far={3} resolution={1024} />
    </>
  )
}

function Oficina() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#16191d" roughness={0.95} metalness={0.05} />
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[50, 50]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a3138"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#35424d"
        fadeDistance={32}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  )
}

/* ─────────────────────────────── camera ──────────────────────────────── */

const PRESETS: Record<Exclude<CamMode, 'foco'>, { pos: Vector3; alvo: Vector3 }> = {
  geral: { pos: new Vector3(4.4, 2.5, 4.8), alvo: new Vector3(0, 0.8, 0) },
  oficina: { pos: new Vector3(0.42, 1.86, -2.72), alvo: new Vector3(0, 0.93, -1.5) },
  cabine: { pos: new Vector3(2.0, 1.5, 2.3), alvo: new Vector3(0.3, 0.5, 0.7) },
  dianteiro: { pos: new Vector3(0.8, 2.2, 3.6), alvo: new Vector3(0, 0.9, 1.35) },
  // Olho do motorista: acima da linha do capo e mirando a pista a uns 8 m.
  // Mais baixo que isto e a tampa dianteira toma a tela inteira.
  dirigir: { pos: new Vector3(0.33, 1.2, 0.34), alvo: new Vector3(0.28, 0.3, 8) },
  cambio: { pos: new Vector3(1.12, 0.82, -0.9), alvo: new Vector3(0, 0.66, -1.25) },
}

function posicaoDoAlvo(id: string | null): Vector3 | null {
  if (!id) return null
  const p = PARTE_POR_ID[id]
  if (p) {
    const est = useSim.getState().parts[id]
    if (est?.status === 'REMOVED' && p.bancada != null) return new Vector3(...slotBancada(p.bancada))
    return new Vector3(...p.pos)
  }
  const b = PARAFUSO_POR_ID[id]
  if (b) return new Vector3(...b.pos)
  const c = CONEXAO_POR_ID[id]
  if (c) return new Vector3(...c.pos)
  return null
}

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camMode = useSim((s) => s.camMode)
  const focoAlvo = useSim((s) => s.focoAlvo)
  const camNonce = useSim((s) => s.camNonce)
  const animando = useRef(true)
  const { camera } = useThree()

  useEffect(() => {
    animando.current = true
  }, [camMode, focoAlvo, camNonce])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c || !animando.current) return
    let pos: Vector3
    let alvo: Vector3
    if (camMode === 'foco') {
      const p = posicaoDoAlvo(focoAlvo)
      if (!p) {
        animando.current = false
        return
      }
      alvo = p
      const dir = camera.position.clone().sub(c.target).normalize()
      const ehFixador = !!focoAlvo && (!!PARAFUSO_POR_ID[focoAlvo] || !!CONEXAO_POR_ID[focoAlvo])
      const dist = ehFixador ? 0.3 : 0.85
      pos = p.clone().add(dir.multiplyScalar(dist)).add(new Vector3(0, ehFixador ? 0.05 : 0.12, 0))
    } else {
      pos = PRESETS[camMode].pos
      alvo = PRESETS[camMode].alvo
    }
    camera.position.x = MathUtils.damp(camera.position.x, pos.x, 3, dt)
    camera.position.y = MathUtils.damp(camera.position.y, pos.y, 3, dt)
    camera.position.z = MathUtils.damp(camera.position.z, pos.z, 3, dt)
    c.target.x = MathUtils.damp(c.target.x, alvo.x, 3, dt)
    c.target.y = MathUtils.damp(c.target.y, alvo.y, 3, dt)
    c.target.z = MathUtils.damp(c.target.z, alvo.z, 3, dt)
    c.update()
    if (camera.position.distanceTo(pos) < 0.015) animando.current = false
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      onStart={() => {
        animando.current = false
      }}
      enablePan
      minDistance={0.15}
      maxDistance={20}
      maxPolarAngle={Math.PI - 0.08}
      minPolarAngle={0.02}
      target={[0, 0.65, 0]}
    />
  )
}

/* ─────────────────────────── etiqueta flutuante ───────────────────────── */

function Etiqueta() {
  const hov = useSim((s) => s.hov)
  if (!hov) return null
  let texto = ''
  let sub = ''
  let pos: Vector3 | null = null

  if (hov.tipo === 'peca') {
    const p = PARTE_POR_ID[hov.id]
    if (!p) return null
    texto = p.nome
    sub = p.categoria
    pos = posicaoDoAlvo(hov.id)
  } else if (hov.tipo === 'parafuso') {
    const b = PARAFUSO_POR_ID[hov.id]
    if (!b) return null
    texto = b.label
    sub = b.medida ? `${b.medida} mm${b.torque ? ` · ${b.torque} Nm` : ''}` : b.tipo
    pos = new Vector3(...b.pos)
  } else {
    const c = CONEXAO_POR_ID[hov.id]
    if (!c) return null
    texto = c.label
    sub = c.tipo
    pos = new Vector3(...c.pos)
  }
  if (!pos) return null

  return (
    <Html position={[pos.x, pos.y + 0.09, pos.z]} center distanceFactor={6} zIndexRange={[40, 0]} pointerEvents="none">
      <div
        style={{
          background: 'rgba(12,15,18,0.92)',
          border: `1px solid ${COR.hov}55`,
          borderRadius: 4,
          padding: '3px 8px',
          color: '#e7edf2',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          whiteSpace: 'nowrap',
          transform: 'translateY(-6px)',
        }}
      >
        {texto}
        <span style={{ color: '#7b8b98', marginLeft: 6, fontSize: 10 }}>{sub}</span>
      </div>
    </Html>
  )
}
