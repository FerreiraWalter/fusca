import { BufferAttribute, BufferGeometry, Vector3 } from 'three'

/**
 * Carroceria do VW Fusca 1973 (Prata DFF3A40) gerada por lofting de secoes
 * transversais hiperelipticas ao longo do eixo Z do veiculo.
 *
 * Inclui parabrisa dianteiro quase plano (pouco curvado), teto proporcional com ombros
 * suaves, janelas laterais fiéis e portas dianteiras articuladas que se abrem exatamente
 * como na foto real do veiculo.
 */

interface Estacao {
  z: number
  w: number
  yBase: number
  yTopo: number
  kTopo: number
  kBase: number
  n: number
}

const TABELA: Estacao[] = [
  // Frente / Bico arredondado
  { z: 2.06, w: 0.3, yBase: 0.46, yTopo: 0.62, kTopo: 0.88, kBase: 0.9, n: 2.3 },
  { z: 1.92, w: 0.4, yBase: 0.4, yTopo: 0.7, kTopo: 0.85, kBase: 0.88, n: 2.4 },
  { z: 1.74, w: 0.5, yBase: 0.36, yTopo: 0.8, kTopo: 0.82, kBase: 0.86, n: 2.5 },
  { z: 1.48, w: 0.58, yBase: 0.34, yTopo: 0.92, kTopo: 0.8, kBase: 0.84, n: 2.6 },
  { z: 1.18, w: 0.64, yBase: 0.33, yTopo: 1.02, kTopo: 0.78, kBase: 0.84, n: 2.8 },
  // Parabrisa (quase plano na horizontal, n = 3.6)
  { z: 0.92, w: 0.66, yBase: 0.33, yTopo: 1.18, kTopo: 0.78, kBase: 0.84, n: 3.6 },
  { z: 0.64, w: 0.67, yBase: 0.33, yTopo: 1.34, kTopo: 0.76, kBase: 0.84, n: 3.4 },
  // Teto plano e suave (parabolico baixo)
  { z: 0.3, w: 0.68, yBase: 0.33, yTopo: 1.4, kTopo: 0.75, kBase: 0.84, n: 3.0 },
  { z: -0.2, w: 0.68, yBase: 0.33, yTopo: 1.4, kTopo: 0.75, kBase: 0.84, n: 3.0 },
  { z: -0.58, w: 0.68, yBase: 0.33, yTopo: 1.36, kTopo: 0.75, kBase: 0.84, n: 2.8 },
  // Vidro traseiro / Caída traseira
  { z: -0.88, w: 0.67, yBase: 0.34, yTopo: 1.26, kTopo: 0.76, kBase: 0.84, n: 2.6 },
  { z: -1.14, w: 0.66, yBase: 0.35, yTopo: 1.14, kTopo: 0.78, kBase: 0.84, n: 2.5 },
  // Tampa do motor / Traseira
  { z: -1.4, w: 0.62, yBase: 0.36, yTopo: 1.0, kTopo: 0.8, kBase: 0.84, n: 2.4 },
  { z: -1.66, w: 0.56, yBase: 0.38, yTopo: 0.86, kTopo: 0.84, kBase: 0.86, n: 2.3 },
  { z: -1.88, w: 0.45, yBase: 0.42, yTopo: 0.74, kTopo: 0.88, kBase: 0.88, n: 2.2 },
  { z: -2.04, w: 0.3, yBase: 0.48, yTopo: 0.62, kTopo: 0.92, kBase: 0.9, n: 2.2 },
]

const N_ANG = 64
const SUB = 4

export const HINGE_CAPO: [number, number, number] = [0, 1.0, 1.02]
export const HINGE_TAMPA: [number, number, number] = [0, 1.12, -1.04]
export const HINGE_PORTA_ESQ: [number, number, number] = [0.64, 0.78, 0.56]
export const HINGE_PORTA_DIR: [number, number, number] = [-0.64, 0.78, 0.56]
export const PISO_VAO = 0.52

