/**
 * Diagnostico por sintomas.
 *
 * A regra deste modulo e uma so: o aluno nunca recebe a causa. Recebe um
 * sintoma, um conjunto de verificacoes que pode executar no carro e, depois
 * de investigar, uma lista de hipoteses para testar. Cada desafio injeta um
 * defeito real no estado fisico do veiculo - nao existe "modo sintoma": o
 * carro se comporta mal porque a peca esta mesmo errada.
 *
 * As pistas incluem, de proposito, achados irrelevantes. Eliminar suspeitos
 * faz parte do diagnostico.
 */

import type { DesafioDef, Snapshot } from './types'

const inst = (s: Snapshot, id: string) => s.parts[id]?.status === 'INSTALLED'
const cond = (s: Snapshot, id: string) => s.parts[id]?.condicao
const conectado = (s: Snapshot, id: string) => !!s.conexoes[id]
const ev = (s: Snapshot, tipo: string, alvo?: string, detalhe?: string) =>
  s.eventos.some(
    (e) =>
      e.tipo === tipo &&
      (alvo === undefined || e.alvo === alvo) &&
      (detalhe === undefined || e.detalhe === detalhe),
  )
/** O aluno afundou o pedal da embreagem ate o fim do curso pelo menos uma vez. */
const pedalAoFundo = (s: Snapshot) => ev(s, 'dirigir', 'pedal-embreagem', 'fundo')
const folgaOk = (s: Snapshot) => {
  const f = s.parts['cabo-embreagem'].ajuste
  return f >= 10 && f <= 20
}
/** Acionamento intacto: o pedal chega ao plato e solta o disco por completo. */
const acionamentoIntegro = (s: Snapshot) =>
  !s.drive.acionamento.semAcionamento && !s.drive.acionamento.desengateIncompleto

