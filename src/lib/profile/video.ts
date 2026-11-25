/**
 * Highlights: sólo se aceptan vídeos de YouTube o Vimeo y se guarda el ID
 * (nunca la URL tal cual), así no se puede incrustar nada que no sea un vídeo.
 */
export type VideoRef = { provider: "youtube" | "vimeo"; videoId: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{6,12}$/;

export function parseVideoUrl(input: string): VideoRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return YT_ID.test(parts[0] ?? "") ? { provider: "youtube", videoId: parts[0]! } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = parts[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live"].includes(parts[0] ?? "") ? parts[1] : null;
    return id && YT_ID.test(id) ? { provider: "youtube", videoId: id } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts[0] === "video" ? parts[1] : parts.find((p) => VIMEO_ID.test(p));
    return id && VIMEO_ID.test(id) ? { provider: "vimeo", videoId: id } : null;
  }
  return null;
}

/** Reproductor con privacidad reforzada (sin cookies hasta reproducir). */
export function embedUrl({ provider, videoId }: VideoRef) {
  return provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${videoId}?autoplay=1&dnt=1`;
}

export function watchUrl({ provider, videoId }: VideoRef) {
  return provider === "youtube" ? `https://www.youtube.com/watch?v=${videoId}` : `https://vimeo.com/${videoId}`;
}
