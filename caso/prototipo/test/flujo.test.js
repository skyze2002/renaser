import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.CRM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'renaser-'));
const { crearServidor } = await import('../crm-mock/server.js');
const { procesarLead } = await import('../flujo/pipeline.js');
const { clasificar } = await import('../flujo/clasificar.js');

let server, crmUrl;
before(async () => {
  server = crearServidor();
  await new Promise((r) => server.listen(0, r));
  crmUrl = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('lead caliente con consentimiento termina en requiere_humano', async () => {
  const l = await procesarLead({ nombre: 'Ana', telefono: '987654321', email: 'a@x.com', origen: 'referido', mensaje: 'Quiero inscribirme', consentimiento: true }, { crmUrl });
  assert.equal(l.clasificacion, 'caliente');
  assert.equal(l.etapa, 'requiere_humano');
  assert.equal(l.responsable, 'equipo_ventas');
});

test('lead sin consentimiento no recibe mensaje', async () => {
  const l = await procesarLead({ nombre: 'Pedro', telefono: '933444555', origen: 'whatsapp', mensaje: 'hola', consentimiento: false }, { crmUrl });
  assert.equal(l.etapa, 'pendiente_consentimiento');
  const m = await (await fetch(`${crmUrl}/metricas`)).json();
  assert.equal(m.mensajes, 1); // solo el de Ana
});

test('duplicado: no crea otro registro ni hace retroceder a un lead caliente', async () => {
  const l = await procesarLead({ nombre: 'Ana', telefono: '+51 987-654-321', origen: 'whatsapp', mensaje: 'hola', consentimiento: true }, { crmUrl });
  const { leads } = await (await fetch(`${crmUrl}/leads`)).json();
  assert.equal(leads.filter((x) => x.nombre === 'Ana').length, 1);
  assert.equal(l.clasificacion, 'caliente');
  assert.equal(l.etapa, 'requiere_humano');
  const m = await (await fetch(`${crmUrl}/metricas`)).json();
  assert.equal(m.mensajes, 1); // no se le envió un mensaje automático
});

test('"ahora" no se confunde con una pregunta de horario', () => {
  const r = clasificar({ origen: 'anuncio', mensaje: 'Solo información por ahora' });
  assert.ok(!r.motivos.some((m) => m.includes('logística')));
});

test('clasificación por reglas', () => {
  assert.equal(clasificar({ origen: 'anuncio', mensaje: 'solo información' }).clasificacion, 'frio');
  assert.equal(clasificar({ origen: 'formulario', mensaje: '¿cuándo es?' }).clasificacion, 'tibio');
});
