"use client";

import { useState } from "react";
import { embedUrl, type VideoRef } from "@/lib/profile/video";

/**
 * Vídeo de YouTube/Vimeo "a la carta": no se carga nada de terceros (ni
 * cookies) hasta que la persona pulsa reproducir.
 */
export function VideoCard({ video, title, playLabel }: { video: VideoRef; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="hl-card">
      {playing ? (
        <iframe
          src={embedUrl(video)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center"
          aria-label={`${playLabel}: ${title}`}
        >
          <span className="play" aria-hidden>
            ▶
          </span>
          <span className="line-clamp-2 text-[12.5px] font-semibold text-white/85">{title}</span>
          <span className="text-[10.5px] tracking-wider text-white/50 uppercase">{video.provider}</span>
        </button>
      )}
    </div>
  );
}
