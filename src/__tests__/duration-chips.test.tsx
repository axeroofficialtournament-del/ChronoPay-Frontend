import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DurationChips from '@/components/dashboard/DurationChips';

describe('DurationChips', () => {
  it('renders chips with counts and toggles selection', () => {
    const counts = { 15: 1, 30: 2, 60: 0 };
    const onChange = vi.fn();

    render(<DurationChips counts={counts} onChange={onChange} />);
    // find by aria-label which contains minute and count
    const btn30 = screen.getByRole('button', { name: /30 minute filter/i });
    expect(btn30).toBeTruthy();
    // initial not pressed
    expect(btn30).toHaveAttribute('aria-pressed', 'false');

    // Live region should be in the document
    const live = screen.getByRole('status');

    fireEvent.click(btn30);
    expect(btn30).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenCalledWith(30);
    // announce selection
    expect(live).toHaveTextContent(/30-minute filter applied/i);

    // clicking again clears
    fireEvent.click(btn30);
    expect(btn30).toHaveAttribute('aria-pressed', 'false');
    expect(onChange).toHaveBeenCalledWith(null);
    expect(live).toHaveTextContent(/Duration filter cleared/i);
  });

  it('syncs selection when `initial` prop changes', () => {
    const counts = { 15: 1, 30: 2, 60: 0 };
    const { rerender } = render(<DurationChips counts={counts} initial={null} />);

    // initially no selection
    expect(screen.getByRole('button', { name: /15 minute filter/i })).toHaveAttribute('aria-pressed', 'false');

    // rerender with initial=15 -> should become pressed
    rerender(<DurationChips counts={counts} initial={15} />);
    expect(screen.getByRole('button', { name: /15 minute filter/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
