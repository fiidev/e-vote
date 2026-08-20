"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wrapper fullscreen kiosk — zero-dependency, Fullscreen API browser.
 *
 * - `enter()` / `exit()` / `toggle()` via handle dari useFullscreen()
 * - `autoEnter` (default true): request fullscreen saat mount (kiosk start)
 * - `onExit`: dipanggil setiap kali keluar fullscreen (termasuk tombol Esc
 *   browser) — dipakai landing untuk memunculkan FullscreenGuard.
 *
 * Catatan kiosk: kiosk mode = 1 browser fullscreen di layar ruangan.
 * Rate limit ada di layer server (lib/utils/rate-limit.ts), bukan per-IP UI.
 */
export interface FullscreenHandle {
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
  /** Subscribe perubahan status fullscreen. Return unsubscribe. */
  subscribe: (listener: (active: boolean) => void) => () => void;
}

export function useFullscreen(): FullscreenHandle {
  const listenersRef = useRef<Set<(active: boolean) => void>>(new Set());

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement);
      for (const listener of listenersRef.current) listener(active);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = async () => {
    if (document.fullscreenElement) return;
    await document.documentElement.requestFullscreen();
  };

  const exit = async () => {
    if (!document.fullscreenElement) return;
    await document.exitFullscreen();
  };

  const toggle = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return {
    enter,
    exit,
    toggle,
    subscribe(listener: (active: boolean) => void) {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
  };
}

/** Wrapper konten kiosk — anak selalu dirender (fullscreen dipakai di root). */
export function FullscreenWrapper({
  handle,
  children,
}: {
  handle: FullscreenHandle;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/** Tombol masuk/keluar fullscreen (label berubah mengikuti status). */
export function FullscreenButton({
  handle,
  label = "Mode Layar Penuh",
}: {
  handle: FullscreenHandle;
  label?: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => handle.subscribe(setActive), [handle]);

  return (
    <button
      type="button"
      onClick={() => void handle.toggle()}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-peach"
      aria-pressed={active}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        ) : (
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        )}
      </svg>
      {active ? "Keluar Layar Penuh" : label}
    </button>
  );
}