import { useCallback, useEffect, useRef, useState } from 'react';

/** Keep the same world mounted while adopting native fullscreen or its CSS fallback. */
export function useImmersiveView() {
  const containerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const request = useRef({ version: 0 });
  const nativeEntered = useRef(false);
  const [immersive, setImmersive] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const leave = useCallback(async () => {
    request.current.version++;
    nativeEntered.current = false;
    if (document.fullscreenElement === containerRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        setAnnouncement(
          'Use your browser’s fullscreen exit control to finish exiting.',
        );
        nativeEntered.current = true;
        return;
      }
    }
    setImmersive(false);
    setAnnouncement('Immersive view closed. Your exploration is preserved.');
  }, []);

  async function enter() {
    const element = containerRef.current;
    if (!element) return;
    const currentRequest = ++request.current.version;
    setImmersive(true);
    setAnnouncement('Immersive view enabled. Press Escape to exit.');
    if (typeof element.requestFullscreen !== 'function') return;
    try {
      await element.requestFullscreen();
      // Escape or navigation may have happened while the browser was asking.
      if (
        currentRequest !== request.current.version &&
        document.fullscreenElement === element
      )
        await document.exitFullscreen();
    } catch {
      if (currentRequest === request.current.version)
        setAnnouncement(
          'Immersive view enabled using the page layout. Press Escape to exit.',
        );
    }
  }

  useEffect(() => {
    const fullscreenChanged = () => {
      if (document.fullscreenElement === containerRef.current)
        nativeEntered.current = true;
      else if (nativeEntered.current) void leave();
    };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    const session = request.current;
    return () => {
      session.version++;
      document.removeEventListener('fullscreenchange', fullscreenChanged);
    };
  }, [leave]);

  useEffect(() => {
    const element = containerRef.current;
    if (!immersive || !element) return;
    const returnFocus = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    const backgrounds: { element: HTMLElement; inert: boolean }[] = [];
    // Hide only siblings along this branch, never an ancestor of the live world.
    let branch: HTMLElement = element;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          backgrounds.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    document.body.style.overflow = 'hidden';
    toggleRef.current?.focus({ preventScroll: true });

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void leave();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [
        ...element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]',
        ),
      ].filter(
        (control) =>
          control.tabIndex >= 0 && control.getClientRects().length > 0,
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      for (const background of backgrounds)
        background.element.inert = background.inert;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      if (document.fullscreenElement === element)
        void document.exitFullscreen().catch(() => {});
    };
  }, [immersive, leave]);

  return {
    containerRef,
    toggleRef,
    immersive,
    announcement,
    toggle: immersive ? leave : enter,
  };
}
