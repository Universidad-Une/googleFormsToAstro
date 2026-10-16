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
  // Independent snapshot of the actual Forms schema supplied by the owner.
  const types = new Map([
    [723568625, "TEXT"],
    [1546505808, "TEXT"],
    [850160784, "MULTIPLE_CHOICE"],
    [264053788, "TEXT"],
    [60807460, "TEXT"],
    [590824040, "CHECKBOX"],
    [541670431, "MULTIPLE_CHOICE"],
  ]);
  for (const [field, id, type, required] of context.schema) {
    if (required)
      data[field] =
        type === "CHECKBOX"
          ? ["Facebook"]
          : field === "programaAcademico" || type === "LIST"
            ? context.schema.find((row) => row[0] === field)[5][0]
            : type === "MULTIPLE_CHOICE"
              ? context.schema.find((row) => row[0] === field)[5][0]
              : "Prueba";
  }
  Object.assign(data, {
    telefonoContacto: "3311111111",
    correo: "test@example.com",
    edad: "25 - 34",
  });
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
          hasOtherOption: () => id === 590824040,
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
test("Other is accepted for media", () => {
  const f = fixture();
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
    { correo: "nombre@dominio" },
    { correo: "nombre@@dominio.com" },
    { telefonoContacto: "123456789" },
    { telefonoContacto: "abcdefghij" },
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

test("stores all 7 answers under the updated IDs", () => {
  const f = fixture();
  f.data.telefonoContacto = "3311111111";
  f.data.telefono = "3322222222";
  f.data.compromiso = "No";
  assert.equal(f.send().success, true);
  assert.equal(f.responses.length, 7);
  const answers = Object.fromEntries(
    f.responses.map(({ id, value }) => [id, value]),
  );
  assert.deepEqual(
    Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b),
    [
      723568625, 1546505808, 850160784, 264053788, 60807460, 590824040,
      541670431,
    ].sort((a, b) => a - b),
  );
  assert.equal(answers[723568625], f.data.programaAcademico);
  assert.equal(answers[264053788], "3311111111");
  assert.equal(answers[125653479], undefined);
  assert.equal(answers[345860602], undefined);
  assert.equal(answers[60807460], "test@example.com");
  assert.equal(answers[850160784], "25 - 34");
  assert.deepEqual(Array.from(answers[590824040]), ["Facebook"]);
  assert.equal(answers[541670431], "No");
});

test("sends every exact age choice and rejects the previous text ranges", () => {
  for (const edad of ["18 - 24", "25 - 34", "35 - 44", "45 - 54", "55 +"]) {
    const f = fixture();
    f.data.edad = edad;
    assert.equal(f.send().success, true);
    assert.equal(f.responses.find(({ id }) => id === 850160784).value, edad);
  }
  for (const edad of ["26", "25 a 34 años", "Menos de 18 años", "Otro"]) {
    const f = fixture();
    f.data.edad = edad;
    assert.equal(f.send().error, "INVALID_DATA");
    assert.equal(f.count(), 0);
  }
});
