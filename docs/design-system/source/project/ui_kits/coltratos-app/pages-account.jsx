/* global React, Icon */
const { useState: useState3 } = React;

/* ----- Page: Mis análisis -------------------------------- */
const PageHistorial = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Mis análisis</h1>
        <p className="sub">147 análisis · filtra por estado, entidad o fecha.</p>
      </div>
      <div className="actions">
        <button className="btn btn-secondary"><Icon name="download" size={14}/>Exportar CSV</button>
        <button className="btn btn-primary"><Icon name="plus" size={14}/>Nuevo análisis</button>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <div className="row" style={{gap:10, flexWrap:"wrap"}}>
          <div className="search" style={{maxWidth:300, padding:"8px 12px"}}>
            <Icon name="search" size={16}/>
            <input placeholder="Buscar por proceso o entidad..."/>
          </div>
          <button className="btn btn-secondary btn-sm"><Icon name="filter" size={14}/>Estado</button>
          <button className="btn btn-secondary btn-sm">Entidad <Icon name="chev-down" size={14}/></button>
          <button className="btn btn-secondary btn-sm">Últimos 30 días <Icon name="chev-down" size={14}/></button>
        </div>
        <div className="muted" style={{fontSize:13}}>Mostrando 1–8 de 147</div>
      </div>
      <table className="tbl">
        <thead><tr>
          <th>Proceso</th><th>Entidad</th><th>Presupuesto</th><th>Estado</th><th>Confianza</th><th>Fecha</th><th></th>
        </tr></thead>
        <tbody>
          {[
            {p:"Suministro de equipos médicos",  id:"LP-2024-0025", e:"Sec. Salud · Bogotá",      b:"$850 M",    s:"green",  sl:"Elegible",      c:96, d:"Hoy"},
            {p:"Construcción CDI Engativá",      id:"LP-2024-0024", e:"IDU · Bogotá",              b:"$3.2 KM",   s:"amber",  sl:"Observaciones", c:92, d:"Ayer"},
            {p:"Mantenimiento parque automotor", id:"SA-2024-0188", e:"Alcaldía de Medellín",       b:"$120 M",    s:"red",    sl:"No elegible",   c:88, d:"23 Abr"},
            {p:"Servicios de aseo y cafetería",  id:"MC-2024-0511", e:"DIAN · Nivel central",       b:"$45 M",     s:"green",  sl:"Elegible",      c:94, d:"22 Abr"},
            {p:"Suministro de papelería",        id:"MC-2024-0509", e:"Min. Educación",             b:"$28 M",     s:"amber",  sl:"Observaciones", c:91, d:"21 Abr"},
            {p:"Adecuación de oficinas DIAN",    id:"LP-2024-0021", e:"DIAN · Cali",                 b:"$420 M",    s:"green",  sl:"Elegible",      c:97, d:"19 Abr"},
            {p:"Suministro insumos hospitalarios",id:"SA-2024-0184",e:"Hosp. Universitario · Cali",  b:"$210 M",    s:"red",    sl:"No elegible",   c:90, d:"18 Abr"},
            {p:"Estudios viales sector norte",   id:"LP-2024-0019", e:"INVIAS",                      b:"$1.8 KM",   s:"green",  sl:"Elegible",      c:93, d:"17 Abr"},
          ].map((r,i)=>(
            <tr key={i}>
              <td>
                <div style={{fontWeight:600}}>{r.p}</div>
                <div className="secondary mono">{r.id}</div>
              </td>
              <td>{r.e}</td>
              <td className="mono">{r.b}</td>
              <td><span className={"chip chip-"+r.s}><span className="dot"/>{r.sl}</span></td>
              <td>
                <div className="row" style={{gap:8}}>
                  <div className="bar" style={{width:60}}><i style={{width:r.c+"%"}}/></div>
                  <span className="secondary mono" style={{fontSize:12}}>{r.c}%</span>
                </div>
              </td>
              <td className="secondary">{r.d}</td>
              <td>
                <div className="row" style={{gap:6}}>
                  <button className="icon-btn" style={{width:32, height:32}}><Icon name="eye" size={16}/></button>
                  <button className="icon-btn" style={{width:32, height:32}}><Icon name="more" size={16}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ----- Page: Créditos ------------------------------------ */
const PageCreditos = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Créditos y facturación</h1>
        <p className="sub">Gestiona tu plan, balance de créditos y facturas.</p>
      </div>
    </div>

    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18}}>
      <div className="card card-pad" style={{gridColumn:"1 / span 2"}}>
        <div className="row" style={{justifyContent:"space-between", alignItems:"flex-start", marginBottom:18}}>
          <div>
            <div className="muted" style={{fontSize:13}}>Balance actual</div>
            <div style={{fontFamily:"var(--font-display)", fontSize:48, fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.05}}>23 <span style={{fontSize:18, color:"var(--fg-3)", fontWeight:500}}>créditos</span></div>
            <div className="muted" style={{fontSize:13, marginTop:6}}>Plan Profesional · 50 créditos/mes · renueva el 5 May</div>
          </div>
          <button className="btn btn-primary"><Icon name="plus" size={14}/>Comprar créditos</button>
        </div>
        <div className="bar" style={{height:10}}><i style={{width:"46%"}}/></div>
        <div className="row" style={{justifyContent:"space-between", marginTop:8, fontSize:12, color:"var(--fg-3)"}}>
          <span>27 usados este mes</span><span>23 / 50</span>
        </div>
      </div>
      <div className="card card-pad">
        <div className="row" style={{gap:12, alignItems:"flex-start", marginBottom:14}}>
          <span className="well well-violet"><Icon name="trophy"/></span>
          <div>
            <div style={{fontWeight:600, fontSize:14}}>Plan Empresarial</div>
            <div className="muted" style={{fontSize:13, marginTop:2}}>Análisis ilimitados, equipo de 10+</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-block">Hablar con ventas</button>
      </div>
    </div>

    <div className="card">
      <div className="card-head"><h3>Paquetes</h3><div className="muted" style={{fontSize:13}}>Pago único · sin renovación</div></div>
      <div className="card-body" style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14}}>
        {[
          {n:"10 créditos", p:"$89.000", u:"$8.900 / análisis", h:"Para uso ocasional"},
          {n:"50 créditos", p:"$349.000", u:"$6.980 / análisis", h:"Más popular", popular:true},
          {n:"200 créditos", p:"$1.099.000", u:"$5.495 / análisis", h:"Para equipos"},
        ].map((p,i)=>(
          <div key={i} className="card card-pad" style={{borderColor:p.popular?"var(--blue-200)":"var(--border-hairline)", boxShadow:p.popular?"0 0 0 2px var(--blue-100)":"var(--shadow-sm)", position:"relative"}}>
            {p.popular && <span className="chip chip-blue" style={{position:"absolute", top:14, right:14}}><span className="dot"/>Popular</span>}
            <div style={{fontSize:14, color:"var(--fg-3)", marginBottom:6}}>{p.h}</div>
            <div style={{fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, letterSpacing:"-0.015em"}}>{p.n}</div>
            <div style={{fontSize:24, fontWeight:700, marginTop:10, fontFamily:"var(--font-display)"}}>{p.p} <span style={{fontSize:13, color:"var(--fg-3)", fontWeight:500}}>COP</span></div>
            <div className="muted" style={{fontSize:13, marginTop:2}}>{p.u}</div>
            <button className={"btn "+(p.popular?"btn-primary":"btn-secondary")+" btn-block"} style={{marginTop:14}}>Comprar</button>
          </div>
        ))}
      </div>
    </div>

    <div className="card">
      <div className="card-head"><h3>Historial de facturas</h3></div>
      <table className="tbl">
        <thead><tr><th>Factura</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {[
            {f:"INV-2026-0421", c:"Plan Profesional · Abril",  m:"$249.000", d:"5 Abr 2026", s:"green", sl:"Pagada"},
            {f:"INV-2026-0322", c:"Plan Profesional · Marzo",  m:"$249.000", d:"5 Mar 2026", s:"green", sl:"Pagada"},
            {f:"INV-2026-0220", c:"50 créditos adicionales",   m:"$349.000", d:"18 Feb 2026", s:"green", sl:"Pagada"},
            {f:"INV-2026-0212", c:"Plan Profesional · Febrero",m:"$249.000", d:"5 Feb 2026", s:"green", sl:"Pagada"},
          ].map((r,i)=>(
            <tr key={i}>
              <td className="mono">{r.f}</td>
              <td>{r.c}</td>
              <td className="mono">{r.m}</td>
              <td className="secondary">{r.d}</td>
              <td><span className={"chip chip-"+r.s}><span className="dot"/>{r.sl}</span></td>
              <td><button className="btn btn-ghost btn-sm"><Icon name="download" size={14}/>PDF</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ----- Page: Equipo -------------------------------------- */
const PageEquipo = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Mi equipo</h1>
        <p className="sub">5 miembros · administra roles y permisos.</p>
      </div>
      <div className="actions">
        <button className="btn btn-primary"><Icon name="plus" size={14}/>Invitar miembro</button>
      </div>
    </div>

    <div className="kpis" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
      <div className="card kpi"><div className="top"><span className="well well-blue"><Icon name="users"/></span></div><div className="num">5</div><div className="lbl">Miembros activos</div></div>
      <div className="card kpi"><div className="top"><span className="well well-green"><Icon name="check-circle"/></span></div><div className="num">23</div><div className="lbl">Análisis este mes</div></div>
      <div className="card kpi"><div className="top"><span className="well well-amber"><Icon name="clock"/></span></div><div className="num">2</div><div className="lbl">Invitaciones pendientes</div></div>
    </div>

    <div className="card">
      <div className="card-head"><h3>Miembros</h3></div>
      <table className="tbl">
        <thead><tr><th>Nombre</th><th>Rol</th><th>Análisis</th><th>Última actividad</th><th></th></tr></thead>
        <tbody>
          {[
            {i:"MR", n:"María Rodríguez", e:"m.rodriguez@constru.co",   r:"Administrador", a:47, t:"Hace 5 min", you:true},
            {i:"JC", n:"Juan Camilo Peña", e:"j.pena@constru.co",        r:"Analista",      a:32, t:"Hoy, 9:14 a. m."},
            {i:"AL", n:"Andrea Lozano",    e:"a.lozano@constru.co",      r:"Analista",      a:28, t:"Ayer"},
            {i:"DS", n:"Diego Suárez",     e:"d.suarez@constru.co",      r:"Viewer",        a:12, t:"Hace 3 días"},
            {i:"CV", n:"Camila Vargas",    e:"c.vargas@constru.co",      r:"Viewer",        a:8,  t:"Hace 1 semana"},
            {i:"??", n:"luis.ramirez@…",   e:"Invitación pendiente",    r:"Analista",      a:0,  t:"—",         pending:true},
          ].map((u,i)=>(
            <tr key={i}>
              <td>
                <div className="row" style={{gap:10}}>
                  <span className="avatar" style={{opacity:u.pending?0.4:1, background:u.pending?"var(--graphite-300)":undefined}}>{u.i}</span>
                  <div>
                    <div style={{fontWeight:600}}>{u.n} {u.you && <span className="chip chip-blue" style={{marginLeft:6, padding:"1px 7px"}}>Tú</span>}</div>
                    <div className="secondary">{u.e}</div>
                  </div>
                </div>
              </td>
              <td>
                <span className={"chip "+(u.r==="Administrador"?"chip-violet":u.r==="Analista"?"chip-blue":"chip-gray")}>
                  <span className="dot"/>{u.r}
                </span>
              </td>
              <td className="mono">{u.a}</td>
              <td className="secondary">{u.t}</td>
              <td><button className="icon-btn" style={{width:32, height:32}}><Icon name="more" size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

Object.assign(window, { PageHistorial, PageCreditos, PageEquipo });
