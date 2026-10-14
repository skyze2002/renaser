// Demo de punta a punta: levanta el CRM simulado y procesa registros ficticios.
import { crearServidor } from '../crm-mock/server.js';
import { procesarLead } from '../flujo/pipeline.js';

const PORT = Number(process.env.PORT || 3001);
const crmUrl = `http://localhost:${PORT}`;

const registros = [
  { nombre: 'Ana Quispe', telefono: '987 654 321', email: 'ana@ejemplo.com', origen: 'referido', mensaje: 'Quiero inscribirme, somos 3 personas. ¿Cuál es el precio?', consentimiento: true },
  { nombre: 'Luis Ramos', telefono: '912345678', origen: 'formulario', mensaje: '¿Cuándo es y dónde será?', consentimiento: true },
  { nombre: 'Carla Díaz', email: 'carla@ejemplo.com', telefono: '956111222', origen: 'anuncio', mensaje: 'Solo información por ahora', consentimiento: true },
  { nombre: 'Pedro Soto', telefono: '933444555', origen: 'whatsapp', mensaje: 'Quiero reservar un cupo', consentimiento: false },
  { nombre: 'Ana Quispe', telefono: '+51 987-654-321', origen: 'whatsapp', mensaje: 'Hola de nuevo, ¿ya puedo pagar?', consentimiento: true },
];

const server = crearServidor();
await new Promise((r) => server.listen(PORT, r));
await fetch(`${crmUrl}/reset`, { method: 'POST' });

for (const reg of registros) {
  console.log(`\n▶ ${reg.nombre} (${reg.origen})`);
  await procesarLead(reg, { crmUrl, log: (m) => console.log('  ' + m) });
}

const { leads } = await (await fetch(`${crmUrl}/leads`)).json();
console.log('\nEstado final en el CRM:');
console.table(leads.map((l) => ({ id: l.id, nombre: l.nombre, clasificacion: l.clasificacion, puntaje: l.puntaje, etapa: l.etapa, eventos: l.historial.length })));
console.log('Métricas:', JSON.stringify(await (await fetch(`${crmUrl}/metricas`)).json()));
server.close();
