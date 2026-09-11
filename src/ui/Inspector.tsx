import { PARTE_POR_ID, DEPENDENTES, cadeiaDoSistema } from '../data/parts'
import { PARAFUSO_POR_ID } from '../data/bolts'
import { CONEXAO_POR_ID } from '../data/connections'
import { FERRAMENTA_POR_ID } from '../data/tools'
import { faixaDoAjuste } from '../sim/vehicle'
import { CURSO_DESENGATE, CURSO_PEDAL, CURSO_ROLAMENTO } from '../sim/driveline'
import { bloqueiosDeRemocao, ferramentaServe, useSim, type AcaoParafuso } from '../state/store'
import type { AcaoId, BoltStatus } from '../data/types'

const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

const ROTULO_ACAO: Record<AcaoId, string> = {
  inspecionar: 'Inspecionar',
  remover: 'Remover',
  instalar: 'Instalar',
  testar: 'Testar',
  ajustar: 'Ajustar',
  limpar: 'Limpar',
  abrir: 'Abrir',
  fechar: 'Fechar',
}

const ROTULO_STATUS: Record<BoltStatus, string> = {
  LOCKED: 'apertado',
  LOOSENED: 'solto',
  REMOVED: 'removido',
  INSTALLED: 'colocado',
  TIGHTENED: 'torqueado',
}

export function Inspetor() {
  const sel = useSim((s) => s.sel)
  if (!sel) {
    return (
      <div className="bloco">
        <h4>Inspetor</h4>
        <p>
          Nada selecionado. Clique em uma peca, em um parafuso ou em um ponto de conexao do Fusca para ver os
          dados tecnicos e as acoes disponiveis.
        </p>
      </div>
    )
  }
  if (sel.tipo === 'peca') return <InspetorPeca id={sel.id} />
  if (sel.tipo === 'parafuso') return <InspetorParafuso id={sel.id} />
  return <InspetorConexao id={sel.id} />
}

/* ────────────────────────────── peca ─────────────────────────────── */

