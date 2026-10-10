import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage.jsx';

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  requestEmailChange: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock('../services/auth.api.js', () => ({
  getProfile: mocks.getProfile,
  updateProfile: mocks.updateProfile,
  requestEmailChange: mocks.requestEmailChange
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ updateUser: mocks.updateUser })
}));

const profileResponse = {
  email: 'ana@example.test',
  pendingEmail: null,
  profile: {
    full_name: 'Ana Pérez',
    phone: '+56912345678',
    avatar_url: null
  }
};

const renderPage = () => render(
  <MemoryRouter>
    <ProfilePage />
  </MemoryRouter>
);

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfile.mockResolvedValue(profileResponse);
    mocks.updateProfile.mockResolvedValue({
      message: 'Perfil actualizado.',
      profile: { ...profileResponse.profile, full_name: 'Ana María Pérez' }
    });
    mocks.requestEmailChange.mockResolvedValue({
      message: 'Confirma el cambio desde tu correo.',
      currentEmail: 'ana@example.test',
      pendingEmail: 'ana.nueva@example.test'
    });
  });

  it('loads and saves personal profile data', async () => {
    const user = userEvent.setup();
    renderPage();

    const name = await screen.findByLabelText('Nombre completo');
    expect(name).toHaveValue('Ana Pérez');
    await user.clear(name);
    await user.type(name, 'Ana María Pérez');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(mocks.updateProfile).toHaveBeenCalledWith({
      fullName: 'Ana María Pérez',
      phone: '+56912345678',
      avatarUrl: undefined
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      fullName: 'Ana María Pérez',
      phone: '+56912345678'
    });
    expect(await screen.findByText('Perfil actualizado.')).toBeInTheDocument();
  });

  it('requests an email change and displays it as pending confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    const email = await screen.findByLabelText('Nuevo correo');
    await user.type(email, 'ana.nueva@example.test');
    await user.click(screen.getByRole('button', { name: 'Solicitar cambio' }));

    expect(mocks.requestEmailChange).toHaveBeenCalledWith('ana.nueva@example.test');
    expect(await screen.findByText('ana.nueva@example.test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar cuenta/i })).not.toBeInTheDocument();
  });
});
