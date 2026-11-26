import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTACHMENT_MAX_BYTES, attachmentTypes, cleanFileName, formatBytes, MESSAGE_MAX_CHARS } from "@/lib/messages/options";

const sql = readFileSync("supabase/migrations/20261129000000_phase4_messages.sql", "utf8");

describe("adjuntos de mensajes", () => {
  it("limpia nombres de fichero sin perder acentos", () => {
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("C:\\Users\\ana\\Ficha médica.pdf")).toBe("Ficha médica.pdf");
    expect(cleanFileName("cv<script>.pdf")).toBe("cv_script_.pdf");
    expect(cleanFileName("")).toBe("file");
    expect(cleanFileName("a".repeat(300) + ".pdf")).toHaveLength(120);
  });

  it("formatea tamaños según el idioma", () => {
    expect(formatBytes(512, "es")).toBe("512 B");
    expect(formatBytes(30000, "es")).toBe("29,3 KB");
    expect(formatBytes(5 * 1024 * 1024, "en")).toBe("5 MB");
  });

  it("los límites de la app coinciden con los de la base de datos", () => {
    expect(sql).toContain(`${ATTACHMENT_MAX_BYTES}`);
    expect(sql).toContain(`${MESSAGE_MAX_CHARS}`);
    for (const type of Object.keys(attachmentTypes)) expect(sql).toContain(`'${type}'`);
  });
});
