// IDs de preguntas de Apps Script, no parámetros entry.*.
const CAMPOS_INSCRIPCION = [
  [
    "programaAcademico",
    723568625,
    "TEXT",
    true,
    "Programa Académico de interés:",
    [
      "Bachillerato en Línea",
      "Lic. en Administración",
      "Lic. en Ad. de Sistemas de Información",
      "Lic. en Contaduría",
      "Lic. Comercio y Negocios Globales",
      "Lic. en Comunicación",
      "Lic. en Derecho",
      "Lic. Diseño Gráfico",
      "Lic. Educación",
      "Ing. Industrial",
      "Lic. en Mercadotecnia",
      "Lic. Psicología",
      "Maestría en Administración de Negocios",
      "Maestría en Educación",
    ],
  ],
  ["apellidoPaterno", 93731934, "TEXT", true, "Apellido paterno"],
  ["apellidoMaterno", 1095444030, "TEXT", true, "Apellido materno"],
  ["nombres", 1546505808, "TEXT", true, "Nombre(s)"],
  [
    "genero",
    2083931233,
    "MULTIPLE_CHOICE",
    true,
    "Genero",
    ["Mujer", "Hombre", "Prefiero no decirlo"],
    true,
  ],
  ["edad", 850160784, "TEXT", true, "Edad"],
  ["telefonoContacto", 264053788, "TEXT", true, "Teléfono"],
  ["correo", 60807460, "TEXT", true, "Correo electrónico"],
  ["ciudadEstado", 1996820764, "TEXT", true, "Ciudad y Estado"],
  [
    "mediosSeleccionados",
    590824040,
    "CHECKBOX",
    true,
    "Medio por el que te enteraste de la Universidad \nNos gustaría llegar a más personas, ¿Cómo llegamos a ti?",
    [
      "Facebook",
      "Instragram",
      "Televisión",
      "Radio",
      "Espectacular",
      "Recomendación",
      "Sesión, Expos o Ferias",
      "Volanteo o Activación",
      "Soy Ex alumno",
    ],
    true,
  ],
  [
    "compromiso",
    541670431,
    "MULTIPLE_CHOICE",
    true,
    "Como alumno de CENTRO UNIVERSITARIO UNE A.C., me comprometo a respetar y cumplir con el reglamento institucional; Así mismo autorizo a CENTRO UNIVERSITARIO UNE A.C. al uso interno y con fines de inscribirme como alumno para el uso de mis datos personales; Entiendo que el llenado de esta solicitud no garantiza mi inscripción y que será válida hasta que realice el pago de la primer parcialidad que corresponde al ciclo escolar. https://une-enlinea.com/",
    ["Sí", "No"],
    false,
  ],
];
function respuestaJson_(contenido) {
  return ContentService.createTextOutput(JSON.stringify(contenido)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function objeto_(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function validarDatosInscripcion_(datos) {
  const valores = {};
  const errores = {};
  CAMPOS_INSCRIPCION.forEach(
    ([campo, , tipo, obligatorio, , opciones = [], permiteOtro = false]) => {
      const original = datos[campo];
      if (tipo === "CHECKBOX") {
        const lista = original === undefined ? [] : original;
        if (
          !Array.isArray(lista) ||
          lista.length > opciones.length + (permiteOtro ? 1 : 0) ||
          lista.some(
            (v) => typeof v !== "string" || !v.trim() || v.length > 500,
          )
        ) {
          errores[campo] = "INVALID_SELECTIONS";
          return;
        }
        valores[campo] = lista.map((v) => v.trim());
        if (obligatorio && !lista.length) errores[campo] = "REQUIRED";
        else if (new Set(valores[campo]).size !== lista.length)
          errores[campo] = "DUPLICATE_SELECTION";
        else if (
          valores[campo].filter((v) => !opciones.includes(v)).length >
          (permiteOtro ? 1 : 0)
        )
          errores[campo] = "INVALID_OPTION";
        return;
      }
      if (original !== undefined && typeof original !== "string") {
        errores[campo] = "EXPECTED_STRING";
        return;
      }
      const valor = (original || "").trim();
      valores[campo] = valor;
      if (obligatorio && !valor) errores[campo] = "REQUIRED";
      else if (valor.length > 500) errores[campo] = "TOO_LONG";
      else if (
        (campo === "programaAcademico" || tipo === "MULTIPLE_CHOICE" || tipo === "LIST") &&
        !permiteOtro &&
        !opciones.includes(valor)
      )
        errores[campo] = "INVALID_OPTION";
    },
  );
  if (valores.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.correo))
    errores.correo = "INVALID_EMAIL";
  if (
    valores.edad &&
    (!/^\d{1,3}$/.test(valores.edad) || Number(valores.edad) > 120)
  )
    errores.edad = "INVALID_AGE";
  return { valores, errores };
}

function doPost(e) {
  const inicio = Date.now();
  try {
    const propiedades = PropertiesService.getScriptProperties();
    const formId = propiedades.getProperty("FORM_ID");
    const secreto = propiedades.getProperty("SHARED_SECRET");
    if (!formId || !secreto || secreto.length < 32) {
      return respuestaJson_({ success: false, error: "SERVER_NOT_CONFIGURED" });
    }
    const contenido = e && e.postData && e.postData.contents;
    if (typeof contenido !== "string" || contenido.length > 32768) {
      return respuestaJson_({ success: false, error: "INVALID_REQUEST" });
    }
    let body;
    try {
      body = JSON.parse(contenido);
    } catch (_) {
      return respuestaJson_({ success: false, error: "INVALID_JSON" });
    }
    if (
      !objeto_(body) ||
      typeof body.secret !== "string" ||
      body.secret !== secreto
    ) {
      return respuestaJson_({ success: false, error: "UNAUTHORIZED" });
    }
    if (!objeto_(body.data)) {
      return respuestaJson_({ success: false, error: "INVALID_DATA" });
    }
    const { valores, errores } = validarDatosInscripcion_(body.data);
    if (Object.keys(errores).length) {
      return respuestaJson_({
        success: false,
        error: "INVALID_DATA",
        fields: errores,
      });
    }

    // En una aplicación web se abre por ID: no depender de getActiveForm().
    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) {
      return respuestaJson_({ success: false, error: "FORM_CLOSED" });
    }
    const respuestas = [];
    for (const [campo, id, tipo, obligatorio] of CAMPOS_INSCRIPCION) {
      const item = form.getItemById(id);
      if (!item || String(item.getType()) !== tipo) {
        return respuestaJson_({
          success: false,
          error: "FORM_SCHEMA_CHANGED",
          schema: { field: campo, id, expected: tipo, actual: item ? String(item.getType()) : "MISSING" },
        });
      }
      const pregunta =
        tipo === "LIST"
          ? item.asListItem()
          : tipo === "TEXT"
          ? item.asTextItem()
          : tipo === "DATE"
            ? item.asDateItem()
            : tipo === "CHECKBOX"
              ? item.asCheckboxItem()
              : item.asMultipleChoiceItem();
      const valor = valores[campo];
      if (valor === "" || (Array.isArray(valor) && valor.length === 0)) {
        if (obligatorio || pregunta.isRequired()) errores[campo] = "REQUIRED";
        continue;
      }
      if (tipo === "CHECKBOX" || tipo === "MULTIPLE_CHOICE" || tipo === "LIST") {
        const opciones = pregunta
          .getChoices()
          .map((opcion) => opcion.getValue());
        const seleccionadas = Array.isArray(valor) ? valor : [valor];
        const otras = seleccionadas.filter(
          (opcion) => !opciones.includes(opcion),
        );
        if (otras.length && (tipo === "LIST" || !pregunta.hasOtherOption() || otras.length > 1)) {
          errores[campo] = "INVALID_OPTION";
          continue;
        }
      }
      respuestas.push(pregunta.createResponse(valor));
    }
    if (Object.keys(errores).length) {
      return respuestaJson_({
        success: false,
        error: "INVALID_DATA",
        fields: errores,
      });
    }
    const respuesta = form.createResponse();
    respuestas.forEach((itemResponse) =>
      respuesta.withItemResponse(itemResponse),
    );
    const enviada = respuesta.submit();
    console.log(
      JSON.stringify({
        form: "inscripcion",
        status: "success",
        duration: Date.now() - inicio,
      }),
    );
    return respuestaJson_({ success: true, responseId: enviada.getId() });
  } catch (_) {
    // No registrar el payload, el secreto ni excepciones con datos personales.
    console.error(
      JSON.stringify({
        form: "inscripcion",
        status: "error",
        duration: Date.now() - inicio,
      }),
    );
    return respuestaJson_({ success: false, error: "FORM_SUBMISSION_FAILED" });
  }
}
