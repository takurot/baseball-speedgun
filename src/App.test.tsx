import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./firebase', () => ({
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return () => {};
  },
}));

test('routes signed-out users to login', async () => {
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: 'ログイン' })
  ).toBeInTheDocument();
});
