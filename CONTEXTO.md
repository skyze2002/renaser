# Contexto del proyecto RENASER

Este repo contiene la entrega de una prueba técnica de Fernando Montecinos.
Úsalo como contexto antes de modificar cualquier archivo.

## El caso

Una empresa organiza eventos presenciales y quiere escalar su captación de clientes.

Situación inicial:
- 200 contactos disponibles.
- CRM implementado solo en parte.
- Formularios y WhatsApp sin integración completa.
- 4 trabajadores.
- No existe seguimiento sistemático de los interesados.
- Primer objetivo: 30 asistentes reales. Objetivo futuro: 3,000 asistentes.

Restricción: no se puede contratar personal ni desarrollar una plataforma completa desde cero.

Tiempo total: 135 min (≈90 para preguntas 1–6, ≈45 para 7 y 8).
Regla de la prueba: **distinguir siempre lo propuesto de lo construido y probado.**

## Estructura

| Carpeta | Contenido |
|---|---|
| `caso/` | Preguntas 1–6. `respuestas.md` + `prototipo/` (pregunta 4) |
| `investigacion/` | Pregunta 7 (investigación encargada por RENASER) |
| `presentacion/` | Pregunta 8 (presentación a la dirección) |

## Decisiones ya tomadas (preguntas 1–3)

1. **Diagnóstico:** las tres causas son (a) embudo sin seguimiento ni medición,
   (b) datos dispersos entre formularios, WhatsApp y CRM, (c) captación basada en
   una lista finita y trabajo manual.
2. **Arquitectura:** el CRM es la única fuente de verdad; n8n mueve los datos;
   la IA atiende FAQ, califica y resume, con derivación a humanos; las personas cierran.
3. **Priorización:** 24 h = embudo en CRM + importar los 200 + formulario→n8n→CRM +
   pedir WhatsApp Business API. Semana siguiente = recordatorios, agente IA, alertas,
   reporte. Eliminar = Excel paralelo, mensajes sin consentimiento, plataforma propia.

## Convenciones

- Todo en español.
- Tono: directo, en primera persona, sin relleno.
- El prototipo no usa datos reales; el WhatsApp es simulado.
