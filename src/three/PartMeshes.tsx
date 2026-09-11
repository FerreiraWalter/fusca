import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector2, Vector3, type Group } from 'three'
import * as THREE from 'three'
import { useSim } from '../state/store'
import { COR, M, useEstiloPeca } from './matlib'
import { RodaMesh } from './Body'

/* ─────────────────────────── utilitarios ─────────────────────────────── */

/** Fecho convexo 2D (monotone chain) - usado para tracar a correia. */
function fechoConvexo(pts: Vector2[]): Vector2[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Vector2, a: Vector2, b: Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const baixo: Vector2[] = []
  for (const q of p) {
    while (baixo.length >= 2 && cross(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 0) baixo.pop()
    baixo.push(q)
  }
  const cima: Vector2[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (cima.length >= 2 && cross(cima[cima.length - 2], cima[cima.length - 1], q) <= 0) cima.pop()
    cima.push(q)
  }
  baixo.pop()
  cima.pop()
  return baixo.concat(cima)
}

function Aletas({ n = 6, raio = 0.115, largura = 0.3, x = 0 }: { n?: number; raio?: number; largura?: number; x?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[x + (i - (n - 1) / 2) * (largura / n), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[raio, raio, 0.01, 16]} />
          <M color={COR.ferroFosco} metalness={0.2} roughness={0.82} />
        </mesh>
      ))}
    </>
  )
}

/* ───────────────────────────── motor ─────────────────────────────────── */

/** Raios das duas polias: definem a razao de transmissao e o traco da correia. */
const R_VIRABREQUIM = 0.088
const R_GERADOR = 0.054
/** Voltas por segundo da polia do virabrequim a cada 60 rpm (escala visual). */
const ROT_POLIA = 0.25

/**
 * Motor boxer 1500 em escala real: carter de ~0,40 m entre as bancadas,
 * cilindros opostos saindo para os lados sob os paralamas e a polia do
 * virabrequim na extremidade traseira, virada para quem abre o cofre.
 */
export function MotorBoxer() {
  const polia = useRef<Group>(null)
  const poliaBlur = useRef<Group>(null)
  useFrame((_, dt) => {
    const rpm = useSim.getState().rt.rpm
    if (polia.current) polia.current.rotation.z -= (rpm / 60) * Math.PI * 2 * dt * ROT_POLIA
    // Motion blur na polia do virabrequim
    if (poliaBlur.current) {
      poliaBlur.current.visible = rpm > 50
      const mat = (poliaBlur.current.children[0] as THREE.Mesh)?.material as THREE.MeshStandardMaterial | undefined
      if (mat) mat.opacity = Math.min(1, rpm / 2000) * 0.5
    }
  })
  return (
    <group>
      {/* Carter bipartido de magnesio */}
      <mesh castShadow>
        <boxGeometry args={[0.34, 0.2, 0.38]} />
        <M color={COR.fundicao} metalness={0.25} roughness={0.78} />
      </mesh>
      {/* Barriga inferior do carter, onde fica o oleo */}
      <mesh position={[0, -0.115, 0]} castShadow>
        <boxGeometry args={[0.28, 0.055, 0.3]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.2} roughness={0.85} />
      </mesh>
      {/* Tampa do filtro de tela do oleo, embaixo, com os prisioneiros */}
      <mesh position={[0, -0.145, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.014, 16]} />
        <M color={COR.ferroSujoEscuro} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Linha de emenda das duas metades do carter */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.345, 0.008, 0.385]} />
        <M color={COR.fundicaoEscura} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Bancadas de cilindros: 1 e 2 a direita (-X), 3 e 4 a esquerda (+X) */}
      {[
        [-1, 0.1],
        [-1, -0.1],
        [1, 0.1],
        [1, -0.1],
      ].map(([lado, dz], i) => (
        <group key={i} position={[0, -0.005, dz]}>
          {/* Cilindro com aletas */}
          <mesh position={[lado * 0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 0.19, 14]} />
            <M color={COR.ferroFosco} metalness={0.15} roughness={0.85} />
          </mesh>
          <Aletas x={lado * 0.26} n={7} raio={0.072} largura={0.18} />
          {/* Cabecote de aluminio fundido */}
          <mesh position={[lado * 0.38, 0.005, 0]} castShadow>
            <boxGeometry args={[0.07, 0.125, 0.15]} />
            <M color={COR.fundicao} metalness={0.2} roughness={0.8} />
          </mesh>
          {/* Aletas do cabecote */}
          {[-0.03, 0.0, 0.03].map((d) => (
            <mesh key={d} position={[lado * 0.38, 0.005, d]}>
              <boxGeometry args={[0.078, 0.11, 0.008]} />
              <M color={COR.fundicaoEscura} metalness={0.2} roughness={0.82} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Tampas de valvulas, embaixo dos cabecotes, presas pelo estribo */}
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * 0.4, -0.075, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.075, 0.05, 0.24]} />
            <M color={COR.ferroFosco} metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[lado * 0.008, 0.005, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.028, 0.005, 6, 12, Math.PI]} />
            <M color={COR.ferroSujo} metalness={0.5} roughness={0.55} />
          </mesh>
        </group>
      ))}
      {/* Coletor de admissao: riser central e os dois bracos para os cabecotes */}
      <mesh position={[0.05, 0.14, 0.12]} rotation={[0.12, 0, 0]}>
        <cylinderGeometry args={[0.019, 0.021, 0.11, 12]} />
        <M color={COR.fundicao} metalness={0.35} roughness={0.6} />
      </mesh>
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.15 + 0.03, 0.1, 0.1]} rotation={[0, 0, Math.PI / 2 + l * 0.18]}>
          <cylinderGeometry args={[0.016, 0.016, 0.28, 12]} />
          <M color={COR.fundicao} metalness={0.35} roughness={0.6} />
        </mesh>
      ))}
      {/* Polia do virabrequim, na traseira do carter: a peca redonda mais
          baixa do cofre, gasta e com a marca do ponto */}
      <group ref={polia} position={[0.02, 0.14, -0.14]}>
        <mesh position={[0, 0, -0.016]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.088, 0.072, 0.018, 26]} />
          <M color={COR.ferroFosco} metalness={0.25} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.014]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.072, 0.088, 0.018, 26]} />
          <M color={COR.ferroFoscoEscuro} metalness={0.25} roughness={0.75} />
        </mesh>
        {/* Cubo e porca central do virabrequim (30 mm) */}
        <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.034, 0.016, 18]} />
          <M color={COR.ferroSujoEscuro} metalness={0.3} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, -0.042]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.014, 6]} />
          <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Entalhe do ponto de ignicao na borda */}
        <mesh position={[0, 0.082, -0.026]}>
          <boxGeometry args={[0.005, 0.016, 0.004]} />
          <M color="#c9c2ae" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>
      {/* Motion blur na polia do virabrequim */}
      <group ref={poliaBlur} position={[-0.15, 0.08, -0.14]} visible={false}>
        <mesh position={[0, 0, -0.002]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.092, 0.092, 0.034, 28]} />
          <meshStandardMaterial
            color={COR.ferroFosco}
            metalness={0.2}
            roughness={0.75}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
      {/* Bocal do oleo com o respiro, no alto do carter (lado direito) */}
      <group position={[-0.1, 0.12, -0.02]} rotation={[0.12, 0, 0.16]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.022, 0.024, 0.055, 14]} />
          <M color={COR.ferroFosco} metalness={0.2} roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.034, 0]}>
          <cylinderGeometry args={[0.026, 0.024, 0.016, 14]} />
          <M color={COR.ferroSujoEscuro} metalness={0.25} roughness={0.7} />
        </mesh>
      </group>
      {/* Vareta de nivel do oleo, com a alca amarelada */}
      <group position={[-0.14, 0.06, 0.08]} rotation={[0.1, 0, 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.0035, 0.0035, 0.08, 8]} />
          <M color={COR.ferroSujo} metalness={0.55} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[0.012, 0.004, 6, 14]} />
          <M color="#b39147" metalness={0.25} roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Carcaca da ventoinha: a grande chapa preta que cobre o alto do motor.
 * Vista de cima, com o cofre aberto, e o fundo escuro contra o qual
 * aparecem o carburador, a polia e os cabos.
 */
