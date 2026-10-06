# Formulario de inscripción

Aplicación web para capturar datos de inscripción de aspirantes de Universidad UNE. Permite registrar la información en Google Forms mediante Astro y Google Apps Script, además de generar un PDF de inscripción desde el navegador.

## Funcionalidades

- Captura de las 11 preguntas actuales de Google Forms, todas obligatorias.
- Género con Otro, medios con selección múltiple y Otro, y compromiso institucional con Sí o No.
- Descarga de un PDF con las nuevas preguntas y respuestas.
- Validación de datos en el navegador y en el servidor.
- Envío a Google Forms con mensajes de progreso, confirmación y error.
- Redirección a `/gracias` cuando el servidor confirma el registro.

La descarga del PDF y el envío del formulario son acciones independientes. El PDF no se guarda en Google Forms; el receptor registra únicamente los campos con una pregunta de destino configurada.

## Tecnologías

| Tecnología              | Uso                                                  |
| ----------------------- | ---------------------------------------------------- |
| Astro                   | Páginas, componentes y endpoint de inscripción.      |
| Adaptador Node de Astro | Ejecución del servidor en modo `standalone`.         |
| Tailwind CSS            | Estilos de la interfaz.                              |
| pdf-lib                 | Generación del PDF en el navegador.                  |
| Google Apps Script      | Validación y creación de respuestas en Google Forms. |

Las versiones y dependencias están definidas en [package.json](./package.json).

## Requisitos

- Node.js **22.12.0 o superior**, según `package.json`.
- npm.
- Para registrar inscripciones: acceso al formulario de Google y a un proyecto de Apps Script con el receptor desplegado como aplicación web.

## Instalación y configuración

### 1. Instalar dependencias

Desde la raíz del proyecto:

```sh
npm ci
```

### 2. Configurar el receptor de Google Forms

Sigue la [guía del receptor de inscripción](./apps-script/README.md) para configurar `FORM_ID` y `SHARED_SECRET` en Apps Script, publicar la aplicación web y obtener su URL terminada en `/exec`.

### 3. Crear las variables de entorno

Crea un archivo `.env` en la raíz y sustituye estos valores de ejemplo por los de tu implementación:

```dotenv
GOOGLE_FORMS_SCRIPT_URL=https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec
GOOGLE_FORMS_SHARED_SECRET=REEMPLAZAR_POR_UNA_CLAVE_ALEATORIA_DE_AL_MENOS_32_CARACTERES
```

| Variable                     | Descripción                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `GOOGLE_FORMS_SCRIPT_URL`    | URL de la aplicación web de Apps Script terminada en `/exec`.               |
| `GOOGLE_FORMS_SHARED_SECRET` | Clave de al menos 32 caracteres, idéntica a `SHARED_SECRET` en Apps Script. |

Estas variables pertenecen al servidor. El archivo `.env` está excluido de Git; no publiques la clave ni la incluyas en el código del navegador. Reinicia el servidor después de cambiar la configuración.

Puedes revisar la interfaz sin configurar el receptor, pero el envío de una inscripción válida devolverá un error de servicio no configurado.

### 4. Iniciar el entorno de desarrollo

Ejecuta el servidor en segundo plano:

```sh
npm run dev -- --background
```

Abre la dirección indicada por el servidor, normalmente `http://localhost:4321`.

## Flujo de inscripción

1. El aspirante completa el formulario en `/` o `/formulario-inscripcion`.
2. El navegador envía los datos como JSON a `POST /api/forms/inscripcion`.
3. Astro valida los campos y conserva las opciones del catálogo de Google Forms.
4. El servidor envía los datos y la clave compartida a Apps Script.
5. Apps Script crea la respuesta en Google Forms y devuelve la confirmación.
6. Astro confirma el resultado al navegador, que redirige a `/gracias`.

El receptor no escribe directamente en Google Sheets. El registro en una hoja depende de la vinculación del formulario con Sheets.

