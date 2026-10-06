# Receptor de inscripción

Astro recibe JSON en `POST /api/forms/inscripcion`, valida los datos y llama a Apps Script desde el servidor. El contrato contiene las 11 preguntas actualizadas; todas son obligatorias.

## Configuración

1. Copia `apps-script/recibir-inscripcion.js` en un archivo `.gs` del proyecto Apps Script. Conserva un solo `doPost`.
2. Configura las propiedades `FORM_ID` (ID del editor entre `/forms/d/` y `/edit`) y `SHARED_SECRET` (mínimo 32 caracteres).
3. Implementa como aplicación web, ejecutada con tu cuenta y con acceso Cualquier persona.
4. Configura en Astro `GOOGLE_FORMS_SCRIPT_URL` con la URL `/exec` y `GOOGLE_FORMS_SHARED_SECRET` con el mismo secreto.
5. Después de actualizar el código, publica una versión nueva de la implementación de Apps Script y reinicia Astro.

Desarrollo: `npm run dev -- --background`. Compilación: `npm run build`.

## Preguntas y referencias

| Campo JSON          | ID         | Pregunta                                                                                                 | Tipo            |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | --------------- |
| programaAcademico   | 723568625  | Programa Académico de interés:                                                                           | TEXT            |
| apellidoPaterno     | 93731934   | Apellido paterno                                                                                         | TEXT            |
| apellidoMaterno     | 1095444030 | Apellido materno                                                                                         | TEXT            |
| nombres             | 1546505808 | Nombre(s)                                                                                                | TEXT            |
| genero              | 2083931233 | Genero                                                                                                   | MULTIPLE_CHOICE |
| edad                | 850160784  | Edad                                                                                                     | TEXT            |
| telefonoContacto    | 264053788  | Teléfono                                                                                                 | TEXT            |
| correo              | 60807460   | Correo electrónico                                                                                       | TEXT            |
| ciudadEstado        | 1996820764 | Ciudad y Estado                                                                                          | TEXT            |
| mediosSeleccionados | 590824040  | Medio por el que te enteraste de la Universidad Nos gustaría llegar a más personas, ¿Cómo llegamos a ti? | CHECKBOX        |
| compromiso          | 541670431  | Compromiso institucional y autorización de datos (texto completo en el contrato)                         | MULTIPLE_CHOICE |

Los IDs son IDs de preguntas de Apps Script, no parámetros `entry.*`. El único Teléfono se envía en `telefonoContacto` con ID `264053788`; la referencia anterior `125653479` se descarta.

- Texto: strings de hasta 500 caracteres; correo válido y edad de 0 a 120.
- Género: `Mujer`, `Hombre`, `Prefiero no decirlo` o una respuesta personalizada de Otro.
- Medios: lista obligatoria de una o más selecciones, sin duplicados. Catálogo: Facebook, Instragram, Televisión, Radio, Espectacular, Recomendación, Sesión, Expos o Ferias, Volanteo o Activación, Soy Ex alumno. Se permite una respuesta adicional de Otro (máximo diez valores). `Instragram` conserva la escritura de Forms.
- Compromiso: `Sí` o `No`; ambas respuestas son válidas.
- Los campos anteriores sin pregunta de destino se descartan.
- El PDF descarga un resumen de las nuevas preguntas y respuestas; ya no usa las coordenadas de la plantilla anterior ni solicita firma. Descargarlo no registra una respuesta en Forms.

## Ejemplo de petición del servidor

```json
{
  "secret": "CLAVE_SOLO_DEL_SERVIDOR",
  "data": {
    "programaAcademico": "Licenciatura",
    "apellidoPaterno": "Prueba",
    "apellidoMaterno": "Prueba",
    "nombres": "Registro de prueba",
    "genero": "Mujer",
    "edad": "26",
    "telefonoContacto": "3311111111",
    "correo": "prueba@example.com",
    "ciudadEstado": "Guadalajara, Jalisco",
    "mediosSeleccionados": ["Facebook"],
    "compromiso": "Sí"
  }
}
```

Una petición válida al receptor desplegado crea una respuesta real. No se envía el secreto desde el navegador.

## Respuestas y verificación

Éxito: `{ "success": true, "responseId": "..." }` después de `submit()`. Errores: `INVALID_DATA` con `fields`, `INVALID_JSON`, `INVALID_REQUEST`, `UNAUTHORIZED`, `SERVER_NOT_CONFIGURED`, `FORM_CLOSED`, `FORM_SCHEMA_CHANGED` o `FORM_SUBMISSION_FAILED`. Astro interpreta el JSON del receptor para producir el código HTTP.

No hay reintentos automáticos. Ante un timeout comprueba si se guardó antes de repetir.

Pruebas: `node --test src/server/inscripcion.test.mjs apps-script/recibir-inscripcion.test.mjs`. Usan servicios simulados; la recepción real en Forms y su fila en Sheets requieren comprobar la implementación publicada.
