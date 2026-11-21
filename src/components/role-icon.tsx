import type { Role } from "@/lib/auth/permissions";

/** Iconos de rol del prototipo (bandera, camiseta, portapapeles, escudo). */
export function RoleIcon({ role }: { role: Role }) {
  switch (role) {
    case "fan":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="3" width="1.6" height="18" rx="0.8" fill="#fff" />
          <path d="M7 4c2.2-1 4-1 6 0s3.8 1 6 0v8c-2.2 1-4 1-6 0s-3.8-1-6 0V4z" fill="#fff" />
          <path d="M7 6.6c2.2-.7 4-.5 6 .4s3.8 1 6 .2" stroke="#16223a" strokeWidth="1" strokeLinecap="round" opacity=".3" />
        </svg>
      );
    case "player":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M8 4l4 2 4-2 4 3-3 3v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10L4 7z" fill="#fff" />
          <path d="M9.3 6.6L12 8l2.7-1.4" stroke="#16223a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity=".3" />
        </svg>
      );
    case "professional":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="5" width="14" height="16" rx="2" fill="#fff" />
          <rect x="9" y="3.3" width="6" height="3" rx="1" fill="#fff" />
          <path d="M8.3 12.6l2.5 2.5 4.9-5.3" stroke="#16223a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
        </svg>
      );
    case "club":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3l7 2.6v5.4c0 5-3 8.6-7 10-4-1.4-7-5-7-10V5.6L12 3z" fill="#fff" />
          <path d="M12 4.3v15.8" stroke="#16223a" strokeWidth="1" opacity=".25" />
        </svg>
      );
  }
}