Para generar el PDF, el navegador utiliza las plantillas de `public/pdfs/`, rellena los datos e incorpora la firma capturada. Descargar el documento no confirma que la inscripción se haya enviado.

## Estructura del proyecto

```text
apps-script/
  README.md                        Guía de configuración del receptor
  recibir-inscripcion.gs           Receptor de Google Apps Script
  recibir-inscripcion.test.mjs     Pruebas del receptor
public/
  pdfs/                            Plantillas PDF servidas al navegador
src/
  assets/                          Recursos importados por los componentes
  components/
    inscripcion/Form.astro         Formulario, envío y generación de PDF
    layout/header.astro            Encabezado
  layouts/Layout.astro             Plantilla general de las páginas
  pages/
    index.astro                    Formulario en la ruta principal
    formulario-inscripcion.astro   Ruta alternativa del formulario
    gracias.astro                  Página de agradecimiento
    api/forms/inscripcion.ts        Endpoint del servidor
  server/
    inscripcion.js                 Validación y adaptación de campos
    inscripcion.test.mjs           Pruebas de validación
  styles/global.css                Estilos globales
astro.config.mjs                   Configuración de Astro, Node y Tailwind
package.json                       Dependencias y comandos
```

Las rutas de la aplicación se encuentran en `src/pages/`. Los archivos `.astro` de las carpetas raíz `inscripcion/` y `pdfs/` no crean rutas. Las plantillas que consume el navegador son las de `public/pdfs/`.

## Comandos

Ejecuta los comandos desde la raíz del proyecto:

| Comando                       | Descripción                                        |
| ----------------------------- | -------------------------------------------------- |
| `npm ci`                      | Instala las dependencias del archivo de bloqueo.   |
| `npm run dev -- --background` | Inicia el servidor de desarrollo en segundo plano. |
| `npm run astro -- dev status` | Consulta el estado del servidor.                   |
| `npm run astro -- dev logs`   | Muestra los registros del servidor.                |
| `npm run astro -- dev stop`   | Detiene el servidor de desarrollo.                 |
| `npm run build`               | Genera la compilación de producción en `dist/`.    |
| `npm run preview`             | Previsualiza la compilación localmente.            |
| `npm run format:check`        | Revisa el formato del proyecto con Prettier.       |
| `npm run format`              | Aplica el formato de Prettier al proyecto.         |

## Pruebas

Ejecuta las pruebas de validación y del receptor con el ejecutor de Node.js:

```sh
node --test src/server/inscripcion.test.mjs apps-script/recibir-inscripcion.test.mjs
```

Las pruebas utilizan servicios simulados. La verificación de una respuesta real en Google Forms y de su fila en Sheets sigue pendiente, según la documentación del receptor.

## Producción

Compila la aplicación:

```sh
npm run build
```

Para ejecutarla localmente con las variables del archivo `.env`:

```sh
node --env-file=.env dist/server/entry.mjs
```

En el alojamiento, configura ambas variables de entorno y ejecuta:

```sh
node dist/server/entry.mjs
```

El despliegue requiere un entorno Node.js para atender el endpoint de inscripción. Subir únicamente archivos estáticos no permite procesar los envíos.

## Mantenimiento y consideraciones

- **Campos y opciones:** mantén sincronizados el formulario, `src/server/inscripcion.js`, el receptor de Apps Script y las preguntas de Google Forms. El contrato actual y la tabla de IDs están en `apps-script/README.md`.
- **PDF:** el generador de `Form.astro` crea un resumen de las preguntas actuales. Las plantillas anteriores se conservan en `public/pdfs/` como archivos de referencia.
- **Envíos sin confirmación:** no hay reintentos automáticos ni garantía de deduplicación. Si ocurre un timeout, verifica si la respuesta se guardó antes de repetir el envío.
- **Cambios en Apps Script:** publica una nueva versión de la implementación después de modificar el receptor.

Consulta la [documentación del receptor](./apps-script/README.md) para conocer el contrato de datos, los campos admitidos y los errores de la integración.