export function CarcacaVentoinha() {
  return (
    <group>
      {/* Painel principal: a grande chapa que fecha o fundo do cofre e
          contra a qual todo o resto do motor aparece */}
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.27, 0.15]} />
        <M color="#33363a" metalness={0.34} roughness={0.7} />
      </mesh>
      {/* Aba superior arredondada, o rebordo que se ve no alto do painel */}
      <mesh position={[0, 0.135, -0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.62, 16, 1, false, 0, Math.PI]} />
        <M color="#3a3d41" metalness={0.34} roughness={0.66} />
      </mesh>
      {/* Boca da turbina: abertura por onde o gerador e a polia saem
          para a frente, no lado direito do conjunto */}
      <mesh position={[-0.15, 0.0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.07, 26, 1, true]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.32} roughness={0.72} />
      </mesh>
      <mesh position={[-0.15, 0.0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.114, 0.008, 8, 26]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.7} />
      </mesh>
      {/* Vincos de reforco estampados na chapa */}
      {[-0.075, 0.06].map((dy) => (
        <mesh key={dy} position={[0.12, dy, 0.078]}>
          <boxGeometry args={[0.34, 0.012, 0.012]} />
          <M color={COR.ferroFoscoEscuro} metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
      {/* Saias laterais descendo para os cabecotes */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.34, -0.09, 0.02]} rotation={[0, 0, l * 0.22]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.18]} />
          <M color={COR.chapaPreta} metalness={0.3} roughness={0.76} />
        </mesh>
      ))}
      {/* Suporte soldado onde a bobina se apoia, no lado esquerdo */}
      <mesh position={[0.24, 0.14, 0.05]}>
        <boxGeometry args={[0.09, 0.014, 0.1]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.65} />
      </mesh>
    </group>
  )
}

/**
 * Roda de ventilacao com a polia: o conjunto redondo e dentado que
 * aparece a direita do carburador na foto, com a correia passando na
 * garganta e as pontas das pas surgindo por tras.
 */
export function Ventoinha() {
  const g = useRef<Group>(null)
  const blurRef = useRef<Group>(null)
  useFrame((_, dt) => {
    const rpm = useSim.getState().rt.rpm
    // Mesma correia: mesmo sentido, e mais rapida na razao dos diametros
    if (g.current) g.current.rotation.z -= (rpm / 60) * Math.PI * 2 * dt * ROT_POLIA * (R_VIRABREQUIM / R_GERADOR)
    // Motion blur: opacidade proporcional ao RPM
    if (blurRef.current) {
      blurRef.current.visible = rpm > 50
      const mat = (blurRef.current.children[0] as THREE.Mesh)?.material as THREE.MeshStandardMaterial | undefined
      if (mat) mat.opacity = Math.min(1, rpm / 2000) * 0.55
    }
  })
  const NP = 20
  return (
    <group>
      <group ref={g}>
        {/* Pas da roda: coroa de dentes que aparece por tras da polia */}
        {Array.from({ length: NP }, (_, i) => {
          const a = (i / NP) * Math.PI * 2
          const escura = i % 3 === 0
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.056, Math.sin(a) * 0.056, 0.012]}
              rotation={[0.3, 0, a + Math.PI / 2]}
            >
              <coneGeometry args={[0.007, 0.016, 3]} />
              <M
                color={escura ? COR.ferroFoscoEscuro : COR.ferroSujo}
                metalness={0.25}
                roughness={0.72}
                flatShading
              />
            </mesh>
          )
        })}
        {/* Disco de fundo da roda de ventilacao */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.024]}>
          <cylinderGeometry args={[0.062, 0.062, 0.009, 28]} />
          <M color={COR.ferroSujoEscuro} metalness={0.22} roughness={0.78} />
        </mesh>
        {/* Meia-polia traseira: a face que recebe a correia */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.016]} castShadow>
          <cylinderGeometry args={[0.058, 0.042, 0.012, 28]} />
          <M color={COR.ferroSujo} metalness={0.35} roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.002]}>
          <cylinderGeometry args={[0.042, 0.058, 0.012, 28]} />
          <M color={COR.ferroFoscoEscuro} metalness={0.25} roughness={0.72} />
        </mesh>
        {/* Cubo e porca de 21 mm no eixo do gerador */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.026]}>
          <cylinderGeometry args={[0.02, 0.022, 0.016, 18]} />
          <M color={COR.aluminioSujo} metalness={0.3} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, -0.038]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.013, 6]} />
          <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      {/* Disco de motion blur: simula as pas girando em alta rotacao */}
      <group ref={blurRef} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.016]}>
          <cylinderGeometry args={[0.066, 0.066, 0.026, 32]} />
          <meshStandardMaterial
            color={COR.ferroSujoEscuro}
            metalness={0.2}
            roughness={0.8}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Gerador/alternador: cilindro deitado no eixo Z, sobre o pedestal, com
 * a polia montada na ponta traseira. Quase todo coberto pela carcaca —
 * o que aparece e a carcaca de aluminio fundido e a cinta de fixacao.
 */
export function Gerador() {
  return (
    <group>
      {/* Corpo cilindrico deitado, apontando para a frente do carro */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.19, 20]} />
        <M color={COR.fundicao} metalness={0.3} roughness={0.68} />
      </mesh>
      {/* Nervuras da carcaca fundida */}
      {[-0.05, -0.017, 0.017, 0.05].map((dz) => (
        <mesh key={dz} position={[0, 0, dz]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.063, 0.004, 6, 20]} />
          <M color={COR.fundicaoEscura} metalness={0.3} roughness={0.72} />
        </mesh>
      ))}
      {/* Tampa dianteira (lado do retificador) */}
      <mesh position={[0, 0, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.024, 16]} />
        <M color={COR.aluminioSujo} metalness={0.3} roughness={0.72} />
      </mesh>
      {/* Cinta de fixacao no pedestal */}
      <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.066, 0.006, 8, 22]} />
        <M color={COR.ferroSujo} metalness={0.35} roughness={0.65} />
      </mesh>
      <mesh position={[0.03, 0.062, 0.01]}>
        <boxGeometry args={[0.024, 0.024, 0.016]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.65} />
      </mesh>
      {/* Terminais B+ / D+ com o cabo saindo para o regulador */}
      <mesh position={[0.04, 0.05, 0.05]}>
        <boxGeometry args={[0.02, 0.015, 0.022]} />
        <M color={COR.plasticoSujo} metalness={0.1} roughness={0.85} />
      </mesh>
      <CaboGerador />
    </group>
  )
}

/** Cabo grosso saindo do terminal B+ do gerador em direcao a chapa. */
function CaboGerador() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0.04, 0.058, 0.05),
        new Vector3(0.09, 0.075, 0.02),
        new Vector3(0.15, 0.05, -0.03),
      ]),
    [],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 14, 0.004, 6, false]} />
      <M color="#1c1f22" metalness={0.1} roughness={0.88} />
    </mesh>
  )
}

/**
 * Correia em V dentada entre a polia do gerador e a do virabrequim.
 * A correia nao gira como um corpo: o que corre e o dentado, que
 * acompanha a rotacao das polias. Por isso os dentes sao deslocados ao
 * longo do traco a cada quadro, em vez de girar a peca inteira.
 */
