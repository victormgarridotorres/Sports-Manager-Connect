import { avatarUrl } from "@/lib/profile/display";
import { initials } from "@/lib/initials";

/** Foto de perfil o, si no hay, las iniciales sobre el degradado dorado del prototipo. */
export function Avatar({
  path,
  name,
  size,
  className = "",
}: {
  path: string | null;
  name: string;
  size: number;
  className?: string;
}) {
  const url = avatarUrl(path);
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- imágenes de Supabase Storage (ya reducidas a 400 px)
    return <img src={url} alt={name} width={size} height={size} style={style} className={`avatar-img ${className}`} />;
  }
  return (
    <span aria-hidden style={{ ...style, fontSize: Math.round(size * 0.32) }} className={`avatar-tile ${className}`}>
      {initials(name)}
    </span>
  );
}
