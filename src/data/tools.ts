import type { ToolDef, ToolId } from './types'

export const FERRAMENTAS: ToolDef[] = [
  {
    id: 'mao',
    nome: 'Mao',
    icone: '✋',
    descricao: 'Presilhas, cachimbos de vela, mangueiras e porcas borboleta.',
    medidas: [],
    tipos: ['presilha'],
  },
  {
    id: 'chave-10',
    nome: 'Chave fixa 10 mm',
    icone: '🔧',
    descricao: 'Parafusos e porcas de 10 mm: bobina, presilha do cabo, terminais da bateria.',
    medidas: [10],
    tipos: ['sextavado', 'porca'],
  },
  {
    id: 'chave-13',
    nome: 'Chave fixa 13 mm',
    icone: '🔧',
    descricao: 'A medida mais usada no Fusca: base do carburador, gerador, distribuidor.',
    medidas: [13],
    tipos: ['sextavado', 'porca'],
  },
  {
    id: 'chave-17',
    nome: 'Chave fixa 17 mm',
    icone: '🔧',
    descricao: 'Porca da polia do gerador e fixacoes maiores.',
    medidas: [17],
    tipos: ['sextavado', 'porca'],
  },
  {
    id: 'chave-combinada',
    nome: 'Chave combinada 12-14 mm',
    icone: '🔩',
    descricao: 'Boca e estrela. Util em espacos apertados do cofre do motor.',
    medidas: [12, 14],
    tipos: ['sextavado', 'porca'],
  },
  {
    id: 'fenda',
    nome: 'Chave de fenda',
    icone: '🪛',
    descricao: 'Presilhas da tampa do distribuidor, abracadeiras e ajustes de marcha lenta.',
    medidas: [],
    tipos: ['fenda', 'presilha'],
  },
  {
    id: 'phillips',
    nome: 'Chave Phillips',
    icone: '🪛',
    descricao: 'Parafusos em cruz, como os do modulo de ignicao eletronica.',
    medidas: [],
    tipos: ['phillips'],
  },
  {
    id: 'alicate',
    nome: 'Alicate universal',
    icone: '🔧',
    descricao: 'Abracadeiras de mangueira, presilhas e a porca borboleta da embreagem.',
    medidas: [],
    tipos: ['presilha'],
  },
  {
    id: 'soquete',
    nome: 'Soquete + catraca',
    icone: '⚙',
    descricao: 'Jogo de soquetes. Escolha a medida antes de usar. 21 mm e a chave de vela.',
    medidas: [10, 13, 17, 19, 21, 36],
    tipos: ['sextavado', 'porca', 'roscado'],
    selecionavel: true,
  },
  {
    id: 'medidor',
    nome: 'Medidor de folga',
    icone: '📏',
    descricao: 'Regua e laminas calibradas. Mede folgas de cabo e curso de pedal.',
    medidas: [],
    tipos: [],
  },
]

export const FERRAMENTA_POR_ID: Record<ToolId, ToolDef> = Object.fromEntries(
  FERRAMENTAS.map((f) => [f.id, f]),
) as Record<ToolId, ToolDef>