export function Correia() {
  const dentes = useRef<Group>(null)
  const blurTubo = useRef<THREE.Mesh>(null)
  const fase = useRef(0)

  const { curva, comprimento } = useMemo(() => {
    const pontos: Vector2[] = []
    const circulo = (cx: number, cy: number, r: number) => {
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        pontos.push(new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
      }
    }
    // As duas polias nao estao na mesma vertical: a de cima e a do gerador,
    // a de baixo e a do virabrequim, no meio do vao. Dai a correia sair torta.
    circulo(-0.085, 0.1, R_GERADOR)
    circulo(0.085, -0.1, R_VIRABREQUIM)
    const hull = fechoConvexo(pontos)
    const c = new CatmullRomCurve3(
      hull.map((p) => new Vector3(p.x, p.y, 0)),
      true,
      'catmullrom',
      0.02,
    )
    return { curva: c, comprimento: c.getLength() }
  }, [])

  const N_DENTES = 46

  // Um dente por filho do grupo: a cada quadro so reposicionamos.
  useFrame((_, dt) => {
    const g = dentes.current
    if (!g) return
    const rpm = useSim.getState().rt.rpm
    // Velocidade linear da correia = velocidade tangencial da polia motora
    const voltas = (rpm / 60) * ROT_POLIA * dt
    fase.current = (fase.current + (voltas * 2 * Math.PI * R_VIRABREQUIM) / comprimento) % 1
    for (let i = 0; i < g.children.length; i++) {
      const t = (i / N_DENTES + fase.current) % 1
      const p = curva.getPoint(t)
      const tg = curva.getTangent(t)
      const n = new Vector3(-tg.y, tg.x, 0).normalize().multiplyScalar(-0.009)
      g.children[i].position.set(p.x + n.x, p.y + n.y, 0)
      g.children[i].rotation.z = Math.atan2(tg.y, tg.x)
    }
    // Motion blur na correia: em RPM alto os dentes ficam borrados
    const blurFator = Math.min(1, rpm / 2500)
    // Reduz a visibilidade dos dentes individuais em RPM alto
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i] as THREE.Mesh
      const mat = m.material as THREE.MeshStandardMaterial
      if (mat.transparent !== undefined) {
        mat.transparent = true
        mat.opacity = 1 - blurFator * 0.7
      }
    }
    // Mostra tubo de blur continuo
    if (blurTubo.current) {
      const mat = blurTubo.current.material as THREE.MeshStandardMaterial
      mat.opacity = blurFator * 0.4
      blurTubo.current.visible = rpm > 100
    }
  })

  return (
    <group>
      {/* Dorso da correia: fina, so a espessura de uma correia em V */}
      <mesh castShadow scale={[1, 1, 0.5]}>
        <tubeGeometry args={[curva, 96, 0.0105, 8, true]} />
        <M color="#131518" metalness={0.1} roughness={0.92} />
      </mesh>
      {/* Dentado da face interna, que corre junto com as polias */}
      <group ref={dentes}>
        {Array.from({ length: N_DENTES }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.0075, 0.008, 0.016]} />
            <M color="#0c0e10" metalness={0.1} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Tubo continuo de blur: sobrepoe o dentado em RPM alto */}
      <mesh ref={blurTubo} visible={false} scale={[1, 1, 0.5]}>
        <tubeGeometry args={[curva, 96, 0.013, 8, true]} />
        <meshStandardMaterial
          color="#0a0c0e"
          metalness={0.1}
          roughness={0.9}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Carburador Solex 30 PIC em escala real (corpo de ~75 mm): flange na
 * base, corpo com a cuba de nivel constante do lado, boca de admissao
 * no alto onde o filtro encaixa, afogador automatico atras e a alavanca
 * da borboleta com a mola de retorno. Origem no meio do corpo.
 */
export function Carburador() {
  return (
    <group>
      {/* Junta e flange de fixacao no coletor */}
      <mesh position={[0, -0.056, 0]}>
        <cylinderGeometry args={[0.037, 0.037, 0.004, 16]} />
        <M color="#0c0d0e" metalness={0.05} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.046, 0]} castShadow>
        <boxGeometry args={[0.072, 0.014, 0.062]} />
        <M color={COR.fundicaoEscura} metalness={0.25} roughness={0.72} />
      </mesh>
      {/* Prisioneiros da base, com as porcas de 13 mm */}
      {[-1, 1].map((l) => (
        <group key={l} position={[l * 0.028, -0.032, 0]}>
          <mesh>
            <cylinderGeometry args={[0.0035, 0.0035, 0.024, 8]} />
            <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.0075, 0.0075, 0.008, 6]} />
            <M color={COR.ferroSujo} metalness={0.55} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* Corpo inferior: borboleta, eixo e marcha lenta */}
      <mesh position={[0, -0.022, 0]} castShadow>
        <cylinderGeometry args={[0.031, 0.034, 0.042, 20]} />
        <M color={COR.fundicao} metalness={0.3} roughness={0.66} />
      </mesh>
      {/* Nervuras de fundicao no corpo inferior */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.032, -0.026, Math.sin(a) * 0.032]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.005, 0.03, 0.008]} />
            <M color={COR.fundicaoEscura} metalness={0.3} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Eixo da borboleta atravessando o corpo */}
      <mesh position={[0, -0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.082, 10]} />
        <M color={COR.ferroSujo} metalness={0.6} roughness={0.42} />
      </mesh>

      {/* Corpo superior, escurecido por combustivel e fuligem */}
      <mesh position={[0, 0.014, 0]} castShadow>
        <cylinderGeometry args={[0.029, 0.031, 0.032, 20]} />
        <M color={COR.fundicaoEscura} metalness={0.28} roughness={0.7} />
      </mesh>
      {/* Bossa de fundicao com o numero do carburador */}
      <mesh position={[0.026, 0.012, 0.014]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.016, 0.018, 0.005]} />
        <M color={COR.fundicao} metalness={0.3} roughness={0.62} />
      </mesh>

      {/* Cuba de nivel constante, com a tampa e os parafusos */}
      <mesh position={[-0.04, -0.014, 0.004]} castShadow>
        <cylinderGeometry args={[0.022, 0.024, 0.05, 16]} />
        <M color={COR.aluminioSujo} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[-0.04, 0.014, 0.004]}>
        <cylinderGeometry args={[0.015, 0.019, 0.01, 14]} />
        <M color={COR.ferroSujo} metalness={0.45} roughness={0.55} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[-0.04 + Math.cos(a) * 0.016, 0.02, 0.004 + Math.sin(a) * 0.016]}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.006, 6]} />
            <M color={COR.ferroSujo} metalness={0.55} roughness={0.45} />
          </mesh>
        )
      })}
      {/* Bujao da cuba */}
      <mesh position={[-0.062, -0.02, 0.004]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.006, 10]} />
        <M color={COR.latao} metalness={0.65} roughness={0.45} />
      </mesh>

      {/* Uniao de entrada de gasolina, virada para a bomba */}
      <mesh position={[-0.05, 0.014, 0.026]} rotation={[Math.PI / 2.2, 0, -0.3]}>
        <cylinderGeometry args={[0.006, 0.007, 0.024, 10]} />
        <M color={COR.latao} metalness={0.65} roughness={0.42} />
      </mesh>
      <mesh position={[-0.048, 0.016, 0.016]}>
        <cylinderGeometry args={[0.009, 0.009, 0.007, 6]} />
        <M color={COR.latao} metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Boca de admissao: e aqui que o filtro de ar se encaixa */}
      <mesh position={[0, 0.038, 0]}>
        <cylinderGeometry args={[0.027, 0.03, 0.018, 20]} />
        <M color={COR.ferroSujo} metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.048, 0]}>
        <torusGeometry args={[0.028, 0.004, 8, 20]} />
        <M color={COR.ferroSujoEscuro} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Tubo de respiro saindo da boca */}
      <mesh position={[0.03, 0.042, -0.012]} rotation={[0.3, 0, -1.1]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.026, 8]} />
        <M color={COR.latao} metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Afogador automatico: capsula com tampa de latao e parafusos */}
      <mesh position={[0.006, 0.028, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.032, 16]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[0.006, 0.028, -0.047]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.005, 16]} />
        <M color={COR.latao} metalness={0.6} roughness={0.45} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return (
          <mesh key={i} position={[0.006 + Math.cos(a) * 0.016, 0.028 + Math.sin(a) * 0.016, -0.05]}>
            <cylinderGeometry args={[0.002, 0.002, 0.005, 6]} />
            <M color={COR.ferroSujo} metalness={0.55} roughness={0.45} />
          </mesh>
        )
      })}

      {/* Diafragma da bomba de aceleracao, com a tampa aparafusada */}
      <mesh position={[0.038, -0.02, 0.006]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.017, 0.017, 0.014, 16]} />
        <M color={COR.fundicaoEscura} metalness={0.28} roughness={0.7} />
      </mesh>
      <mesh position={[0.046, -0.02, 0.006]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.005, 14]} />
        <M color={COR.ferroSujo} metalness={0.45} roughness={0.55} />
      </mesh>
      {/* Haste da bomba de aceleracao ligando a alavanca */}
      <mesh position={[0.046, -0.004, -0.008]} rotation={[0.2, 0, 0.25]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.034, 8]} />
        <M color={COR.ferroSujo} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Alavanca da borboleta e mola de retorno */}
      <BorboletaAcelerador />

      {/* Parafuso de mistura e de marcha lenta, em latao, com molas */}
      <group position={[0.034, -0.034, 0.026]} rotation={[0.6, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.0035, 0.0035, 0.026, 8]} />
          <M color={COR.latao} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.008, 0]}>
          <torusGeometry args={[0.0045, 0.0012, 5, 10]} />
          <M color={COR.ferroSujo} metalness={0.6} roughness={0.45} />
        </mesh>
      </group>
      <group position={[-0.03, -0.034, 0.03]} rotation={[0.7, 0, 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.003, 0.003, 0.022, 8]} />
          <M color={COR.latao} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.007, 0]}>
          <torusGeometry args={[0.004, 0.001, 5, 10]} />
          <M color={COR.ferroSujo} metalness={0.6} roughness={0.45} />
        </mesh>
      </group>
    </group>
  )
}

