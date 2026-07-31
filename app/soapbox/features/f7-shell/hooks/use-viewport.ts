/**
 * Phase 3C — Viewport, keyboard, and orientation hooks.
 *
 * Handles:
 * - Virtual keyboard detection and content adjustment
 * - Orientation change scroll preservation
 * - Standalone PWA mode detection
 * - Safe-area inset awareness
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface ViewportState {
  /** Whether the virtual keyboard is visible */
  keyboardVisible: boolean;
  /** Current viewport height (accounts for keyboard) */
  viewportHeight: number;
  /** Whether the app is running in standalone PWA mode */
  isStandalone: boolean;
  /** Current orientation: 'portrait' or 'landscape' */
  orientation: 'portrait' | 'landscape';
}

export interface ViewportBaseline {
  height: number;
  width: number;
  orientation: 'portrait' | 'landscape';
  scale: number;
}

export interface ViewportMeasurement {
  height: number;
  width: number;
  scale: number;
  editableFocused: boolean;
}

export interface DerivedViewportState {
  baseline: ViewportBaseline;
  keyboardVisible: boolean;
  viewportHeight: number;
  orientation: 'portrait' | 'landscape';
}

const orientationFor = (height: number, width: number): ViewportBaseline['orientation'] => (
  height > width ? 'portrait' : 'landscape'
);

/** Pure viewport classifier used by the hook and deterministic regression tests. */
export function deriveViewportState(
  previousBaseline: ViewportBaseline,
  measurement: ViewportMeasurement,
): DerivedViewportState {
  const orientation = orientationFor(measurement.height, measurement.width);
  const orientationChanged = orientation !== previousBaseline.orientation;
  const scaleChanged = Math.abs(measurement.scale - previousBaseline.scale) > 0.01;
  const shouldRebase = orientationChanged || scaleChanged || !measurement.editableFocused;
  const baseline = shouldRebase
    ? {
      height: measurement.height,
      width: measurement.width,
      orientation,
      scale: measurement.scale,
    }
    : previousBaseline;

  return {
    baseline,
    keyboardVisible: (
      measurement.editableFocused
      && !orientationChanged
      && !scaleChanged
      && baseline.height - measurement.height > 150
    ),
    viewportHeight: measurement.height,
    orientation,
  };
}

const isEditableElementFocused = (): boolean => {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (active.isContentEditable) return true;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) {
    return !active.hasAttribute('disabled') && !active.hasAttribute('readonly');
  }
  if (!(active instanceof HTMLInputElement)) return false;

  const nonTextTypes = new Set([
    'button', 'checkbox', 'color', 'file', 'hidden', 'image',
    'radio', 'range', 'reset', 'submit',
  ]);
  return !active.disabled && !active.readOnly && !nonTextTypes.has(active.type);
};

const readMeasurement = (): ViewportMeasurement => {
  const viewport = window.visualViewport;
  return {
    height: viewport?.height ?? window.innerHeight,
    width: viewport?.width ?? window.innerWidth,
    scale: viewport?.scale ?? 1,
    editableFocused: isEditableElementFocused(),
  };
};

/**
 * Detects virtual keyboard visibility using the Visual Viewport API.
 * Falls back to window.innerHeight comparison when unavailable.
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => ({
    keyboardVisible: false,
    viewportHeight: window.innerHeight,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
  }));

  const initialMeasurement = readMeasurement();
  const baseline = useRef<ViewportBaseline>({
    height: initialMeasurement.height,
    width: initialMeasurement.width,
    orientation: orientationFor(initialMeasurement.height, initialMeasurement.width),
    scale: initialMeasurement.scale,
  });

  const updateViewport = useCallback(() => {
    const derived = deriveViewportState(baseline.current, readMeasurement());
    baseline.current = derived.baseline;

    setState(prev => {
      if (
        prev.keyboardVisible === derived.keyboardVisible &&
        prev.viewportHeight === derived.viewportHeight &&
        prev.orientation === derived.orientation
      ) {
        return prev;
      }
      return {
        ...prev,
        keyboardVisible: derived.keyboardVisible,
        viewportHeight: derived.viewportHeight,
        orientation: derived.orientation,
      };
    });
  }, []);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      visualViewport.addEventListener('resize', updateViewport);
      visualViewport.addEventListener('scroll', updateViewport);
    } else {
      window.addEventListener('resize', updateViewport, { passive: true });
    }

    // Also listen for orientation changes
    const orientationMedia = window.matchMedia('(orientation: portrait)');
    const handleOrientation = () => updateViewport();
    orientationMedia.addEventListener('change', handleOrientation);
    document.addEventListener('focusin', updateViewport);
    document.addEventListener('focusout', updateViewport);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateViewport);
        visualViewport.removeEventListener('scroll', updateViewport);
      } else {
        window.removeEventListener('resize', updateViewport);
      }
      orientationMedia.removeEventListener('change', handleOrientation);
      document.removeEventListener('focusin', updateViewport);
      document.removeEventListener('focusout', updateViewport);
    };
  }, [updateViewport]);

  return state;
}

/**
 * Preserves scroll position across orientation changes.
 * Restores the relative scroll position after the viewport dimensions change.
 */
export function useOrientationScrollPreserve(containerRef: React.RefObject<HTMLElement | null>): void {
  const scrollRatio = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const saveScroll = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      scrollRatio.current = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
    };

    const restoreScroll = () => {
      // Use rAF to wait for layout recalculation after orientation change
      // eslint-disable-next-line compat/compat
      requestAnimationFrame(() => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        container.scrollTop = scrollRatio.current * maxScroll;
      });
    };

    const orientationMedia = window.matchMedia('(orientation: portrait)');
    const handleChange = () => restoreScroll();

    saveScroll();
    container.addEventListener('scroll', saveScroll, { passive: true });
    orientationMedia.addEventListener('change', handleChange);
    return () => {
      container.removeEventListener('scroll', saveScroll);
      orientationMedia.removeEventListener('change', handleChange);
    };
  }, [containerRef]);
}
