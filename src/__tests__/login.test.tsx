import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import '@/i18n';
import LoginScreen from '@/app/login';
import { sendMagicLink, verifyEmailCode } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

jest.mock('@/lib/auth', () => ({
  sendMagicLink: jest.fn(async () => undefined),
  verifyEmailCode: jest.fn(async () => undefined),
}));

jest.mock('@/constants/brand', () => ({ BRAND: { name: 'TestBrand' } }));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('zeigt einen Fehler bei ungültiger E-Mail und sendet nichts', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('E-Mail-Adresse'), 'kein-mail');
    await fireEvent.press(screen.getByRole('button', { name: 'Anmelde-Link senden' }));

    expect(await screen.findByText('Bitte gib eine gültige E-Mail-Adresse ein.')).toBeTruthy();
    expect(sendMagicLink).not.toHaveBeenCalled();
  });

  it('sendet den Link und wechselt zur Code-Eingabe', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('E-Mail-Adresse'), 'du@beispiel.de');
    await fireEvent.press(screen.getByRole('button', { name: 'Anmelde-Link senden' }));

    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledWith('du@beispiel.de'));
    expect(await screen.findByText('Schau in dein Postfach')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Code aus der E-Mail'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Code bestätigen' }));
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('du@beispiel.de', '123456'));
  });

  it('ermöglicht die Nutzung ohne Anmeldung', async () => {
    useAuthStore.setState({ guest: false });
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ohne Anmeldung weiter' }));
    expect(useAuthStore.getState().guest).toBe(true);
    expect(sendMagicLink).not.toHaveBeenCalled();
  });
});
