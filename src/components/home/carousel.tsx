"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lógica común de los carruseles de la portada: avance automático (se pausa
 * al pasar el ratón, al enfocar con teclado o si el sistema pide menos
 * movimiento), flechas, puntos y deslizar con el dedo.
 */
function useCarousel(count: number, interval: number) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [count, paused, interval]);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);
  const handlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
    onTouchStart: (e: React.TouchEvent) => (startX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      startX.current = null;
    },
  };
  return { index, setIndex, go, handlers };
}

/** Carrusel de noticias de la cabecera (prototipo: «hero-photo»). */
export function NewsCarousel({
  slides,
  labels,
}: {
  slides: ReactNode[];
  labels: { region: string; prev: string; next: string; slide: string; live: string };
}) {
  const { index, setIndex, go, handlers } = useCarousel(slides.length, 6500);
  return (
    <div className="hero-photo" role="region" aria-roledescription="carousel" aria-label={labels.region} {...handlers}>
      <span className="tag-new">
        <i aria-hidden /> {labels.live}
      </span>
      {slides.map((s, i) => (
        <div key={i} className={`nc-slide ${i === index ? "active" : ""}`} aria-hidden={i !== index} inert={i !== index}>
          {s}
        </div>
      ))}
      {slides.length > 1 ? (
        <>
          <div className="nc-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={`nc-dot ${i === index ? "active" : ""}`} aria-label={`${labels.slide} ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />
            ))}
          </div>
          <button type="button" className="nc-arrow prev" aria-label={labels.prev} onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" className="nc-arrow next" aria-label={labels.next} onClick={() => go(1)}>
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}

/** Carrusel de últimos anuncios (prototipo: «offer-feature»). */
export function OfferCarousel({ slides, labels }: { slides: ReactNode[]; labels: { region: string; prev: string; next: string; slide: string } }) {
  const { index, setIndex, go, handlers } = useCarousel(slides.length, 7000);
  return (
    <div className="offer-feature-wrap" role="region" aria-roledescription="carousel" aria-label={labels.region} {...handlers}>
      {slides.length > 1 ? (
        <button type="button" className="offer-feature-arrow prev" aria-label={labels.prev} onClick={() => go(-1)}>
          ‹
        </button>
      ) : null}
      {slides.map((s, i) => (
        <div key={i} hidden={i !== index}>
          {s}
        </div>
      ))}
      {slides.length > 1 ? (
        <>
          <button type="button" className="offer-feature-arrow next" aria-label={labels.next} onClick={() => go(1)}>
            ›
          </button>
          <div className="offer-feature-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={`of-dot ${i === index ? "is-active" : ""}`} aria-label={`${labels.slide} ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
