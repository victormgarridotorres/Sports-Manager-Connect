"use client";

import { useState } from "react";

/** Compartir: copiar enlace, email y WhatsApp (sin scripts de terceros). */
export function ShareButtons({ title, labels }: { title: string; labels: { copy: string; copied: string; email: string; whatsapp: string } }) {
  const [copied, setCopied] = useState(false);
  const url = () => window.location.href.split("?")[0];
  return (
    <div className="share-row">
      <button
        type="button"
        className="share-btn"
        title={copied ? labels.copied : labels.copy}
        aria-label={copied ? labels.copied : labels.copy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* sin permiso de portapapeles */
          }
        }}
      >
        {copied ? "✓" : "🔗"}
      </button>
      <button type="button" className="share-btn" title={labels.email} aria-label={labels.email} onClick={() => (window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url())}`)}>
        ✉️
      </button>
      <button
        type="button"
        className="share-btn"
        title={labels.whatsapp}
        aria-label={labels.whatsapp}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`, "_blank", "noopener,noreferrer")}
      >
        💬
      </button>
    </div>
  );
}