function InspetorPeca({ id }: { id: string }) {
  const def = PARTE_POR_ID[id]
  const est = useSim((s) => s.parts[id])
  const acaoPeca = useSim((s) => s.acaoPeca)
  const focar = useSim((s) => s.focar)
  const estado = useSim((s) => s)
  if (!def) return null

  const bloqueios = bloqueiosDeRemocao(estado, id)
  const podeRemover = def.removivel && est.status === 'INSTALLED' && bloqueios.length === 0
  const dependentes = (DEPENDENTES[id] ?? []).map((d) => PARTE_POR_ID[d].nome)

  const acoesVisiveis = def.acoes.filter((a) => {
    if (a === 'remover') return def.removivel && est.status === 'INSTALLED'
    if (a === 'instalar') return est.status === 'REMOVED'
    if (a === 'limpar') return est.status === 'REMOVED'
    if (a === 'abrir') return !est.aberto
    if (a === 'fechar') return est.aberto
    if (a === 'ajustar') return false
    return true
  })

  return (
    <>
      <div className="cab">
        <h2>{def.nome}</h2>
        <div className="meta">
          {def.categoria} · <span className="dif">{estrelas(def.dificuldade)}</span>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
          <span className={`tag ${est.status === 'INSTALLED' ? 'verde' : 'ambar'}`}>
            {est.status === 'INSTALLED' ? 'instalada' : est.status === 'REMOVED' ? 'na bancada' : 'solta'}
          </span>
          <span
            className={`tag ${est.condicao === 'ruim' ? 'vermelho' : est.condicao === 'desgastado' ? 'ambar' : est.condicao === 'novo' ? 'ciano' : 'verde'}`}
          >
            {est.condicao}
          </span>
          {est.aberto && <span className="tag ciano">aberta</span>}
        </div>
      </div>

      <div className="bloco">
        <h4>Acoes</h4>
        <div className="acoes">
          {acoesVisiveis.map((a) => (
            <button
              key={a}
              className={`btn${a === 'remover' && !podeRemover ? '' : a === 'remover' || a === 'instalar' ? ' primario' : ''}`}
              disabled={a === 'remover' && !podeRemover}
              onClick={() => acaoPeca(id, a)}
            >
              {ROTULO_ACAO[a]}
            </button>
          ))}
          {est.status === 'REMOVED' && def.consumivel && (
            <button className="btn primario" onClick={() => acaoPeca(id, 'instalar', { nova: true })}>
              Instalar peca nova
            </button>
          )}
          <button className="btn mini" onClick={() => focar(id)}>
            Focar camera
          </button>
        </div>
        {bloqueios.length > 0 && est.status === 'INSTALLED' && def.removivel && (
          <div style={{ marginTop: 9 }}>
            <h4>Antes de remover</h4>
            <ul className="lista-falhas">
              {bloqueios.map((b) => (
                <li key={b}>
                  <span className="mk" style={{ color: 'var(--laranja)' }}>
                    !
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {def.sistema && <CadeiaDaPeca id={id} />}

      {def.ajuste && <ControleAjuste id={id} />}

      {def.parafusos.length > 0 && (
        <div className="bloco">
          <h4>Fixadores ({def.parafusos.length})</h4>
          {def.parafusos.map((b) => (
            <Fixador key={b} id={b} />
          ))}
        </div>
      )}

      {def.conexoes.length > 0 && (
        <div className="bloco">
          <h4>Conexoes</h4>
          {def.conexoes.map((c) => (
            <LinhaConexao key={c} id={c} />
          ))}
        </div>
      )}

      <div className="bloco">
        <h4>Descricao</h4>
        <p>{def.descricao}</p>
        <h4 style={{ marginTop: 10 }}>Funcao no veiculo</h4>
        <p>{def.funcao}</p>
      </div>

      <div className="bloco">
        <h4>Falhas comuns</h4>
        <ul>
          {def.falhas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="bloco">
        <h4>Dados</h4>
        <div className="linha-dado">
          <span className="k">ferramentas</span>
          <span className="v">
            {def.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(', ') || '—'}
            {def.medida ? ` (${def.medida} mm)` : ''}
          </span>
        </div>
        <div className="linha-dado">
          <span className="k">remover antes</span>
          <span className="v">{def.requer.map((r) => PARTE_POR_ID[r].nome).join(', ') || '—'}</span>
        </div>
        <div className="linha-dado">
          <span className="k">depende desta</span>
          <span className="v">{dependentes.join(', ') || '—'}</span>
        </div>
        <div className="linha-dado">
          <span className="k">compartimento</span>
          <span className="v">{def.compartimento ?? 'externo'}</span>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────── posicao na cadeia ───────────────────────── */

/**
 * Onde esta peca entra no fluxo de forca e o que ela esta produzindo agora.
 * Ver o elo anterior e o seguinte e o que permite raciocinar "o movimento
 * chega aqui e para" em vez de trocar pecas por eliminacao.
 */
function CadeiaDaPeca({ id }: { id: string }) {
  const def = PARTE_POR_ID[id]
  const est = useSim((s) => s.parts[id])
  const acion = useSim((s) => s.drive.acionamento)
  const selecionar = useSim((s) => s.selecionar)
  const focar = useSim((s) => s.focar)
  const cadeia = cadeiaDoSistema(def.sistema!)
  const i = cadeia.findIndex((p) => p.id === id)
  const anterior = i > 0 ? cadeia[i - 1] : null
  const proxima = i >= 0 && i < cadeia.length - 1 ? cadeia[i + 1] : null

  // Leitura instantanea do elo, quando ele produz um numero.
  const leitura: Record<string, string> = {
    'pedal-embreagem': `${acion.cursoPedal.toFixed(0)} mm de curso`,
    'cabo-embreagem': `${acion.cursoCabo.toFixed(0)} mm uteis (folga consumiu ${acion.folgaLivre.toFixed(0)} mm)`,
    'alavanca-embreagem': `${acion.anguloAlavanca.toFixed(1)}° de giro`,
    'garfo-embreagem': `${acion.anguloGarfo.toFixed(1)}° de giro`,
    'rolamento-embreagem': `${acion.cursoRolamento.toFixed(1)} mm de avanco (de ${CURSO_ROLAMENTO} mm)`,
    'plato-embreagem': `${(acion.cargaPlato * 100).toFixed(0)} % de carga nos dedos`,
    'disco-embreagem': `${(acion.engate * 100).toFixed(0)} % do torque ainda passa`,
  }

  return (
    <div className="bloco">
      <h4>Posicao na cadeia · {def.sistema}</h4>
      {leitura[id] && (
        <div className="linha-dado">
          <span className="k">leitura agora</span>
          <span className="v">{leitura[id]}</span>
        </div>
      )}
      {id === 'cabo-embreagem' && acion.desengateIncompleto && (
        <p style={{ color: 'var(--laranja)', fontSize: 11.5, lineHeight: 1.45 }}>
          Com o pedal no assoalho sobram apenas{' '}
          {Math.max(0, CURSO_PEDAL - est.ajuste).toFixed(0)} mm de curso util, e sao necessarios{' '}
          {CURSO_DESENGATE} mm para soltar o disco.
        </p>
      )}
      <div className="cadeia-nav">
        <button className="btn mini" disabled={!anterior} onClick={() => anterior && selecionar({ tipo: 'peca', id: anterior.id })}>
          ← {anterior ? anterior.nome : 'inicio'}
        </button>
        <button className="btn mini" onClick={() => focar(id)}>
          Focar
        </button>
        <button className="btn mini" disabled={!proxima} onClick={() => proxima && selecionar({ tipo: 'peca', id: proxima.id })}>
          {proxima ? proxima.nome : 'fim'} →
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────── ajuste ─────────────────────────────── */

function ControleAjuste({ id }: { id: string }) {
  const def = PARTE_POR_ID[id]
  const est = useSim((s) => s.parts[id])
  const setAjuste = useSim((s) => s.setAjuste)
  const acaoPeca = useSim((s) => s.acaoPeca)
  const ferramenta = useSim((s) => s.ferramenta)
  const aj = def.ajuste!
  const faixa = faixaDoAjuste(id, est.ajuste)
  const pct = (v: number) => ((v - aj.min) / (aj.max - aj.min)) * 100
  const temFerramenta = aj.ferramentas.includes(ferramenta)

  return (
    <div className="bloco">
      <h4>Ajuste · {aj.label}</h4>
      <div className="ajuste-topo">
        <span className={`ajuste-valor ${faixa === 'ok' ? 'ok' : 'fora'}`}>
          {est.ajuste.toFixed(aj.passo < 1 ? 1 : 0)}
          <small>{aj.unidade}</small>
        </span>
        <span className={`tag ${faixa === 'ok' ? 'verde' : 'ambar'}`}>
          {faixa === 'ok' ? 'dentro da faixa' : faixa === 'baixo' ? 'abaixo' : 'acima'}
        </span>
      </div>

      <div className="faixa">
        <div
          className="ideal"
          style={{ left: `${pct(aj.ideal[0])}%`, width: `${pct(aj.ideal[1]) - pct(aj.ideal[0])}%` }}
        />
        <div className="marcador" style={{ left: `${pct(est.ajuste)}%` }} />
      </div>
      <div className="escala">
        <span>
          {aj.min} {aj.unidade}
        </span>
        <span style={{ color: 'var(--verde)' }}>
          ideal {aj.ideal[0]}-{aj.ideal[1]}
        </span>
        <span>
          {aj.max} {aj.unidade}
        </span>
      </div>

      <input
        type="range"
        min={aj.min}
        max={aj.max}
        step={aj.passo}
        value={est.ajuste}
        disabled={!temFerramenta || est.status !== 'INSTALLED'}
        onChange={(e) => setAjuste(id, Number(e.target.value))}
      />

      {!temFerramenta && (
        <p style={{ color: 'var(--laranja)', fontSize: 11, margin: '4px 0 0' }}>
          Pegue {aj.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(' ou ')} para mexer neste ajuste.
        </p>
      )}
      {faixa !== 'ok' && (
        <p style={{ color: 'var(--laranja)', fontSize: 11.5, margin: '6px 0 0', lineHeight: 1.45 }}>
          {faixa === 'baixo' ? aj.abaixo : aj.acima}
        </p>
      )}
      <div className="acoes" style={{ marginTop: 8 }}>
        <button className="btn mini" onClick={() => acaoPeca(id, 'testar')}>
          Medir / testar
        </button>
        <button className="btn mini" onClick={() => setAjuste(id, aj.padrao)}>
          Valor de fabrica
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────── fixadores ───────────────────────────── */

export function Fixador({ id }: { id: string }) {
  const def = PARAFUSO_POR_ID[id]
  const est = useSim((s) => s.bolts[id])
  const acao = useSim((s) => s.acaoParafuso)
  const ferramenta = useSim((s) => s.ferramenta)
  const medida = useSim((s) => s.medidaSoquete)
  const sel = useSim((s) => s.sel?.tipo === 'parafuso' && s.sel.id === id)
  const selecionar = useSim((s) => s.selecionar)
  const serve = ferramentaServe(ferramenta, medida, def)

  const disp: Record<AcaoParafuso, boolean> = {
    soltar: est.status === 'LOCKED' || est.status === 'TIGHTENED' || est.status === 'INSTALLED',
    remover: est.status === 'LOOSENED' || (def.tipo === 'presilha' && est.status === 'LOCKED'),
    instalar: est.status === 'REMOVED',
    apertar: est.status === 'INSTALLED' || est.status === 'LOOSENED' || est.status === 'LOCKED',
  }

  return (
    <div className={`fixador${sel ? ' sel' : ''}`} onClick={() => selecionar({ tipo: 'parafuso', id })}>
      <div className="top">
        <span className="nome">{def.label}</span>
        <span
          className={`tag ${est.status === 'TIGHTENED' || est.status === 'LOCKED' ? 'verde' : est.status === 'REMOVED' ? 'cinza' : 'ambar'}`}
        >
          {ROTULO_STATUS[est.status]}
        </span>
      </div>
      <div className="linha-dado">
        <span className="k">{def.medida ? `${def.medida} mm · ${def.tipo}` : def.tipo}</span>
        <span className="v" style={{ color: serve ? 'var(--verde)' : 'var(--vermelho)' }}>
          {serve ? '✓ ferramenta ok' : '✗ ferramenta errada'}
        </span>
      </div>
      {def.torque && (
        <div className="linha-dado">
          <span className="k">torque</span>
          <span className="v">
            {def.torque} Nm {est.status === 'TIGHTENED' ? `(aplicado ${est.torqueAplicado})` : ''}
          </span>
        </div>
      )}
      <div className="acoes" style={{ marginTop: 6 }}>
        {(['soltar', 'remover', 'instalar', 'apertar'] as AcaoParafuso[]).map((a) => (
          <button
            key={a}
            className="btn mini"
            disabled={!disp[a]}
            onClick={(e) => {
              e.stopPropagation()
              acao(id, a)
            }}
          >
            {a[0].toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

function InspetorParafuso({ id }: { id: string }) {
  const def = PARAFUSO_POR_ID[id]
  const focar = useSim((s) => s.focar)
  const selecionar = useSim((s) => s.selecionar)
  if (!def) return null
  const parte = PARTE_POR_ID[def.parte]
  return (
    <>
      <div className="cab">
        <h2>{def.label}</h2>
        <div className="meta">Fixador · {parte?.nome}</div>
      </div>
      <div className="bloco">
        <Fixador id={id} />
        <div className="acoes" style={{ marginTop: 6 }}>
          <button className="btn mini" onClick={() => focar(id)}>
            Focar camera
          </button>
          <button className="btn mini" onClick={() => selecionar({ tipo: 'peca', id: def.parte })}>
            Ver {parte?.nome}
          </button>
        </div>
      </div>
      <div className="bloco">
        <h4>Sequencia correta</h4>
        <p>
          Soltar → Remover para desmontar. Instalar → Apertar para montar. Um fixador apenas colocado, sem
          aperto, deixa a peca frouxa e gera falha em servico.
        </p>
      </div>
    </>
  )
}

/* ─────────────────────────── conexoes ────────────────────────────── */

function LinhaConexao({ id }: { id: string }) {
  const def = CONEXAO_POR_ID[id]
  const ligada = useSim((s) => s.conexoes[id])
  const alternar = useSim((s) => s.alternarConexao)
  const selecionar = useSim((s) => s.selecionar)
  return (
    <div className="fixador">
      <div className="top">
        <span className="nome">{def.label}</span>
        <span className={`tag ${ligada ? 'verde' : 'ambar'}`}>{ligada ? 'conectada' : 'solta'}</span>
      </div>
      <div className="acoes">
        <button className="btn mini" onClick={() => alternar(id)}>
          {ligada ? 'Desconectar' : 'Conectar'}
        </button>
        <button className="btn mini" onClick={() => selecionar({ tipo: 'conexao', id })}>
          Detalhes
        </button>
      </div>
    </div>
  )
}

function InspetorConexao({ id }: { id: string }) {
  const def = CONEXAO_POR_ID[id]
  const ligada = useSim((s) => s.conexoes[id])
  const alternar = useSim((s) => s.alternarConexao)
  const focar = useSim((s) => s.focar)
  const selecionar = useSim((s) => s.selecionar)
  if (!def) return null
  return (
    <>
      <div className="cab">
        <h2>{def.label}</h2>
        <div className="meta">Conexao {def.tipo}</div>
        <div style={{ marginTop: 7 }}>
          <span className={`tag ${ligada ? 'verde' : 'ambar'}`}>{ligada ? 'conectada' : 'desconectada'}</span>
        </div>
      </div>
      <div className="bloco">
        <p>{def.descricao}</p>
        <div className="acoes" style={{ marginTop: 8 }}>
          <button className="btn primario" onClick={() => alternar(id)}>
            {ligada ? 'Desconectar' : 'Conectar'}
          </button>
          <button className="btn mini" onClick={() => focar(id)}>
            Focar camera
          </button>
        </div>
      </div>
      <div className="bloco">
        <h4>Liga</h4>
        <div className="acoes">
          {[def.a, def.b].map((p) => (
            <button key={p} className="btn mini" onClick={() => selecionar({ tipo: 'peca', id: p })}>
              {PARTE_POR_ID[p]?.nome ?? p}
            </button>
          ))}
        </div>
        <div className="linha-dado" style={{ marginTop: 8 }}>
          <span className="k">ferramenta</span>
          <span className="v">{def.ferramentas.map((f) => FERRAMENTA_POR_ID[f].nome).join(' ou ')}</span>
        </div>
      </div>
    </>
  )
}
