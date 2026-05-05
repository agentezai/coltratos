import type { Semaforo } from "@/components/page/sem-pill";

export interface MockAnalisis {
  id: string;
  proceso: string;
  procesoId: string;
  entidad: string;
  fecha: string;
  sem: Semaforo;
  resultado: number;
  requisitos: { ok: number; warn: number; fail: number };
}

export interface MockProceso {
  id: string;
  nombre: string;
  entidad: string;
  modalidad: string;
  pliegos: number;
  presupuesto: string;
  cierre: string;
  sem: Semaforo;
  analisisId: string;
}

export interface MockRequisito {
  id: string;
  titulo: string;
  subtitulo: string;
  status: Semaforo;
  observaciones: number;
  razonamiento: string;
}

export interface MockResultDetail {
  id: string;
  proceso: string;
  procesoId: string;
  entidad: string;
  objeto: string;
  cierre: string;
  modalidad: string;
  presupuesto: string;
  sem: Semaforo;
  resultado: number;
  resumen: { cumple: number; conObs: number; noCumple: number; total: number };
  recomendacion: string;
  archivo: string;
  archivoTamano: string;
  reqs: MockRequisito[];
}

export interface MockMiembro {
  id: string;
  nombre: string;
  email: string;
  initials: string;
  rol: "Administrador" | "Analista" | "Viewer";
  estado: "Activo" | "Suspendido";
  ultimoAcceso: string;
}

export interface MockFactura {
  id: string;
  fecha: string;
  descripcion: string;
  monto: string;
  estado: "Pagada" | "Vencida";
}

export const ANALISIS: MockAnalisis[] = [
  { id: "ANA-2026-00048", proceso: "Suministro de equipos de cómputo", procesoId: "LP-2024-00123", entidad: "Alcaldía de Medellín", fecha: "28 Abr 2026", sem: "conditional", resultado: 70, requisitos: { ok: 16, warn: 3, fail: 1 } },
  { id: "ANA-2026-00047", proceso: "Construcción infraestructura vial", procesoId: "SA-2024-00089", entidad: "INVIAS", fecha: "27 Abr 2026", sem: "eligible", resultado: 95, requisitos: { ok: 20, warn: 1, fail: 0 } },
  { id: "ANA-2026-00046", proceso: "Prestación servicios de salud", procesoId: "LI-2024-00067", entidad: "Ministerio de Salud", fecha: "26 Abr 2026", sem: "not-eligible", resultado: 35, requisitos: { ok: 7, warn: 2, fail: 9 } },
  { id: "ANA-2026-00045", proceso: "Consultoría sistema de información", procesoId: "MC-2024-00234", entidad: "DNP", fecha: "25 Abr 2026", sem: "eligible", resultado: 92, requisitos: { ok: 18, warn: 2, fail: 0 } },
  { id: "ANA-2026-00044", proceso: "Adquisición mobiliario escolar", procesoId: "SA-2024-00178", entidad: "Ministerio de Educación", fecha: "24 Abr 2026", sem: "conditional", resultado: 65, requisitos: { ok: 13, warn: 4, fail: 2 } },
  { id: "ANA-2026-00043", proceso: "Mantenimiento red eléctrica", procesoId: "LP-2024-00099", entidad: "EPM", fecha: "23 Abr 2026", sem: "eligible", resultado: 88, requisitos: { ok: 17, warn: 3, fail: 0 } },
  { id: "ANA-2026-00042", proceso: "Interventoría obras civiles", procesoId: "CM-2024-00045", entidad: "IDU Bogotá", fecha: "22 Abr 2026", sem: "not-eligible", resultado: 40, requisitos: { ok: 8, warn: 1, fail: 8 } },
  { id: "ANA-2026-00041", proceso: "Suministro medicamentos", procesoId: "SA-2024-00312", entidad: "Hospital San Vicente", fecha: "21 Abr 2026", sem: "conditional", resultado: 72, requisitos: { ok: 14, warn: 5, fail: 1 } },
];

export const PROCESOS: MockProceso[] = [
  { id: "LP-2024-00123", nombre: "Suministro de equipos de cómputo para dependencias administrativas", entidad: "Alcaldía de Medellín", modalidad: "Licitación Pública", pliegos: 2, presupuesto: "$2.450.000.000 COP", cierre: "15 May 2026", sem: "conditional", analisisId: "ANA-2026-00048" },
  { id: "SA-2024-00089", nombre: "Construcción y mejoramiento de infraestructura vial urbana", entidad: "INVIAS", modalidad: "Selección Abreviada", pliegos: 1, presupuesto: "$8.900.000.000 COP", cierre: "20 May 2026", sem: "eligible", analisisId: "ANA-2026-00047" },
  { id: "LI-2024-00067", nombre: "Prestación de servicios de salud para población vulnerable", entidad: "Ministerio de Salud", modalidad: "Licitación Pública", pliegos: 3, presupuesto: "$5.200.000.000 COP", cierre: "18 May 2026", sem: "not-eligible", analisisId: "ANA-2026-00046" },
  { id: "MC-2024-00234", nombre: "Consultoría para diseño de sistema de información geográfica", entidad: "DNP", modalidad: "Mínima Cuantía", pliegos: 1, presupuesto: "$85.000.000 COP", cierre: "10 May 2026", sem: "eligible", analisisId: "ANA-2026-00045" },
  { id: "SA-2024-00178", nombre: "Adquisición de mobiliario escolar para instituciones educativas", entidad: "Ministerio de Educación", modalidad: "Selección Abreviada", pliegos: 1, presupuesto: "$1.200.000.000 COP", cierre: "25 May 2026", sem: "conditional", analisisId: "ANA-2026-00044" },
];

