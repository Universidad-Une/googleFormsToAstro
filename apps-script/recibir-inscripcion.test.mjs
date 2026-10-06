import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  new URL("./recibir-inscripcion.js", import.meta.url),
  "utf8",
);
function fixture() {
  let submissions = 0;
  const responses = [];
  const context = {
    console: { log() {}, error() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) =>
          key === "FORM_ID" ? "form-test" : "s".repeat(32),
      }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
  };
  runInNewContext(source + "\nthis.schema = CAMPOS_INSCRIPCION;", context);
  const data = {};
  const types = new Map();
  for (const [field, id, type, required] of context.schema) {
    types.set(id, type);
    if (required)
      data[field] =
        type === "CHECKBOX"
          ? ["Facebook"]
          : field === "programaAcademico" || type === "LIST"
            ? context.schema.find((row) => row[0] === field)[5][0]
          : type === "MULTIPLE_CHOICE"
            ? field === "compromiso"
              ? "Sí"
              : "Mujer"
            : "Prueba";
  }
  Object.assign(data, { correo: "test@example.com", edad: "26" });
  context.FormApp = {
    openById: () => ({
      isAcceptingResponses: () => true,
      getItemById: (id) => {
        const question = {
          isRequired: () => false,
          getChoices: () =>
            context.schema
              .find((row) => row[1] === id)[5]
              ?.map((value) => ({ getValue: () => value })) || [],
          hasOtherOption: () => [2083931233, 590824040].includes(id),
          createResponse: (value) => ({ id, value }),
        };
        return {
          getType: () => types.get(id),
          asTextItem: () => question,
          asListItem: () => ({ ...question, hasOtherOption: undefined }),
          asDateItem: () => question,
          asMultipleChoiceItem: () => question,
          asCheckboxItem: () => question,
        };
      },
      createResponse: () => ({
        withItemResponse(response) {
          responses.push(response);
        },
        submit() {
          submissions++;
          return { getId: () => "response-test" };
        },
      }),
    }),
  };
  return {
    data,
    responses,
    send: (secret = "s".repeat(32)) =>
      context.doPost({
        postData: { contents: JSON.stringify({ secret, data }) },
      }),
    raw: (contents) => context.doPost({ postData: { contents } }),
    count: () => submissions,
  };
}

test("new questions submit once with the current phone", () => {
  const f = fixture();
  assert.equal(f.send().success, true);
  assert.equal(f.count(), 1);
});
test("Other is accepted for gender and media", () => {
  const f = fixture();
  f.data.genero = "Personalizado";
  f.data.mediosSeleccionados = ["Facebook", "Medio personalizado"];
  assert.equal(f.send().success, true);
});
test("invalid and missing responses never submit", () => {
  for (const patch of [
    { programaAcademico: "Programa desconocido" },
    { mediosSeleccionados: [] },
    { mediosSeleccionados: ["Facebook", "Facebook"] },
    { mediosSeleccionados: ["Otro A", "Otro B"] },
    { compromiso: "Tal vez" },
    { nombres: "" },
    { correo: "invalid" },
    { mediosSeleccionados: "Facebook" },
  ]) {
    const f = fixture();
    Object.assign(f.data, patch);
    assert.equal(f.send().error, "INVALID_DATA");
    assert.equal(f.count(), 0);
  }
});
test("unauthorized and malformed requests never submit", () => {
  const f = fixture();
  assert.equal(f.send("bad").error, "UNAUTHORIZED");
  assert.equal(f.raw("{").error, "INVALID_JSON");
  assert.equal(f.count(), 0);
});

test("stores all 11 answers under the updated IDs", () => {
  const f = fixture();
  f.data.telefonoContacto = "3311111111";
  f.data.telefono = "3322222222";
  f.data.compromiso = "No";
  assert.equal(f.send().success, true);
  assert.equal(f.responses.length, 11);
  const answers = Object.fromEntries(
    f.responses.map(({ id, value }) => [id, value]),
  );
  assert.deepEqual(
    Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b),
    [
      723568625, 93731934, 1095444030, 1546505808, 2083931233, 850160784,
      264053788, 60807460, 1996820764, 590824040, 541670431,
    ].sort((a, b) => a - b),
  );
  assert.equal(answers[723568625], f.data.programaAcademico);
  assert.equal(answers[264053788], "3311111111");
  assert.equal(answers[125653479], undefined);
  assert.equal(answers[345860602], undefined);
  assert.equal(answers[60807460], "test@example.com");
  assert.equal(answers[850160784], "26");
  assert.equal(answers[1996820764], f.data.ciudadEstado);
  assert.equal(answers[2083931233], "Mujer");
  assert.deepEqual(Array.from(answers[590824040]), ["Facebook"]);
  assert.equal(answers[541670431], "No");
});