/** Alavanca que gira conforme o pedal do acelerador. */
function BorboletaAcelerador() {
  const g = useRef<Group>(null)
  useFrame(() => {
    const s = useSim.getState()
    const ativo = s.veiculo.acelerador.ajuste !== 'ausente'
    const alvo = ativo ? -s.rt.pedalAcelerador * 0.9 : 0
    if (g.current) g.current.rotation.x += (alvo - g.current.rotation.x) * 0.2
  })
  return (
    <group ref={g} position={[0.034, -0.012, -0.02]}>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[0.007, 0.034, 0.008]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.65} />
      </mesh>
      {/* Mola de retorno do acelerador */}
      <mesh position={[0.008, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.008, 0.0022, 6, 10, Math.PI * 3.5]} />
        <M color={COR.latao} metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Filtro de ar de banho de oleo: tambor preto de ~24 cm de diametro e
 * 14 cm de altura, encaixado sobre a boca do carburador. E a peca mais
 * alta e mais visivel do cofre — a primeira coisa que se ve ao abrir a
 * tampa, exatamente como na foto de referencia. A origem local fica na
 * base, no ponto em que ele senta no carburador.
 */
export function FiltroAr() {
  return (
    <group>
      {/* Colar de encaixe na boca do carburador */}
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.014, 16]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Reservatorio de oleo: a bacia inferior, um pouco mais larga */}
      <mesh position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[0.091, 0.082, 0.026, 28]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.15} roughness={0.86} />
      </mesh>
      {/* Corpo principal do tambor */}
      <mesh position={[0, 0.068, 0]} castShadow>
        <cylinderGeometry args={[0.089, 0.091, 0.062, 28]} />
        <M color={COR.plasticoSujo} metalness={0.1} roughness={0.9} />
      </mesh>
      {/* Aro de encaixe entre corpo e tampa (onde ficam os grampos) */}
      <mesh position={[0, 0.101, 0]}>
        <cylinderGeometry args={[0.093, 0.093, 0.007, 28]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.2} roughness={0.82} />
      </mesh>
      {/* Tampa plana: o tambor termina reto, sem cupula */}
      <mesh position={[0, 0.111, 0]} castShadow>
        <cylinderGeometry args={[0.089, 0.091, 0.012, 28]} />
        <M color={COR.plasticoSujo} metalness={0.1} roughness={0.88} />
      </mesh>
      {/* Porca borboleta central que prende a tampa */}
      <group position={[0, 0.127, 0]}>
        <mesh>
          <cylinderGeometry args={[0.009, 0.009, 0.016, 8]} />
          <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, 0.006, 0]} rotation={[0, (i * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.03, 0.005, 0.008]} />
            <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, -0.008, 0]}>
          <cylinderGeometry args={[0.021, 0.021, 0.005, 20]} />
          <M color={COR.ferroFoscoEscuro} metalness={0.3} roughness={0.75} />
        </mesh>
      </group>
      {/* Snorkel de admissao de ar, saindo para o lado */}
      <mesh position={[0.032, 0.05, 0.084]} rotation={[Math.PI / 2.6, 0, -0.25]}>
        <cylinderGeometry args={[0.019, 0.021, 0.08, 14]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.15} roughness={0.84} />
      </mesh>
      {/* Mangueira do respiro do carter, ligada na lateral do tambor */}
      <RespiroFiltro />
    </group>
  )
}

/** Mangueira de borracha do respiro, do filtro de ar ate o bocal do oleo. */
function RespiroFiltro() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-0.088, 0.045, 0.018),
        new Vector3(-0.16, 0.02, 0.04),
        new Vector3(-0.185, -0.03, 0.02),
      ]),
    [],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 16, 0.011, 8, false]} />
      <M color="#1a1c1e" metalness={0.08} roughness={0.94} />
    </mesh>
  )
}

/**
 * Distribuidor: corpo de aluminio de ~50 mm encaixado no furo do carter,
 * com o avanco a vacuo do lado e a mangueira fina indo para o carburador.
 */
export function Distribuidor() {
  return (
    <group>
      {/* Pe do corpo, dentro do carter, com o colar de fixacao */}
      <mesh position={[0, -0.042, 0]}>
        <cylinderGeometry args={[0.028, 0.032, 0.04, 16]} />
        <M color={COR.fundicaoEscura} metalness={0.28} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.024, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.008, 16]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.65} />
      </mesh>
      {/* Corpo principal */}
      <mesh castShadow>
        <cylinderGeometry args={[0.026, 0.028, 0.06, 16]} />
        <M color={COR.fundicao} metalness={0.3} roughness={0.68} />
      </mesh>
      {/* Capsula do avanco a vacuo, na lateral */}
      <mesh position={[-0.042, -0.008, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.019, 0.019, 0.03, 14]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.25} roughness={0.72} />
      </mesh>
      <mesh position={[-0.058, -0.008, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.014, 8]} />
        <M color={COR.ferroSujo} metalness={0.5} roughness={0.55} />
      </mesh>
    </group>
  )
}

