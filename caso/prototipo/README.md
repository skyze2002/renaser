# Pregunta 4 — Prototipo funcional

Flujo: **registro ficticio → almacenamiento → clasificación → seguimiento de prueba → estado actualizado.**

Está construido de dos formas con la misma lógica:

- `n8n/renaser-flujo.json`: el workflow de n8n que pide la prueba.
- `flujo/pipeline.js`: el mismo flujo en Node, para ejecutarlo y testearlo sin instalar n8n.

Ambos hablan con `crm-mock/server.js`, un CRM simulado (API HTTP sin dependencias) que hace de
única fuente de verdad y también simula el envío por WhatsApp.

## Cómo ejecutarlo

Requiere Node 20+. No tiene dependencias.

```bash
cd caso/prototipo
npm test        # 5 pruebas automáticas
npm run demo    # procesa 5 registros ficticios y muestra el estado final del CRM
```

Con n8n:

```bash
npm run crm                                 # CRM simulado en http://localhost:3001
n8n import:workflow --input=n8n/renaser-flujo.json
# activar el workflow y enviar un registro:
curl -X POST http://localhost:5678/webhook/renaser/lead \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana Quispe","telefono":"987654321","email":"ana@ejemplo.com","origen":"referido","mensaje":"Quiero inscribirme, ¿precio?","consentimiento":true}'
```

## Qué hace cada paso (nodos de n8n)

| # | Nodo | Qué hace | Configuración clave |
|---|---|---|---|
| 1 | Registro (Webhook) | Recibe el registro del formulario o de WhatsApp | `POST /webhook/renaser/lead`, responde con el resultado del último nodo |
| 2 | Guardar en CRM | Crea el lead o lo actualiza si ya existe | `POST /leads`. El CRM normaliza el teléfono (`+51 987-654-321` = `987654321`) y deduplica por teléfono o correo |
| 3 | Clasificar | Calcula un puntaje de 0 a 100 y lo traduce a caliente (≥60), tibio (30–59) o frío (<30) | Reglas por origen e intención del mensaje. Decide la acción: `enviar`, `sin_consentimiento` o `protegido` |
| 4 | Guardar clasificación | Registra puntaje, clasificación y motivos en el CRM | `PATCH /leads/:id`. Pasa a `clasificado` solo si estaba en `nuevo` |
| 5 | ¿Qué hacer? (Switch) | Enruta según la acción | 3 salidas |
| 6a | Seguimiento WhatsApp | Envía el mensaje de la plantilla que corresponde a la clasificación | `POST /whatsapp/send` (simulado). El CRM rechaza el envío si no hay consentimiento |
| 7a | Actualizar estado | Caliente → `requiere_humano` con responsable asignado; tibio/frío → `contactado` | `PATCH /leads/:id` con el id del mensaje en el historial |
| 6b | Marcar sin consentimiento | No envía nada y deja el lead en `pendiente_consentimiento` | Cumplimiento de la Ley 29733 y de las políticas de WhatsApp |
| 6c | Alertar al responsable | Si el lead ya lo atiende una persona, no se le envía un mensaje automático | Evita que el bot interrumpa una venta en curso |

## Decisiones de criterio

- **Reglas en vez de IA para clasificar.** Son deterministas, explicables, gratuitas y fáciles de auditar.
  El nodo 3 puede reemplazarse por un agente de IA que devuelva la misma salida (`puntaje`, `clasificacion`, `motivos`).
- **Un lead nunca retrocede.** Si un lead caliente vuelve a escribir "hola", conserva su puntaje y su etapa.
- **El CRM valida, no el flujo.** La deduplicación y el bloqueo por consentimiento están en el CRM; así,
  aunque otro flujo o una persona lo llame mal, la regla se cumple.
- **Todo cambio deja historial** en el CRM, para medir el embudo después.

## Errores que encontré al probarlo y corregí

1. Un lead caliente que volvía a escribir se degradaba a tibio y perdía al vendedor asignado.
2. "Solo información por *ahora*" se detectaba como pregunta de horario (la regla `hora` coincidía dentro de "ahora").
3. "¿Ya puedo pagar?" no se detectaba como intención de pago.

Cada uno tiene ahora su prueba en `test/flujo.test.js`.

## Qué está construido y probado, y qué no

| Construido y probado | Propuesto, no probado aquí |
|---|---|
| CRM simulado, flujo en Node, 5 pruebas automáticas, demo con 5 registros | Conexión a un CRM real (HubSpot, Zoho, etc.) |
| Workflow de n8n (ver resultado de la prueba abajo) | WhatsApp Business API real (el envío es simulado) |
| Deduplicación, consentimiento, etapas protegidas | Clasificación con IA |

### Resultado de la prueba en n8n

Probado en **n8n 2.43.5** (Node 24): importado con `n8n import:workflow`, activado y ejecutado
enviando los mismos 5 registros ficticios de la demo al webhook. Estado final del CRM:

| id | nombre | clasificación | puntaje | etapa | responsable | último evento |
|---|---|---|---|---|---|---|
| L0001 | Ana Quispe | caliente | 100 | requiere_humano | equipo_ventas | alerta_responsable |
| L0002 | Luis Ramos | tibio | 35 | contactado | | seguimiento_enviado |
| L0003 | Carla Díaz | frío | 5 | contactado | | seguimiento_enviado |
| L0004 | Pedro Soto | tibio | 50 | pendiente_consentimiento | | bloqueo_consentimiento |

5 registros → 4 leads (Ana escribió dos veces y se deduplicó), 3 mensajes enviados (Pedro no tenía
consentimiento y a Ana no se le volvió a escribir porque ya la atiende una persona).
El resultado es idéntico al de `npm run demo`.

> Nota: n8n 2.x requiere Node 24 o superior. El CRM simulado y la versión en Node funcionan con Node 20+.