type Recorte =
  | 'vao-motor'
  | 'vao-capo'
  | 'jan-parabrisa'
  | 'jan-traseira'
  | 'jan-lateral'
  | 'porta-esq'
  | 'porta-dir'
  | 'vidro-porta-esq'
  | 'vidro-porta-dir'
  | null

function recorteDe(x: number, y: number, z: number, s: number): Recorte {
  const ax = Math.abs(x)
  if (z < -1.05 && z > -1.82 && s > 0.42 && ax < 0.38) return 'vao-motor'
  if (z > 1.05 && z < 1.82 && s > 0.42 && ax < 0.36) return 'vao-capo'
  if (z > 0.6 && z < 1.02 && s > 0.35 && ax < 0.48) return 'jan-parabrisa'
  if (z > -1.02 && z < -0.8 && s > 0.35 && ax < 0.44) return 'jan-traseira'

  // Janelas traseiras fixas
  if (y > 1.05 && y < 1.34 && ax > 0.28 && z > -0.74 && z < -0.15) return 'jan-lateral'

  // Portas dianteiras articuladas (abrem na lateral).
  // Acima da linha de cintura e vidro; abaixo, a chapa da porta.
  if (ax > 0.28 && z >= -0.15 && z <= 0.58) {
    if (y >= 1.05 && y < 1.34) return x > 0 ? 'vidro-porta-esq' : 'vidro-porta-dir'
    if (y >= 0.35 && y < 1.05) return x > 0 ? 'porta-esq' : 'porta-dir'
  }

  return null
}

const ehJanela = (r: Recorte) => r === 'jan-parabrisa' || r === 'jan-traseira' || r === 'jan-lateral'

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

function estacoesInterpoladas(): Estacao[] {
  const out: Estacao[] = []
  const at = (i: number) => TABELA[Math.max(0, Math.min(TABELA.length - 1, i))]
  const campos: (keyof Estacao)[] = ['z', 'w', 'yBase', 'yTopo', 'kTopo', 'kBase', 'n']
  for (let i = 0; i < TABELA.length - 1; i++) {
    const passos = i === TABELA.length - 2 ? SUB + 1 : SUB
    for (let k = 0; k < passos; k++) {
      const t = k / SUB
      const e = {} as Estacao
      for (const c of campos) e[c] = catmull(at(i - 1)[c], at(i)[c], at(i + 1)[c], at(i + 2)[c], t)
      out.push(e)
    }
  }
  return out
}

function pontoSecao(e: Estacao, theta: number): Vector3 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / e.n)
  const ey = Math.sign(s) * Math.pow(Math.abs(s), 2 / e.n)
  const yc = (e.yTopo + e.yBase) / 2
  const h = (e.yTopo - e.yBase) / 2
  const k = s > 0 ? 1 + (e.kTopo - 1) * s : 1 + (e.kBase - 1) * -s
  return new Vector3(e.w * ex * k, yc + h * ey, e.z)
}

interface Acumulador {
  pos: number[]
}

const novo = (): Acumulador => ({ pos: [] })

function tri(a: Acumulador, p: Vector3, q: Vector3, r: Vector3) {
  a.pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z)
}

function quad(a: Acumulador, p: Vector3, q: Vector3, r: Vector3, s: Vector3) {
  tri(a, p, q, r)
  tri(a, p, r, s)
}

function geo(a: Acumulador, deslocar?: [number, number, number]): BufferGeometry {
  const g = new BufferGeometry()
  const arr = new Float32Array(a.pos)
  if (deslocar) {
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] -= deslocar[0]
      arr[i + 1] -= deslocar[1]
      arr[i + 2] -= deslocar[2]
    }
  }
  g.setAttribute('position', new BufferAttribute(arr, 3))
  g.computeVertexNormals()
  return g
}

