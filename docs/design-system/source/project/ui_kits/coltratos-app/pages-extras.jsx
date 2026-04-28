/* global React, Icon */
const { useState: useStateA } = React;

/* ----- Page: Alertas (matching SECOP) -------------------- */
const PageAlertas = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Alertas de licitaciones</h1>
        <p className="sub">Procesos del SECOP II que coinciden con tu RUP. Revisamos cada hora.</p>
      </div>
      <div className="actions">
        <button className="btn btn-secondary"><Icon name="settings" size={14}/>Configurar criterios</button>
      </div>
    </div>

    <div className="banner-info">
      <Icon name="sparkles" size={18}/>
      <div><b>3 procesos nuevos</b> coinciden con tus sectores UNSPSC desde tu última visita.</div>
    </div>

    <div className="card">
      <div className="card-head">
        <h3>Procesos sugeridos</h3>
        <div className="row" style={{gap:8}}>
          <button className="btn btn-secondary btn-sm">Sector <Icon name="chev-down" size={14}/></button>
          <button className="btn btn-secondary btn-sm">Confianza ≥ 80%</button>
        </div>
      </div>
      <div className="card-body" style={{padding:0}}>
        {[
          {p:"Adecuación de oficinas regionales", id:"LP-2026-0042", e:"DIAN · Cali", b:"$420.000.000 COP", c:"Cierre 12 May", m:96, sectors:["72 · Construcción","81 · Servicios profesionales"]},
          {p:"Suministro de papelería institucional", id:"MC-2026-0118", e:"Min. Cultura", b:"$28.000.000 COP", c:"Cierre 6 May", m:88, sectors:["44 · Equipos de oficina"]},
          {p:"Mantenimiento equipos de cómputo",  id:"SA-2026-0233", e:"Universidad Nacional", b:"$95.000.000 COP", c:"Cierre 28 Abr", m:81, sectors:["43 · IT","81 · Servicios profesionales"]},
        ].map((r,i)=>(
          <div key={i} style={{padding:"20px 24px", borderBottom:i<2?"1px solid var(--border-hairline)":0, display:"grid", gridTemplateColumns:"1fr auto", gap:18, alignItems:"center"}}>
            <div>
              <div className="row" style={{gap:8, marginBottom:6}}>
                <span className="mono secondary" style={{fontSize:12}}>{r.id}</span>
                <span className="muted">·</span>
                <span className="muted" style={{fontSize:13}}>{r.e}</span>
              </div>
              <div style={{fontWeight:600, fontSize:16, marginBottom:8}}>{r.p}</div>
              <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                {r.sectors.map(s => <span key={s} className="chip chip-gray"><span className="dot"/>{s}</span>)}
                <span className="chip chip-blue"><span className="dot"/>{r.b}</span>
                <span className="chip chip-amber"><span className="dot"/>{r.c}</span>
              </div>
            </div>
            <div className="row" style={{gap:14}}>
              <div style={{textAlign:"right"}}>
                <div className="muted" style={{fontSize:12}}>Match</div>
                <div style={{fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, color:"var(--green-600)"}}>{r.m}%</div>
              </div>
              <button className="btn btn-primary btn-sm"><Icon name="sparkles" size={14}/>Analizar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ----- Page: Configuración ------------------------------- */
const PageConfig = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Configuración de empresa</h1>
        <p className="sub">Datos del RUP, sectores y notificaciones.</p>
      </div>
    </div>

    <div className="card">
      <div className="card-head"><h3>Empresa</h3></div>
      <div className="card-body" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>Razón social</label>
          <input className="input" defaultValue="Constructora del Sur S.A.S."/>
        </div>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>NIT</label>
          <input className="input mono" defaultValue="900.123.456-7"/>
        </div>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>Inscripción RUP</label>
          <input className="input mono" defaultValue="2014-25876"/>
        </div>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>Vigencia RUP</label>
          <div className="row" style={{gap:8}}>
            <input className="input mono" defaultValue="14 Mar 2027"/>
            <span className="chip chip-green"><span className="dot"/>Vigente</span>
          </div>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <div><h3>Sectores UNSPSC</h3><div className="sub">Códigos en los que tu empresa puede contratar.</div></div>
        <button className="btn btn-secondary btn-sm"><Icon name="plus" size={14}/>Agregar sector</button>
      </div>
      <div className="card-body">
        <div className="row" style={{gap:8, flexWrap:"wrap"}}>
          {[
            "72 · Edificación e infraestructura",
            "81 · Servicios profesionales de ingeniería",
            "30 · Componentes estructurales",
            "42 · Equipo médico y de laboratorio",
            "43 · Tecnología de la información",
          ].map(s=>(
            <span key={s} className="chip chip-blue" style={{padding:"6px 10px"}}>
              <span className="dot"/>{s}
              <Icon name="x" size={12} style={{marginLeft:4, opacity:.6, cursor:"pointer"}}/>
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head"><h3>Notificaciones</h3></div>
      <div className="card-body" style={{display:"flex", flexDirection:"column", gap:14}}>
        {[
          {t:"Análisis terminado", d:"Recibe correo cuando un análisis concluya.", on:true},
          {t:"Procesos sugeridos en SECOP II", d:"Notificar cuando aparezca un proceso con match ≥ 80%.", on:true},
          {t:"Vencimiento de documentos", d:"Aviso 30 días antes del vencimiento del RUP o certificados.", on:true},
          {t:"Actualizaciones del producto", d:"Novedades, cambios y nuevas funcionalidades.", on:false},
        ].map((n,i)=>(
          <div key={i} className="row" style={{justifyContent:"space-between", padding:"10px 0", borderBottom: i<3?"1px solid var(--border-hairline)":0}}>
            <div>
              <div style={{fontWeight:600, fontSize:14}}>{n.t}</div>
              <div className="muted" style={{fontSize:13, marginTop:2}}>{n.d}</div>
            </div>
            <span style={{
              display:"inline-block", width:38, height:22,
              background: n.on ? "var(--blue-600)" : "var(--graphite-300)",
              borderRadius:999, position:"relative",
              transition:"background var(--dur-base) var(--ease-out)"
            }}>
              <span style={{position:"absolute", width:18, height:18, borderRadius:999, background:"#fff",
                top:2, left: n.on ? 18 : 2, transition:"left var(--dur-base) var(--ease-out)",
                boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { PageAlertas, PageConfig });
