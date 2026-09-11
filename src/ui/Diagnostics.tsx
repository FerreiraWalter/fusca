import { useSim } from '../state/store'

function Led({ estado }: { estado: 'on' | 'off' | 'aviso' | 'alerta' }) {
  return <span className={`led${estado === 'off' ? '' : ` ${estado === 'on' ? 'on' : estado}`}`} />
}

function Linha({ k, v, estado }: { k: string; v: string; estado?: 'on' | 'off' | 'aviso' | 'alerta' }) {
  return (
    <div className="linha-dado">
      <span className="k">{k}</span>
      <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {v}
        {estado && <Led estado={estado} />}
      </span>
    </div>
  )
}

export function Diagnostico() {
  const v = useSim((s) => s.veiculo)
  const parts = useSim((s) => s.parts)

  return (
    <>
      <div className="cab">
        <h2>Estado do veiculo</h2>
        <div className="meta">Leitura em tempo real</div>
        <div style={{ marginTop: 8 }}>
          <span className={`tag ${v.podeLigar ? 'verde' : 'vermelho'}`}>
            {v.podeLigar ? 'motor apto a funcionar' : 'motor nao funciona'}
          </span>
        </div>
      </div>

      {v.falhas.length > 0 && (
        <div className="bloco">
          <h4 style={{ color: 'var(--vermelho)' }}>Impedimentos ({v.falhas.length})</h4>
          <ul className="lista-falhas">
            {v.falhas.map((f) => (
              <li key={f}>
                <span className="mk" style={{ color: 'var(--vermelho)' }}>
                  ✕
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.avisos.length > 0 && (
        <div className="bloco">
          <h4 style={{ color: 'var(--laranja)' }}>Observacoes ({v.avisos.length})</h4>
          <ul className="lista-falhas">
            {v.avisos.map((f) => (
              <li key={f}>
                <span className="mk" style={{ color: 'var(--laranja)' }}>
                  !
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bloco">
        <h4>Motor</h4>
        <Linha k="funcionando" v={v.motor.ligado ? 'sim' : 'nao'} estado={v.motor.ligado ? 'on' : 'off'} />
        <Linha k="rotacao" v={`${v.motor.rpm} rpm`} />
        <Linha
          k="temperatura"
          v={`${v.motor.temperatura} C`}
          estado={v.motor.tempStatus === 'critica' ? 'alerta' : v.motor.tempStatus === 'alta' ? 'aviso' : 'on'}
        />
        <Linha k="marcha lenta reg." v={`${parts['carburador'].ajuste} rpm`} />
      </div>

      <div className="bloco">
        <h4>Ignicao</h4>
        <Linha
          k="distribuidor"
          v={v.ignicao.distribuidor ? 'completo' : 'incompleto'}
          estado={v.ignicao.distribuidor ? 'on' : 'alerta'}
        />
        <Linha k="velas" v={`${v.ignicao.velas} / 4`} estado={v.ignicao.velas === 4 ? 'on' : 'alerta'} />
        <Linha k="bobina" v={v.ignicao.bobina ? 'ok' : 'sem sinal'} estado={v.ignicao.bobina ? 'on' : 'alerta'} />
        <Linha
          k="modulo eletronico"
          v={v.ignicao.modulo ? 'ok' : 'sem sinal'}
          estado={v.ignicao.modulo ? 'on' : 'alerta'}
        />
        <Linha k="cabos" v={v.ignicao.cabos ? 'instalados' : 'ausentes'} estado={v.ignicao.cabos ? 'on' : 'alerta'} />
        <Linha k="ponto" v={`${parts['distribuidor'].ajuste}° APMS`} />
      </div>

      <div className="bloco">
        <h4>Comandos</h4>
        <Linha
          k="cabo acelerador"
          v={v.acelerador.ajuste}
          estado={v.acelerador.ajuste === 'correto' ? 'on' : 'aviso'}
        />
        <Linha
          k="cabo embreagem"
          v={v.embreagem.ajuste === 'correto' ? `correto (${v.embreagem.folga} mm)` : v.embreagem.ajuste}
          estado={v.embreagem.ajuste === 'correto' ? 'on' : 'aviso'}
        />
      </div>

      <div className="bloco">
        <h4>Freios</h4>
        <Linha
          k="sistema"
          v={v.freios.status}
          estado={v.freios.status === 'operacional' ? 'on' : v.freios.status === 'atencao' ? 'aviso' : 'alerta'}
        />
        <Linha k="folga do pedal" v={`${v.freios.folgaPedal} mm`} />
        <Linha k="fluido" v={`${parts['reservatorio-freio'].ajuste} %`} />
        <Linha k="regulagem traseira" v={`${parts['regulagem-freio-tras'].ajuste} clicks`} />
      </div>

      <div className="bloco">
        <h4>Eletrica</h4>
        <Linha k="bateria" v={v.eletrica.bateria ? '12,4 V' : 'sem contato'} estado={v.eletrica.bateria ? 'on' : 'alerta'} />
        <Linha k="carga do gerador" v={v.eletrica.carga ? 'carregando' : 'sem carga'} estado={v.eletrica.carga ? 'on' : 'aviso'} />
      </div>
    </>
  )
}
