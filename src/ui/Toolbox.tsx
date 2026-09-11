import { FERRAMENTAS, FERRAMENTA_POR_ID } from '../data/tools'
import { PARTES } from '../data/parts'
import { useSim } from '../state/store'

export function CaixaFerramentas() {
  const ferramenta = useSim((s) => s.ferramenta)
  const medida = useSim((s) => s.medidaSoquete)
  const setFerramenta = useSim((s) => s.setFerramenta)
  const setMedida = useSim((s) => s.setMedida)
  const def = FERRAMENTA_POR_ID[ferramenta]

  return (
    <div className="secao">
      <h3>Caixa de ferramentas</h3>
      {FERRAMENTAS.map((f) => (
        <div key={f.id}>
          <button
            className={`ferramenta${ferramenta === f.id ? ' on' : ''}`}
            onClick={() => setFerramenta(f.id)}
            title={f.descricao}
          >
            <span className="ico">{f.icone}</span>
            <span className="nm">{f.nome}</span>
          </button>
          {f.selecionavel && ferramenta === f.id && (
            <div className="medidas">
              {f.medidas.map((m) => (
                <button key={m} className={`medida${medida === m ? ' on' : ''}`} onClick={() => setMedida(m)}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="dica-ferramenta">{def.descricao}</div>
    </div>
  )
}

export function Bancada() {
  const parts = useSim((s) => s.parts)
  const selecionar = useSim((s) => s.selecionar)
  const focar = useSim((s) => s.focar)
  const removidas = PARTES.filter((p) => parts[p.id].status === 'REMOVED')

  return (
    <div className="secao">
      <h3>Bancada ({removidas.length})</h3>
      {removidas.length === 0 && <div className="vazio">Nenhuma peca desmontada.</div>}
      {removidas.map((p) => {
        const c = parts[p.id].condicao
        return (
          <button
            key={p.id}
            className="bancada-item"
            onClick={() => {
              selecionar({ tipo: 'peca', id: p.id })
              focar(p.id)
            }}
          >
            <span>{p.nome}</span>
            <span
              className={`tag ${c === 'ruim' ? 'vermelho' : c === 'desgastado' ? 'ambar' : c === 'novo' ? 'ciano' : 'verde'}`}
            >
              {c}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Legenda() {
  return (
    <div className="secao">
      <h3>Como operar</h3>
      <div className="dica-ferramenta" style={{ borderLeftColor: 'var(--ambar)' }}>
        1. Escolha a ferramenta certa.
        <br />
        2. Clique na peca, no parafuso ou no ponto de conexao dentro do carro.
        <br />
        3. Use as acoes do painel a direita.
        <br />
        <br />
        Esferas <b style={{ color: 'var(--verde)' }}>verdes</b> = conexao ligada.
        <br />
        Esferas <b style={{ color: 'var(--laranja)' }}>ambar</b> = solta.
        <br />
        Aro <b style={{ color: '#ff8a3d' }}>laranja</b> = falta um fixador.
        <br />
        Contorno <b style={{ color: 'var(--ciano)' }}>azul</b> = encaixe da peca removida.
      </div>
    </div>
  )
}