export const RESULT_DETAIL: MockResultDetail = {
  id: "ANA-2026-00048",
  proceso: "Suministro de equipos de cómputo para dependencias administrativas",
  procesoId: "LP-2024-00123",
  entidad: "Alcaldía de Medellín",
  objeto: "Suministro e instalación de equipos de cómputo",
  cierre: "15 May 2026",
  modalidad: "Licitación Pública",
  presupuesto: "$2.450.000.000 COP",
  sem: "conditional",
  resultado: 70,
  resumen: { cumple: 16, conObs: 3, noCumple: 1, total: 20 },
  recomendacion: "Revisar los requisitos financieros de liquidez y la experiencia específica en contratos similares antes de presentar oferta.",
  archivo: "pliego-lp-2024-00123.pdf",
  archivoTamano: "4.2 MB",
  reqs: [
    { id: "REQ-001", titulo: "Existencia y representación legal", subtitulo: "Jurídico", status: "eligible", observaciones: 0, razonamiento: "RUP activo y representante legal con facultades vigentes." },
    { id: "REQ-002", titulo: "No estar incurso en inhabilidades", subtitulo: "Jurídico", status: "eligible", observaciones: 0, razonamiento: "Sin registros de inhabilidades en SECOP II." },
    { id: "REQ-003", titulo: "Indicador de liquidez ≥ 1.5", subtitulo: "Financiero", status: "conditional", observaciones: 1, razonamiento: "Liquidez reportada en RUP: 1.42. Requiere verificación del período de corte." },
    { id: "REQ-004", titulo: "Indicador de endeudamiento ≤ 70%", subtitulo: "Financiero", status: "eligible", observaciones: 0, razonamiento: "Endeudamiento: 58%. Cumple el límite establecido." },
    { id: "REQ-005", titulo: "Experiencia contratos similares (mín. 2)", subtitulo: "Experiencia", status: "not-eligible", observaciones: 2, razonamiento: "Solo se encontró 1 contrato similar acreditado en RUP. Se requieren mínimo 2." },
    { id: "REQ-006", titulo: "Personal técnico clave certificado", subtitulo: "Técnico", status: "eligible", observaciones: 0, razonamiento: "Equipo técnico clave cumple los requisitos de títulos y años de experiencia." },
    { id: "REQ-007", titulo: "Patrimonio neto mínimo $500M COP", subtitulo: "Financiero", status: "conditional", observaciones: 1, razonamiento: "Patrimonio neto: $480M. Diferencia marginal — verificar estados financieros actualizados." },
    { id: "REQ-008", titulo: "RUP activo y vigente", subtitulo: "Jurídico", status: "eligible", observaciones: 0, razonamiento: "RUP renovado para el período vigente." },
  ],
};

export const EQUIPO: MockMiembro[] = [
  { id: "1", nombre: "María Rodríguez", email: "m.rodriguez@constru.co", initials: "MR", rol: "Administrador", estado: "Activo", ultimoAcceso: "Hoy, 09:42" },
  { id: "2", nombre: "Carlos Jiménez", email: "c.jimenez@constru.co", initials: "CJ", rol: "Analista", estado: "Activo", ultimoAcceso: "Hoy, 08:15" },
  { id: "3", nombre: "Ana López", email: "a.lopez@constru.co", initials: "AL", rol: "Administrador", estado: "Activo", ultimoAcceso: "Ayer, 17:30" },
  { id: "4", nombre: "Pedro Martínez", email: "p.martinez@constru.co", initials: "PM", rol: "Analista", estado: "Activo", ultimoAcceso: "Ayer, 14:00" },
  { id: "5", nombre: "Lucía Gómez", email: "l.gomez@constru.co", initials: "LG", rol: "Viewer", estado: "Activo", ultimoAcceso: "28 Abr 2026" },
  { id: "6", nombre: "Daniela Valencia", email: "d.valencia@constru.co", initials: "DV", rol: "Analista", estado: "Suspendido", ultimoAcceso: "15 Abr 2026" },
];

export const FACTURAS: MockFactura[] = [
  { id: "FAC-2026-001", fecha: "01 May 2026", descripcion: "Paquete Pro — 500 análisis", monto: "$19.900 COP", estado: "Pagada" },
  { id: "FAC-2026-002", fecha: "01 Abr 2026", descripcion: "Paquete Básico — 200 análisis", monto: "$9.900 COP", estado: "Pagada" },
  { id: "FAC-2026-003", fecha: "01 Mar 2026", descripcion: "Paquete Pro — 500 análisis", monto: "$19.900 COP", estado: "Pagada" },
  { id: "FAC-2026-004", fecha: "01 Feb 2026", descripcion: "Paquete Básico — 200 análisis", monto: "$9.900 COP", estado: "Vencida" },
  { id: "FAC-2026-005", fecha: "01 Ene 2026", descripcion: "Paquete Empresarial — 1.200 análisis", monto: "$39.900 COP", estado: "Pagada" },
];
