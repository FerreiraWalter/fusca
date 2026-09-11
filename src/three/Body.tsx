import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, MathUtils, type BufferGeometry, type Group } from 'three'
import { useSim } from '../state/store'
import { COR, getPlacaMercosulTexture } from './matlib'
import { construirFusca, HINGE_CAPO, HINGE_TAMPA, HINGE_PORTA_ESQ, HINGE_PORTA_DIR } from './fuscaGeometry'

/** A carroceria e gerada uma unica vez: e deterministica e nao depende de estado. */
const GEO = construirFusca()

export function Carroceria() {
  const raioX = useSim((s) => s.raioX)
  const selecionar = useSim((s) => s.selecionar)

  return (
    <group onClick={() => selecionar(null)}>
      {/* Casca externa da carroceria em Prata Metalico DFF3A40 */}
      <mesh geometry={GEO.pele} castShadow receiveShadow>
        <meshStandardMaterial
          color={COR.carroceria}
          metalness={0.72}
          roughness={0.24}
          envMapIntensity={0.8}
          side={DoubleSide}
          transparent={raioX}
          opacity={raioX ? 0.12 : 1}
          depthWrite={!raioX}
        />
      </mesh>

      {/* Revestimento interno */}
      <mesh geometry={GEO.interior}>
        <meshStandardMaterial
          color="#20242a"
          metalness={0.35}
          roughness={0.85}
          side={DoubleSide}
          transparent={raioX}
          opacity={raioX ? 0.2 : 1}
        />
      </mesh>

      {/* Vidros (parabrisa quase plano, vidro traseiro com veneziana e janelas traseiras) */}
      <mesh geometry={GEO.vidros}>
        <meshStandardMaterial
          color={COR.vidro}
          metalness={0.3}
          roughness={0.05}
          side={DoubleSide}
          transparent
          opacity={raioX ? 0.08 : 0.5}
          depthWrite={false}
        />
      </mesh>

      <Paralamas raioX={raioX} />
      <Cromados />
      <Interior raioX={raioX} />
      <TunelCentral raioX={raioX} />
    </group>
  )
}

export function Tampas() {
  return (
    <>
      <TampaArticulada id="tampa-motor" geometria={GEO.tampaMotor} hinge={HINGE_TAMPA} aberturaMax={1.5} motor />
      <TampaArticulada id="capo-dianteiro" geometria={GEO.tampaCapo} hinge={HINGE_CAPO} aberturaMax={-0.95} capo />
      <PortaArticulada
        id="porta-esquerda"
        geometria={GEO.portaEsq}
        vidro={GEO.vidroPortaEsq}
        hinge={HINGE_PORTA_ESQ}
        lado={1}
      />
      <PortaArticulada
        id="porta-direita"
        geometria={GEO.portaDir}
        vidro={GEO.vidroPortaDir}
        hinge={HINGE_PORTA_DIR}
        lado={-1}
      />
    </>
  )
}

