import { test } from "node:test";
import assert from "node:assert/strict";
import { CAMPOS_INSCRIPCION, validarInscripcion } from "./inscripcion.js";
const valid = () => ({
  programaAcademico: "Lic. en Administración",
  apellidoPaterno: "Pérez",
  apellidoMaterno: "López",
  nombres: "Ana",
  genero: "Mujer",
  edad: "26",
  telefonoContacto: "3311111111",
  correo: "prueba@example.com",
  ciudadEstado: "Guadalajara, Jalisco",
  mediosSeleccionados: ["Facebook"],
  compromiso: "Sí",
});
test("conserva las nuevas respuestas y elimina campos anteriores", () => {
  const { data, errors } = validarInscripcion({
    ...valid(),
    calleNumero: "omitida",
    secret: "omitido",
  });
  assert.deepEqual(errors, {});
  assert.deepEqual(data, valid());
  assert.equal(CAMPOS_INSCRIPCION.length, 11);
});
test("todos los campos son obligatorios", () => {
  for (const [field, , type] of CAMPOS_INSCRIPCION) {
    assert.equal(
      validarInscripcion({
        ...valid(),
        [field]: type === "CHECKBOX" ? [] : " ",
      }).errors[field],
      "REQUIRED",
    );
  }
});
test("admite Otro, nueve medios más Otro y ambas respuestas de compromiso", () => {
  const opciones = CAMPOS_INSCRIPCION.find(
    ([field]) => field === "mediosSeleccionados",
  )[5];
  for (const compromiso of ["Sí", "No"])
    assert.deepEqual(
      validarInscripcion({
        ...valid(),
        genero: "Personalizado",
        mediosSeleccionados: [...opciones, "Otro medio"],
        compromiso,
      }).errors,
      {},
    );
});
test("rechaza listas inválidas, duplicados, varios Otros y compromiso desconocido", () => {
  for (const mediosSeleccionados of [
    "Facebook",
    ["Facebook", "Facebook"],
    ["Otro A", "Otro B"],
    [" "],
  ])
    assert.ok(
      validarInscripcion({ ...valid(), mediosSeleccionados }).errors
        .mediosSeleccionados,
    );
  assert.equal(
    validarInscripcion({ ...valid(), compromiso: "Tal vez" }).errors.compromiso,
    "INVALID_OPTION",
  );
  assert.equal(
    validarInscripcion({ ...valid(), correo: "incorrecto" }).errors.correo,
    "INVALID_EMAIL",
  );
  assert.equal(
    validarInscripcion({ ...valid(), edad: "121" }).errors.edad,
    "INVALID_AGE",
  );
  assert.ok(validarInscripcion(null).errors.formulario);
});
