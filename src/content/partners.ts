/**
 * Colaboradores y patrocinadores (los del prototipo y la web actual).
 * Para añadir uno: sube su logo a public/partners/ y añádelo aquí.
 */
export type Partner = { name: string; logo: string; url?: string; kind: "institution" | "federation" | "club" | "brand" | "business" };

export const partners: Partner[] = [
  { name: "Xunta de Galicia · Deporte Galego", logo: "/partners/xunta-deporte-galego.jpg", kind: "institution" },
  { name: "Federación Galega de Balonmán", logo: "/partners/fegaba.png", kind: "federation" },
  { name: "S.D. Teucro", logo: "/partners/sd-teucro.png", kind: "club" },
  { name: "hummel", logo: "/partners/hummel.png", kind: "brand" },
  { name: "Apartamentos Rozavella", logo: "/partners/apartamentos-rozavella.png", kind: "business" },
];
