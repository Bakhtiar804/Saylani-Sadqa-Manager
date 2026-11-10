"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function complete() {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setProgress(100);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setActive(false), 250);
    }

    function start() {
      pendingRef.current = true;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setActive(true);
      setProgress(18);
      window.requestAnimationFrame(() => {
        if (pendingRef.current) setProgress(78);
      });
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(complete, 30_000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.hash && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (`${destination.pathname}?${destination.searchParams.toString()}` === `${window.location.pathname}?${window.location.search.slice(1)}`) return;
      start();
    }

    function handleSubmit(event: SubmitEvent) {
      // Client-managed forms show their own saving state.
      if (!event.defaultPrevented) start();
    }

    function handleDataStart() {
      start();
    }

    function handleDataReady() {
      complete();
    }

    const observer = new MutationObserver((mutations) => {
      if (!pendingRef.current) return;
      const ready = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
        node instanceof Element && (node.matches("[data-dashboard-ready]") || node.querySelector("[data-dashboard-ready]")),
      ));
      if (ready) complete();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit);
    window.addEventListener("dashboard:data-start", handleDataStart);
    window.addEventListener("dashboard:data-ready", handleDataReady);

    if (!document.querySelector("[data-dashboard-ready]")) start();
    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("dashboard:data-start", handleDataStart);
      window.removeEventListener("dashboard:data-ready", handleDataReady);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (document.querySelector("[data-dashboard-ready]")) {
      window.dispatchEvent(new Event("dashboard:data-ready"));
    }
  }, [pathname, searchParams]);

  return (
    <div
      role="progressbar"
      aria-label="Loading dashboard content"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="h-full bg-[#61bb46] shadow-[0_0_10px_rgba(97,187,70,.75)] transition-[width] duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