export const DESAFIOS: DesafioDef[] = [
  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-primeira-dura',
    sintoma: 'Primeira marcha dificil de engatar.',
    relato:
      'Cliente: "Com o carro parado e o motor ligado, a primeira so entra na marra. As vezes tenho que desligar o motor para conseguir engatar."',
    categoria: 'Embreagem',
    dificuldade: 2,
    setup: { parts: { 'cabo-embreagem': { ajuste: 34 } } },
    pistas: [
      {
        id: 'medir-folga',
        titulo: 'Medir a folga livre do pedal da embreagem',
        achado:
          'Folga livre medida bem acima dos 10 a 20 mm de especificacao. O pedal anda um bom pedaco antes de o cabo comecar a puxar alguma coisa.',
        relevante: true,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'pedal-fundo',
        titulo: 'Afundar o pedal ate o assoalho e observar o rolamento',
        achado:
          'Mesmo com o pedal no batente do assoalho o rolamento nao completa o curso: os dedos do plato ainda estao sendo pressionados so pela metade.',
        relevante: true,
        check: pedalAoFundo,
      },
      {
        id: 'tentar-engatar',
        titulo: 'Tentar engatar uma marcha com o motor ligado',
        achado: 'A marcha arranha ao entrar. O sincronizador esta tendo de frear um disco que ainda gira preso ao volante.',
        relevante: true,
        check: (s) => s.drive.arranhoes > 0,
      },
      {
        id: 'inspecionar-disco',
        titulo: 'Inspecionar o disco de embreagem',
        achado: 'Guarnicao com folga de sobra ate os rebites e sem cheiro de queimado. O disco esta bom: nao e ele.',
        relevante: false,
        check: (s) => !!s.parts['disco-embreagem'].inspecionado,
      },
      {
        id: 'outras-marchas',
        titulo: 'Testar as outras marchas',
        achado: 'Terceira e quarta tambem raspam, mas menos. Nao e defeito de um sincronizador isolado: e o conjunto que nao esta soltando.',
        relevante: true,
        check: (s) => ev(s, 'arranhar') && s.drive.arranhoes >= 2,
      },
    ],
    hipoteses: [
      {
        id: 'h-sincronizador',
        texto: 'O sincronizador da primeira esta gasto e precisa abrir o cambio.',
        correta: false,
        resposta:
          'REJEITADA. Um sincronizador gasto afetaria uma marcha so, e o problema apareceria principalmente em reducao com o carro andando. Aqui todas as marchas resistem, com o carro parado.',
      },
      {
        id: 'h-disco',
        texto: 'O disco de embreagem esta gasto e precisa ser trocado.',
        correta: false,
        resposta:
          'REJEITADA. Disco gasto faz a embreagem PATINAR: o motor sobe de giro e o carro nao acompanha. Aqui e o contrario, ela nao solta.',
      },
      {
        id: 'h-folga',
        texto: 'A folga livre do cabo esta excessiva e o pedal acaba antes de desacoplar o disco.',
        correta: true,
        resposta:
          'CONFIRMADA. Folga demais significa curso util de menos. O pedal chega ao assoalho antes de o rolamento terminar de aliviar a mola do plato, o disco continua transmitindo torque e o sincronizador nao consegue igualar as rotacoes. Regule a folga para 10 a 20 mm na porca borboleta.',
      },
      {
        id: 'h-motor',
        texto: 'A marcha lenta do motor esta alta demais.',
        correta: false,
        resposta:
          'REJEITADA. Marcha lenta alta piora um engate, mas nao impede. E o teste de folga ja mostrou um numero fora de especificacao.',
      },
    ],
    corrigido: (s) => folgaOk(s) && acionamentoIntegro(s),
    licao:
      'Folga livre grande demais = "embreagem baixa". O curso do pedal e finito: tudo o que a folga consome deixa de estar disponivel para soltar o disco. O sintoma classico e exatamente este - dificuldade de engatar com o carro parado.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-patina',
    sintoma: 'O motor sobe de giro mas o carro nao acompanha.',
    relato:
      'Cliente: "Na subida da ladeira o motor grita, o ponteiro sobe, e o carro fica pra tras. Depois de um tempo da um cheiro forte dentro do carro."',
    categoria: 'Embreagem',
    dificuldade: 3,
    setup: { parts: { 'disco-embreagem': { condicao: 'ruim' } } },
    pistas: [
      {
        id: 'rodar',
        titulo: 'Pegar embalo, engatar 3a ou 4a e abrir o acelerador',
        achado:
          'Com marcha engatada e acelerador aberto, a rotacao do motor e a rotacao do eixo primario nao coincidem: existe deslizamento permanente entre os dois lados.',
        relevante: true,
        check: (s) => ev(s, 'dirigir', 'disco-embreagem', 'patinando'),
      },
      {
        id: 'medir-folga',
        titulo: 'Medir a folga livre do pedal',
        achado: 'Folga dentro da faixa de 10 a 20 mm. O ajuste do cabo esta correto: nao e regulagem.',
        relevante: false,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'abrir',
        titulo: 'Abrir a carcaca e inspecionar o disco',
        achado:
          'Guarnicao consumida ate perto dos rebites, com marcas de superaquecimento e cheiro de material de atrito queimado.',
        relevante: true,
        check: (s) => !!s.parts['disco-embreagem'].inspecionado,
      },
      {
        id: 'plato',
        titulo: 'Inspecionar o plato',
        achado: 'Mola-membrana com tensao normal e dedos sem desgaste anormal. O plato ainda serve.',
        relevante: false,
        check: (s) => !!s.parts['plato-embreagem'].inspecionado,
      },
      {
        id: 'volante',
        titulo: 'Inspecionar a face do volante do motor',
        achado: 'Face lisa, sem sulcos profundos e sem oleo. O retentor do virabrequim nao esta vazando.',
        relevante: true,
        check: (s) => !!s.parts['volante-motor'].inspecionado,
      },
    ],
    hipoteses: [
      {
        id: 'h-cabo',
        texto: 'A folga do cabo esta pequena demais e o rolamento vive em carga.',
        correta: false,
        resposta:
          'REJEITADA. Essa causa tambem faz patinar, mas a medicao mostrou folga dentro da faixa. E, com o rolamento em carga, haveria ruido constante com o pedal solto.',
      },
      {
        id: 'h-disco',
        texto: 'A guarnicao do disco chegou ao fim da vida util.',
        correta: true,
        resposta:
          'CONFIRMADA. Sem material de atrito o disco nao consegue mais transmitir o torque do motor: ele desliza sob carga, esquenta e queima ainda mais rapido. Substitua o disco.',
      },
      {
        id: 'h-motor',
        texto: 'O motor perdeu compressao e nao tem mais forca.',
        correta: false,
        resposta:
          'REJEITADA. Motor fraco nao ganha rotacao facil; aqui a rotacao SOBE sem que a velocidade acompanhe. Isso e escorregamento na transmissao, nao falta de potencia.',
      },
      {
        id: 'h-freio',
        texto: 'Os freios estao arrastando e segurando o carro.',
        correta: false,
        resposta:
          'REJEITADA. Freio arrastando segura o carro, mas o motor tambem sentiria a carga e perderia rotacao, nao ganharia.',
      },
    ],
    corrigido: (s) => inst(s, 'disco-embreagem') && cond(s, 'disco-embreagem') === 'novo',
    licao:
      'Patinar e o oposto de nao desengatar. O disco e a unica peca do conjunto projetada para se desgastar; quando a guarnicao acaba, a capacidade de torque cai abaixo do que o motor entrega e a diferenca vira calor.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-rolamento-carga',
    sintoma: 'Chiado constante que muda quando encosto o pe na embreagem.',
    relato:
      'Cliente: "Tem um chiado fino o tempo todo com o motor ligado. Quando encosto no pedal ele muda de tom. E a embreagem parece pegar logo no comeco do pedal."',
    categoria: 'Embreagem',
    dificuldade: 3,
    setup: { parts: { 'cabo-embreagem': { ajuste: 2 } } },
    pistas: [
      {
        id: 'medir-folga',
        titulo: 'Medir a folga livre do pedal',
        achado: 'Folga livre praticamente nula: o pedal comeca a puxar o cabo no primeiro milimetro de curso.',
        relevante: true,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'rolamento',
        titulo: 'Inspecionar o rolamento da embreagem',
        achado:
          'O rolamento esta encostado nos dedos do plato mesmo com o pedal totalmente solto: ele gira em carga o tempo todo que o motor esta funcionando.',
        relevante: true,
        check: (s) => !!s.parts['rolamento-embreagem'].inspecionado,
      },
      {
        id: 'engate-alto',
        titulo: 'Sair com o carro e observar onde a embreagem pega',
        achado: 'O ponto de engate acontece logo no inicio do curso do pedal, muito acima do normal.',
        relevante: true,
        check: (s) => ev(s, 'dirigir', 'veiculo', 'saiu'),
      },
      {
        id: 'disco',
        titulo: 'Inspecionar o disco',
        achado: 'Guarnicao ainda com material. O disco vai durar pouco assim, mas ainda nao e a causa do ruido.',
        relevante: false,
        check: (s) => !!s.parts['disco-embreagem'].inspecionado,
      },
    ],
    hipoteses: [
      {
        id: 'h-rolamento-seco',
        texto: 'O rolamento esta seco e precisa ser trocado.',
        correta: false,
        resposta:
          'PARCIAL, MAS REJEITADA COMO CAUSA. Trocar o rolamento tira o ruido por algumas semanas. Se a folga continuar zerada, o rolamento novo vai morrer do mesmo jeito. Ataque a causa, nao o sintoma.',
      },
      {
        id: 'h-folga-zero',
        texto: 'A folga livre do cabo esta insuficiente e mantem o rolamento pressionado contra o plato.',
        correta: true,
        resposta:
          'CONFIRMADA. Sem folga o rolamento nunca descansa: ele gira em carga durante todo o funcionamento do motor (dai o chiado) e ainda alivia parte da mola do plato, reduzindo a pressao sobre o disco. Aumente a folga para 10 a 20 mm.',
      },
      {
        id: 'h-gerador',
        texto: 'O ruido vem do rolamento do gerador ou da ventoinha.',
        correta: false,
        resposta:
          'REJEITADA. Um ruido de gerador nao mudaria de tom ao encostar no pedal da embreagem. A mudanca com o pedal aponta direto para o conjunto de acionamento.',
      },
      {
        id: 'h-plato',
        texto: 'A mola do plato quebrou.',
        correta: false,
        resposta:
          'REJEITADA. Mola quebrada faria a embreagem patinar sem qualquer relacao com a posicao do pedal, e o ponto de engate nao ficaria alto: ele sumiria.',
      },
    ],
    corrigido: (s) => folgaOk(s) && !s.drive.acionamento.rolamentoEmCarga,
    licao:
      'A folga livre existe para garantir que o rolamento fique afastado do plato com o pedal solto. Ela nao e "sobra": e uma cota de projeto. Zerada, voce troca rolamento e disco em ciclos cada vez mais curtos.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-cabo-rompido',
    sintoma: 'O pedal da embreagem afundou e ficou la embaixo.',
    relato: 'Cliente: "Fui trocar de marcha no transito, o pedal foi ao chao e nao voltou mais. Tive que vir de guincho."',
    categoria: 'Embreagem',
    dificuldade: 2,
    setup: {
      parts: { 'cabo-embreagem': { condicao: 'ruim' } },
      conexoes: { 'c-embr-alavanca': false },
    },
    pistas: [
      {
        id: 'pedal',
        titulo: 'Pisar o pedal da embreagem e sentir a resistencia',
        achado: 'O pedal desce sem nenhuma resistencia e nao volta sozinho. Nao ha carga de mola do outro lado.',
        relevante: true,
        check: pedalAoFundo,
      },
      {
        id: 'alavanca',
        titulo: 'Observar a alavanca de acionamento no cambio com o pedal pisado',
        achado: 'Com alguem pisando o pedal, a alavanca externa do cambio nao se move um milimetro.',
        relevante: true,
        check: (s) => !!s.parts['alavanca-embreagem'].inspecionado,
      },
      {
        id: 'cabo',
        titulo: 'Inspecionar o cabo da embreagem em todo o trajeto',
        achado: 'A ponta rosqueada do cabo esta livre da alavanca. O cabo nao esta mais ligado ao mecanismo.',
        relevante: true,
        check: (s) => !!s.parts['cabo-embreagem'].inspecionado,
      },
      {
        id: 'garfo',
        titulo: 'Inspecionar o garfo dentro da carcaca',
        achado: 'Garfo e rolamento em ordem, encaixados normalmente. O problema esta antes deles na cadeia.',
        relevante: false,
        check: (s) => !!s.parts['garfo-embreagem'].inspecionado,
      },
    ],
    hipoteses: [
      {
        id: 'h-cabo',
        texto: 'O cabo se soltou ou rompeu e nao transmite mais nada ao mecanismo.',
        correta: true,
        resposta:
          'CONFIRMADA. Sem o cabo ligando as duas pontas, o pedal fica sem carga e o plato mantem o disco preso ao volante permanentemente. Substitua o cabo, conecte as duas pontas e regule a folga.',
      },
      {
        id: 'h-mola',
        texto: 'A mola de retorno do pedal quebrou.',
        correta: false,
        resposta:
          'REJEITADA. A mola de retorno explicaria o pedal nao voltar, mas nao explicaria a alavanca do cambio parada com o pedal pisado.',
      },
      {
        id: 'h-plato',
        texto: 'O plato quebrou por dentro.',
        correta: false,
        resposta:
          'REJEITADA. Plato quebrado deixaria o pedal com alguma carga irregular. Aqui nao ha carga nenhuma: o esforco nao esta nem chegando ao plato.',
      },
    ],
    corrigido: (s) =>
      inst(s, 'cabo-embreagem') &&
      cond(s, 'cabo-embreagem') === 'novo' &&
      conectado(s, 'c-embr-alavanca') &&
      conectado(s, 'c-embr-pedal') &&
      folgaOk(s),
    licao:
      'Cabo rompido deixa a embreagem SEMPRE acoplada, nunca sempre solta: quem prende o disco e a mola do plato, e o cabo so serve para vencer essa mola. Por isso da para "dirigir sem embreagem" dando partida com a marcha engatada.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-garfo-solto',
    sintoma: 'Nenhuma marcha entra com o motor ligado, mas o pedal parece normal.',
    relato:
      'Cliente: "Depois que mexeram no cambio, o pedal da embreagem ficou com a dureza de sempre, mas nao entra marcha nenhuma com o motor funcionando."',
    categoria: 'Embreagem',
    dificuldade: 4,
    setup: { conexoes: { 'c-garfo-rolamento': false } },
    pistas: [
      {
        id: 'folga',
        titulo: 'Medir a folga livre do pedal',
        achado: 'Folga dentro da faixa de especificacao. A regulagem do cabo esta correta.',
        relevante: false,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'alavanca',
        titulo: 'Observar a alavanca externa do cambio com o pedal pisado',
        achado: 'A alavanca externa gira normalmente: o cabo esta fazendo o seu trabalho ate aqui.',
        relevante: true,
        check: (s) => !!s.parts['alavanca-embreagem'].inspecionado,
      },
      {
        id: 'visao',
        titulo: 'Abrir a visao mecanica e acompanhar a cadeia ate o rolamento',
        achado:
          'O garfo se move com o pedal, mas o rolamento fica parado no lugar. A cadeia de forca se interrompe exatamente entre os dois.',
        relevante: true,
        check: (s) => !!s.parts['rolamento-embreagem'].inspecionado || !!s.parts['garfo-embreagem'].inspecionado,
      },
      {
        id: 'arranhar',
        titulo: 'Tentar engatar uma marcha com o motor ligado',
        achado: 'Arranha em qualquer marcha, inclusive na re. O disco nunca chega a soltar.',
        relevante: true,
        check: (s) => s.drive.arranhoes > 0,
      },
    ],
    hipoteses: [
      {
        id: 'h-cabo',
        texto: 'O cabo da embreagem esta desregulado.',
        correta: false,
        resposta: 'REJEITADA. A medicao de folga deu dentro da faixa e a alavanca externa se move com o pedal.',
      },
      {
        id: 'h-garfo',
        texto: 'O garfo esta desencaixado do rolamento: o movimento nao passa adiante.',
        correta: true,
        resposta:
          'CONFIRMADA. As molas em U que prendem o garfo a luva do rolamento nao foram recolocadas. O garfo balanca no vazio e o rolamento nunca avanca contra os dedos do plato. Reencaixe a conexao entre garfo e rolamento.',
      },
      {
        id: 'h-sincronizadores',
        texto: 'Os sincronizadores do cambio estao todos gastos.',
        correta: false,
        resposta:
          'REJEITADA. Sincronizadores gastos nao afetam a re, que nao tem sincronizador. Aqui ate a re arranha: o problema e de desacoplamento, nao de sincronismo.',
      },
      {
        id: 'h-haste',
        texto: 'A haste do cambio esta desacoplada.',
        correta: false,
        resposta:
          'REJEITADA. Se a haste estivesse solta a alavanca giraria no vazio, sem resistencia e sem arranhar nada. O arranhado prova que o cambio esta recebendo o comando.',
      },
    ],
    corrigido: (s) => conectado(s, 'c-garfo-rolamento') && acionamentoIntegro(s),
    licao:
      'Um elo desconectado no meio da cadeia produz um sintoma que parece de outro sistema. Percorrer a cadeia elo a elo - pedal, cabo, alavanca, garfo, rolamento, plato, disco - e o que separa consertar de trocar pecas no escuro.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-haste-solta',
    sintoma: 'A alavanca vai para todos os lados e nao engata nada.',
    relato:
      'Cliente: "A alavanca ficou mole, mexe pra qualquer lado sem encontrar nada. Nao entra marcha nenhuma, nem com o motor desligado."',
    categoria: 'Cambio',
    dificuldade: 3,
    setup: { conexoes: { 'c-alavanca-haste': false } },
    pistas: [
      {
        id: 'mexer',
        titulo: 'Mover a alavanca pelo portao de marchas',
        achado: 'A alavanca percorre o H inteiro sem nenhuma resistencia e sem o estalo caracteristico do engate.',
        relevante: true,
        check: (s) => ev(s, 'engatar') || ev(s, 'arranhar'),
      },
      {
        id: 'embreagem',
        titulo: 'Testar o pedal da embreagem',
        achado: 'Pedal com carga normal e folga dentro da faixa. A embreagem esta em ordem.',
        relevante: false,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'haste',
        titulo: 'Inspecionar a haste do cambio no tunel central',
        achado: 'A ponta inferior da alavanca esta fora da garra da haste. Nada liga o comando ao cambio.',
        relevante: true,
        check: (s) => !!s.parts['haste-cambio'].inspecionado || !!s.parts['alavanca-cambio'].inspecionado,
      },
      {
        id: 'seletor',
        titulo: 'Inspecionar o mecanismo de selecao no cambio',
        achado: 'Tampa seletora montada e presa. Movendo o dedo seletor a mao, as marchas entram normalmente.',
        relevante: true,
        check: (s) => !!s.parts['seletor-marchas'].inspecionado,
      },
    ],
    hipoteses: [
      {
        id: 'h-cambio',
        texto: 'O cambio quebrou por dentro e precisa ser aberto.',
        correta: false,
        resposta:
          'REJEITADA. Acionando o dedo seletor diretamente no cambio, as marchas entram. O trem de engrenagens esta intacto.',
      },
      {
        id: 'h-acoplamento',
        texto: 'A alavanca esta desacoplada da haste do cambio.',
        correta: true,
        resposta:
          'CONFIRMADA. Sem o acoplamento, a alavanca gira na propria rotula sem transmitir nada. Reconecte a alavanca a haste e confira os dois parafusos de base.',
      },
      {
        id: 'h-embreagem',
        texto: 'A embreagem nao esta desacoplando.',
        correta: false,
        resposta:
          'REJEITADA. Embreagem presa faz a marcha ARRANHAR ao entrar. Aqui nao ha arranhado nenhum: nao chega comando ao cambio. E o sintoma persiste com o motor desligado.',
      },
    ],
    corrigido: (s) => conectado(s, 'c-alavanca-haste') && inst(s, 'haste-cambio'),
    licao:
      'Sintoma parecido, causa oposta: marcha que ARRANHA e problema de embreagem; marcha que nem chega a resistir e problema de comando. Ouvir a diferenca economiza a abertura de um cambio.',
  },

  /* ───────────────────────────────────────────────────────────────────── */
  {
    id: 'd-conduite',
    sintoma: 'O pedal da embreagem ficou muito duro.',
    relato:
      'Cliente: "Depois que o carro pegou aquele buraco, o pedal da embreagem ficou pesadissimo e a embreagem quase nao solta. No transito minha perna nao aguenta."',
    categoria: 'Embreagem',
    dificuldade: 4,
    setup: { parts: { 'conduite-embreagem': { condicao: 'ruim' } } },
    pistas: [
      {
        id: 'folga',
        titulo: 'Medir a folga livre do pedal',
        achado: 'Folga dentro da faixa de 10 a 20 mm. A regulagem da porca borboleta esta correta.',
        relevante: false,
        check: (s) => ev(s, 'testar', 'cabo-embreagem') || ev(s, 'testar', 'pedal-embreagem'),
      },
      {
        id: 'fundo',
        titulo: 'Afundar o pedal e medir quanto de cabo realmente sai',
        achado:
          'Com folga correta e pedal no assoalho, o curso util que chega a alavanca e muito menor do que deveria: parte do movimento se perde no caminho.',
        relevante: true,
        check: pedalAoFundo,
      },
      {
        id: 'conduite',
        titulo: 'Inspecionar o conduite ao longo do tunel',
        achado: 'A capa esta amassada num trecho: o cabo raspa por dentro e a capa se deforma em vez de servir de apoio.',
        relevante: true,
        check: (s) => !!s.parts['conduite-embreagem'].inspecionado,
      },
      {
        id: 'engate',
        titulo: 'Tentar engatar marcha com o motor ligado',
        achado: 'Arranha ao engatar, mesmo com o pedal totalmente afundado.',
        relevante: true,
        check: (s) => s.drive.arranhoes > 0,
      },
    ],
    hipoteses: [
      {
        id: 'h-folga',
        texto: 'A folga do cabo esta excessiva.',
        correta: false,
        resposta: 'REJEITADA. A medicao deu dentro da faixa. O curso se perde depois da folga, nao dentro dela.',
      },
      {
        id: 'h-conduite',
        texto: 'O conduite esta amassado: come curso e deixa o pedal duro.',
        correta: true,
        resposta:
          'CONFIRMADA. O conduite e o apoio de reacao do cabo. Amassado, ele se deforma sob carga em vez de segurar, engolindo parte do curso e multiplicando o atrito interno. Substitua o conduite.',
      },
      {
        id: 'h-plato',
        texto: 'O plato esta com a mola endurecida de fabrica.',
        correta: false,
        resposta:
          'REJEITADA. Uma mola mais dura deixaria o pedal pesado, mas nao reduziria o curso util que chega a alavanca.',
      },
      {
        id: 'h-cabo-preso',
        texto: 'O cabo esta enferrujado dentro da capa.',
        correta: false,
        resposta:
          'PROXIMO, MAS REJEITADO. Cabo enferrujado explica pedal duro e retorno lento, mas nao a perda de curso na saida. A inspecao apontou deformacao da propria capa.',
      },
    ],
    corrigido: (s) => inst(s, 'conduite-embreagem') && cond(s, 'conduite-embreagem') === 'novo',
    licao:
      'Num acionamento por cabo, a capa faz tanta forca quanto o cabo - em sentido contrario. Ela e um componente de carga, nao um enfeite de protecao.',
  },
]

export const DESAFIO_POR_ID: Record<string, DesafioDef> = Object.fromEntries(DESAFIOS.map((d) => [d.id, d]))