/** Tampa preta do distribuidor, com as quatro torres dos cabos de vela. */
export function TampaDistribuidor() {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.037, 0.034, 0.04, 18]} />
        <M color="#141416" metalness={0.15} roughness={0.55} />
      </mesh>
      {/* Aba inferior onde encaixam as presilhas */}
      <mesh position={[0, -0.018, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.008, 18]} />
        <M color="#141416" metalness={0.15} roughness={0.6} />
      </mesh>
      {/* Torre central: recebe o cabo que vem da bobina */}
      <mesh position={[0, 0.034, 0]}>
        <cylinderGeometry args={[0.012, 0.009, 0.03, 10]} />
        <M color="#141416" metalness={0.15} roughness={0.55} />
      </mesh>
      {/* Quatro torres dos cilindros */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.026, 0.028, Math.sin(a) * 0.026]} rotation={[0, -a, 0]}>
            <cylinderGeometry args={[0.009, 0.007, 0.026, 8]} />
            <M color="#141416" metalness={0.15} roughness={0.55} />
          </mesh>
        )
      })}
    </group>
  )
}

export function Rotor() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    const rpm = useSim.getState().rt.rpm
    if (g.current) g.current.rotation.y += (rpm / 120) * Math.PI * 2 * dt * 0.3
  })
  return (
    <group ref={g}>
      <mesh>
        <cylinderGeometry args={[0.019, 0.019, 0.011, 12]} />
        <M color="#3d2b22" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.014, 0.004, 0]}>
        <boxGeometry args={[0.024, 0.004, 0.008]} />
        <M color={COR.cobre} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}

/**
 * Bobina de ignicao: cilindro preto de ~60 mm deitado sobre o suporte da
 * carcaca, com a torre de alta tensao e os terminais 15 (+) e 1 (-).
 */
export function Bobina() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.026, 0.026, 0.1, 16]} />
        <M color="#16181a" metalness={0.4} roughness={0.55} />
      </mesh>
      {/* Cabecote de baquelite */}
      <mesh position={[0, 0.058, 0]}>
        <cylinderGeometry args={[0.022, 0.027, 0.022, 16]} />
        <M color="#141416" metalness={0.15} roughness={0.6} />
      </mesh>
      {/* Torre central para o cabo que vai a tampa do distribuidor */}
      <mesh position={[0, 0.074, 0]}>
        <cylinderGeometry args={[0.011, 0.008, 0.018, 10]} />
        <M color="#141416" metalness={0.15} roughness={0.6} />
      </mesh>
      {/* Terminais 15 (+) e 1 (-) */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.014, 0.06, 0.023]}>
          <cylinderGeometry args={[0.004, 0.004, 0.01, 8]} />
          <M color={COR.latao} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Cinta de fixacao */}
      <mesh position={[0, 0.01, 0]}>
        <torusGeometry args={[0.028, 0.005, 6, 18]} />
        <M color={COR.ferroSujo} metalness={0.5} roughness={0.55} />
      </mesh>
      <CaboAltaTensao />
    </group>
  )
}

/**
 * Cabo de alta tensao da bobina ate a torre central da tampa do
 * distribuidor. Desenhado no espaco local da bobina, que esta girada
 * 90 graus, entao o eixo Y local aponta para a traseira do carro.
 */
function CaboAltaTensao() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, 0.082, 0),
        new Vector3(0.01, 0.13, -0.03),
        new Vector3(-0.03, 0.16, -0.05),
        new Vector3(-0.05, 0.135, -0.055),
      ]),
    [],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 20, 0.005, 6, false]} />
      <M color="#17191c" metalness={0.1} roughness={0.92} />
    </mesh>
  )
}

/**
 * Modulo de ignicao eletronica INDUMAG: caixa preta com aletas de
 * dissipacao, aparafusada na chapa lateral do cofre, com o conector e o
 * chicote de fios coloridos descendo em direcao a bobina.
 */
export function ModuloIgnicao() {
  return (
    <group>
      {/* Caixa / dissipador — verde como a caixa INDUMAG real */}
      <mesh castShadow>
        <boxGeometry args={[0.062, 0.034, 0.088]} />
        <M color={COR.verdeModulo} metalness={0.45} roughness={0.55} />
      </mesh>
      {/* Aletas de dissipacao no topo */}
      {[-0.03, -0.015, 0, 0.015, 0.03].map((dz) => (
        <mesh key={dz} position={[0, 0.02, dz]}>
          <boxGeometry args={[0.058, 0.008, 0.005]} />
          <M color={COR.verdeModuloEscuro} metalness={0.45} roughness={0.55} />
        </mesh>
      ))}
      {/* Etiqueta clara com o nome do fabricante */}
      <mesh position={[0, 0.018, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 0.02]} />
        <M color="#c8d0b8" metalness={0.05} roughness={0.85} />
      </mesh>
      {/* Conector do chicote, na ponta */}
      <mesh position={[0, -0.006, 0.05]}>
        <boxGeometry args={[0.03, 0.026, 0.018]} />
        <M color="#0e1012" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Chicote saindo em direcao a bobina */}
      <ChicoteModulo />
      {/* Fios vermelho e verde soltos, como na instalacao real */}
      <FioSolto cor={COR.fioVermelho} fim={[-0.05, -0.1, 0.04]} />
      <FioSolto cor={COR.fioVerde} fim={[-0.02, -0.115, 0.06]} />
      {/* Parafusos de fixacao na chapa */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[0, 0.018, l * 0.04]}>
          <cylinderGeometry args={[0.004, 0.004, 0.008, 8]} />
          <M color={COR.cromo} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Fio fino solto, caindo do conector do modulo — apenas decorativo. */
function FioSolto({ cor, fim }: { cor: string; fim: [number, number, number] }) {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, -0.014, 0.052),
        new Vector3(-0.02, -0.06, 0.055),
        new Vector3(...fim),
      ]),
    [fim],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 12, 0.0018, 5, false]} />
      <M color={cor} metalness={0.1} roughness={0.7} />
    </mesh>
  )
}

function ChicoteModulo() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, -0.01, 0.056),
        new Vector3(-0.05, -0.03, 0.04),
        new Vector3(-0.1, -0.05, -0.02),
      ]),
    [],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 16, 0.005, 6, false]} />
      <M color={COR.chicote} metalness={0.05} roughness={0.9} />
    </mesh>
  )
}

/**
 * Jogo de cabos de vela reorganizados. Cada cabo sai de sua torre na
 * tampa do distribuidor, sobe em arco limpo e desce paralelo ao vizinho
 * ate o cachimbo na vela. Separadores de cabos (wire looms) agrupam os
 * cabos de cada bancada, impedindo que se cruzem ou fiquem soltos.
 * Ordem de ignicao do Fusca: 1-4-3-2.
 */
