import { useEffect, useRef, useCallback, type RefObject } from "react";

export function useScrollToBottom(): [
  RefObject<HTMLDivElement | null>,
  RefObject<HTMLDivElement | null>,
  () => void
] {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUp = useRef(false);
  const isScrollingToBottom = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (endRef.current && !userHasScrolledUp.current) {
      isScrollingToBottom.current = true;
      endRef.current.scrollIntoView({ behavior: "smooth" });
      // Reset after a delay to allow smooth scroll to complete
      setTimeout(() => {
        isScrollingToBottom.current = false;
        userHasScrolledUp.current = false;
      }, 500);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Don't update scroll state if we're programmatically scrolling
      if (isScrollingToBottom.current) return;

      // Debounce scroll detection to avoid rapid state changes
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const threshold = 100; // Increased threshold for better UX
        const atBottom = scrollHeight - scrollTop <= clientHeight + threshold;
        userHasScrolledUp.current = !atBottom;
      }, 50);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (!container || !end) return;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user hasn't manually scrolled up and we're not already scrolling
      if (!userHasScrolledUp.current && !isScrollingToBottom.current) {
        isScrollingToBottom.current = true;
        end.scrollIntoView({ behavior: "instant", block: "end" });
        setTimeout(() => {
          isScrollingToBottom.current = false;
        }, 100);
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return [containerRef, endRef, scrollToBottom];
}
