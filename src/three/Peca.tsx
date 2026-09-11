import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { PARTE_POR_ID, slotBancada } from '../data/parts'
import { useSim } from '../state/store'
import { PecaCtx } from './matlib'
import type { Vec3 } from '../data/types'

const soma = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]

function amortecer(atual: number, alvo: number, lambda: number, dt: number) {
  return MathUtils.damp(atual, alvo, lambda, dt)
}

interface Props {
  id: string
  children: ReactNode
  /** Peca que nao vai para a bancada (tampas, pedais, estruturas). */
  fixa?: boolean
}

/**
 * Envolve a geometria de um componente. Cuida de:
 *  - posicao animada entre o encaixe no carro e o slot na bancada;
 *  - selecao / hover / clique;
 *  - visibilidade conforme o compartimento aberto e o modo raio-X;
 *  - o "fantasma" que mostra onde a peca removida deve voltar.
 */
export function Peca({ id, children, fixa }: Props) {
  const def = PARTE_POR_ID[id]
  const est = useSim((s) => s.parts[id])
  const sel = useSim((s) => s.sel?.tipo === 'peca' && s.sel.id === id)
  const hov = useSim((s) => s.hov?.tipo === 'peca' && s.hov.id === id)
  const raioX = useSim((s) => s.raioX)
  const visao = useSim((s) => s.visaoMecanica)
  const filtro = useSim((s) => s.filtro)
  const camMode = useSim((s) => s.camMode)
  const tampaAberta = useSim((s) => s.parts['tampa-motor'].aberto)
  const capoAberto = useSim((s) => s.parts['capo-dianteiro'].aberto)
  const carcacaFora = useSim((s) => s.parts['carcaca-embreagem']?.status === 'REMOVED')
  const selecionar = useSim((s) => s.selecionar)
  const apontar = useSim((s) => s.apontar)

  const g = useRef<Group>(null)
  const [fase, setFase] = useState<'parado' | 'saindo' | 'entrando'>('parado')
  const anterior = useRef(est.status)

  useEffect(() => {
    if (fixa) return
    if (anterior.current !== est.status) {
      if (est.status === 'REMOVED') setFase('saindo')
      else if (est.status === 'INSTALLED') setFase('entrando')
      anterior.current = est.status
      const t = setTimeout(() => setFase('parado'), 420)
      return () => clearTimeout(t)
    }
  }, [est.status, fixa])

  const saida = def.saida ?? [0, 1, 0]
  const bancada = def.bancada != null ? slotBancada(def.bancada) : def.pos

  useFrame((_, dt) => {
    if (!g.current || fixa) return
    let alvo: Vec3
    let giro = 0
    if (est.status === 'REMOVED') {
      alvo = fase === 'saindo' ? soma(def.pos, saida, 0.34) : (bancada as Vec3)
      giro = fase === 'saindo' ? 0 : 0.5
    } else {
      alvo = fase === 'entrando' ? soma(def.pos, saida, 0.2) : def.pos
    }
    const k = fase === 'parado' ? 4.5 : 9
    g.current.position.x = amortecer(g.current.position.x, alvo[0], k, dt)
    g.current.position.y = amortecer(g.current.position.y, alvo[1], k, dt)
    g.current.position.z = amortecer(g.current.position.z, alvo[2], k, dt)
    g.current.rotation.y = amortecer(g.current.rotation.y, giro, 4, dt)
  })

  // Visibilidade por compartimento
  let visivel = true
  if (est.status === 'INSTALLED' && def.compartimento) {
    if (def.compartimento === 'motor') visivel = tampaAberta || raioX || visao
    if (def.compartimento === 'dianteiro') visivel = capoAberto || raioX || visao
    if (def.compartimento === 'cabine')
      visivel = raioX || visao || camMode === 'cabine' || camMode === 'dirigir'
  }
  // Peca interna: so aparece com o sino aberto ou com a visao mecanica ligada.
  if (est.status === 'INSTALLED' && def.interno) visivel = visivel && (visao || raioX || carcacaFora)

  const foco = visao && filtro !== 'todos'
  const destaque = foco && def.sistema === filtro
  const apagada = foco && def.sistema !== filtro

  const alerta = est.condicao === 'ruim'
  const naBancada = est.status === 'REMOVED'
  const posInicial = naBancada ? (bancada as Vec3) : def.pos

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

  return (
    <>
      <group
        ref={g}
        position={posInicial}
        rotation={def.rot ?? [0, 0, 0]}
        visible={visivel || naBancada}
        {...(visivel || naBancada ? eventos : {})}
      >
        <PecaCtx.Provider value={{ sel, hov, ghost: false, alerta, destaque, apagada }}>
          {children}
        </PecaCtx.Provider>
      </group>

      {naBancada && visivelFantasma(def.compartimento, tampaAberta, capoAberto, raioX || visao, camMode) && (
        <group position={def.pos} rotation={def.rot ?? [0, 0, 0]} {...eventos}>
          <PecaCtx.Provider value={{ sel: false, hov, ghost: true, alerta: false }}>{children}</PecaCtx.Provider>
        </group>
      )}
    </>
  )
}

function visivelFantasma(
  comp: string | undefined,
  tampa: boolean,
  capo: boolean,
  raioX: boolean,
  cam: string,
): boolean {
  if (!comp) return true
  if (comp === 'motor') return tampa || raioX
  if (comp === 'dianteiro') return capo || raioX
  return raioX || cam === 'cabine' || cam === 'dirigir'
}