export function CabosVela() {
  const { curvas, cachimbos, separadores } = useMemo(() => {
    const origem = new Vector3(0.14, 1.03, -1.56) // origem local da peca
    // Torres da tampa do distribuidor (tampa em [0.17, 1.03, -1.56])
    const torre = (i: number) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      return new Vector3(0.17 + Math.cos(a) * 0.026, 1.058, -1.56 + Math.sin(a) * 0.026)
    }
    // Velas rosqueadas no alto do cabecote: 1 e 2 a direita (-X), 3 e 4 a esquerda (+X)
    const vela = (x: number, z: number) => new Vector3(x, 0.75, z)

    // Cada cabo sai da torre, cruza por cima do carter e desce ate a vela.
    // Bancada direita (-X): cilindros 1 e 2
    const rota1: Vector3[] = [
      torre(0),
      new Vector3(0.11, 1.07, -1.5),
      new Vector3(0.0, 1.03, -1.44),
      new Vector3(-0.14, 0.95, -1.4),
      new Vector3(-0.27, 0.84, -1.38),
      new Vector3(-0.33, 0.77, -1.38),
      vela(-0.36, -1.38),
    ]
    const rota2: Vector3[] = [
      torre(1),
      new Vector3(0.09, 1.07, -1.6),
      new Vector3(-0.03, 1.03, -1.58),
      new Vector3(-0.14, 0.95, -1.56),
      new Vector3(-0.27, 0.84, -1.6),
      new Vector3(-0.33, 0.77, -1.62),
      vela(-0.36, -1.62),
    ]
    // Bancada esquerda (+X): cilindros 3 e 4
    const rota3: Vector3[] = [
      torre(2),
      new Vector3(0.23, 1.07, -1.5),
      new Vector3(0.31, 1.03, -1.44),
      new Vector3(0.39, 0.95, -1.4),
      new Vector3(0.42, 0.84, -1.38),
      new Vector3(0.39, 0.77, -1.38),
      vela(0.36, -1.38),
    ]
    const rota4: Vector3[] = [
      torre(3),
      new Vector3(0.25, 1.07, -1.6),
      new Vector3(0.33, 1.03, -1.58),
      new Vector3(0.39, 0.95, -1.56),
      new Vector3(0.42, 0.84, -1.6),
      new Vector3(0.39, 0.77, -1.62),
      vela(0.36, -1.62),
    ]

    const rotas = [rota1, rota2, rota3, rota4]
    const cs = rotas.map((pts) =>
      new CatmullRomCurve3(
        pts.map((p) => p.clone().sub(origem)),
        false,
        'catmullrom',
        0.35,
      ),
    )
    const caps = rotas.map((pts) => {
      const v = pts[pts.length - 1]
      const dir = Math.sign(v.x) || 1
      return new Vector3(v.x - dir * 0.028, v.y, v.z).sub(origem)
    })
    // Separadores: agrupam os dois cabos de cada bancada na descida
    const seps = [
      new Vector3(-0.14, 0.95, -1.48).sub(origem),
      new Vector3(-0.27, 0.84, -1.49).sub(origem),
      new Vector3(0.39, 0.95, -1.48).sub(origem),
      new Vector3(0.42, 0.84, -1.49).sub(origem),
    ]
    return { curvas: cs, cachimbos: caps, separadores: seps }
  }, [])
  return (
    <group>
      {curvas.map((c, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[c, 48, 0.0065, 6, false]} />
          <M color="#15171a" metalness={0.1} roughness={0.92} />
        </mesh>
      ))}
      {/* Separadores de cabos (wire looms) — pecinhas cilindricas que
          mantem os cabos paralelos e organizados */}
      {separadores.map((p, i) => (
        <group key={`sep-${i}`} position={p.toArray()}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.026, 10]} />
            <M color="#1e2023" metalness={0.15} roughness={0.88} />
          </mesh>
          {/* Furos do separador por onde passam os cabos */}
          {[-0.005, 0.005].map((dy) => (
            <mesh key={dy} position={[0, dy, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.007, 0.002, 6, 10]} />
              <M color="#111315" metalness={0.1} roughness={0.92} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Cachimbos de borracha encaixados nas velas */}
      {cachimbos.map((p, i) => (
        <group key={i} position={p.toArray()} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.013, 0.011, 0.038, 12]} />
            <M color="#1a1c1f" metalness={0.08} roughness={0.94} />
          </mesh>
          <mesh position={[0, 0.024, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.016, 10]} />
            <M color="#111315" metalness={0.08} roughness={0.94} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Vela() {
  const { ghost } = useEstiloPeca()
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* Rosca que entra no cabecote */}
      <mesh>
        <cylinderGeometry args={[0.007, 0.007, 0.022, 10]} />
        <M color={COR.cromo} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Sextavado de 21 mm */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.016, 6]} />
        <M color="#9aa0a4" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Isolador de ceramica */}
      <mesh position={[0, 0.046, 0]}>
        <cylinderGeometry args={[0.009, 0.01, 0.034, 12]} />
        <M color={ghost ? '#fff' : '#e8e2d6'} metalness={0.05} roughness={0.6} />
      </mesh>
      {/* Terminal onde encaixa o cachimbo */}
      <mesh position={[0, 0.068, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.012, 10]} />
        <M color={COR.cromo} metalness={0.85} roughness={0.35} />
      </mesh>
    </group>
  )
}

export function Escapamento() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.86, 0.15, 0.18]} />
        <M color="#4c5155" metalness={0.6} roughness={0.7} />
      </mesh>
      {[0.14, -0.14].map((x) => (
        <mesh key={x} position={[x, -0.03, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.14, 10]} />
          <M color="#3f4448" metalness={0.7} roughness={0.55} />
        </mesh>
      ))}
      {[0.36, -0.36].map((x) => (
        <mesh key={x} position={[x, 0.11, 0.12]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 10]} />
          <M color="#4c5155" metalness={0.6} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Mangueira de combustivel: borracha ambar translucida, da uniao da
 * bomba ate a entrada da cuba do carburador, com abracadeiras nas duas
 * pontas. E a mangueira clara que atravessa o vao na foto.
 */
export function MangueiraCombustivel() {
  const { curva, bracadeiras } = useMemo(() => {
    const origem = new Vector3(0.08, 0.94, -1.48) // origem local da peca
    // Percurso real: saida da bomba -> filtro em linha -> entrada da cuba
    const bomba = new Vector3(0.055, 0.935, -1.53)
    const filtroEntrada = new Vector3(0.27, 0.88, -1.475)
    const filtroSaida = new Vector3(0.27, 0.88, -1.405)
    const carburador = new Vector3(-0.012, 0.995, -1.42)
    const pts = [
      bomba,
      new Vector3(0.14, 0.9, -1.52),
      new Vector3(0.22, 0.885, -1.5),
      filtroEntrada,
      filtroSaida,
      new Vector3(0.21, 0.915, -1.37),
      new Vector3(0.1, 0.965, -1.37),
      carburador,
    ]
    const c = new CatmullRomCurve3(
      pts.map((v) => v.clone().sub(origem)),
      false,
      'catmullrom',
      0.35,
    )
    return { curva: c, bracadeiras: [bomba, carburador].map((v) => v.clone().sub(origem)) }
  }, [])
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curva, 48, 0.0072, 8, false]} />
        <M color="#c19338" metalness={0.05} roughness={0.35} transparent opacity={0.85} />
      </mesh>
      {/* Abracadeiras de arame nas duas pontas */}
      {bracadeiras.map((p, i) => (
        <mesh key={i} position={p.toArray()}>
          <torusGeometry args={[0.0088, 0.0022, 6, 12]} />
          <M color={COR.ferroSujo} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Bomba de combustivel mecanica: corpo fundido bipartido sobre o
 * pedestal do carter, com o copo de sedimentacao de vidro em cima e a
 * haste de acionamento saindo por baixo, para o eixo de comando.
 */
export function BombaCombustivel() {
  return (
    <group>
      {/* Pedestal isolante entre o carter e a bomba */}
      <mesh position={[0, -0.034, 0]} castShadow>
        <boxGeometry args={[0.044, 0.022, 0.04]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.15} roughness={0.85} />
      </mesh>
      {/* Metade inferior, onde trabalha o diafragma */}
      <mesh position={[0, -0.012, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.021, 0.02, 18]} />
        <M color={COR.fundicaoEscura} metalness={0.25} roughness={0.72} />
      </mesh>
      {/* Flange central com os parafusos das duas metades */}
      <mesh position={[0, 0.001, 0]}>
        <cylinderGeometry args={[0.027, 0.027, 0.005, 18]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.65} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.024, 0.004, Math.sin(a) * 0.024]}>
            <cylinderGeometry args={[0.003, 0.003, 0.008, 6]} />
            <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
          </mesh>
        )
      })}
      {/* Metade superior */}
      <mesh position={[0, 0.014, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.021, 18]} />
        <M color={COR.fundicao} metalness={0.28} roughness={0.7} />
      </mesh>
      {/* Copo de sedimentacao de vidro, preso pelo estribo de arame */}
      <mesh position={[0, 0.036, 0]}>
        <cylinderGeometry args={[0.016, 0.017, 0.022, 16]} />
        <M color="#cdbb7a" metalness={0.1} roughness={0.15} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.006, 14]} />
        <M color={COR.ferroSujo} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.036, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.02, 0.0018, 6, 14, Math.PI]} />
        <M color={COR.ferroSujo} metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Unioes de entrada e saida, em latao */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.024, 0.014, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.006, 0.016, 10]} />
          <M color={COR.latao} metalness={0.65} roughness={0.45} />
        </mesh>
      ))}
      {/* Haste de acionamento descendo para o eixo de comando */}
      <mesh position={[0, -0.052, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.018, 10]} />
        <M color={COR.ferroSujo} metalness={0.55} roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Chapas do cofre do motor: a chaparia que fecha o vao em volta do
 * motor e separa o compartimento quente do resto. E o fundo escuro e
 * empoeirado contra o qual todo o resto aparece — sem ela o cofre fica
 * com cara de poco vazio.
 */
