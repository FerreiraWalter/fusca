import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group } from 'three'
import { PARAFUSOS } from '../data/bolts'
import { PARTE_POR_ID } from '../data/parts'
import { useSim, ferramentaServe } from '../state/store'
import { COR } from './matlib'
import type { BoltDef, Vec3 } from '../data/types'

const CIMA = new Vector3(0, 1, 0)

function quatDoEixo(eixo: Vec3 | undefined): Quaternion {
  const v = new Vector3(...(eixo ?? [0, 1, 0])).normalize()
  return new Quaternion().setFromUnitVectors(CIMA, v)
}

/** Raio do circulo circunscrito do sextavado a partir da medida entre faces. */
const raioHex = (mm: number) => (mm / 1000 / 2) * 1.1547

export function Parafusos() {
  const mostrar = useSim((s) => s.mostrarFixadores)
  return (
    <group>
      {PARAFUSOS.map((b) => (
        <Parafuso key={b.id} def={b} mostrar={mostrar} />
      ))}
    </group>
  )
}

function Parafuso({ def, mostrar }: { def: BoltDef; mostrar: boolean }) {
  const est = useSim((s) => s.bolts[def.id])
  const sel = useSim((s) => s.sel?.tipo === 'parafuso' && s.sel.id === def.id)
  const hov = useSim((s) => s.hov?.tipo === 'parafuso' && s.hov.id === def.id)
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)
  const raioX = useSim((s) => s.raioX)
  const tampaAberta = useSim((s) => s.parts['tampa-motor'].aberto)
  const capoAberto = useSim((s) => s.parts['capo-dianteiro'].aberto)
  const g = useRef<Group>(null)

  const parte = PARTE_POR_ID[def.parte]
  const q = useMemo(() => quatDoEixo(def.eixo), [def.eixo])
  const eixo = useMemo(() => new Vector3(...(def.eixo ?? [0, 1, 0])).normalize(), [def.eixo])

  let visivel = mostrar
  if (parte?.compartimento === 'motor') visivel = visivel && (tampaAberta || raioX)
  if (parte?.compartimento === 'dianteiro') visivel = visivel && (capoAberto || raioX)

  useFrame((_, dt) => {
    if (!g.current) return
    const s = useSim.getState()
    const av = s.acaoVisual
    const animando = av?.alvo === def.id && performance.now() - av.inicio < av.duracao
    const alvo =
      est.status === 'LOOSENED' ? 0.016 : est.status === 'INSTALLED' ? 0.005 : est.status === 'REMOVED' ? 0.05 : 0
    const atual = g.current.position.length()
    const novo = atual + (alvo - atual) * Math.min(1, dt * 8)
    g.current.position.copy(eixo).multiplyScalar(novo)
    if (animando) g.current.rotation.y += (av!.giro > 0 ? 9 : -9) * dt
  })

  const cor =
    est.status === 'TIGHTENED' || est.status === 'LOCKED'
      ? '#b9c0c6'
      : est.status === 'LOOSENED'
        ? '#e0a33a'
        : '#e0a33a'
  const emissive = sel ? COR.sel : hov ? COR.hov : est.status === 'INSTALLED' ? '#c07d16' : '#000'
  const emissiveIntensity = sel ? 0.7 : hov ? 0.4 : est.status === 'INSTALLED' ? 0.3 : 0

  const r = def.medida ? raioHex(def.medida) : 0.008
  const comp = def.comprimento ?? 0.035

  if (!visivel) return null

  return (
    <group position={def.pos} quaternion={q}>
      {/* Furo / assento: sempre visivel, mostra que falta um fixador */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[r * 0.55, r * 1.25, 12]} />
        <meshBasicMaterial
          color={est.status === 'REMOVED' ? '#ff8a3d' : '#000'}
          transparent
          opacity={est.status === 'REMOVED' ? 0.85 : 0.35}
        />
      </mesh>

      {est.status !== 'REMOVED' && (
        <group
          ref={g}
          onClick={(e) => {
            e.stopPropagation()
            selecionar({ tipo: 'parafuso', id: def.id })
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            apontar({ tipo: 'parafuso', id: def.id })
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            apontar(null)
            document.body.style.cursor = 'auto'
          }}
        >
          {def.tipo === 'presilha' ? (
            <group>
              <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.012, 0.003, 6, 14, Math.PI * 1.4]} />
                <meshStandardMaterial color={cor} metalness={0.9} roughness={0.3} emissive={emissive} emissiveIntensity={emissiveIntensity} />
              </mesh>
              {[-1, 1].map((l) => (
                <mesh key={l} position={[l * 0.011, 0.022, 0]} rotation={[0, 0, l * 0.5]}>
                  <boxGeometry args={[0.016, 0.006, 0.004]} />
                  <meshStandardMaterial color={cor} metalness={0.9} roughness={0.3} emissive={emissive} emissiveIntensity={emissiveIntensity} />
                </mesh>
              ))}
            </group>
          ) : (
            <group>
              {/* Cabeca */}
              <mesh position={[0, 0.005, 0]}>
                {def.tipo === 'phillips' || def.tipo === 'fenda' ? (
                  <cylinderGeometry args={[r * 1.1, r * 1.1, 0.006, 14]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.008, 6]} />
                )}
                <meshStandardMaterial color={cor} metalness={0.85} roughness={0.32} emissive={emissive} emissiveIntensity={emissiveIntensity} />
              </mesh>
              {/* Fenda / cruz */}
              {(def.tipo === 'phillips' || def.tipo === 'fenda') && (
                <>
                  <mesh position={[0, 0.009, 0]}>
                    <boxGeometry args={[r * 1.7, 0.002, 0.0025]} />
                    <meshStandardMaterial color="#3a4045" />
                  </mesh>
                  {def.tipo === 'phillips' && (
                    <mesh position={[0, 0.009, 0]}>
                      <boxGeometry args={[0.0025, 0.002, r * 1.7]} />
                      <meshStandardMaterial color="#3a4045" />
                    </mesh>
                  )}
                </>
              )}
              {/* Corpo roscado */}
              <mesh position={[0, -comp / 2, 0]}>
                <cylinderGeometry args={[r * 0.6, r * 0.6, comp, 10]} />
                <meshStandardMaterial color="#8b9298" metalness={0.85} roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  )
}

