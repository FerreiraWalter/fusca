import type { ProcedimentoDef, Snapshot } from './types'
import { faixaDoAjuste } from '../sim/vehicle'

// ── Predicados auxiliares ──────────────────────────────────────────────────
const inst = (s: Snapshot, id: string) => s.parts[id]?.status === 'INSTALLED'
const rem = (s: Snapshot, id: string) => s.parts[id]?.status === 'REMOVED'
const nova = (s: Snapshot, id: string) => s.parts[id]?.condicao === 'novo'
const aberto = (s: Snapshot, id: string) => !!s.parts[id]?.aberto
const desconectado = (s: Snapshot, id: string) => !s.conexoes[id]
const conectado = (s: Snapshot, id: string) => !!s.conexoes[id]
const bolt = (s: Snapshot, id: string, ...st: string[]) => st.includes(s.bolts[id]?.status ?? '')
const boltFora = (s: Snapshot, id: string) => bolt(s, id, 'REMOVED')
const ev = (s: Snapshot, tipo: string, alvo: string, detalhe?: string) =>
  s.eventos.some((e) => e.tipo === tipo && e.alvo === alvo && (detalhe === undefined || e.detalhe === detalhe))
const ajusteOk = (s: Snapshot, id: string) => faixaDoAjuste(id, s.parts[id]?.ajuste ?? 0) === 'ok'
const todos = (s: Snapshot, ids: string[], f: (s: Snapshot, id: string) => boolean) => ids.every((i) => f(s, i))
/** O aluno afundou o pedal da embreagem ate o batente do assoalho. */
const pedalFundo = (s: Snapshot) => ev(s, 'dirigir', 'pedal-embreagem', 'fundo')

const VELAS = ['vela-1', 'vela-2', 'vela-3', 'vela-4']

