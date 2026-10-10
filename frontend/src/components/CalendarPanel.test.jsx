import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarPanel } from './CalendarPanel.jsx';

describe('CalendarPanel', () => {
  it('renders safely when reminders are omitted', () => {
    const date = new Date(2030, 3, 1);
    render(
      <CalendarPanel
        date={date}
        selectedDate={date}
        onSelectDate={vi.fn()}
        onChangeMonth={vi.fn()}
      />
    );

    expect(screen.getByRole('group', { name: /Días de/ })).toBeInTheDocument();
  });
});