function TampaArticulada({
  id,
  geometria,
  hinge,
  aberturaMax,
  motor,
  capo,
}: {
  id: string
  geometria: BufferGeometry
  hinge: [number, number, number]
  aberturaMax: number
  motor?: boolean
  capo?: boolean
}) {
  const aberto = useSim((s) => s.parts[id]?.aberto)
  const sel = useSim((s) => s.sel?.id === id)
  const hov = useSim((s) => s.hov?.id === id)
  const raioX = useSim((s) => s.raioX)
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)
  const acaoPeca = useSim((s) => s.acaoPeca)
  const g = useRef<Group>(null)

  const placaTex = getPlacaMercosulTexture()

  useFrame((_, dt) => {
    if (!g.current) return
    g.current.rotation.x = MathUtils.damp(g.current.rotation.x, aberto ? aberturaMax : 0, 4.5, dt)
  })

  return (
    <group ref={g} position={hinge}>
      <mesh
        geometry={geometria}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          selecionar({ tipo: 'peca', id })
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          acaoPeca(id, aberto ? 'fechar' : 'abrir')
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          apontar({ tipo: 'peca', id })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          apontar(null)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          color={COR.carroceria}
          metalness={0.72}
          roughness={0.24}
          envMapIntensity={0.8}
          side={DoubleSide}
          emissive={sel ? COR.sel : hov ? COR.hov : '#000'}
          emissiveIntensity={sel ? 0.4 : hov ? 0.22 : 0}
          transparent={raioX}
          opacity={raioX ? 0.15 : 1}
        />
      </mesh>

      {/* Detalhes da Tampa do Motor (Fotos 2, 3) */}
      {motor && (
        <group>
          {/* Grelhas / Saídas de ar do morcego no topo da tampa traseira */}
          {[-0.18, 0.18].map((ladoX) => (
            <group key={ladoX} position={[ladoX, -0.12, -0.28]}>
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={i} position={[0, -i * 0.042, -i * 0.052]} rotation={[0.42, 0, 0]} castShadow>
                  <boxGeometry args={[0.15, 0.018, 0.038]} />
                  <meshStandardMaterial color="#121416" metalness={0.5} roughness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Puxador com fechadura da tampa do motor */}
          <mesh position={[0, -0.38, -0.72]} rotation={[0.28, 0, 0]} castShadow>
            <sphereGeometry args={[0.045, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.40, -0.74]} rotation={[0.28, 0, 0]}>
            <boxGeometry args={[0.10, 0.026, 0.04]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Placa Mercosul Traseira DFF3A40 em Box3D solida na face EXTERNA da tampa (Z=-0.86) */}
          <mesh position={[0, -0.54, -0.86]} rotation={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.32, 0.16, 0.02]} />
            <meshStandardMaterial map={placaTex} roughness={0.3} metalness={0.1} />
          </mesh>
          {/* Nariz de tubarão / Luz de iluminação da placa traseira na face externa (Z=-0.90) */}
          <mesh position={[0, -0.64, -0.90]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.08, 0.024, 0.045]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* Detalhes do Capo Dianteiro (Foto 2) */}
      {capo && (
        <group>
          {/* Friso cromado central ao longo dos vincos do capo */}
          <mesh position={[0, -0.36, 0.46]} rotation={[-0.45, 0, 0]}>
            <boxGeometry args={[0.016, 0.014, 0.86]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Puxador da tampa do capo dianteiro */}
          <mesh position={[0, -0.62, 0.75]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.038, 0.065, 0.028]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Emblema circular cromado da VW na ponta do capo */}
          <group position={[0, -0.18, 0.35]} rotation={[-0.48, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.016, 24]} />
              <meshStandardMaterial color={COR.cromo} metalness={0.98} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.004, 24]} />
              <meshStandardMaterial color="#1a3d6d" metalness={0.4} roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  )
}

