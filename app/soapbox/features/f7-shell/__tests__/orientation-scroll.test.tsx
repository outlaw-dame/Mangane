import { fireEvent, render } from '@testing-library/react';
import React, { useRef } from 'react';

import { useOrientationScrollPreserve } from '../hooks/use-viewport';

const ScrollFixture: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useOrientationScrollPreserve(ref);
  return <div ref={ref} data-testid='scroller' />;
};

describe('orientation scroll preservation', () => {
  it('restores the last observed relative position after layout changes', () => {
    let onOrientationChange: (() => void) | undefined;
    jest.spyOn(window, 'matchMedia').mockImplementation(() => ({
      matches: true,
      media: '(orientation: portrait)',
      onchange: null,
      addEventListener: (_type, listener) => {
        onOrientationChange = listener as () => void;
      },
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const { getByTestId } = render(<ScrollFixture />);
    const scroller = getByTestId('scroller');
    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1000, writable: true },
    });
    scroller.scrollTop = 200;
    fireEvent.scroll(scroller);

    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1500 });
    onOrientationChange?.();

    expect(scroller.scrollTop).toBe(400);
  });
});