export interface GeometriasFusca {
  pele: BufferGeometry
  interior: BufferGeometry
  vidros: BufferGeometry
  tampaMotor: BufferGeometry
  tampaCapo: BufferGeometry
  portaEsq: BufferGeometry
  portaDir: BufferGeometry
  vidroPortaEsq: BufferGeometry
  vidroPortaDir: BufferGeometry
  paralamaDianteiroEsq: BufferGeometry
  paralamaDianteiroDir: BufferGeometry
  paralamaTraseiroEsq: BufferGeometry
  paralamaTraseiroDir: BufferGeometry
}

export function construirFusca(): GeometriasFusca {
  const est = estacoesInterpoladas()
  const NI = est.length

  const P: Vector3[][] = est.map((e) =>
    Array.from({ length: N_ANG }, (_, j) => pontoSecao(e, (j / N_ANG) * Math.PI * 2)),
  )
  const S: number[] = Array.from({ length: N_ANG }, (_, j) => Math.sin((j / N_ANG) * Math.PI * 2))

  const paraDentro = (i: number, j: number): Vector3 => {
    const e = est[i]
    const centro = new Vector3(0, (e.yTopo + e.yBase) / 2, e.z)
    return centro.sub(P[i][j]).normalize()
  }

  const marca: Recorte[][] = []
  for (let i = 0; i < NI - 1; i++) {
    marca[i] = []
    for (let j = 0; j < N_ANG; j++) {
      const j2 = (j + 1) % N_ANG
      const cx = (P[i][j].x + P[i][j2].x + P[i + 1][j2].x + P[i + 1][j].x) / 4
      const cy = (P[i][j].y + P[i][j2].y + P[i + 1][j2].y + P[i + 1][j].y) / 4
      const cz = (P[i][j].z + P[i + 1][j].z) / 2
      const cs = (S[j] + S[j2]) / 2
      marca[i][j] = recorteDe(cx, cy, cz, cs)
    }
  }

  const pele = novo()
  const interior = novo()
  const vidros = novo()
  const tMotor = novo()
  const tCapo = novo()
  const pEsq = novo()
  const pDir = novo()
  const vpEsq = novo()
  const vpDir = novo()

  for (let i = 0; i < NI - 1; i++) {
    for (let j = 0; j < N_ANG; j++) {
      const j2 = (j + 1) % N_ANG
      const A = P[i][j]
      const B = P[i][j2]
      const C = P[i + 1][j2]
      const D = P[i + 1][j]
      const r = marca[i][j]

      if (!r) {
        quad(pele, A, D, C, B)
        continue
      }

      if (r === 'vao-motor') quad(tMotor, A, D, C, B)
      else if (r === 'vao-capo') quad(tCapo, A, D, C, B)
      else if (r === 'porta-esq') quad(pEsq, A, D, C, B)
      else if (r === 'porta-dir') quad(pDir, A, D, C, B)
      else if (r === 'vidro-porta-esq' || r === 'vidro-porta-dir') {
        // Vidro embutido alguns milimetros para dentro, como os demais
        const off = 0.014
        const Ai = A.clone().addScaledVector(paraDentro(i, j), off)
        const Bi = B.clone().addScaledVector(paraDentro(i, j2), off)
        const Ci = C.clone().addScaledVector(paraDentro(i + 1, j2), off)
        const Di = D.clone().addScaledVector(paraDentro(i + 1, j), off)
        quad(r === 'vidro-porta-esq' ? vpEsq : vpDir, Ai, Di, Ci, Bi)
      }

      if (ehJanela(r)) {
        const off = 0.014
        const Ai = A.clone().addScaledVector(paraDentro(i, j), off)
        const Bi = B.clone().addScaledVector(paraDentro(i, j2), off)
        const Ci = C.clone().addScaledVector(paraDentro(i + 1, j2), off)
        const Di = D.clone().addScaledVector(paraDentro(i + 1, j), off)
        quad(vidros, Ai, Di, Ci, Bi)
      }

      const vizinhos: [number, number, Vector3, Vector3][] = [
        [i - 1, j, A, B],
        [i + 1, j, D, C],
        [i, j - 1, A, D],
        [i, j + 1, B, C],
      ]
      for (const [vi, vj, e1, e2] of vizinhos) {
        const jj = ((vj % N_ANG) + N_ANG) % N_ANG
        const fora = vi < 0 || vi >= NI - 1
        const vizinhoR = fora ? null : marca[vi][jj]
        if (vizinhoR === r) continue
        if (r === 'vao-motor' || r === 'vao-capo') {
          quad(interior, e1, e2, new Vector3(e2.x, PISO_VAO, e2.z), new Vector3(e1.x, PISO_VAO, e1.z))
        } else {
          const d1 = e1.clone().addScaledVector(paraDentro(i, j), 0.05)
          const d2 = e2.clone().addScaledVector(paraDentro(i, j2), 0.05)
          quad(interior, e1, e2, d2, d1)
        }
      }
    }
  }

  for (const [i, sinal] of [
    [0, 1],
    [NI - 1, -1],
  ] as const) {
    const e = est[i]
    const centro = new Vector3(0, (e.yTopo + e.yBase) / 2, e.z)
    for (let j = 0; j < N_ANG; j++) {
      const j2 = (j + 1) % N_ANG
      if (sinal > 0) tri(pele, centro, P[i][j], P[i][j2])
      else tri(pele, centro, P[i][j2], P[i][j])
    }
  }

  return {
    pele: geo(pele),
    interior: geo(interior),
    vidros: geo(vidros),
    tampaMotor: geo(tMotor, HINGE_TAMPA),
    tampaCapo: geo(tCapo, HINGE_CAPO),
    portaEsq: geo(pEsq, HINGE_PORTA_ESQ),
    portaDir: geo(pDir, HINGE_PORTA_DIR),
    vidroPortaEsq: geo(vpEsq, HINGE_PORTA_ESQ),
    vidroPortaDir: geo(vpDir, HINGE_PORTA_DIR),
    paralamaDianteiroEsq: geraParalamaDianteiro(1),
    paralamaDianteiroDir: geraParalamaDianteiro(-1),
    paralamaTraseiroEsq: geraParalamaTraseiro(1),
    paralamaTraseiroDir: geraParalamaTraseiro(-1),
  }
}

