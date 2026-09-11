/** Tipos base do simulador. Todo o veiculo e descrito por dados, nao por codigo. */

export type Vec3 = [number, number, number]

export type Categoria =
  | 'Motor'
  | 'Ignicao'
  | 'Comandos'
  | 'Freios'
  | 'Eletrica'
  | 'Carroceria'
  | 'Transmissao'
  | 'Embreagem'
  | 'Cambio'

export type ToolId =
  | 'mao'
  | 'chave-10'
  | 'chave-13'
  | 'chave-17'
  | 'chave-combinada'
  | 'fenda'
  | 'phillips'
  | 'alicate'
  | 'soquete'
  | 'medidor'

export interface ToolDef {
  id: ToolId
  nome: string
  icone: string
  descricao: string
  /** Medidas (mm) que a ferramenta atende. */
  medidas: number[]
  /** Tipos de fixador que a ferramenta consegue operar. */
  tipos: FixadorTipo[]
  /** Ferramenta com medida selecionavel (jogo de soquetes). */
  selecionavel?: boolean
}

export type FixadorTipo = 'sextavado' | 'porca' | 'fenda' | 'phillips' | 'presilha' | 'roscado'

/** Estados possiveis de um parafuso, conforme especificacao. */
export type BoltStatus = 'LOCKED' | 'LOOSENED' | 'REMOVED' | 'INSTALLED' | 'TIGHTENED'

export interface BoltDef {
  id: string
  label: string
  /** Componente ao qual o fixador pertence. */
  parte: string
  tipo: FixadorTipo
  /** Medida em mm (sextavado/porca/roscado). */
  medida?: number
  /** Torque de aperto em Nm. */
  torque?: number
  pos: Vec3
  /** Direcao de saida do parafuso ao ser removido. */
  eixo?: Vec3
  /** Comprimento visual do corpo. */
  comprimento?: number
}

export type PartStatus = 'INSTALLED' | 'LOOSE' | 'REMOVED'
export type Condicao = 'novo' | 'bom' | 'desgastado' | 'ruim'

export interface Ajuste {
  label: string
  unidade: string
  min: number
  max: number
  passo: number
  /** Faixa correta [min, max]. */
  ideal: [number, number]
  padrao: number
  /** Texto quando abaixo da faixa ideal. */
  abaixo: string
  /** Texto quando acima da faixa ideal. */
  acima: string
  /** Ferramenta exigida para mexer no ajuste. */
  ferramentas: ToolId[]
}

export type AcaoId =
  | 'inspecionar'
  | 'remover'
  | 'instalar'
  | 'testar'
  | 'ajustar'
  | 'limpar'
  | 'abrir'
  | 'fechar'

export interface PartDef {
  id: string
  nome: string
  categoria: Categoria
  dificuldade: 1 | 2 | 3 | 4 | 5
  removivel: boolean
  /** Posicao instalada (espaco do veiculo). */
  pos: Vec3
  rot?: Vec3
  /** Direcao/tamanho do deslocamento ao soltar a peca. */
  saida?: Vec3
  /** Slot na bancada quando removida. */
  bancada?: number
  ferramentas: ToolId[]
  /** Medida (mm) exigida quando a ferramenta e um jogo de soquetes. */
  medida?: number
  /** Componentes que precisam sair antes deste. */
  requer: string[]
  parafusos: string[]
  conexoes: string[]
  acoes: AcaoId[]
  ajuste?: Ajuste
  descricao: string
  funcao: string
  falhas: string[]
  /** Visivel apenas com o compartimento aberto. */
  compartimento?: 'motor' | 'dianteiro' | 'cabine'
  /** Peca de consumo: existe versao nova na bancada. */
  consumivel?: boolean
  /** Grupo funcional usado pelos filtros da visao mecanica. */
  sistema?: Sistema
  /** Peca interna: so aparece na visao mecanica ou com a carcaca aberta. */
  interno?: boolean
  /** Elo da cadeia de acionamento da embreagem (ordem de exibicao). */
  elo?: number
}

