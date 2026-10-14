// Flujo completo en Node (equivalente al workflow de n8n):
// registro → almacenamiento → clasificación → seguimiento → estado actualizado
import { clasificar, combinarPuntaje, planDeSeguimiento, ETAPAS_PROTEGIDAS } from './clasificar.js';

async function api(crmUrl, method, ruta, body) {
  const res = await fetch(crmUrl + ruta, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

export async function procesarLead(registro, { crmUrl = 'http://localhost:3001', log = () => {} } = {}) {
  // 1. Almacenamiento: el CRM valida, normaliza y deduplica
  const { creado, lead } = await api(crmUrl, 'POST', '/leads', registro);
  log(`[1] ${creado ? 'Creado' : 'Duplicado, actualizado'} ${lead.id} (${lead.nombre})`);

  // 2. Clasificación (nunca baja si el lead ya tenía puntaje)
  const c = combinarPuntaje(lead.puntaje, clasificar(lead));
  const protegido = ETAPAS_PROTEGIDAS.includes(lead.etapa);
  await api(crmUrl, 'PATCH', `/leads/${lead.id}`, {
    ...c, evento: 'clasificacion', ...(lead.etapa === 'nuevo' ? { etapa: 'clasificado' } : {}),
  });
  log(`[2] ${c.clasificacion} (${c.puntaje}) — ${c.motivos.join(', ')}`);

  // 3a. Ya lo atiende una persona: no se automatiza, se le avisa
  if (protegido) {
    const r = await api(crmUrl, 'PATCH', `/leads/${lead.id}`, { evento: 'alerta_responsable', nota: 'Nuevo mensaje de un lead asignado; responde una persona' });
    log(`[3] Etapa protegida (${lead.etapa}) → sin mensaje automático, alerta al responsable`);
    return r.lead;
  }

  // 3b. Sin consentimiento no se envía nada
  if (!lead.consentimiento) {
    const r = await api(crmUrl, 'PATCH', `/leads/${lead.id}`, { etapa: 'pendiente_consentimiento', evento: 'bloqueo_consentimiento', nota: 'No se envía mensaje sin opt-in' });
    log(`[3] Sin consentimiento → ${r.lead.etapa}`);
    return r.lead;
  }

  // 3c. Seguimiento de prueba (WhatsApp simulado)
  const plan = planDeSeguimiento(lead, c.clasificacion);
  const msg = await api(crmUrl, 'POST', '/whatsapp/send', { lead_id: lead.id, plantilla: plan.plantilla, texto: plan.texto });
  log(`[3] Mensaje ${msg.id} (${plan.plantilla}) ${msg.estado}`);

  // 4. Estado actualizado
  const r = await api(crmUrl, 'PATCH', `/leads/${lead.id}`, {
    etapa: plan.etapa, evento: 'seguimiento_enviado', nota: `Mensaje ${msg.id}`,
    responsable: plan.etapa === 'requiere_humano' ? 'equipo_ventas' : undefined,
  });
  log(`[4] Estado → ${r.lead.etapa}`);
  return r.lead;
}
