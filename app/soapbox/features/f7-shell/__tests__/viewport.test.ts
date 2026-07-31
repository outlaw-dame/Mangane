import { deriveViewportState } from '../hooks/use-viewport';

describe('F7 shell viewport state', () => {
  const baseline = {
    height: 844,
    width: 390,
    orientation: 'portrait' as const,
    scale: 1,
  };

  it('requires editable focus before classifying viewport shrinkage as a keyboard', () => {
    expect(deriveViewportState(baseline, {
      height: 600,
      width: 390,
      scale: 1,
      editableFocused: false,
    }).keyboardVisible).toBe(false);

    expect(deriveViewportState(baseline, {
      height: 600,
      width: 390,
      scale: 1,
      editableFocused: true,
    }).keyboardVisible).toBe(true);
  });

  it('rebases on orientation and zoom instead of reporting a stale keyboard', () => {
    const landscape = deriveViewportState(baseline, {
      height: 390,
      width: 844,
      scale: 1,
      editableFocused: true,
    });
    expect(landscape.keyboardVisible).toBe(false);
    expect(landscape.baseline).toEqual({
      height: 390,
      width: 844,
      orientation: 'landscape',
      scale: 1,
    });

    const zoomed = deriveViewportState(baseline, {
      height: 560,
      width: 260,
      scale: 1.5,
      editableFocused: true,
    });
    expect(zoomed.keyboardVisible).toBe(false);
    expect(zoomed.baseline.scale).toBe(1.5);
  });
});