/** Ferramenta que aparece e gira sobre o fixador durante a operacao. */
export function FerramentaEmAcao() {
  const acao = useSim((s) => s.acaoVisual)
  const g = useRef<Group>(null)
  const def = acao?.tipo === 'parafuso' ? PARAFUSOS.find((b) => b.id === acao.alvo) : undefined
  const q = useMemo(() => quatDoEixo(def?.eixo), [def?.eixo])

  useFrame((_, dt) => {
    if (!g.current || !acao) return
    const t = (performance.now() - acao.inicio) / acao.duracao
    g.current.rotation.y += (acao.giro > 0 ? 7 : -7) * dt
    const escala = t < 0.15 ? t / 0.15 : t > 0.85 ? Math.max(0, (1 - t) / 0.15) : 1
    g.current.scale.setScalar(escala)
  })

  if (!acao || !def) return null
  if (performance.now() - acao.inicio > acao.duracao) return null

  const chaveDeFenda = acao.ferramenta === 'fenda' || acao.ferramenta === 'phillips'
  const r = def.medida ? raioHex(def.medida) : 0.01

  return (
    <group position={def.pos} quaternion={q}>
      <group ref={g} position={[0, chaveDeFenda ? 0.09 : 0.02, 0]}>
        {chaveDeFenda ? (
          <>
            <mesh>
              <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
              <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.018, 0.015, 0.09, 10]} />
              <meshStandardMaterial color="#c0392b" metalness={0.15} roughness={0.7} />
            </mesh>
          </>
        ) : (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r * 1.5, r * 0.5, 6, 16, Math.PI * 1.5]} />
              <meshStandardMaterial color="#d3dae0" metalness={0.95} roughness={0.2} />
            </mesh>
            <mesh position={[r * 1.5 + 0.06, 0, 0]}>
              <boxGeometry args={[0.13, 0.008, 0.022]} />
              <meshStandardMaterial color="#d3dae0" metalness={0.95} roughness={0.2} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}

/** Realca em verde os fixadores que a ferramenta atual consegue operar. */
export function DicaFerramenta() {
  const ferramenta = useSim((s) => s.ferramenta)
  const medida = useSim((s) => s.medidaSoquete)
  const bolts = useSim((s) => s.bolts)
  const mostrar = useSim((s) => s.mostrarFixadores)
  const tampaAberta = useSim((s) => s.parts['tampa-motor'].aberto)
  const capoAberto = useSim((s) => s.parts['capo-dianteiro'].aberto)
  const raioX = useSim((s) => s.raioX)
  if (!mostrar) return null
  return (
    <group>
      {PARAFUSOS.filter((b) => {
        if (bolts[b.id].status === 'REMOVED') return false
        if (!ferramentaServe(ferramenta, medida, b)) return false
        const c = PARTE_POR_ID[b.parte]?.compartimento
        if (c === 'motor') return tampaAberta || raioX
        if (c === 'dianteiro') return capoAberto || raioX
        return true
      }).map((b) => (
        <mesh key={b.id} position={b.pos} quaternion={quatDoEixo(b.eixo)}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshBasicMaterial color={COR.ok} transparent opacity={0.14} />
        </mesh>
      ))}
    </group>
  )
}
