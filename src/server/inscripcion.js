// Contrato compartido por la interfaz y el servidor Astro.
export const CAMPOS_INSCRIPCION = [
  [
    "programaAcademico",
    723568625,
    "TEXT",
    true,
    "Programa Académico de interés",
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
        (campo === "programaAcademico" ||
          tipo === "MULTIPLE_CHOICE" ||
          tipo === "LIST") &&
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

export function validarInscripcion(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { data: {}, errors: { formulario: "INVALID_DATA" } };
  const { valores, errores } = validarDatosInscripcion_(input);
  return { data: valores, errors: errores };
}
