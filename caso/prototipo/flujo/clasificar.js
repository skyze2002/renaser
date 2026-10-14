// Clasificación por reglas (determinista, explicable y sin costo).
// En producción este paso puede reemplazarse por un agente de IA que
// devuelva la misma salida { puntaje, clasificacion, motivos }.
// La misma lógica está copiada en el nodo "Clasificar" del flujo de n8n.

const PESO_ORIGEN = { referido: 30, formulario: 20, whatsapp: 20, evento_anterior: 25, anuncio: 10 };
const SENALES = [
  { re: /inscrib|reserv|separar|cupo/i, pts: 30, motivo: 'quiere inscribirse' },
  { re: /precio|cu[aá]nto|costo|pag(o|ar)/i, pts: 20, motivo: 'pregunta por precio o pago' },
  { re: /cu[aá]ndo|fecha|d[oó]nde|lugar|\bhora\b|horario/i, pts: 15, motivo: 'pregunta logística' },
  { re: /grupo|equipo|somos \d+|\d+ personas/i, pts: 15, motivo: 'viene en grupo' },
  { re: /solo informaci|m[aá]s adelante|no s[eé]/i, pts: -15, motivo: 'interés bajo' },
];

export function clasificar(lead) {
  let puntaje = 0;
  const motivos = [];
  const origen = PESO_ORIGEN[lead.origen] ?? 0;
  if (origen) { puntaje += origen; motivos.push(`origen ${lead.origen} (+${origen})`); }
  for (const s of SENALES) {
    if (s.re.test(lead.mensaje || '')) { puntaje += s.pts; motivos.push(`${s.motivo} (${s.pts > 0 ? '+' : ''}${s.pts})`); }
  }
  if (lead.email && lead.telefono) { puntaje += 10; motivos.push('datos completos (+10)'); }
  puntaje = Math.max(0, Math.min(100, puntaje));
  const clasificacion = puntaje >= 60 ? 'caliente' : puntaje >= 30 ? 'tibio' : 'frio';
  return { puntaje, clasificacion, motivos };
}

// Etapas a partir de las cuales el lead ya está en manos de una persona
// o más avanzado: el flujo automático no debe hacerlo retroceder.
export const ETAPAS_PROTEGIDAS = ['requiere_humano', 'inscrito', 'confirmado', 'asistio'];

// Un lead que vuelve a escribir nunca baja de clasificación.
export function combinarPuntaje(previo, nuevo) {
  if (previo == null || nuevo.puntaje >= previo) return nuevo;
  const puntaje = previo;
  const clasificacion = puntaje >= 60 ? 'caliente' : puntaje >= 30 ? 'tibio' : 'frio';
  return { puntaje, clasificacion, motivos: [...nuevo.motivos, `se mantiene puntaje previo (${previo})`] };
}

// Seguimiento según clasificación. Caliente: mensaje + persona del equipo.
export function planDeSeguimiento(lead, clasificacion) {
  const nombre = lead.nombre.split(' ')[0];
  const planes = {
    caliente: { plantilla: 'bienvenida_inscripcion', etapa: 'requiere_humano',
      texto: `Hola ${nombre}, gracias por tu interés. Te escribirá alguien del equipo en breve para ayudarte con tu inscripción.` },
    tibio: { plantilla: 'info_evento', etapa: 'contactado',
      texto: `Hola ${nombre}, te comparto los detalles del evento (fecha, lugar y precio). ¿Te separo un cupo?` },
    frio: { plantilla: 'nutricion', etapa: 'contactado',
      texto: `Hola ${nombre}, gracias por escribirnos. Te avisaremos de las próximas fechas.` },
  };
  return planes[clasificacion];
}