/**
 * Gera a geometria indexada do paralama dianteiro com arco concentrico perfeito
 * ao pneu e soquete do farol na frente.
 */
function geraParalamaDianteiro(sinalLado: number): BufferGeometry {
  const NZ = 44
  const NV = 40
  const zStart = 1.96
  const zEnd = 0.46
  const zRoda = 1.2
  const yRoda = 0.34
  const raioArcoPneu = 0.40

  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < NZ; i++) {
    const tz = i / (NZ - 1)
    const z = zStart * (1 - tz) + zEnd * tz
    const distRoda = z - zRoda

    const sinTZ = Math.sin(Math.PI * tz)
    const xIn = sinalLado * (0.34 + 0.30 * sinTZ)
    const xOut = sinalLado * (0.56 + 0.24 * sinTZ)
    const yTop = 0.44 + 0.38 * sinTZ
    const yIn = yTop * 0.95

    let yLip = 0.34
    if (Math.abs(distRoda) <= raioArcoPneu) {
      const ang = Math.acos(distRoda / raioArcoPneu)
      yLip = yRoda + raioArcoPneu * Math.sin(ang)
    }

    for (let j = 0; j < NV; j++) {
      const v = j / (NV - 1)
      // Secao redonda: a saia sobe suave ate a coroa e volta para dentro na
      // descida. Antes ela caia reta, o que criava uma quina no lugar do bojo.
      const xLip = xIn + (xOut - xIn) * 0.74
      let px: number, py: number
      if (v <= 0.5) {
        const u = v / 0.5
        const e = Math.sin(u * (Math.PI / 2))
        px = xIn + (xOut - xIn) * e
        py = yIn + (yTop - yIn) * e
      } else {
        const u = (v - 0.5) / 0.5
        const e = Math.sin(u * (Math.PI / 2))
        px = xOut - (xOut - xLip) * e
        py = yTop - (yTop - yLip) * e
      }

      let bojo = 0.062 * Math.sin(v * Math.PI)
      if (z > 1.45 && v > 0.15 && v < 0.85) {
        const fatorFarol = Math.sin(((z - 1.45) / 0.45) * Math.PI)
        bojo += 0.04 * fatorFarol * Math.sin(((v - 0.15) / 0.7) * Math.PI)
      }

      px += sinalLado * bojo
      positions.push(px, py, z)
    }
  }

  for (let i = 0; i < NZ - 1; i++) {
    for (let j = 0; j < NV - 1; j++) {
      const v00 = i * NV + j
      const v01 = i * NV + (j + 1)
      const v11 = (i + 1) * NV + (j + 1)
      const v10 = (i + 1) * NV + j

      if (sinalLado > 0) {
        indices.push(v00, v01, v11)
        indices.push(v00, v11, v10)
      } else {
        indices.push(v00, v11, v01)
        indices.push(v00, v10, v11)
      }
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/**
 * Gera a geometria indexada do paralama traseiro com arco concentrico perfeito ao pneu.
 */
function geraParalamaTraseiro(sinalLado: number): BufferGeometry {
  const NZ = 44
  const NV = 40
  const zStart = -0.46
  const zEnd = -1.88
  const zRoda = -1.2
  const yRoda = 0.34
  const raioArcoPneu = 0.40

  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < NZ; i++) {
    const tz = i / (NZ - 1)
    const z = zStart * (1 - tz) + zEnd * tz
    const distRoda = z - zRoda

    const sinTZ = Math.sin(Math.PI * tz)
    const xIn = sinalLado * (0.64 - 0.14 * tz)
    const xOut = sinalLado * (0.58 + 0.22 * sinTZ)
    const yTop = 0.44 + 0.38 * sinTZ
    const yIn = yTop * 0.95

    let yLip = 0.34
    if (Math.abs(distRoda) <= raioArcoPneu) {
      const ang = Math.acos(distRoda / raioArcoPneu)
      yLip = yRoda + raioArcoPneu * Math.sin(ang)
    }

    for (let j = 0; j < NV; j++) {
      const v = j / (NV - 1)
      // Secao redonda: a saia sobe suave ate a coroa e volta para dentro na
      // descida. Antes ela caia reta, o que criava uma quina no lugar do bojo.
      const xLip = xIn + (xOut - xIn) * 0.74
      let px: number, py: number
      if (v <= 0.5) {
        const u = v / 0.5
        const e = Math.sin(u * (Math.PI / 2))
        px = xIn + (xOut - xIn) * e
        py = yIn + (yTop - yIn) * e
      } else {
        const u = (v - 0.5) / 0.5
        const e = Math.sin(u * (Math.PI / 2))
        px = xOut - (xOut - xLip) * e
        py = yTop - (yTop - yLip) * e
      }
      let bojo = 0.068 * Math.sin(v * Math.PI)
      if (z < -1.45 && z > -1.85 && v > 0.2 && v < 0.8) {
        const fatorLanterna = Math.sin(((-1.45 - z) / 0.40) * Math.PI)
        bojo += 0.03 * fatorLanterna * Math.sin(((v - 0.2) / 0.6) * Math.PI)
      }
      px += sinalLado * bojo
      positions.push(px, py, z)
    }
  }

  for (let i = 0; i < NZ - 1; i++) {
    for (let j = 0; j < NV - 1; j++) {
      const v00 = i * NV + j
      const v01 = i * NV + (j + 1)
      const v11 = (i + 1) * NV + (j + 1)
      const v10 = (i + 1) * NV + j

      if (sinalLado > 0) {
        indices.push(v00, v01, v11)
        indices.push(v00, v11, v10)
      } else {
        indices.push(v00, v11, v01)
        indices.push(v00, v10, v11)
      }
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}
