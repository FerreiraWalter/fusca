/**
 * Diagnostico por sintomas.
 *
 * A tela nunca antecipa a causa. Ela mostra o sintoma, lista as verificacoes
 * disponiveis (sem dizer o que cada uma vai revelar) e so libera a lista de
 * hipoteses depois que o aluno levantou alguma informacao. Achados aparecem
 * a medida que sao produzidos DENTRO do carro - medindo, inspecionando,
 * dirigindo - e nao clicando num botao de resposta.
 */

import { DESAFIOS, DESAFIO_POR_ID } from '../data/challenges'
import { useSim } from '../state/store'

const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

export function Sintomas() {
  const desafio = useSim((s) => s.desafio)
  return desafio ? <Investigacao /> : <ListaDesafios />
}

function ListaDesafios() {
  const iniciar = useSim((s) => s.iniciarDesafio)
  return (
    <>
      <div className="bloco">
        <h4>Diagnostico de sintomas</h4>
        <p>
          Aqui voce nao recebe a tarefa pronta. Recebe a queixa do cliente e o carro com o defeito dentro.
          Investigue no veiculo, levante os achados, elimine suspeitos e so entao teste a sua hipotese.
        </p>
      </div>
      <div className="bloco">
        <h4>Casos ({DESAFIOS.length})</h4>
        {DESAFIOS.map((d) => (
          <div key={d.id} className="tarefa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <h5>{d.sintoma}</h5>
              <span className="dif">{estrelas(d.dificuldade)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn primario" onClick={() => iniciar(d.id)}>
                Investigar
              </button>
              <span className="tag cinza">{d.categoria}</span>
              <span className="tag cinza">{d.hipoteses.length} hipoteses</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Investigacao() {
  const desafio = useSim((s) => s.desafio)!
  const def = DESAFIO_POR_ID[desafio.id]
  const encerrar = useSim((s) => s.encerrarDesafio)
  const iniciar = useSim((s) => s.iniciarDesafio)
  const testar = useSim((s) => s.testarHipotese)
  const toggleVisao = useSim((s) => s.toggleVisaoMecanica)
  const visao = useSim((s) => s.visaoMecanica)
  const setPainel = useSim((s) => s.setPainel)

  const achadas = def.pistas.filter((p) => desafio.pistas[p.id])
  const pendentes = def.pistas.filter((p) => !desafio.pistas[p.id])
  // Sem nenhuma verificacao feita, chutar hipotese nao ensina nada.
  const podeTestar = achadas.length >= 2 || !!desafio.confirmada

  if (desafio.resolvido) {
    return (
      <>
        <div className="cab">
          <h2>Caso encerrado</h2>
          <div className="meta">{def.sintoma}</div>
        </div>
        <div className="resultado">
          <div className="nota">{Math.max(0, 100 - desafio.erros * 15)}</div>
          <div className="linha-dado">
            <span className="k">verificacoes feitas</span>
            <span className="v">
              {achadas.length} de {def.pistas.length}
            </span>
          </div>
          <div className="linha-dado">
            <span className="k">hipoteses erradas</span>
            <span className="v">{desafio.erros}</span>
          </div>
          <div className="linha-dado">
            <span className="k">tempo</span>
            <span className="v">
              {Math.floor(desafio.duracao / 60)}m {Math.round(desafio.duracao % 60)}s
            </span>
          </div>
        </div>
        <div className="bloco">
          <h4>O que estava acontecendo</h4>
          <p>{def.licao}</p>
          <div className="acoes" style={{ marginTop: 10 }}>
            <button className="btn primario" onClick={() => iniciar(def.id)}>
              Repetir
            </button>
            <button className="btn" onClick={encerrar}>
              Outro caso
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="cab">
        <h2>SINTOMA</h2>
        <div className="sintoma">{def.sintoma}</div>
        <div className="meta" style={{ marginTop: 8 }}>
          {def.categoria} · <span className="dif">{estrelas(def.dificuldade)}</span>
        </div>
      </div>

      <div className="bloco">
        <h4>Relato do cliente</h4>
        <p style={{ color: 'var(--ambar-2)', fontStyle: 'italic' }}>{def.relato}</p>
      </div>

      <div className="bloco">
        <h4>Investigacao ({achadas.length}/{def.pistas.length})</h4>
        <p style={{ marginTop: 0 }}>
          Cada verificacao e feita no carro, nao aqui. Meca, inspecione, entre na pista e observe o que muda.
        </p>
        <div className="acoes" style={{ margin: '8px 0' }}>
          <button className={`btn ciano${visao ? ' on' : ''}`} onClick={toggleVisao}>
            👁 Visao mecanica
          </button>
          <button className="btn" onClick={() => setPainel('cabine')}>
            Ir para a cabine
          </button>
        </div>

        {achadas.map((p) => (
          <div key={p.id} className="achado">
            <div className="achado-top">
              <span className="mk">✓</span>
              <span className="nome">{p.titulo}</span>
            </div>
            <p>{p.achado}</p>
          </div>
        ))}

        {pendentes.length > 0 && (
          <>
            <h4 style={{ marginTop: 10 }}>Ainda nao verificado</h4>
            <ul className="lista-falhas">
              {pendentes.map((p) => (
                <li key={p.id}>
                  <span className="mk" style={{ color: 'var(--txt-3)' }}>
                    ○
                  </span>
                  {p.titulo}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="bloco">
        <h4>Testar hipotese</h4>
        {!podeTestar ? (
          <p>
            Levante pelo menos duas informacoes no carro antes de formular uma hipotese. Chutar peca nao e
            diagnostico.
          </p>
        ) : (
          <div className="hipoteses">
            {def.hipoteses.map((h) => {
              const testada = !!desafio.testadas[h.id]
              const confirmada = desafio.confirmada === h.id
              return (
                <button
                  key={h.id}
                  className={`hipotese${confirmada ? ' certa' : testada ? ' errada' : ''}`}
                  disabled={testada}
                  onClick={() => testar(h.id)}
                >
                  <span className="mk">{confirmada ? '✓' : testada ? '✕' : '?'}</span>
                  <span>{h.texto}</span>
                </button>
              )
            })}
          </div>
        )}
        {desafio.confirmada && (
          <p className="nota-ok">
            Hipotese confirmada. Agora corrija o defeito no carro: o caso so fecha quando o sintoma some de
            verdade.
          </p>
        )}
      </div>

      <div className="bloco">
        <div className="acoes">
          <button className="btn" onClick={() => iniciar(def.id)}>
            Reiniciar caso
          </button>
          <button className="btn perigo" onClick={encerrar}>
            Abandonar
          </button>
        </div>
      </div>
    </>
  )
}
