import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel.jsx';

describe('ChatPanel', () => {
  it('shows the user message, processing state and assistant response', async () => {
    const user = userEvent.setup();
    let finishRequest;
    const response = new Promise(resolve => { finishRequest = resolve; });
    const onSend = vi.fn(() => response);
    render(<ChatPanel onSend={onSend} selectedDate={new Date(2026, 3, 8)} />);

    await user.type(screen.getByLabelText('Escribe un mensaje'), 'Anota comprar pan');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(screen.getByRole('status')).toHaveTextContent('Pensando en ello');
    finishRequest({ reply: 'Quedó anotado.' });
    expect(await screen.findByText('Quedó anotado.')).toBeInTheDocument();
    expect(onSend).toHaveBeenCalledWith('Anota comprar pan');
    expect(screen.queryByText('Pensando en ello…')).not.toBeInTheDocument();
  });

  it('keeps the draft and reports a failed request', async () => {
    const user = userEvent.setup();
    render(<ChatPanel onSend={async () => { throw new Error('API sin conexión'); }} selectedDate={new Date()} />);
    const input = screen.getByLabelText('Escribe un mensaje');

    await user.type(input, 'Recuérdame llamar');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('API sin conexión');
    expect(input).toHaveValue('Recuérdame llamar');
  });
});
