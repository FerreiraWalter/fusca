import { PROCEDIMENTOS, PROCEDIMENTO_POR_ID } from '../data/procedures'
import { useSim } from '../state/store'

const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

export function Tarefas() {
  const proc = useSim((s) => s.proc)
  if (!proc) return <ListaTarefas />
  return <TarefaAtiva />
}

function ListaTarefas() {
  const iniciar = useSim((s) => s.iniciarProcedimento)
  return (
    <>
      <div className="bloco">
        <h4>Oficina virtual</h4>
        <p>
          Escolha um procedimento. O simulador injeta o defeito, acompanha cada etapa e avalia o servico no
          final. Voce tambem pode fechar a tarefa e explorar o carro livremente.
        </p>
      </div>
      <div className="bloco">
        <h4>Procedimentos ({PROCEDIMENTOS.length})</h4>
        {PROCEDIMENTOS.map((p) => (
          <div key={p.id} className="tarefa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <h5>{p.titulo}</h5>
              <span className="dif" title={`dificuldade ${p.dificuldade}`}>
                {estrelas(p.dificuldade)}
              </span>
            </div>
            <p>{p.objetivo}</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn primario" onClick={() => iniciar(p.id)}>
                Iniciar
              </button>
              <span className="tag cinza">{p.categoria}</span>
              <span className="tag cinza">{p.passos.length} etapas</span>
              {p.diagnostico && <span className="tag ciano">diagnostico</span>}
              <span className="tag cinza">alvo {Math.round(p.tempoAlvo / 60)} min</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function TarefaAtiva() {
  const proc = useSim((s) => s.proc)!
  const encerrar = useSim((s) => s.encerrarProcedimento)
  const iniciar = useSim((s) => s.iniciarProcedimento)
  const def = PROCEDIMENTO_POR_ID[proc.id]
  const feitos = def.passos.filter((p) => proc.feitos[p.id]).length
  const iAtual = def.passos.findIndex((p) => !proc.feitos[p.id])

  if (proc.concluido) {
    return (
      <>
        <div className="cab">
          <h2>{def.titulo}</h2>
          <div className="meta">Procedimento concluido</div>
        </div>
        <div className="resultado">
          <div className="nota">{proc.nota}</div>
          <div className="estrelas">{'★'.repeat(proc.estrelas)}{'☆'.repeat(3 - proc.estrelas)}</div>
          <div className="linha-dado">
            <span className="k">tempo</span>
            <span className="v">
              {Math.floor(proc.duracao / 60)}m {Math.round(proc.duracao % 60)}s (alvo{' '}
              {Math.round(def.tempoAlvo / 60)}m)
            </span>
          </div>
          <div className="linha-dado">
            <span className="k">ferramenta errada</span>
            <span className="v">{proc.erros.ferramenta}</span>
          </div>
          <div className="linha-dado">
            <span className="k">ordem incorreta</span>
            <span className="v">{proc.erros.ordem}</span>
          </div>
          <div className="linha-dado">
            <span className="k">ajuste fora da faixa</span>
            <span className="v">{proc.erros.ajuste}</span>
          </div>
          <div className="acoes" style={{ marginTop: 14, justifyContent: 'center' }}>
            <button className="btn primario" onClick={() => iniciar(proc.id)}>
              Repetir
            </button>
            <button className="btn" onClick={encerrar}>
              Escolher outra
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="cab">
        <h2>{def.titulo}</h2>
        <div className="meta">
          {def.categoria} · <span className="dif">{estrelas(def.dificuldade)}</span>
        </div>
        <div className="progresso">
          <div style={{ width: `${(feitos / def.passos.length) * 100}%` }} />
        </div>
        <div className="meta" style={{ marginTop: 5 }}>
          {feitos} de {def.passos.length} etapas
        </div>
      </div>

      {proc.briefing && (
        <div className="bloco">
          <h4>Relato do cliente</h4>
          <p style={{ color: 'var(--ambar-2)', fontStyle: 'italic' }}>{proc.briefing}</p>
        </div>
      )}

      <div className="bloco">
        <h4>Objetivo</h4>
        <p>{def.objetivo}</p>
      </div>

      <div className="bloco">
        <h4>Etapas</h4>
        {def.passos.map((p, i) => {
          const feito = !!proc.feitos[p.id]
          const atual = i === iAtual
          const oculto = def.diagnostico && !feito && !atual
          return (
            <div key={p.id} className={`passo${feito ? ' feito' : ''}${atual ? ' atual' : ''}`}>
              <span className="cx">✓</span>
              <span className="txt">
                {oculto ? <span style={{ color: 'var(--txt-3)' }}>etapa bloqueada</span> : p.titulo}
                {atual && p.dica && !def.diagnostico && <span className="dica">{p.dica}</span>}
              </span>
            </div>
          )
        })}
      </div>

      <div className="bloco">
        <div className="acoes">
          <button className="btn" onClick={() => iniciar(proc.id)}>
            Reiniciar
          </button>
          <button className="btn perigo" onClick={encerrar}>
            Abandonar
          </button>
        </div>
        <div className="linha-dado" style={{ marginTop: 8 }}>
          <span className="k">erros ate agora</span>
          <span className="v">
            {proc.erros.ferramenta + proc.erros.ordem + proc.erros.ajuste}
          </span>
        </div>
      </div>
    </>
  )
}