export type ConexaoTipo = 'cabo' | 'eletrica' | 'mangueira' | 'mecanica'

export interface ConexaoDef {
  id: string
  label: string
  tipo: ConexaoTipo
  /** Componentes ligados por esta conexao. */
  a: string
  b: string
  /** Ponto 3D da conexao. */
  pos: Vec3
  ferramentas: ToolId[]
  descricao: string
}

export interface PartState {
  status: PartStatus
  condicao: Condicao
  /** Valor atual do ajuste, quando aplicavel. */
  ajuste: number
  /** Compartimento aberto (capo / tampa do motor). */
  aberto: boolean
  inspecionado: boolean
}

export interface BoltState {
  status: BoltStatus
  torqueAplicado: number
}

export type EventoTipo =
  | 'selecionar'
  | 'inspecionar'
  | 'remover'
  | 'instalar'
  | 'ajustar'
  | 'testar'
  | 'limpar'
  | 'abrir'
  | 'fechar'
  | 'parafuso'
  | 'conexao'
  | 'desconexao'
  | 'partida'
  | 'erro'
  | 'ferramenta-errada'
  | 'ordem-errada'
  | 'engatar'
  | 'arranhar'
  | 'morrer'
  | 'dirigir'
  | 'hipotese'

export interface SimEvento {
  t: number
  tipo: EventoTipo
  alvo: string
  detalhe?: string
  valor?: number
}

export type Nivel = 'ok' | 'aviso' | 'erro' | 'info'

export interface Feedback {
  id: number
  nivel: Nivel
  texto: string
  t: number
}

export interface VeiculoEstado {
  motor: {
    ligado: boolean
    rpm: number
    temperatura: number
    tempStatus: 'normal' | 'alta' | 'critica'
  }
  ignicao: {
    distribuidor: boolean
    velas: number
    modulo: boolean
    bobina: boolean
    cabos: boolean
  }
  acelerador: { cabo: boolean; ajuste: 'correto' | 'folgado' | 'tensionado' | 'ausente' }
  embreagem: { cabo: boolean; ajuste: 'correto' | 'alta' | 'baixa' | 'ausente'; folga: number }
  freios: { status: 'operacional' | 'atencao' | 'inoperante'; folgaPedal: number }
  eletrica: { bateria: boolean; carga: boolean }
  /** Impedimentos para o motor funcionar. */
  falhas: string[]
  /** Problemas que nao impedem a partida. */
  avisos: string[]
  podeLigar: boolean
}

export interface Snapshot {
  parts: Record<string, PartState>
  bolts: Record<string, BoltState>
  conexoes: Record<string, boolean>
  veiculo: VeiculoEstado
  eventos: SimEvento[]
  /** Estado vivo da transmissao, disponivel para checks de tarefa. */
  drive: DriveState
}

export interface PassoDef {
  id: string
  titulo: string
  dica: string
  check: (s: Snapshot) => boolean
}

export interface ProcedimentoDef {
  id: string
  titulo: string
  objetivo: string
  categoria: Categoria
  dificuldade: 1 | 2 | 3 | 4 | 5
  tempoAlvo: number
  /** Estado inicial injetado (falha a ser diagnosticada). */
  setup?: {
    parts?: Record<string, Partial<PartState>>
    bolts?: Record<string, Partial<BoltState>>
    conexoes?: Record<string, boolean>
    mensagem?: string
  }
  /** Setups alternativos sorteados no inicio (falhas diferentes a cada tentativa). */
  variantes?: NonNullable<ProcedimentoDef['setup']>[]
  passos: PassoDef[]
  /** Passos que o aluno precisa descobrir sozinho (nao mostra a lista). */
  diagnostico?: boolean
}

/* ════════════════════════ EMBREAGEM / CAMBIO ════════════════════════════ */

