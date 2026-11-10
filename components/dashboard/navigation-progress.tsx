"use client";

import { useEffect, useRef, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";

export default function NavigationProgress() {
  const [active, setActive] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function complete() {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      setShowSkeleton(false);
      setProgress(100);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setActive(false), 250);
    }

    function start() {
      pendingRef.current = true;
      document.querySelectorAll("[data-dashboard-ready]").forEach((node) => node.removeAttribute("data-dashboard-ready"));
      setActive(true);
      setProgress(18);
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      skeletonTimer.current = setTimeout(() => setShowSkeleton(true), 180);
      window.requestAnimationFrame(() => setProgress(78));
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

    function handleSubmit() {
      start();
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
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("dashboard:data-start", handleDataStart);
    window.addEventListener("dashboard:data-ready", handleDataReady);

    if (!document.querySelector("[data-dashboard-ready]")) start();
    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("dashboard:data-start", handleDataStart);
      window.removeEventListener("dashboard:data-ready", handleDataReady);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
    };
  }, []);

  return (
    <>
      {showSkeleton && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 left-[258px] right-0 top-[68px] z-[90] overflow-y-auto bg-[#f7faf5]/95 px-10 pb-8 pt-8 backdrop-blur-[2px] max-[1100px]:left-[220px] max-[1100px]:px-6 max-[900px]:left-[72px] max-[600px]:bottom-[72px] max-[600px]:left-0 max-[600px]:top-[60px] max-[600px]:px-4 max-[600px]:pt-5"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <DashboardSkeleton />
          </div>
        </div>
      )}
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
    </>
  );
}