export function ChapasDoCofre() {
  return (
    <group>
      {/* Chapa dianteira, na divisa com o cambio, com o vinco central */}
      <mesh position={[0, 0.84, -1.17]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[0.78, 0.012, 0.14]} />
        <M color={COR.chapaPreta} metalness={0.32} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.848, -1.12]}>
        <boxGeometry args={[0.74, 0.016, 0.03]} />
        <M color={COR.ferroFoscoEscuro} metalness={0.32} roughness={0.78} />
      </mesh>
      {/* Chapas laterais, deitadas, apoiando nos cabecotes */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.36, 0.84, -1.47]} rotation={[0, 0, l * 0.1]} castShadow>
          <boxGeometry args={[0.1, 0.012, 0.54]} />
          <M color={COR.chapaPreta} metalness={0.32} roughness={0.78} />
        </mesh>
      ))}
      {/* Chapa traseira, sobre o escapamento */}
      <mesh position={[0, 0.82, -1.81]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.012, 0.12]} />
        <M color={COR.chapaPreta} metalness={0.32} roughness={0.78} />
      </mesh>
      {/* Travessa que atravessa o cofre, onde apoiam as chapas */}
      <mesh position={[0, 0.816, -1.74]}>
        <boxGeometry args={[0.76, 0.018, 0.024]} />
        <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.72} />
      </mesh>
      <TubulacaoOleo />
      {/* Tubo de pre-aquecimento atravessando o vao: o tubao enferrujado da foto */}
      <ArcoPreAquecimento />
    </group>
  )
}

/**
 * Tubo de pre-aquecimento: atravessa o cofre de um lado ao outro em
 * arco, como uma ponte, passando por cima do filtro de combustivel.
 * E o tubao enferrujado que cruza o vao na foto de referencia.
 */
