import { forumAvatars, type ForumAvatar } from "@/lib/forum/options";

/** Avatar del foro: un icono neutro (nunca la foto real). Sin avatar = cuenta eliminada. */
export function AnonAvatar({ avatar, size = 38, label }: { avatar: ForumAvatar | null; size?: number; label?: string }) {
  const a = avatar ? forumAvatars[avatar] : null;
  return (
    <span
      className="avatar-anon"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45), background: a?.bg ?? "#c9ccd6" }}
    >
      {a?.emoji ?? "?"}
    </span>
  );
}
