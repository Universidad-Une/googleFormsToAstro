import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import logoUrl from "../../assets/logos/une-enlinea.png?url";

export async function generarPdfInscripcion(data, campos) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error("Logo unavailable");
  const logo = await pdf.embedPng(await response.arrayBuffer());
  const blue = rgb(0, 26 / 255, 113 / 255);
  const gray = rgb(0.35, 0.39, 0.44);
  const groups = [
    ["Datos académicos", ["programaAcademico"]],
    ["Datos personales", ["apellidoPaterno", "apellidoMaterno", "nombres", "edad", "genero"]],
    ["Datos de domicilio", ["ciudadEstado"]],
    ["Datos de contacto", ["telefonoContacto", "correo"]],
    ["¿Cómo nos conociste?", ["mediosSeleccionados"]],
    ["Compromiso y autorización", ["compromiso"]],
  ];
  const safe = (text) => Array.from(String(text)).map(char => {
    try { regular.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const wrap = (text, font, size, width) => {
    const lines = [];
    let line = "";
    for (const word of safe(text).split(/\s+/)) {
      if (line && font.widthOfTextAtSize(line + " " + word, size) > width) {
        lines.push(line); line = "";
      }
      for (const char of (line ? " " : "") + word) {
        if (font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line); line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  let page, y;
  function newPage() {
    page = pdf.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.97, 0.98, 0.99) });
    page.drawRectangle({ x: 0, y: 837.89, width: 595.28, height: 4, color: blue });
    const dims = logo.scaleToFit(100, 65);
    page.drawImage(logo, { x: 40, y: 753, ...dims });
    page.drawText("Solicitud de inscripción", { x: 160, y: 782, size: 20, font: bold, color: blue });
    page.drawText("UNE en línea", { x: 160, y: 762, size: 11, font: regular, color: gray });
    y = 728;
  }
  newPage();
  for (const [title, fields] of groups) {
    const lines = [];
    for (const field of fields) {
      const question = campos.find(row => row[0] === field);
      const value = data[field];
      for (const text of wrap(question[4], bold, 10, 483)) lines.push({ text, font: bold, size: 10, color: gray });
      for (const text of wrap(Array.isArray(value) ? value.join(", ") : value || "", regular, 11, 483)) lines.push({ text, font: regular, size: 11, color: blue });
      lines.push(null);
    }
    let offset = 0;
    while (offset < lines.length) {
      const desired = 48 + (lines.length - offset) * 16;
      if (y - Math.min(desired, 650) < 65) newPage();
      const count = Math.min(lines.length - offset, Math.floor((y - 65 - 48) / 16));
      const height = 48 + count * 16;
      page.drawRectangle({ x: 40, y: y - height, width: 515.28, height, color: rgb(1, 1, 1), borderColor: rgb(0.88, 0.9, 0.93), borderWidth: 0.5 });
      page.drawText(title + (offset ? " (continuación)" : ""), { x: 56, y: y - 23, size: 14, font: bold, color: blue });
      page.drawLine({ start: { x: 56, y: y - 33 }, end: { x: 539, y: y - 33 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });
      let baseline = y - 49;
      for (const line of lines.slice(offset, offset + count)) {
        if (line) page.drawText(line.text, { x: 56, y: baseline, font: line.font, size: line.size, color: line.color });
        baseline -= 16;
      }
      offset += count;
      y -= height + 16;
    }
  }
  pdf.getPages().forEach((p, index, pages) => {
    p.drawText("Copia de la solicitud · No acredita la inscripción", { x: 40, y: 33, size: 9, font: regular, color: gray });
    p.drawText(`${index + 1} / ${pages.length}`, { x: 520, y: 33, size: 9, font: regular, color: gray });
  });
  return pdf.save();
}
