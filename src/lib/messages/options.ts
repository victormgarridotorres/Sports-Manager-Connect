export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const attachmentTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MESSAGE_MAX_CHARS = 4000;

/** Nombre de fichero seguro para mostrar (sin rutas ni caracteres raros). */
export function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "file";
}

export function formatBytes(n: number, locale: string) {
  const units = ["B", "KB", "MB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(locale, { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`;
}