/** Sistema mecanico ao qual a peca pertence (filtros da visao mecanica). */
export type Sistema = 'motor' | 'embreagem' | 'cambio' | 'transmissao' | 'comando'

export type Marcha = 'N' | '1' | '2' | '3' | '4' | 'R'

/** Posicao da alavanca no portao em H. x: -1 esq / 0 corredor / 1 dir. */
export interface Portao {
  x: -1 | 0 | 1
  y: -1 | 0 | 1
  /** Alavanca pressionada para baixo (destrava a re no Fusca). */
  baixo: boolean
}

/**
 * Cadeia causal do acionamento, em milimetros e graus. Cada campo e a saida
 * do elo anterior: e isso que a interface desenha como "fluxo de forca".
 */
export interface Acionamento {
  /** Curso do pedal, 0 a 150 mm. */
  cursoPedal: number
  /** Folga livre consumida antes do cabo comecar a puxar. */
  folgaLivre: number
  /** Deslocamento util do cabo depois de vencida a folga. */
  cursoCabo: number
  /** Giro da alavanca externa do cambio, em graus. */
  anguloAlavanca: number
  /** Giro do garfo interno, em graus. */
  anguloGarfo: number
  /** Avanco do rolamento contra as molas do plato, em mm. */
  cursoRolamento: number
  /** Carga aplicada nos dedos do plato, 0 a 1. */
  cargaPlato: number
  /** 1 = disco totalmente acoplado, 0 = totalmente livre. */
  engate: number
  /** O rolamento encosta no plato mesmo com o pedal solto. */
  rolamentoEmCarga: boolean
  /** O curso do pedal nao chega a soltar o disco por completo. */
  desengateIncompleto: boolean
  /** Rompido / desconectado: o pedal nao move nada. */
  semAcionamento: boolean
}

export interface DriveState {
  marcha: Marcha
  portao: Portao
  /** Velocidade do veiculo em m/s. */
  velocidade: number
  /** Distancia percorrida na pista, em metros. */
  distancia: number
  /** Rotacao do eixo primario refletida no lado do cambio. */
  rpmPrimario: number
  /** Diferenca de rotacao entre motor e disco (patinacao). */
  patinacao: number
  /** Embreagem travada (motor e cambio girando juntos). */
  acoplado: boolean
  acionamento: Acionamento
  /** Motor apagou por acoplamento brusco / marcha alta demais. */
  morreu: boolean
  /** Contador de engates arranhados nesta sessao. */
  arranhoes: number
  /** Desgaste acumulado do disco por patinacao, 0 a 100. */
  desgasteDisco: number
  /** Modo pista ativo. */
  pista: boolean
}

/* ───────────────────── diagnostico por sintomas ────────────────────────── */

export interface PistaDef {
  id: string
  /** O que o aluno precisa fazer para levantar esta informacao. */
  titulo: string
  /** Texto revelado quando a verificacao e feita. */
  achado: string
  /** Esta pista aponta para a causa real? */
  relevante: boolean
  check: (s: Snapshot) => boolean
}

export interface HipoteseDef {
  id: string
  texto: string
  correta: boolean
  /** Resposta do sistema ao testar a hipotese. */
  resposta: string
}

export interface DesafioDef {
  id: string
  /** Frase curta que o aluno ve. Nunca revela a causa. */
  sintoma: string
  relato: string
  categoria: Categoria
  dificuldade: 1 | 2 | 3 | 4 | 5
  setup: {
    parts?: Record<string, Partial<PartState>>
    bolts?: Record<string, Partial<BoltState>>
    conexoes?: Record<string, boolean>
  }
  pistas: PistaDef[]
  hipoteses: HipoteseDef[]
  /** Condicao que prova que o defeito foi realmente corrigido. */
  corrigido: (s: Snapshot) => boolean
  /** Texto de fechamento, exibido apenas depois da correcao. */
  licao: string
}