function PortaArticulada({
  id,
  geometria,
  vidro,
  hinge,
  lado,
}: {
  id: string
  geometria: BufferGeometry
  vidro: BufferGeometry
  hinge: [number, number, number]
  lado: number
}) {
  const aberto = useSim((s) => s.parts[id]?.aberto)
  const sel = useSim((s) => s.sel?.id === id)
  const hov = useSim((s) => s.hov?.id === id)
  const raioX = useSim((s) => s.raioX)
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)
  const acaoPeca = useSim((s) => s.acaoPeca)
  const g = useRef<Group>(null)

  useFrame((_, dt) => {
    if (!g.current) return
    const angAlvo = aberto ? -lado * 1.15 : 0
    g.current.rotation.y = MathUtils.damp(g.current.rotation.y, angAlvo, 4.5, dt)
  })

  return (
    <group ref={g} position={hinge}>
      {/* Painel da porta */}
      <mesh
        geometry={geometria}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          selecionar({ tipo: 'peca', id })
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          acaoPeca(id, aberto ? 'fechar' : 'abrir')
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          apontar({ tipo: 'peca', id })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          apontar(null)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          color={COR.carroceria}
          metalness={0.72}
          roughness={0.24}
          envMapIntensity={0.8}
          side={DoubleSide}
          emissive={sel ? COR.sel : hov ? COR.hov : '#000'}
          emissiveIntensity={sel ? 0.4 : hov ? 0.22 : 0}
          transparent={raioX}
          opacity={raioX ? 0.15 : 1}
        />
      </mesh>

      {/* Vidro da porta: acompanha a folha ao abrir */}
      <mesh geometry={vidro}>
        <meshStandardMaterial
          color={COR.vidro}
          metalness={0.3}
          roughness={0.05}
          side={DoubleSide}
          transparent
          opacity={raioX ? 0.08 : 0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Friso cromado lateral externo da porta (Fotos 2, 4) */}
      <mesh position={[lado * 0.048, 0.22, -0.22]}>
        <boxGeometry args={[0.008, 0.015, 0.72]} />
        <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Macaneta externa cromada no lado exterior da porta (Foto 4) */}
      <mesh position={[lado * 0.048, 0.16, -0.48]}>
        <boxGeometry args={[0.024, 0.03, 0.14]} />
        <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Coluna cromada do quebra-vento na janela dianteira */}
      <mesh position={[lado * 0.02, 0.38, -0.22]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.012, 0.26, 0.014]} />
        <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Retrovisor cromado no lado do motorista (Foto 4) */}
      {lado > 0 && (
        <group position={[0.05, 0.32, 0.12]} rotation={[0, -0.2, -0.3]}>
          <mesh position={[0.04, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0.08, 0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.015, 18]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* Revestimento estofado interno da porta */}
      <mesh position={[lado * -0.02, 0.05, -0.22]}>
        <boxGeometry args={[0.015, 0.42, 0.65]} />
        <meshStandardMaterial color="#3b3029" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Paralamas({ raioX }: { raioX: boolean }) {
  const eixos: [number, number][] = [
    [0.66, 1.2],
    [-0.66, 1.2],
    [0.66, -1.2],
    [-0.66, -1.2],
  ]

  const matParalama = (
    <meshStandardMaterial
      color={COR.carroceria}
      metalness={0.72}
      roughness={0.24}
      envMapIntensity={0.8}
      side={DoubleSide}
      transparent={raioX}
      opacity={raioX ? 0.14 : 1}
    />
  )

  return (
    <group>
      {/* Paralamas Dianteiros com arco concentrico ao pneu */}
      <mesh geometry={GEO.paralamaDianteiroEsq} castShadow receiveShadow>
        {matParalama}
      </mesh>
      <mesh geometry={GEO.paralamaDianteiroDir} castShadow receiveShadow>
        {matParalama}
      </mesh>

      {/* Paralamas Traseiros com arco concentrico */}
      <mesh geometry={GEO.paralamaTraseiroEsq} castShadow receiveShadow>
        {matParalama}
      </mesh>
      <mesh geometry={GEO.paralamaTraseiroDir} castShadow receiveShadow>
        {matParalama}
      </mesh>

      {/* Rodas nas 4 posicoes */}
      {eixos.map(([x, z]) => (
        <Roda key={`${x}${z}`} x={x} z={z} estatica={!(x > 0 && z < 0)} />
      ))}

      {/* Estribos com friso cromado lateral (Fotos 2, 4) */}
      {[0.66, -0.66].map((x) => (
        <group key={x} position={[x, 0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.045, 1.36]} />
            <meshStandardMaterial color="#1a1c1e" roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh position={[x > 0 ? 0.082 : -0.082, 0, 0]}>
            <boxGeometry args={[0.012, 0.05, 1.38]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Portinhola do tanque de combustivel no paralama dianteiro direito (Foto 4) */}
      <mesh position={[-0.64, 0.74, 1.12]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.01, 0.11, 0.11]} />
        <meshStandardMaterial color={COR.carroceriaEscura} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function Roda({ x, z, estatica = true }: { x: number; z: number; estatica?: boolean }) {
  if (!estatica) return null
  return (
    <group position={[x, 0.34, z]}>
      <RodaMesh lado={x > 0 ? 1 : -1} />
    </group>
  )
}

export function RodaMesh({ lado = 1 }: { lado?: number }) {
  const giro = useRef<Group>(null)
  // A roda traseira fica bem na frente do sino de embreagem: na visao
  // mecanica ela precisa sair do caminho, senao o conjunto nao aparece.
  const visao = useSim((s) => s.visaoMecanica)
  const t = { transparent: visao, opacity: visao ? 0.12 : 1, depthWrite: !visao }
  useFrame((_, dt) => {
    const v = useSim.getState().drive.velocidade
    // v / raio = rad/s do pneu. O sinal segue o lado em que a roda esta.
    if (giro.current && Math.abs(v) > 0.01) giro.current.rotation.y += (v / 0.32) * lado * dt
  })
  return (
    <group rotation={[0, 0, (lado * -Math.PI) / 2]}>
      <group ref={giro}>
      {/* Banda de rodagem do pneu de borracha preta */}
      <mesh castShadow={!visao}>
        <cylinderGeometry args={[0.32, 0.32, 0.185, 32]} />
        <meshStandardMaterial color={COR.pneu} roughness={0.95} metalness={0.03} {...t} />
      </mesh>
      {/* Borda externa de ferro da roda em Creme/Branco (igual à foto do usuário) */}
      <mesh position={[0, 0.094, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.015, 28]} />
        <meshStandardMaterial color="#f4f0e6" roughness={0.35} metalness={0.1} {...t} />
      </mesh>
      {/* Miolo central preto do aro */}
      <mesh position={[0, 0.096, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.016, 24]} />
        <meshStandardMaterial color="#141618" roughness={0.6} metalness={0.3} {...t} />
      </mesh>
      {/* Calota cromada convexa no centro */}
      <mesh position={[0, 0.10, 0]}>
        <sphereGeometry args={[0.095, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshStandardMaterial color={COR.cromo} metalness={0.98} roughness={0.1} {...t} />
      </mesh>
      </group>
    </group>
  )
}

function Cromados() {
  const placaTex = getPlacaMercosulTexture()

  return (
    <group>
      {/* Parachoque Dianteiro */}
      <group position={[0, 0.52, 2.08]}>
        <mesh castShadow>
          <boxGeometry args={[1.44, 0.09, 0.08]} />
          <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.14} />
        </mesh>
        <mesh position={[0, 0, 0.042]}>
          <boxGeometry args={[1.42, 0.038, 0.012]} />
          <meshStandardMaterial color="#181a1c" roughness={0.8} />
        </mesh>
        {[-0.32, 0.32].map((x) => (
          <group key={x} position={[x, 0.08, 0]}>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.065, 0.22, 0.075]} />
              <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.14} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.068, 0.04, 0.078]} />
              <meshStandardMaterial color="#181a1c" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Placa Mercosul Dianteira DFF3A40 sob o parachoque */}
        <mesh position={[0, -0.16, 0.02]} rotation={[-0.08, 0, 0]}>
          <planeGeometry args={[0.34, 0.17]} />
          <meshStandardMaterial map={placaTex} roughness={0.3} metalness={0.1} />
        </mesh>
      </group>

      {/* Parachoque Traseiro */}
      <group position={[0, 0.52, -2.04]}>
        <mesh castShadow>
          <boxGeometry args={[1.44, 0.09, 0.08]} />
          <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.14} />
        </mesh>
        <mesh position={[0, 0, -0.042]}>
          <boxGeometry args={[1.42, 0.038, 0.012]} />
          <meshStandardMaterial color="#181a1c" roughness={0.8} />
        </mesh>
        {[-0.32, 0.32].map((x) => (
          <group key={x} position={[x, 0.08, 0]}>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.065, 0.22, 0.075]} />
              <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.14} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.068, 0.04, 0.078]} />
              <meshStandardMaterial color="#181a1c" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Ponteiras Duplas de Escapamento Cromadas na HORIZONTAL */}
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, -0.14, -0.12]} rotation={[Math.PI / 2 - 0.05, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 16]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.98} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* Farois Encaixados e Embutidos no Paralama Dianteiro (Foto 2) */}
      {[0.57, -0.57].map((x) => (
        <group key={x} position={[x, 0.69, 1.66]} rotation={[-0.18, x > 0 ? -0.32 : 0.32, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.135, 0.125, 0.075, 26]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Cúpula do vidro do farol girada para a frente (não para cima) */}
          <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            <meshStandardMaterial color="#eef3f6" emissive="#fff8e0" emissiveIntensity={0.35} roughness={0.06} />
          </mesh>
          <mesh position={[0, 0, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI / 3.5]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.05} />
          </mesh>
        </group>
      ))}

      {/* Piscas/Setas no Topo dos Paralamas Dianteiros ("Marmitas") (Fotos 2, 4) */}
      {[0.62, -0.62].map((x) => (
        <group key={x} position={[x, 0.84, 1.34]} rotation={[0.08, x > 0 ? 0.04 : -0.04, 0]}>
          <mesh position={[0, -0.015, 0]}>
            <boxGeometry args={[0.062, 0.024, 0.125]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.055, 0.035, 0.115]} />
            <meshStandardMaterial color="#ff8c00" emissive="#ff6600" emissiveIntensity={0.45} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Lanternas Traseiras Ovais com Suporte Vermelho e Lente Bicolor (Cima Vermelho / Baixo Amarelo) */}
      {[0.61, -0.61].map((x) => (
        <group key={x} position={[x, 0.60, -1.68]} rotation={[0.42, x > 0 ? 0.35 : -0.35, 0]}>
          {/* Suporte / Copo da Lanterna Traseira em Vermelho (Invertido com Preto) */}
          <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.038, 24]} />
            <meshStandardMaterial color="#cc1111" metalness={0.4} roughness={0.3} />
          </mesh>
          {/* Anel de Borracha / Vedação em Preto */}
          <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.087, 0.087, 0.012, 24]} />
            <meshStandardMaterial color="#16181a" roughness={0.8} />
          </mesh>
          {/* Lente Metade de Cima: VERMELHO */}
          <mesh position={[0, 0.022, 0.024]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.084, 0.084, 0.032, 24, 1, false, -Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color="#d61818" emissive="#aa0000" emissiveIntensity={0.55} roughness={0.15} />
          </mesh>
          {/* Lente Metade de Baixo: AMARELO / ÂMBAR */}
          <mesh position={[0, -0.022, 0.024]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.084, 0.084, 0.032, 24, 1, false, Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ff8800" emissiveIntensity={0.6} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Frisos Cromados Laterais de Cintura (Frente e Traseira) */}
      {[0.66, -0.66].map((x) => (
        <group key={x}>
          {/* Friso lateral dianteiro (do farol ate a porta) */}
          <mesh position={[x > 0 ? x + 0.02 : x - 0.02, 0.77, 1.05]} rotation={[0, x > 0 ? -0.1 : 0.1, 0]}>
            <boxGeometry args={[0.008, 0.015, 0.78]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Friso lateral traseiro (da porta ate a lanterna traseira) */}
          <mesh position={[x > 0 ? x + 0.02 : x - 0.02, 0.77, -0.92]} rotation={[0, x > 0 ? 0.08 : -0.08, 0]}>
            <boxGeometry args={[0.008, 0.015, 0.95]} />
            <meshStandardMaterial color={COR.cromo} metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Moldura de borracha preta no contorno do parabrisa (quase plano) */}
      <mesh position={[0, 1.18, 0.78]} rotation={[-0.52, 0, 0]}>
        <boxGeometry args={[1.04, 0.02, 0.44]} />
        <meshStandardMaterial color="#16181b" roughness={0.9} wireframe />
      </mesh>

      {/* Veneziana interna / Linhas do desembaçador do vidro traseiro (Foto 3) */}
      <group position={[0, 1.12, -0.9]} rotation={[-0.4, 0, 0]}>
        {[-0.1, -0.05, 0.0, 0.05, 0.1].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.72, 0.006, 0.004]} />
            <meshStandardMaterial color="#3a4046" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Interior({ raioX }: { raioX: boolean }) {
  const visao = useSim((s) => s.visaoMecanica)
  // Na visao mecanica o estofamento sai da frente: e ele que esconde o tunel
  // central, o cabo da embreagem e a haste do cambio.
  const oculto = visao
  const op = visao ? 0.18 : raioX ? 0.45 : 1
  const mat = { color: '#3b3029', roughness: 0.92, transparent: true, opacity: op }
  return (
    <group>
      {/* Banco do carona. O do motorista e uma peca removivel (ver Driveline). */}
      <group position={[-0.3, 0.56, 0.36]} visible={!oculto}>
        <mesh>
          <boxGeometry args={[0.42, 0.1, 0.42]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0, 0.24, -0.18]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[0.42, 0.45, 0.1]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      </group>
      <group visible={!oculto}>
      <mesh position={[0, 0.55, -0.5]}>
        <boxGeometry args={[1.02, 0.1, 0.4]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.8, -0.72]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[1.02, 0.42, 0.1]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      </group>
      {/* Painel */}
      <mesh position={[0, 0.94, 0.94]}>
        <boxGeometry args={[1.14, 0.16, 0.12]} />
        <meshStandardMaterial color="#2c3033" roughness={0.8} transparent opacity={op} />
      </mesh>

      {/* Assoalho Fundo e Estrutura Inferior do Chassi do Fusca */}
      <group position={[0, 0.33, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.26, 0.03, 3.8]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.9} metalness={0.2} transparent opacity={op} />
        </mesh>
        {/* Bandeja / Protecao inferior do motor e cambio */}
        <mesh position={[0, 0.02, -1.35]}>
          <boxGeometry args={[1.04, 0.06, 0.95]} />
          <meshStandardMaterial color="#22262a" roughness={0.85} metalness={0.2} transparent opacity={op} />
        </mesh>
      </group>
    </group>
  )
}

function TunelCentral({ raioX }: { raioX: boolean }) {
  if (!raioX) return null
  return (
    <mesh position={[0.06, 0.3, -0.05]}>
      <boxGeometry args={[0.34, 0.24, 1.94]} />
      <meshStandardMaterial color="#2f3a41" transparent opacity={0.25} wireframe />
    </mesh>
  )
}
