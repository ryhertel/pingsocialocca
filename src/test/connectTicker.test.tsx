import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConnectTicker } from '@/components/landing/ConnectTicker';
import { TICKER_ITEMS } from '@/lib/landing/tickerItems';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import { advance, repeatsNeeded, wrapPosition, MAX_FRAME_MS } from '@/lib/landing/tickerLoop';

describe('wrapPosition', () => {
  const W = 1000;

  it('leaves a position inside the middle copy alone', () => {
    expect(wrapPosition(1000, W)).toBe(1000);
    expect(wrapPosition(1499.5, W)).toBe(1499.5);
  });

  it('jumps back exactly one copy when drifting past the end', () => {
    expect(wrapPosition(2000, W)).toBe(1000);
    expect(wrapPosition(2003.25, W)).toBeCloseTo(1003.25);
  });

  it('jumps forward exactly one copy when swiped backwards', () => {
    expect(wrapPosition(999, W)).toBe(1999);
    expect(wrapPosition(0, W)).toBe(1000);
  });

  it('handles a fling several copies out of range', () => {
    expect(wrapPosition(4250, W)).toBe(1250);
    expect(wrapPosition(-750, W)).toBe(1250);
  });

  it('is a no-op before anything has been measured', () => {
    expect(wrapPosition(123, 0)).toBe(123);
    expect(wrapPosition(NaN, W)).toBeNaN();
  });
});

describe('repeatsNeeded', () => {
  it('repeats the list until one copy covers the viewport', () => {
    expect(repeatsNeeded(1200, 1800)).toBe(1);
    expect(repeatsNeeded(2560, 1800)).toBe(2);
    expect(repeatsNeeded(5120, 1000)).toBe(6);
  });

  it('never returns less than one', () => {
    expect(repeatsNeeded(0, 1800)).toBe(1);
    expect(repeatsNeeded(1200, 0)).toBe(1);
  });
});

describe('advance', () => {
  it('moves at the given speed', () => {
    expect(advance(0, 36, 1000 / 60)).toBeCloseTo(0.6);
  });

  it('caps a long frame so a backgrounded tab cannot fling the ticker', () => {
    expect(advance(0, 36, 10_000)).toBeCloseTo((36 * MAX_FRAME_MS) / 1000);
  });

  it('ignores time running backwards', () => {
    expect(advance(5, 36, -100)).toBe(5);
  });
});

describe('ticker items', () => {
  it('covers every connector, so a new one shows up automatically', () => {
    expect(TICKER_ITEMS.map((i) => i.id)).toEqual([...connectorTemplates.map((t) => t.id), 'email']);
  });

  it('gives every item a line to show', () => {
    for (const item of TICKER_ITEMS) expect(item.line.length).toBeGreaterThan(0);
  });
});

describe('<ConnectTicker />', () => {
  beforeEach(() => localStorage.clear());

  const renderTicker = () =>
    render(
      <MemoryRouter>
        <ConnectTicker />
      </MemoryRouter>,
    );

  it('links each service once to its section of the docs', () => {
    renderTicker();
    for (const item of TICKER_ITEMS) {
      // Only the real copy is exposed; the loop clones are hidden.
      const link = screen.getByRole('link', { name: new RegExp(item.name) });
      expect(link.getAttribute('href')).toBe(`/docs#${item.id}`);
    }
  });

  it('keeps the loop clones out of the tab order', () => {
    const { container } = renderTicker();
    const scroller = screen.getByTestId('ticker-scroller');
    const focusable = scroller.querySelectorAll('a:not([tabindex="-1"])');
    expect(focusable).toHaveLength(TICKER_ITEMS.length);
    expect(container.querySelectorAll('ul[aria-hidden="true"]')).toHaveLength(2);
  });

  it('can be paused and resumed', () => {
    renderTicker();
    const pause = screen.getByRole('button', { name: 'Pause scrolling' });
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Resume scrolling' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('stays hidden once dismissed', () => {
    const { unmount } = renderTicker();
    fireEvent.click(screen.getByRole('button', { name: 'Hide this bar' }));
    expect(screen.queryByRole('region', { name: /connect ping/i })).toBeNull();
    unmount();

    renderTicker();
    expect(screen.queryByRole('region', { name: /connect ping/i })).toBeNull();
  });
});
