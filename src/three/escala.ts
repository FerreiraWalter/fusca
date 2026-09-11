/**
 * Fatores de escala da camada 3D.
 *
 * Os cursos reais do acionamento sao pequenos demais para serem lidos na tela
 * junto com o carro inteiro: o rolamento da embreagem anda 8,5 mm, o que na
 * escala do Fusca da menos de um pixel a distancia normal de camera. Os
 * deslocamentos animados sao ampliados por um fator unico e declarado, para
 * que a PROPORCAO entre os elos continue verdadeira mesmo quando o valor
 * absoluto nao esta.
 */

/** Curso nominal do rolamento contra os dedos do plato, em metros. */
export const CURSO_ROLAMENTO_M = 0.0085

/** Ampliacao aplicada a todos os deslocamentos do acionamento. */
export const FATOR_CURSO = 2.6
