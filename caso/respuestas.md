# Caso — Respuestas (preguntas 1 a 6)

> Las preguntas 1–3 son **propuesta** (análisis). La pregunta 4 está **construida y probada**: ver [`prototipo/`](prototipo/).

## 1. Diagnóstico

Hoy, de 200 contactos salen 30 asistentes (15%). Para llegar a 3,000 harían falta unos 20,000 contactos, y eso no lo pueden atender 4 personas a mano. El problema no es de esfuerzo, sino de proceso.

**1. No hay seguimiento ni medición del embudo.** Nadie sabe en qué etapa está cada interesado ni dónde se pierde.
Datos: etapa actual de los 200 contactos; tiempo hasta la primera respuesta; % sin segundo mensaje; asistentes reales vs. inscritos en eventos anteriores.

**2. Los datos están dispersos.** Formularios, WhatsApp y CRM no están conectados: leads perdidos, duplicados y sin atribución por canal.
Datos:
- Conciliación de leads por fuente: formularios y conversaciones de WhatsApp de 7 días, cruzados contra las altas en el CRM (la diferencia es la tasa de fuga).
- Calidad de datos: % de duplicados (por teléfono o correo) y de registros con campos obligatorios vacíos o sin origen.
- Tipo de cuenta de WhatsApp (personal, Business App o Business API); solo la API permite integración por webhooks.

**3. La captación depende de una lista finita y de trabajo manual.** Los 200 contactos se acaban y 4 personas tienen un techo de capacidad.
Datos: origen y costo de los 200 contactos; horas semanales por persona en captación; canales probados y costo por asistente; presupuesto; si los 3,000 son en uno o varios eventos.

**Orden:** medir → unificar datos → captar más.

## 2. Arquitectura mínima

El CRM guarda, n8n mueve, la IA conversa y las personas cierran.

- **Reutilizo:** el CRM actual, los formularios (con webhook), el número de WhatsApp (migrado a Business API), los 200 contactos limpios y los 4 trabajadores enfocados en leads calientes.
- **n8n:** captura con deduplicación, mensajes por cambio de etapa (confirmación y recordatorios 7d/1d/2h), alertas por leads sin respuesta y reporte diario.
- **Agentes de IA:** FAQ 24/7, calificación y resumen de conversaciones. No negocian precios ni confirman pagos; derivan a una persona.
- **CRM:** única fuente de verdad: ficha, embudo, historial, consentimiento (Ley 29733), check-in de asistencia y métricas.

## 3. Priorización

- **24 horas:** etapas del embudo en el CRM; importar los 200; formulario → n8n → CRM; contactar a los 200 con guion; pedir acceso a WhatsApp Business API.
- **Semana siguiente:** WhatsApp API + recordatorios, agente de IA, alertas, reporte diario.
- **Eliminar:** Excel paralelo, mensajes masivos sin consentimiento, funciones del CRM sin uso, cualquier plataforma o chatbot propio.

## 4. Prototipo funcional

Ver [`prototipo/README.md`](prototipo/README.md).

## 5. Pendiente

## 6. Pendiente
