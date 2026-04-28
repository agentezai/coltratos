/* global React, Icon */
const { useState: useState2 } = React;

/* ----- Page: Dashboard ----------------------------------- */
const PageDashboard = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">¡Hola, María! 👋</h1>
        <p className="sub">Aquí tienes el resumen de tu actividad reciente.</p>
      </div>
      <div className="actions">
        <button className="btn btn-secondary"><Icon name="download" size={14}/>Exportar</button>
        <button className="btn btn-primary"><Icon name="plus" size={14}/>Nuevo análisis</button>
      </div>
    </div>

    {/* KPIs */}
    <div className="kpis">
      {[
        {well:"blue",  icon:"file",         num:"147",   lbl:"Análisis realizados",  delta:"+12%", up:true},
        {well:"green", icon:"check-circle", num:"68%",   lbl:"Tasa de elegibilidad", delta:"+4 pts", up:true},
        {well:"amber", icon:"card",         num:"23",    lbl:"Créditos restantes",   delta:"−5",    up:false},
        {well:"violet",icon:"clock",        num:"112 h", lbl:"Tiempo ahorrado",      delta:"+38 h", up:true},
      ].map((k,i)=>(
        <div key={i} className="card kpi">
          <div className="top">
            <span className={"well well-"+k.well}><Icon name={k.icon}/></span>
            <span className={"delta "+(k.up?"up":"down")}>{k.up?"↑":"↓"} {k.delta.replace(/^[+−-]/,"")}</span>
          </div>
          <div className="num">{k.num}</div>
          <div className="lbl">{k.lbl}</div>
        </div>
      ))}
    </div>

    {/* Recent analyses + Quick actions */}
    <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:18}}>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Análisis recientes</h3>
            <div className="sub">Últimos 5 procesos analizados</div>
          </div>
          <button className="btn btn-ghost btn-sm">Ver todos <Icon name="chev-right" size={14}/></button>
        </div>
        <table className="tbl">
          <thead><tr><th>Proceso</th><th>Entidad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {[
              {p:"Suministro de equipos médicos",   id:"LP-2024-0025", e:"Secretaría de Salud · Bogotá",   s:"green",  sl:"Elegible",       d:"Hoy, 10:24 a. m."},
              {p:"Construcción CDI Engativá",       id:"LP-2024-0024", e:"IDU · Bogotá",                   s:"amber",  sl:"Observaciones",  d:"Ayer, 4:08 p. m."},
              {p:"Mantenimiento parque automotor",  id:"SA-2024-0188", e:"Alcaldía de Medellín",            s:"red",    sl:"No elegible",    d:"23 Abr, 3:12 p. m."},
              {p:"Servicios de aseo y cafetería",   id:"MC-2024-0511", e:"DIAN · Nivel central",            s:"green",  sl:"Elegible",       d:"22 Abr, 9:46 a. m."},
              {p:"Suministro de papelería",         id:"MC-2024-0509", e:"Min. Educación",                  s:"amber",  sl:"Observaciones",  d:"21 Abr, 5:30 p. m."},
            ].map((r,i)=>(
              <tr key={i}>
                <td>
                  <div style={{fontWeight:600}}>{r.p}</div>
                  <div className="secondary mono">{r.id}</div>
                </td>
                <td>{r.e}</td>
                <td><span className={"chip chip-"+r.s}><span className="dot"/>{r.sl}</span></td>
                <td className="secondary">{r.d}</td>
                <td><button className="icon-btn" style={{width:32, height:32}}><Icon name="more" size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-pad">
        <h3 style={{margin:"0 0 14px", fontSize:18, fontWeight:600}}>Acciones rápidas</h3>
        <div className="col" style={{gap:10}}>
          <button className="btn btn-primary btn-block"><Icon name="upload" size={14}/>Subir pliego</button>
          <button className="btn btn-secondary btn-block"><Icon name="bell" size={14}/>Configurar alertas</button>
          <button className="btn btn-secondary btn-block"><Icon name="card" size={14}/>Comprar créditos</button>
        </div>
        <div className="divider" style={{margin:"18px 0"}}/>
        <div className="row" style={{gap:12, alignItems:"flex-start"}}>
          <span className="well well-violet"><Icon name="sparkles"/></span>
          <div>
            <div style={{fontWeight:600, fontSize:14}}>Nuevo: Alertas IA</div>
            <div className="muted" style={{fontSize:13, lineHeight:1.5, marginTop:4}}>
              Recibe procesos del SECOP II que coinciden con tu RUP automáticamente.
            </div>
            <a style={{color:"var(--blue-700)", fontSize:13, fontWeight:600, marginTop:8, display:"inline-block"}}>Activar →</a>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ----- Page: Subir pliego -------------------------------- */
const PageSubir = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Subir pliego de condiciones</h1>
        <p className="sub">Arrastra el PDF del proceso del SECOP II — el análisis tarda menos de 1 minuto.</p>
      </div>
    </div>

    <div className="card card-pad">
      <div className="dropzone">
        <div className="icon"><Icon name="upload" size={28}/></div>
        <div className="title">Arrastra tu pliego aquí o haz clic para buscar</div>
        <div className="hint">PDF · hasta 25 MB</div>
        <div style={{marginTop:18}}>
          <button className="btn btn-secondary"><Icon name="file" size={14}/>Seleccionar archivo</button>
        </div>
      </div>

      <div className="banner-info" style={{marginTop:18}}>
        <Icon name="shield" size={18}/>
        <div>
          <b>Tu archivo se analiza de forma privada y segura.</b><br/>
          No compartimos tu información con terceros. Cifrado en tránsito y en reposo.
        </div>
      </div>

      <div style={{marginTop:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}}>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>Número de proceso (opcional)</label>
          <input className="input" placeholder="LP-2024-0025"/>
        </div>
        <div className="col" style={{gap:6}}>
          <label style={{fontSize:13, fontWeight:600}}>Entidad contratante (opcional)</label>
          <input className="input" placeholder="Secretaría de Salud · Bogotá"/>
        </div>
      </div>

      <div className="row" style={{marginTop:24, justifyContent:"space-between", alignItems:"center"}}>
        <div className="row" style={{gap:8}}>
          <span className="chip chip-blue"><span className="dot"/>1 crédito</span>
          <span className="muted" style={{fontSize:13}}>Costo estimado del análisis</span>
        </div>
        <button className="btn btn-primary btn-lg"><Icon name="sparkles" size={14}/>Iniciar análisis</button>
      </div>
    </div>
  </div>
);

/* ----- Page: Procesamiento ------------------------------- */
const PageProcesamiento = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <h1 className="title">Análisis en progreso</h1>
        <p className="sub">Estamos procesando tu pliego de condiciones. No cierres esta ventana.</p>
      </div>
    </div>
    <div className="card card-pad" style={{padding:"40px 32px"}}>
      <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:24, marginBottom:32}}>
        <div className="ring">
          <svg viewBox="0 0 100 100">
            <circle className="track" cx="50" cy="50" r="42"/>
            <circle className="fill" cx="50" cy="50" r="42" strokeDasharray="180 264"/>
          </svg>
          <div className="label">68%</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:18, fontWeight:600}}>Evaluando con IA</div>
          <div className="muted" style={{fontSize:13, marginTop:4}}>Comparando contra tu RUP y experiencia registrada · 27 seg restantes</div>
        </div>
      </div>

      <div className="stepper">
        {[
          {n:1, l:"Extracción del PDF", st:"done"},
          {n:2, l:"Segmentación de requisitos", st:"done"},
          {n:3, l:"Evaluación con IA", st:"active"},
          {n:4, l:"Validación final", st:""},
        ].map(s => (
          <div key={s.n} className={"step "+s.st}>
            <div className="num">{s.st==="done" ? "✓" : s.n}</div>
            <div className="lbl">{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:32, padding:"16px 18px", background:"var(--surface-sunken)", borderRadius:10, fontSize:13}}>
        <div className="row" style={{gap:10}}>
          <Icon name="file" size={16} style={{stroke:"var(--fg-3)"}}/>
          <div className="grow">
            <div style={{fontWeight:600}}>pliego-LP-2024-0025.pdf</div>
            <div className="muted mono" style={{fontSize:12}}>1.87 MB · PDF · 84 páginas</div>
          </div>
          <span className="chip chip-violet"><span className="dot"/>Procesando</span>
        </div>
      </div>
    </div>
  </div>
);

/* ----- Page: Resultado ----------------------------------- */
const PageResultado = () => {
  const [tab, setTab] = useState2("juridico");
  const tabs = [
    {id:"juridico",   label:"Jurídico"},
    {id:"financiero", label:"Financiero"},
    {id:"tecnico",    label:"Técnico"},
    {id:"experiencia",label:"Experiencia"},
  ];
  const reqs = {
    juridico: [
      {st:"green", t:"Inscripción vigente en RUP", d:"Tu RUP figura activo, renovado el 14 Mar 2026."},
      {st:"green", t:"Capacidad jurídica para contratar", d:"Representante legal con facultades suficientes."},
      {st:"amber", t:"Certificado de existencia y representación", d:"Vence en 18 días — renueva antes de presentar la propuesta."},
      {st:"green", t:"Pago aportes parafiscales", d:"Al día. Última verificación: 22 Abr 2026."},
    ],
    financiero: [
      {st:"green", t:"Capital de trabajo ≥ 30% del presupuesto", d:"Tu indicador: 38%. Cumple."},
      {st:"red",   t:"Índice de liquidez ≥ 1.5", d:"Tu indicador: 1.32. No cumple — ajusta cuentas por cobrar."},
    ],
    tecnico: [
      {st:"green", t:"Personal técnico mínimo (3 ingenieros)", d:"Tu equipo: 5 ingenieros con tarjeta profesional."},
    ],
    experiencia: [
      {st:"amber", t:"Contratos similares en últimos 5 años", d:"2 contratos de 3 requeridos. Sumar uno más para cumplir."},
    ],
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="row" style={{gap:8, marginBottom:6}}>
            <span className="muted mono" style={{fontSize:13}}>LP-2024-0025</span>
            <span className="muted">·</span>
            <span className="muted" style={{fontSize:13}}>Analizado hace 12 min</span>
          </div>
          <h1 className="title">Suministro de equipos médicos</h1>
          <p className="sub">Secretaría de Salud · Bogotá D.C. · Presupuesto $850.000.000 COP</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><Icon name="download" size={14}/>Exportar PDF</button>
          <button className="btn btn-primary"><Icon name="arrow-up-right" size={14}/>Ver en SECOP II</button>
        </div>
      </div>

      <div className="semaforo-hero">
        <div className="semaforo-light sem-amber">
          <Icon name="alert" size={56}/>
        </div>
        <div className="grow">
          <div className="row" style={{gap:8, marginBottom:6}}>
            <span className="chip chip-amber"><span className="dot"/>Elegible con observaciones</span>
            <span className="muted" style={{fontSize:13}}>Confianza 92%</span>
          </div>
          <h2 style={{margin:"0 0 6px", fontSize:26, fontWeight:700, letterSpacing:"-0.015em"}}>
            Puedes presentarte — con dos ajustes.
          </h2>
          <p style={{margin:0, color:"var(--fg-2)", maxWidth:"60ch", lineHeight:1.5}}>
            Cumples la mayoría de requisitos habilitantes. Hay <b>1 observación crítica</b> en el componente
            financiero y <b>1 menor</b> en jurídico. Resuélvelas antes del cierre el <b>30 Abr 2026</b>.
          </p>
        </div>
        <div className="ring">
          <svg viewBox="0 0 100 100">
            <circle className="track" cx="50" cy="50" r="42"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" strokeDasharray="185 264"/>
          </svg>
          <div className="label" style={{color:"#b45309"}}>70%</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{padding:"6px 12px 0", borderBottom:0}}>
          <div className="tabs">
            {tabs.map(t=>(
              <button key={t.id} className={"tab "+(tab===t.id?"active":"")} onClick={()=>setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="col" style={{gap:14}}>
            {reqs[tab].map((r,i)=>(
              <div key={i} className="row" style={{gap:14, alignItems:"flex-start", padding:"12px 14px", border:"1px solid var(--border-hairline)", borderRadius:10}}>
                <span className={"well well-"+(r.st==="green"?"green":r.st==="amber"?"amber":"red")} style={{width:34, height:34}}>
                  <Icon name={r.st==="green"?"check-circle":r.st==="amber"?"alert":"x-circle"} size={18}/>
                </span>
                <div className="grow">
                  <div style={{fontWeight:600, fontSize:14}}>{r.t}</div>
                  <div className="muted" style={{fontSize:13, marginTop:3, lineHeight:1.5}}>{r.d}</div>
                </div>
                <span className={"chip chip-"+r.st}><span className="dot"/>{r.st==="green"?"Cumple":r.st==="amber"?"Observación":"No cumple"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row" style={{gap:12, alignItems:"flex-start"}}>
          <span className="well well-blue"><Icon name="sparkles"/></span>
          <div className="grow">
            <h3 style={{margin:"0 0 8px", fontSize:17, fontWeight:600}}>Recomendaciones</h3>
            <ul style={{margin:0, paddingLeft:18, color:"var(--fg-2)", lineHeight:1.7, fontSize:14}}>
              <li>Renueva el certificado de existencia antes del <b>10 May</b>.</li>
              <li>Mejora tu índice de liquidez gestionando cobros pendientes — mínimo 1.5x.</li>
              <li>Considera presentar consorcio para complementar experiencia técnica.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { PageDashboard, PageSubir, PageProcesamiento, PageResultado });