export const PROCEDIMENTOS: ProcedimentoDef[] = [
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'tutorial-filtro',
    titulo: 'Primeiro contato: filtro de ar',
    objetivo:
      'Aprenda o ciclo basico da oficina: abrir o cofre, escolher a ferramenta, soltar o fixador, remover, limpar e montar de volta.',
    categoria: 'Motor',
    dificuldade: 1,
    tempoAlvo: 180,
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir a tampa do motor',
        dica: 'Clique na tampa traseira do Fusca e use a acao Abrir.',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'localizar',
        titulo: 'Localizar e inspecionar o filtro de ar',
        dica: 'E o tambor redondo sobre o carburador. Selecione e use Inspecionar.',
        check: (s) => !!s.parts['filtro-ar']?.inspecionado,
      },
      {
        id: 'borboleta',
        titulo: 'Soltar a porca borboleta',
        dica: 'Porca borboleta se solta com a mao. Selecione a ferramenta Mao na caixa.',
        check: (s) => boltFora(s, 'b-filtro-borboleta'),
      },
      {
        id: 'remover',
        titulo: 'Remover o filtro',
        dica: 'Com o fixador fora, a peca fica solta e vai para a bancada.',
        check: (s) => rem(s, 'filtro-ar'),
      },
      {
        id: 'limpar',
        titulo: 'Limpar o elemento filtrante',
        dica: 'Selecione o filtro na bancada e use Limpar.',
        check: (s) => ev(s, 'limpar', 'filtro-ar'),
      },
      {
        id: 'instalar',
        titulo: 'Instalar o filtro de volta',
        dica: 'Selecione o filtro e use Instalar. Ele volta para o encaixe destacado.',
        check: (s) => inst(s, 'filtro-ar'),
      },
      {
        id: 'apertar',
        titulo: 'Recolocar e apertar a porca borboleta',
        dica: 'Instalar e depois Apertar. Uma peca solta e uma peca mal montada.',
        check: (s) => bolt(s, 'b-filtro-borboleta', 'TIGHTENED', 'LOCKED'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'troca-cabo-acelerador',
    titulo: 'Substituir o cabo do acelerador',
    objetivo:
      'Remover o cabo antigo, instalar um novo, conectar as duas pontas, regular a folga e testar o pedal.',
    categoria: 'Comandos',
    dificuldade: 2,
    tempoAlvo: 420,
    setup: {
      parts: { 'cabo-acelerador': { condicao: 'ruim' } },
      mensagem:
        'O motorista relata que o pedal do acelerador "prende" e o motor nao responde. O cabo esta desfiado junto a presilha.',
    },
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir o cofre do motor',
        dica: 'Sem acesso nao ha manutencao.',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'identificar',
        titulo: 'Identificar o cabo e inspecionar seu estado',
        dica: 'Siga o cabo do tunel central ate a alavanca da borboleta. Ative o modo Raio-X para ve-lo por inteiro.',
        check: (s) => !!s.parts['cabo-acelerador']?.inspecionado,
      },
      {
        id: 'presilha',
        titulo: 'Soltar a presilha de 10 mm no carburador',
        dica: 'A presilha e sextavada de 10 mm. Chave errada nao serve.',
        check: (s) => bolt(s, 'b-presilha-acel', 'LOOSENED', 'REMOVED'),
      },
      {
        id: 'desconectar-carb',
        titulo: 'Desconectar o cabo da alavanca da borboleta',
        dica: 'Clique no ponto de conexao destacado em amarelo.',
        check: (s) => desconectado(s, 'c-acel-carb'),
      },
      {
        id: 'desconectar-pedal',
        titulo: 'Desconectar o cabo do pedal',
        dica: 'A outra ponta esta no rolete do pedal, dentro da cabine. Use a camera Cabine.',
        check: (s) => desconectado(s, 'c-acel-pedal'),
      },
      {
        id: 'remover',
        titulo: 'Remover o cabo do veiculo',
        dica: 'Com as duas pontas livres o cabo sai pelo tunel.',
        check: (s) => rem(s, 'cabo-acelerador'),
      },
      {
        id: 'instalar-novo',
        titulo: 'Instalar o cabo NOVO',
        dica: 'Na bancada, escolha Instalar peca nova. Reaproveitar um cabo desfiado e defeito de servico.',
        check: (s) => inst(s, 'cabo-acelerador') && nova(s, 'cabo-acelerador'),
      },
      {
        id: 'conectar',
        titulo: 'Conectar as duas pontas',
        dica: 'Pedal e alavanca da borboleta.',
        check: (s) => conectado(s, 'c-acel-carb') && conectado(s, 'c-acel-pedal'),
      },
      {
        id: 'apertar',
        titulo: 'Apertar a presilha',
        dica: '6 Nm. Sem isso o cabo escapa na primeira arrancada.',
        check: (s) => bolt(s, 'b-presilha-acel', 'TIGHTENED'),
      },
      {
        id: 'ajustar',
        titulo: 'Regular a folga entre 1 e 3 mm',
        dica: 'Folga de menos deixa a borboleta aberta; de mais tira a aceleracao total.',
        check: (s) => ajusteOk(s, 'cabo-acelerador'),
      },
      {
        id: 'testar',
        titulo: 'Testar o pedal e confirmar o curso total',
        dica: 'Use Testar no cabo ou pise no pedal pelo painel de comandos.',
        check: (s) => ev(s, 'testar', 'cabo-acelerador', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'diagnostico-embreagem',
    titulo: 'Diagnostico: embreagem desregulada',
    objetivo:
      'O cliente reclama da embreagem. Descubra o sintoma testando o pedal, corrija a folga pela porca borboleta e confirme.',
    categoria: 'Comandos',
    dificuldade: 2,
    tempoAlvo: 300,
    diagnostico: true,
    variantes: [
      {
        parts: { 'cabo-embreagem': { ajuste: 33 } },
        mensagem: 'Cliente: "A embreagem so pega la embaixo e as marchas arranham."',
      },
      {
        parts: { 'cabo-embreagem': { ajuste: 3 } },
        mensagem: 'Cliente: "A embreagem pega logo no comeco do pedal e parece que patina na subida."',
      },
      {
        parts: { 'cabo-embreagem': { ajuste: 28 } },
        mensagem: 'Cliente: "Preciso afundar o pedal ate o assoalho para engatar a primeira."',
      },
    ],
    passos: [
      {
        id: 'testar-antes',
        titulo: 'Testar o pedal da embreagem e medir a folga',
        dica: 'Selecione o cabo da embreagem (ou o pedal) e use Testar. Anote a folga medida.',
        check: (s) => ev(s, 'testar', 'cabo-embreagem'),
      },
      {
        id: 'localizar',
        titulo: 'Localizar a porca borboleta na alavanca do cambio',
        dica: 'Fica na ponta rosqueada do cabo, na alavanca externa do cambio.',
        check: (s) => !!s.parts['cabo-embreagem']?.inspecionado || !!s.parts['alavanca-embreagem']?.inspecionado,
      },
      {
        id: 'ajustar',
        titulo: 'Regular a folga livre do pedal para 10 a 20 mm',
        dica: 'A porca borboleta gira com a mao ou com alicate.',
        check: (s) => ajusteOk(s, 'cabo-embreagem'),
      },
      {
        id: 'testar-depois',
        titulo: 'Testar novamente e confirmar o acionamento',
        dica: 'A folga correta desengata o disco sem manter carga no rolamento.',
        check: (s) => ev(s, 'testar', 'cabo-embreagem', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'troca-cabo-embreagem',
    titulo: 'Substituir o cabo da embreagem',
    objetivo: 'Cabo rompido: soltar a porca borboleta, retirar o cabo pelo tunel, montar o novo e regular.',
    categoria: 'Comandos',
    dificuldade: 3,
    tempoAlvo: 480,
    setup: {
      parts: { 'cabo-embreagem': { condicao: 'ruim', ajuste: 38 } },
      mensagem: 'O pedal da embreagem foi ao assoalho e ficou la. O cabo se rompeu junto a ponteira.',
    },
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir o cofre do motor',
        dica: 'A alavanca da embreagem fica no cambio, a frente do motor.',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'inspecionar',
        titulo: 'Inspecionar o cabo e confirmar o rompimento',
        dica: 'Modo Raio-X ajuda a acompanhar o cabo dentro do tunel.',
        check: (s) => !!s.parts['cabo-embreagem']?.inspecionado,
      },
      {
        id: 'borboleta',
        titulo: 'Soltar a porca borboleta de ajuste',
        dica: 'Com a mao ou com alicate.',
        check: (s) => bolt(s, 'b-borboleta-embreagem', 'LOOSENED', 'REMOVED'),
      },
      {
        id: 'desconectar',
        titulo: 'Soltar as duas pontas: alavanca e pedal',
        dica: 'Sao dois pontos de conexao.',
        check: (s) => desconectado(s, 'c-embr-alavanca') && desconectado(s, 'c-embr-pedal'),
      },
      {
        id: 'remover',
        titulo: 'Remover o cabo',
        dica: 'Puxe o cabo pelo tunel central.',
        check: (s) => rem(s, 'cabo-embreagem'),
      },
      {
        id: 'instalar',
        titulo: 'Instalar o cabo novo e conectar as pontas',
        dica: 'Passe primeiro pelo tunel, depois encaixe pedal e alavanca.',
        check: (s) =>
          inst(s, 'cabo-embreagem') &&
          nova(s, 'cabo-embreagem') &&
          conectado(s, 'c-embr-alavanca') &&
          conectado(s, 'c-embr-pedal'),
      },
      {
        id: 'ajustar',
        titulo: 'Regular a folga livre para 10 a 20 mm',
        dica: 'Rosqueie a porca borboleta ate a folga entrar na faixa.',
        check: (s) => ajusteOk(s, 'cabo-embreagem'),
      },
      {
        id: 'testar',
        titulo: 'Testar o pedal',
        dica: 'Confirme que desengata sem manter o rolamento em carga.',
        check: (s) => ev(s, 'testar', 'cabo-embreagem', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'primeira-saida',
    titulo: 'Primeira saida: sair do lugar sem matar o motor',
    objetivo:
      'A coordenacao basica de um carro manual. Dar partida, desacoplar, engatar a primeira, encontrar o ponto de engate e soltar o pedal sem afogar o motor.',
    categoria: 'Embreagem',
    dificuldade: 1,
    tempoAlvo: 240,
    passos: [
      {
        id: 'pista',
        titulo: 'Entrar na pista de oficina',
        dica: 'Aba Cabine, botao "Entrar na pista".',
        check: (s) => s.drive.pista,
      },
      {
        id: 'partida',
        titulo: 'Dar partida no motor',
        dica: 'Com o cambio em neutro, como se faz em qualquer carro manual.',
        check: (s) => ev(s, 'partida', 'motor-boxer', 'ok'),
      },
      {
        id: 'pisar',
        titulo: 'Pisar a embreagem ate o fim',
        dica: 'Segure a tecla A, arraste a barra do pedal ou clique no proprio pedal dentro do carro.',
        check: pedalFundo,
      },
      {
        id: 'engatar',
        titulo: 'Engatar a primeira marcha',
        dica: 'No portao em H a primeira fica a esquerda e a frente. Se arranhar, o disco ainda nao soltou.',
        check: (s) => ev(s, 'engatar', '1'),
      },
      {
        id: 'sair',
        titulo: 'Soltar a embreagem com o acelerador aberto e sair do lugar',
        dica: 'Solte o pedal aos poucos e mantenha alguma aceleracao: soltar de uma vez em marcha travada apaga o motor.',
        check: (s) => ev(s, 'dirigir', 'veiculo', 'saiu'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'trocar-marchas',
    titulo: 'Passagem de marchas ate a terceira',
    objetivo:
      'Subir a caixa com o carro andando: aliviar o acelerador, desacoplar, mudar de corredor pelo neutro e reacoplar sem solavanco.',
    categoria: 'Cambio',
    dificuldade: 2,
    tempoAlvo: 300,
    passos: [
      {
        id: 'pista',
        titulo: 'Entrar na pista com o motor funcionando',
        dica: 'Aba Cabine.',
        check: (s) => s.drive.pista && s.veiculo.motor.ligado,
      },
      {
        id: 'primeira',
        titulo: 'Sair em primeira',
        dica: 'Mesma sequencia da tarefa anterior.',
        check: (s) => ev(s, 'dirigir', 'veiculo', 'saiu'),
      },
      {
        id: 'segunda',
        titulo: 'Passar para a segunda',
        dica: 'A segunda fica no mesmo corredor da primeira, so que atras. Nao precisa passar pelo centro.',
        check: (s) => ev(s, 'engatar', '2'),
      },
      {
        id: 'terceira',
        titulo: 'Passar para a terceira',
        dica: 'Agora e preciso voltar ao neutro e mudar de corredor antes de engatar.',
        check: (s) => ev(s, 'engatar', '3'),
      },
      {
        id: 'limpo',
        titulo: 'Chegar a terceira andando a mais de 25 km/h',
        dica: 'Marcha alta com o carro devagar sobrecarrega a embreagem e pode apagar o motor.',
        check: (s) => s.drive.marcha === '3' && Math.abs(s.drive.velocidade) * 3.6 > 25,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'engatar-re',
    titulo: 'Engatar a re',
    objetivo:
      'A re do Fusca nao tem sincronizador e fica atras de um batente. Descobrir a sequencia correta e entender por que ela e diferente das outras.',
    categoria: 'Cambio',
    dificuldade: 2,
    tempoAlvo: 180,
    passos: [
      {
        id: 'pista',
        titulo: 'Entrar na pista e dar partida',
        dica: 'Aba Cabine.',
        check: (s) => s.drive.pista && s.veiculo.motor.ligado,
      },
      {
        id: 'neutro',
        titulo: 'Deixar o cambio em neutro com o carro parado',
        dica: 'A re nao entra em movimento, nem a partir de outra marcha.',
        check: (s) => s.drive.marcha === 'N' && Math.abs(s.drive.velocidade) < 0.4,
      },
      {
        id: 'pisar',
        titulo: 'Pisar a embreagem ate o fim',
        dica: 'Sem sincronizador, so o desacoplamento total permite o engate.',
        check: pedalFundo,
      },
      {
        id: 'engatar',
        titulo: 'Pressionar a alavanca para baixo e engatar a re',
        dica: 'O batente que protege a re so e vencido com a alavanca pressionada.',
        check: (s) => ev(s, 'engatar', 'R'),
      },
      {
        id: 'andar',
        titulo: 'Dar re por pelo menos 3 metros',
        dica: 'Mesmo controle de pedal da saida em primeira.',
        check: (s) => s.drive.velocidade < -0.5,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'troca-disco-embreagem',
    titulo: 'Substituir o disco de embreagem',
    objetivo:
      'A revisao completa do conjunto: separar o cambio do motor, desmontar plato e disco, montar o disco novo e reconstruir a cadeia de acionamento ate o teste na pista.',
    categoria: 'Embreagem',
    dificuldade: 5,
    tempoAlvo: 900,
    setup: {
      parts: { 'disco-embreagem': { condicao: 'ruim' } },
      mensagem:
        'Cliente: "Na subida o motor grita e o carro fica pra tras. Ja trocaram o cabo e nao adiantou."',
    },
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir o cofre do motor',
        dica: 'O conjunto fica entre o motor e o cambio, dentro da carcaca da embreagem.',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'visao',
        titulo: 'Inspecionar o disco e confirmar o desgaste',
        dica: 'Ligue a visao mecanica para enxergar dentro da carcaca.',
        check: (s) => !!s.parts['disco-embreagem'].inspecionado,
      },
      {
        id: 'carcaca-fora',
        titulo: 'Soltar as 4 porcas e retirar a carcaca da embreagem',
        dica: 'Porcas de 17 mm. Solte antes de tentar remover a peca.',
        check: (s) => rem(s, 'carcaca-embreagem'),
      },
      {
        id: 'plato-fora',
        titulo: 'Retirar os 6 parafusos do plato e remover o plato',
        dica: 'Parafusos de 13 mm, sempre em cruz para nao empenar a capa.',
        check: (s) => rem(s, 'plato-embreagem'),
      },
      {
        id: 'disco-fora',
        titulo: 'Remover o disco gasto',
        dica: 'Com o plato fora ele sai a mao.',
        check: (s) => rem(s, 'disco-embreagem'),
      },
      {
        id: 'volante',
        titulo: 'Inspecionar a face do volante do motor',
        dica: 'Disco novo sobre volante sulcado ou com oleo dura poucos meses.',
        check: (s) => !!s.parts['volante-motor'].inspecionado,
      },
      {
        id: 'disco-novo',
        titulo: 'Instalar um disco novo',
        dica: 'Na bancada, use "Instalar peca nova".',
        check: (s) => inst(s, 'disco-embreagem') && nova(s, 'disco-embreagem'),
      },
      {
        id: 'plato-montado',
        titulo: 'Montar o plato e apertar os 6 parafusos',
        dica: 'Instalar e depois Apertar: parafuso so encostado deixa o conjunto desbalanceado.',
        check: (s) =>
          inst(s, 'plato-embreagem') &&
          todos(s, ['b-plato-1', 'b-plato-2', 'b-plato-3', 'b-plato-4', 'b-plato-5', 'b-plato-6'], (x, id) =>
            bolt(x, id, 'TIGHTENED'),
          ),
      },
      {
        id: 'carcaca-montada',
        titulo: 'Recolocar a carcaca e apertar as 4 porcas',
        dica: 'Confira antes se garfo e rolamento continuam encaixados.',
        check: (s) =>
          inst(s, 'carcaca-embreagem') &&
          todos(s, ['b-sino-1', 'b-sino-2', 'b-sino-3', 'b-sino-4'], (x, id) =>
            bolt(x, id, 'TIGHTENED'),
          ) &&
          conectado(s, 'c-garfo-rolamento'),
      },
      {
        id: 'regular',
        titulo: 'Regular a folga livre do pedal para 10 a 20 mm',
        dica: 'Toda montagem de embreagem termina na porca borboleta.',
        check: (s) => ajusteOk(s, 'cabo-embreagem'),
      },
      {
        id: 'testar',
        titulo: 'Testar na pista: sair em primeira sem patinar',
        dica: 'Com disco novo e folga correta a rotacao acompanha a velocidade.',
        check: (s) => ev(s, 'dirigir', 'veiculo', 'saiu') && s.drive.desgasteDisco < 2,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'comando-cambio',
    titulo: 'Revisar o comando do cambio',
    objetivo:
      'Alavanca, haste e mecanismo de selecao: desmontar o comando pelo tunel central, remontar e conferir se o portao em H voltou a responder.',
    categoria: 'Cambio',
    dificuldade: 3,
    tempoAlvo: 480,
    setup: {
      parts: { 'haste-cambio': { condicao: 'ruim' } },
      mensagem: 'Cliente: "A alavanca ficou com uma folga enorme e as vezes nao acha a marcha."',
    },
    passos: [
      {
        id: 'banco',
        titulo: 'Remover o banco do motorista para acessar o tunel',
        dica: 'Aba Cabine ou camera Cabine para chegar ate ele.',
        check: (s) => rem(s, 'banco-motorista'),
      },
      {
        id: 'inspecionar',
        titulo: 'Inspecionar a haste do cambio',
        dica: 'A bucha central de apoio e o que costuma gastar.',
        check: (s) => !!s.parts['haste-cambio'].inspecionado,
      },
      {
        id: 'desacoplar',
        titulo: 'Soltar as duas pontas da haste: alavanca e mecanismo de selecao',
        dica: 'Sao dois pontos de conexao mecanica.',
        check: (s) => desconectado(s, 'c-alavanca-haste') && desconectado(s, 'c-haste-seletor'),
      },
      {
        id: 'remover',
        titulo: 'Retirar a haste pelo tunel',
        check: (s) => rem(s, 'haste-cambio'),
        dica: 'Ela sai por baixo, pelo tunel central.',
      },
      {
        id: 'nova',
        titulo: 'Instalar a haste nova e reconectar as duas pontas',
        dica: 'Use "Instalar peca nova" na bancada.',
        check: (s) =>
          inst(s, 'haste-cambio') &&
          nova(s, 'haste-cambio') &&
          conectado(s, 'c-alavanca-haste') &&
          conectado(s, 'c-haste-seletor'),
      },
      {
        id: 'banco-volta',
        titulo: 'Recolocar o banco',
        dica: 'Servico so termina com o carro montado.',
        check: (s) => inst(s, 'banco-motorista'),
      },
      {
        id: 'conferir',
        titulo: 'Percorrer o portao: engatar 1a, 2a, 3a e 4a',
        dica: 'Com o motor desligado da para conferir o desenho do H sem arranhar nada.',
        check: (s) => ev(s, 'engatar', '1') && ev(s, 'engatar', '2') && ev(s, 'engatar', '3') && ev(s, 'engatar', '4'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'revisao-ignicao',
    titulo: 'Revisao do sistema de ignicao',
    objetivo:
      'Trocar tampa, rotor e cabos, limpar as quatro velas e dar a partida com o motor completo.',
    categoria: 'Ignicao',
    dificuldade: 3,
    tempoAlvo: 600,
    setup: {
      parts: {
        'tampa-distribuidor': { condicao: 'ruim' },
        rotor: { condicao: 'desgastado' },
        'cabos-vela': { condicao: 'desgastado' },
        'vela-1': { condicao: 'desgastado' },
        'vela-2': { condicao: 'desgastado' },
        'vela-3': { condicao: 'desgastado' },
        'vela-4': { condicao: 'desgastado' },
      },
      mensagem: 'Motor falhando a frio e com marcha lenta irregular. Revisao completa da ignicao.',
    },
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir o cofre do motor',
        dica: '',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'cabos-fora',
        titulo: 'Retirar o jogo de cabos de vela',
        dica: 'Cachimbos saem com a mao. Nunca puxe pelo cabo.',
        check: (s) => rem(s, 'cabos-vela'),
      },
      {
        id: 'tampa-fora',
        titulo: 'Soltar as presilhas e retirar a tampa do distribuidor',
        dica: 'Duas presilhas laterais, chave de fenda ou mao.',
        check: (s) => rem(s, 'tampa-distribuidor'),
      },
      {
        id: 'rotor-inspecao',
        titulo: 'Inspecionar o rotor',
        dica: 'Verifique a ponta metalica e o resistor.',
        check: (s) => !!s.parts['rotor']?.inspecionado,
      },
      {
        id: 'rotor-novo',
        titulo: 'Trocar o rotor por um novo',
        dica: 'Remova o antigo e instale a peca nova.',
        check: (s) => inst(s, 'rotor') && nova(s, 'rotor'),
      },
      {
        id: 'tampa-nova',
        titulo: 'Instalar tampa nova e travar as presilhas',
        dica: 'A tampa so trava com as duas presilhas.',
        check: (s) =>
          inst(s, 'tampa-distribuidor') &&
          nova(s, 'tampa-distribuidor') &&
          bolt(s, 'b-tampa-clip-1', 'LOCKED', 'TIGHTENED') &&
          bolt(s, 'b-tampa-clip-2', 'LOCKED', 'TIGHTENED'),
      },
      {
        id: 'velas-fora',
        titulo: 'Remover as quatro velas',
        dica: 'Chave de vela: soquete de 21 mm.',
        check: (s) => todos(s, VELAS, rem),
      },
      {
        id: 'velas-limpas',
        titulo: 'Limpar as quatro velas',
        dica: 'Selecione cada vela na bancada e use Limpar.',
        check: (s) => VELAS.every((v) => ev(s, 'limpar', v)),
      },
      {
        id: 'velas-montadas',
        titulo: 'Montar as quatro velas de volta',
        dica: 'Aperto de 25 Nm, sem exagero: o cabecote e de aluminio.',
        check: (s) => todos(s, VELAS, inst),
      },
      {
        id: 'cabos-novos',
        titulo: 'Instalar o jogo de cabos novo na ordem 1-4-3-2',
        dica: 'O simulador monta na ordem correta ao instalar o jogo novo.',
        check: (s) => inst(s, 'cabos-vela') && nova(s, 'cabos-vela'),
      },
      {
        id: 'partida',
        titulo: 'Dar a partida',
        dica: 'Com a ignicao completa o motor deve pegar de primeira.',
        check: (s) => ev(s, 'partida', 'motor-boxer', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'correia-refrigeracao',
    titulo: 'Trocar a correia do gerador',
    objetivo:
      'Correia rompida. Instalar a nova, dar a tensao correta e entender por que ela e vital num motor refrigerado a ar.',
    categoria: 'Motor',
    dificuldade: 2,
    tempoAlvo: 360,
    setup: {
      parts: { correia: { status: 'REMOVED', condicao: 'ruim' } },
      bolts: { 'b-polia-porca': { status: 'REMOVED' } },
      mensagem:
        'A luz da bateria acendeu no painel e o carro comecou a cheirar a quente. A correia se partiu na estrada.',
    },
    passos: [
      {
        id: 'abrir',
        titulo: 'Abrir o cofre do motor',
        dica: '',
        check: (s) => aberto(s, 'tampa-motor'),
      },
      {
        id: 'inspecionar',
        titulo: 'Confirmar o problema inspecionando a polia e o gerador',
        dica: 'Sem correia o gerador nao carrega E a ventoinha nao gira.',
        check: (s) => !!s.parts['correia']?.inspecionado || !!s.parts['gerador']?.inspecionado,
      },
      {
        id: 'instalar',
        titulo: 'Instalar a correia nova',
        dica: 'Passe a correia nas duas polias antes de recolocar a porca.',
        check: (s) => inst(s, 'correia') && nova(s, 'correia'),
      },
      {
        id: 'porca',
        titulo: 'Recolocar e apertar a porca da polia (17 mm, 40 Nm)',
        dica: 'A porca de 17 mm prende as meias-polias.',
        check: (s) => bolt(s, 'b-polia-porca', 'TIGHTENED'),
      },
      {
        id: 'tensao',
        titulo: 'Ajustar a folga da correia para 10 a 15 mm',
        dica: 'Folga medida no meio do ramo livre, pressionando com o polegar.',
        check: (s) => ajusteOk(s, 'correia'),
      },
      {
        id: 'partida',
        titulo: 'Dar a partida e observar a temperatura',
        dica: 'Com a correia correta a temperatura estabiliza perto de 90 C.',
        check: (s) => ev(s, 'partida', 'motor-boxer', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'motor-nao-pega',
    titulo: 'Desafio: o motor nao pega',
    objetivo:
      'O Fusca chegou de guincho. Use o painel de diagnostico, descubra a falha, corrija e de a partida.',
    categoria: 'Ignicao',
    dificuldade: 4,
    tempoAlvo: 420,
    diagnostico: true,
    variantes: [
      {
        conexoes: { 'c-bobina-dist': false },
        mensagem: 'Gira mas nao pega. Nenhum sinal de que esteja tentando funcionar.',
      },
      {
        parts: { rotor: { status: 'REMOVED' } },
        mensagem: 'O carro parou de repente e nao voltou a pegar. Alguem mexeu na ignicao antes de voce.',
      },
      {
        conexoes: { 'c-combustivel': false },
        mensagem: 'Pega e morre. Cheiro de gasolina no cofre do motor.',
      },
      {
        bolts: { 'b-bat-neg': { status: 'LOOSENED' } },
        mensagem: 'Nem o motor de partida gira. Os faroes piscam fraco.',
      },
      {
        conexoes: { 'c-modulo-bobina': false },
        mensagem: 'Parou apos passar em uma poca de agua. Nao ha centelha.',
      },
    ],
    passos: [
      {
        id: 'tentar',
        titulo: 'Tentar dar a partida e observar o resultado',
        dica: 'Use o botao PARTIDA no painel do motor.',
        check: (s) => ev(s, 'partida', 'motor-boxer'),
      },
      {
        id: 'corrigir',
        titulo: 'Localizar e corrigir a falha',
        dica: 'O painel de diagnostico lista o que impede o funcionamento.',
        check: (s) => s.veiculo.falhas.length === 0,
      },
      {
        id: 'pegar',
        titulo: 'Dar a partida com o motor funcionando',
        dica: '',
        check: (s) => ev(s, 'partida', 'motor-boxer', 'ok'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'regulagem-freios',
    titulo: 'Regulagem do comando de freio',
    objetivo:
      'Pedal baixo. Conferir o nivel de fluido, regular a folga da haste do pedal e aproximar as lonas traseiras.',
    categoria: 'Freios',
    dificuldade: 2,
    tempoAlvo: 360,
    setup: {
      parts: {
        'pedal-freio': { ajuste: 22 },
        'regulagem-freio-tras': { ajuste: 3 },
        'reservatorio-freio': { ajuste: 55 },
      },
      mensagem: 'Cliente: "O pedal do freio vai quase ao assoalho antes do carro comecar a parar."',
    },
    passos: [
      {
        id: 'nivel',
        titulo: 'Conferir o nivel de fluido no compartimento dianteiro',
        dica: 'Abra o capo dianteiro e inspecione o reservatorio.',
        check: (s) => !!s.parts['reservatorio-freio']?.inspecionado,
      },
      {
        id: 'completar',
        titulo: 'Completar o fluido ate a faixa correta',
        dica: 'Entre 70 e 95 por cento.',
        check: (s) => ajusteOk(s, 'reservatorio-freio'),
      },
      {
        id: 'pedal',
        titulo: 'Regular a folga livre do pedal (5 a 10 mm)',
        dica: 'A haste do pedal define essa folga.',
        check: (s) => ajusteOk(s, 'pedal-freio'),
      },
      {
        id: 'lonas',
        titulo: 'Aproximar as lonas traseiras (8 a 12 clicks)',
        dica: 'Chave de fenda no furo do espelho, girando o excentrico.',
        check: (s) => ajusteOk(s, 'regulagem-freio-tras'),
      },
      {
        id: 'testar',
        titulo: 'Testar o pedal do freio',
        dica: 'O pedal deve ficar alto e firme.',
        check: (s) => ev(s, 'testar', 'pedal-freio', 'ok'),
      },
    ],
  },
]

export const PROCEDIMENTO_POR_ID: Record<string, ProcedimentoDef> = Object.fromEntries(
  PROCEDIMENTOS.map((p) => [p.id, p]),
)