function ArcoPreAquecimento() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(0.4, 0.7, -1.5),
          new Vector3(0.3, 0.82, -1.5),
          new Vector3(0.12, 0.86, -1.51),
          new Vector3(-0.12, 0.86, -1.51),
          new Vector3(-0.3, 0.82, -1.5),
          new Vector3(-0.4, 0.7, -1.5),
        ],
        false,
        'catmullrom',
        0.4,
      ),
    [],
  )
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curva, 48, 0.021, 12, false]} />
        <M color={COR.ferrugem} metalness={0.35} roughness={0.85} />
      </mesh>
      {/* Luvas de emenda ao longo do tubo */}
      {[0.2, 0.5, 0.8].map((t) => {
        const pt = curva.getPoint(t)
        const tg = curva.getTangent(t)
        return (
          <mesh key={t} position={pt.toArray()} rotation={[0, 0, Math.atan2(tg.y, tg.x) - Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.024, 0.03, 14]} />
            <M color={COR.ferroSujoEscuro} metalness={0.35} roughness={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Tubulacao de oleo: o tubo de cobre que faz a curva no lado direito do
 * cofre, entre o carter e o radiador/pressostato. E o tubo claro e
 * curvado que aparece a direita na foto de referencia.
 */
function TubulacaoOleo() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(-0.13, 0.81, -1.66),
          new Vector3(-0.29, 0.86, -1.62),
          new Vector3(-0.36, 0.96, -1.5),
          new Vector3(-0.33, 1.0, -1.36),
          new Vector3(-0.22, 0.97, -1.3),
        ],
        false,
        'catmullrom',
        0.35,
      ),
    [],
  )
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curva, 40, 0.009, 10, false]} />
        <M color={COR.cobre} metalness={0.7} roughness={0.45} />
      </mesh>
      {/* Presilhas que prendem o tubo na chapa */}
      {[0.25, 0.7].map((t) => {
        const p = curva.getPoint(t)
        return (
          <mesh key={t} position={p.toArray()}>
            <torusGeometry args={[0.012, 0.003, 6, 12]} />
            <M color={COR.ferroSujoEscuro} metalness={0.45} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Bomba de combustivel mecanica (acionada pelo eixo de comando), com o
 * copo de sedimentacao translucido, o balancim de acionamento e o tubo
 * de cobre rigido que sobe ate o carburador — decoracao fixa do vao do
 * motor, fiel a posicao real junto ao carter.
 */
export function FiltroCombustivel() {
  return (
    // Deitado no sentido do carro: o corpo aponta para quem abre o cofre
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Corpo cilindrico claro, pequeno, o filtrinho de linha */}
      <mesh castShadow>
        <cylinderGeometry args={[0.019, 0.019, 0.062, 18]} />
        <M color="#cfcabb" metalness={0.06} roughness={0.62} />
      </mesh>
      {/* Faixa de sujeira no meio do corpo */}
      <mesh>
        <cylinderGeometry args={[0.0195, 0.0195, 0.016, 18]} />
        <M color="#a49d8e" metalness={0.06} roughness={0.8} />
      </mesh>
      {/* Bicos de entrada e saida nas duas pontas */}
      {[-1, 1].map((l) => (
        <group key={l}>
          <mesh position={[0, l * 0.036, 0]}>
            <cylinderGeometry args={[0.017, 0.019, 0.012, 16]} />
            <M color="#bdb8a9" metalness={0.06} roughness={0.66} />
          </mesh>
          <mesh position={[0, l * 0.05, 0]}>
            <cylinderGeometry args={[0.006, 0.007, 0.018, 12]} />
            <M color={COR.latao} metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Abracadeira que prende o filtro na chapa */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.021, 0.0035, 6, 16]} />
        <M color={COR.ferroSujoEscuro} metalness={0.45} roughness={0.6} />
      </mesh>
    </group>
  )
}

/**
 * Bomba de combustivel mecanica: corpo fundido bipartido sobre o
 * pedestal do carter, com o copo de sedimentacao de vidro em cima e a
 * haste de acionamento saindo por baixo, para o eixo de comando.
 */
/**
 * Tanque de combustivel de 40 litros, no compartimento dianteiro.
 * Formato de sela achatada, com o bocal de enchimento de um lado e a
 * boia do medidor no alto. O nivel liquido acompanha o ajuste da peca.
 */
export function TanqueCombustivel() {
  const nivel = useSim((s) => s.parts['tanque-combustivel']?.ajuste ?? 0)
  const frac = Math.max(0, Math.min(1, nivel / 40))
  const alturaUtil = 0.17
  const h = Math.max(0.004, alturaUtil * frac)
  return (
    <group>
      {/* Corpo do tanque */}
      <mesh castShadow>
        <boxGeometry args={[0.68, 0.2, 0.36]} />
        <M color="#5b6166" metalness={0.5} roughness={0.55} transparent opacity={0.55} />
      </mesh>
      {/* Gasolina dentro, subindo conforme o nivel */}
      <mesh position={[0, -alturaUtil / 2 + h / 2, 0]}>
        <boxGeometry args={[0.66, h, 0.34]} />
        <M color="#c8a94a" metalness={0.1} roughness={0.25} transparent opacity={0.75} />
      </mesh>
      {/* Selo das duas metades estampadas */}
      <mesh>
        <boxGeometry args={[0.69, 0.014, 0.37]} />
        <M color="#4a5055" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Bocal de enchimento, no lado direito */}
      <mesh position={[-0.26, 0.12, 0.06]} rotation={[0.2, 0, -0.25]}>
        <cylinderGeometry args={[0.038, 0.042, 0.09, 16]} />
        <M color="#575d62" metalness={0.55} roughness={0.5} />
      </mesh>
      <mesh position={[-0.28, 0.16, 0.07]} rotation={[0.2, 0, -0.25]}>
        <cylinderGeometry args={[0.044, 0.044, 0.018, 16]} />
        <M color={COR.ferroSujoEscuro} metalness={0.5} roughness={0.55} />
      </mesh>
      {/* Boia do medidor, no alto do tanque */}
      <mesh position={[0.1, 0.108, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.016, 16]} />
        <M color={COR.ferroSujo} metalness={0.5} roughness={0.55} />
      </mesh>
      <mesh position={[0.1, 0.124, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.018, 10]} />
        <M color={COR.latao} metalness={0.65} roughness={0.45} />
      </mesh>
      {/* Saida para a linha de combustivel, embaixo */}
      <mesh position={[0.05, -0.105, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.009, 0.03, 12]} />
        <M color={COR.latao} metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Linha rigida de combustivel: sai do tanque no compartimento dianteiro,
 * corre pelo tunel central sob o assoalho e sobe no cofre do motor ate o
 * filtro. Decoracao fixa, visivel com um dos compartimentos aberto.
 */
export function LinhaCombustivel() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(0.05, 0.7, 1.28), // saida do tanque
          new Vector3(0.06, 0.5, 1.1),
          new Vector3(0.04, 0.2, 0.75),
          new Vector3(0.02, 0.16, 0.1),
          new Vector3(0.03, 0.16, -0.7),
          new Vector3(0.06, 0.34, -1.05),
          new Vector3(0.16, 0.72, -1.32),
          new Vector3(0.28, 0.88, -1.44),
          new Vector3(0.3, 0.92, -1.5), // chega no filtro, no cofre
        ],
        false,
        'catmullrom',
        0.35,
      ),
    [],
  )
  return (
    <mesh>
      <tubeGeometry args={[curva, 70, 0.006, 8, false]} />
      <M color="#8a8f93" metalness={0.55} roughness={0.5} />
    </mesh>
  )
}

export function Bateria() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.2, 0.18]} />
        <M color="#1b2b22" metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <boxGeometry args={[0.25, 0.02, 0.19]} />
        <M color="#101a15" metalness={0.1} roughness={0.9} />
      </mesh>
      {[0.08, -0.08].map((x, i) => (
        <mesh key={x} position={[x, 0.13, 0.06]}>
          <cylinderGeometry args={[0.016, 0.019, 0.04, 10]} />
          <M color={i === 0 ? '#b4643c' : '#8d9195'} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────────────────── comandos e freios ─────────────────────────── */

/**
 * Pedal do Fusca. Alem de acompanhar o estado, ele e o proprio comando:
 * segurar o botao do mouse sobre o pedal equivale a manter o pe nele.
 */
export function Pedal({ tipo }: { tipo: 'acelerador' | 'freio' | 'embreagem' }) {
  const g = useRef<Group>(null)
  const pisando = useRef(false)
  const pisar = useSim((s) => s.pisarPedal)

  useFrame(() => {
    const rt = useSim.getState().rt
    const v = tipo === 'acelerador' ? rt.pedalAcelerador : tipo === 'freio' ? rt.pedalFreio : rt.pedalEmbreagem
    if (g.current) g.current.rotation.x += (v * 0.45 - g.current.rotation.x) * 0.2
  })

  // Soltar o botao fora do pedal tem de soltar o pedal tambem: sem isso o
  // pedal fica "colado" no fundo e a simulacao inteira mente.
  useEffect(() => {
    const soltar = () => {
      if (!pisando.current) return
      pisando.current = false
      pisar(tipo, 0)
    }
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [pisar, tipo])

  const rolo = tipo === 'acelerador'
  return (
    <group
      ref={g}
      onPointerDown={() => {
        pisando.current = true
        pisar(tipo, 1)
      }}
    >
      <mesh position={[0, 0.06, 0.02]}>
        <boxGeometry args={[0.03, 0.16, 0.02]} />
        <M color="#4a5054" metalness={0.7} roughness={0.5} />
      </mesh>
      {rolo ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.075, 12]} />
          <M color={COR.borracha} metalness={0.1} roughness={0.95} />
        </mesh>
      ) : (
        <mesh rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.075, 0.11, 0.018]} />
          <M color={COR.borracha} metalness={0.1} roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

export function AlavancaEmbreagem() {
  const g = useRef<Group>(null)
  useFrame(() => {
    // O giro sai do curso util do cabo, nao da posicao do pedal: com folga
    // excessiva o pedal desce e a alavanca quase nao se move.
    const acion = useSim.getState().drive.acionamento
    const alvo = (-acion.anguloAlavanca * Math.PI) / 180
    if (g.current) g.current.rotation.x += (alvo - g.current.rotation.x) * 0.2
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.025, 0.13, 0.02]} />
        <M color="#5a6165" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.11, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.05, 10]} />
        <M color={COR.cromo} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function CilindroMestre() {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.2, 14]} />
        <M color="#575e63" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0.045]}>
        <cylinderGeometry args={[0.015, 0.015, 0.05, 10]} />
        <M color="#4a5054" metalness={0.7} roughness={0.5} />
      </mesh>
    </group>
  )
}

export function ReservatorioFreio() {
  const nivel = useSim((s) => s.parts['reservatorio-freio'].ajuste)
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.13, 16]} />
        <M color="#c9cdd0" metalness={0.05} roughness={0.35} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -0.065 + (0.13 * (nivel / 100)) / 2, 0]}>
        <cylinderGeometry args={[0.048, 0.048, Math.max(0.004, 0.13 * (nivel / 100)), 16]} />
        <M color="#c8a94a" metalness={0.1} roughness={0.25} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.03, 12]} />
        <M color="#22272b" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  )
}

export function RegulagemFreio() {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.022, 0.022, 0.03, 12]} />
        <M color="#6b7276" metalness={0.7} roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.024, 0, Math.sin(a) * 0.024]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.014, 0.028, 0.008]} />
            <M color="#7b8286" metalness={0.7} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

export function TamborFreio() {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.1, 24]} />
        <M color="#5c6367" metalness={0.55} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 20]} />
        <M color="#4d5459" metalness={0.55} roughness={0.7} />
      </mesh>
    </group>
  )
}

export function RodaTraseira() {
  return <RodaMesh />
}

/** Cambio + carcaca da embreagem, entre o motor e o eixo traseiro. */
export function Transmissao() {
  return (
    <group position={[0, 0.6, -0.92]}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.3, 0.34]} />
        <meshStandardMaterial color="#6d7479" metalness={0.55} roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.02, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.14, 20]} />
        <meshStandardMaterial color="#6d7479" metalness={0.55} roughness={0.65} />
      </mesh>
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.42, -0.24, -0.28]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.56, 12]} />
          <meshStandardMaterial color="#4d5459" metalness={0.6} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
