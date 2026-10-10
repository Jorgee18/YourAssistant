import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReminderPanel } from './ReminderPanel.jsx';

const reminder = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  title: 'Revisar propuesta',
  reminder_date: '2030-04-02T12:00:00Z',
  status: 'pending',
  notification_offset_minutes: 0
};

const renderPanel = onOffsetChange => render(
  <ReminderPanel
    reminders={[reminder]}
    loading={false}
    error=""
    busyId={null}
    busyOffsetId={null}
    onStatusChange={() => {}}
    onOffsetChange={onOffsetChange}
    onRetry={() => {}}
  />
);

describe('ReminderPanel notification timing', () => {
  it('saves a preset lead time for a single reminder', async () => {
    const user = userEvent.setup();
    const onOffsetChange = vi.fn();
    renderPanel(onOffsetChange);

    await user.selectOptions(screen.getByLabelText('Aviso para Revisar propuesta'), '10080');

    expect(onOffsetChange).toHaveBeenCalledWith(reminder.id, 10080);
  });

  it('saves a custom lead time in days', async () => {
    const user = userEvent.setup();
    const onOffsetChange = vi.fn();
    renderPanel(onOffsetChange);

    await user.selectOptions(screen.getByLabelText('Aviso para Revisar propuesta'), 'custom');
    await user.clear(screen.getByLabelText('Cantidad de adelanto'));
    await user.type(screen.getByLabelText('Cantidad de adelanto'), '2');
    await user.selectOptions(screen.getByLabelText('Unidad de adelanto'), 'days');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onOffsetChange).toHaveBeenCalledWith(reminder.id, 2880);
  });
});
