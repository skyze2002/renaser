// CRM simulado (sin dependencias). Representa al CRM real de la empresa:
// es la única fuente de verdad. También simula el envío por WhatsApp.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CRM_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'crm.json');

const ETAPAS = ['nuevo', 'clasificado', 'contactado', 'requiere_humano', 'pendiente_consentimiento', 'inscrito', 'confirmado', 'asistio'];

function cargar() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { leads: [], mensajes: [], seq: 0 }; }
}
function guardar(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const ahora = () => new Date().toISOString();
const normTel = (t) => String(t || '').replace(/[^\d]/g, '').replace(/^(?!51)(\d{9})$/, '51$1');
const normEmail = (e) => String(e || '').trim().toLowerCase() || null;

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON inválido')); } });
  });
}
function responder(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function crearServidor() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const partes = url.pathname.split('/').filter(Boolean);
      const db = cargar();

      // POST /leads — crea o actualiza (deduplica por teléfono o correo)
      if (req.method === 'POST' && url.pathname === '/leads') {
        const b = await leerBody(req);
        const telefono = normTel(b.telefono);
        const email = normEmail(b.email);
        if (!b.nombre || (!telefono && !email)) return responder(res, 400, { error: 'Se requiere nombre y teléfono o correo' });

        let lead = db.leads.find((l) => (telefono && l.telefono === telefono) || (email && l.email === email));
        const creado = !lead;
        if (creado) {
          lead = { id: `L${String(++db.seq).padStart(4, '0')}`, etapa: 'nuevo', creado_en: ahora(), historial: [] };
          db.leads.push(lead);
        }
        Object.assign(lead, {
          nombre: b.nombre.trim(),
          telefono: telefono || lead.telefono || null,
          email: email || lead.email || null,
          origen: b.origen || lead.origen || 'desconocido',
          mensaje: b.mensaje ?? lead.mensaje ?? '',
          consentimiento: Boolean(b.consentimiento ?? lead.consentimiento),
          actualizado_en: ahora(),
        });
        lead.historial.push({ fecha: ahora(), evento: creado ? 'registro' : 'registro_duplicado', origen: lead.origen });
        guardar(db);
        return responder(res, creado ? 201 : 200, { creado, lead });
      }

      // PATCH /leads/:id — actualiza etapa / clasificación y deja historial
      if (req.method === 'PATCH' && partes[0] === 'leads' && partes[1]) {
        const lead = db.leads.find((l) => l.id === partes[1]);
        if (!lead) return responder(res, 404, { error: 'Lead no encontrado' });
        const b = await leerBody(req);
        if (b.etapa && !ETAPAS.includes(b.etapa)) return responder(res, 400, { error: `Etapa inválida: ${b.etapa}` });
        for (const k of ['etapa', 'clasificacion', 'puntaje', 'responsable', 'motivos']) if (b[k] !== undefined) lead[k] = b[k];
        lead.actualizado_en = ahora();
        lead.historial.push({ fecha: ahora(), evento: b.evento || 'actualizacion', etapa: lead.etapa, nota: b.nota });
        guardar(db);
        return responder(res, 200, { lead });
      }

      // GET /leads y /leads/:id
      if (req.method === 'GET' && partes[0] === 'leads') {
        if (!partes[1]) return responder(res, 200, { leads: db.leads });
        const lead = db.leads.find((l) => l.id === partes[1]);
        return lead ? responder(res, 200, { lead }) : responder(res, 404, { error: 'Lead no encontrado' });
      }

      // POST /whatsapp/send — WhatsApp simulado. Bloquea si no hay consentimiento.
      if (req.method === 'POST' && url.pathname === '/whatsapp/send') {
        const b = await leerBody(req);
        const lead = db.leads.find((l) => l.id === b.lead_id);
        if (!lead) return responder(res, 404, { error: 'Lead no encontrado' });
        if (!lead.consentimiento) return responder(res, 403, { error: 'Sin consentimiento para mensajes' });
        const msg = { id: `M${String(db.mensajes.length + 1).padStart(4, '0')}`, lead_id: lead.id, telefono: lead.telefono, plantilla: b.plantilla, texto: b.texto, estado: 'enviado (simulado)', fecha: ahora() };
        db.mensajes.push(msg);
        guardar(db);
        return responder(res, 200, msg);
      }

      // GET /metricas — conteo por etapa (embudo)
      if (req.method === 'GET' && url.pathname === '/metricas') {
        const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, db.leads.filter((l) => l.etapa === e).length]));
        return responder(res, 200, { total: db.leads.length, porEtapa, mensajes: db.mensajes.length });
      }

      // POST /reset — solo para pruebas
      if (req.method === 'POST' && url.pathname === '/reset') {
        guardar({ leads: [], mensajes: [], seq: 0 });
        return responder(res, 200, { ok: true });
      }

      responder(res, 404, { error: 'Ruta no encontrada' });
    } catch (e) {
      responder(res, 500, { error: e.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  crearServidor().listen(port, () => console.log(`CRM simulado en http://localhost:${port}`));
}
