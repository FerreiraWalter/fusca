import type { ConexaoDef } from './types'

/**
 * Pontos de conexao entre componentes. Cada ponto pode ser desconectado e
 * reconectado, e o cabo/mangueira correspondente acompanha visualmente.
 */
export const CONEXOES: ConexaoDef[] = [
  {
    id: 'c-acel-carb',
    label: 'Cabo do acelerador na borboleta',
    tipo: 'cabo',
    a: 'cabo-acelerador',
    b: 'carburador',
    pos: [0.09, 1.0, -1.4],
    ferramentas: ['chave-10', 'alicate'],
    descricao:
      'Ponta do cabo presa na alavanca da borboleta por uma presilha de 10 mm. E aqui que se regula a folga.',
  },
  {
    id: 'c-acel-pedal',
    label: 'Cabo do acelerador no pedal',
    tipo: 'cabo',
    a: 'cabo-acelerador',
    b: 'pedal-acelerador',
    pos: [0.14, 0.23, 0.66],
    ferramentas: ['mao', 'alicate'],
    descricao: 'Ponteira encaixada no rolete do pedal, travada por um clipe.',
  },
  {
    id: 'c-combustivel',
    label: 'Mangueira de combustivel no carburador',
    tipo: 'mangueira',
    a: 'mangueira-combustivel',
    b: 'carburador',
    pos: [-0.01, 1.0, -1.42],
    ferramentas: ['alicate', 'mao'],
    descricao: 'Entrada de gasolina na cuba, presa por abracadeira.',
  },
  {
    id: 'c-bobina-dist',
    label: 'Cabo central bobina - distribuidor',
    tipo: 'eletrica',
    a: 'bobina',
    b: 'distribuidor',
    pos: [0.2, 1.07, -1.5],
    ferramentas: ['mao'],
    descricao: 'Cabo de alta tensao entre a saida central da bobina e a torre central da tampa.',
  },
  {
    id: 'c-modulo-bobina',
    label: 'Chicote do modulo de ignicao',
    tipo: 'eletrica',
    a: 'modulo-ignicao',
    b: 'bobina',
    pos: [0.3, 1.1, -1.34],
    ferramentas: ['mao'],
    descricao: 'Conector do modulo eletronico no terminal 1 (negativo) da bobina.',
  },
  {
    id: 'c-gerador-eletrica',
    label: 'Terminais D+ / DF do gerador',
    tipo: 'eletrica',
    a: 'gerador',
    b: 'bateria',
    pos: [-0.1, 1.1, -1.46],
    ferramentas: ['mao', 'chave-10'],
    descricao: 'Ligacao do gerador com o regulador de tensao e a bateria.',
  },
  {
    id: 'c-embr-alavanca',
    label: 'Cabo da embreagem na alavanca',
    tipo: 'cabo',
    a: 'cabo-embreagem',
    b: 'alavanca-embreagem',
    pos: [0.29, 0.6, -1.06],
    ferramentas: ['alicate', 'mao'],
    descricao: 'Ponta rosqueada do cabo atravessando a alavanca, travada pela porca borboleta.',
  },
  {
    id: 'c-embr-pedal',
    label: 'Cabo da embreagem no pedal',
    tipo: 'cabo',
    a: 'cabo-embreagem',
    b: 'pedal-embreagem',
    pos: [0.46, 0.23, 0.66],
    ferramentas: ['mao', 'alicate'],
    descricao: 'Ponteira do cabo no braco inferior do pedal da embreagem.',
  },
  {
    id: 'c-garfo-rolamento',
    label: 'Garfo encaixado no rolamento',
    tipo: 'mecanica',
    a: 'garfo-embreagem',
    b: 'rolamento-embreagem',
    pos: [0, 0.66, -1.185],
    ferramentas: ['mao'],
    descricao:
      'As duas pontas do garfo entram nos rebaixos da luva do rolamento e sao presas por molas em U. Solto aqui, o pedal move o garfo mas nao o rolamento.',
  },
  {
    id: 'c-haste-seletor',
    label: 'Haste no dedo seletor',
    tipo: 'mecanica',
    a: 'haste-cambio',
    b: 'seletor-marchas',
    pos: [0, 0.62, -0.72],
    ferramentas: ['mao', 'alicate'],
    descricao:
      'Acoplamento com pino travado por contrapino, na entrada da tampa seletora do cambio. E o ponto onde se regula o alinhamento do H.',
  },
  {
    id: 'c-alavanca-haste',
    label: 'Alavanca acoplada a haste',
    tipo: 'mecanica',
    a: 'alavanca-cambio',
    b: 'haste-cambio',
    pos: [0, 0.47, 0.36],
    ferramentas: ['mao', 'alicate'],
    descricao:
      'Ponta inferior da alavanca encaixada na garra da haste. Solto aqui, a alavanca gira livre sem engatar nada.',
  },
]

export const CONEXAO_POR_ID: Record<string, ConexaoDef> = Object.fromEntries(CONEXOES.map((c) => [c.id, c]))
