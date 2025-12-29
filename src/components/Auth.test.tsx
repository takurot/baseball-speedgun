import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import SignUp from './SignUp';

jest.mock('../firebase', () => ({
  auth: {},
}));

test('login form uses shared layout and password toggle', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  expect(screen.getByText('Baseball Speedgun')).toBeInTheDocument();
  expect(
    screen.getByText('球速を記録して、選手別ランキングで振り返ろう')
  ).toBeInTheDocument();
  expect(screen.getByText('記録を追加')).toBeInTheDocument();
  expect(screen.getByText('ランキング')).toBeInTheDocument();
  expect(screen.getByText('推移グラフ')).toBeInTheDocument();

  const passwordInput = screen.getByLabelText('パスワード');
  expect(passwordInput).toHaveAttribute('type', 'password');

  const toggle = screen.getByRole('button', { name: /パスワードを/ });
  fireEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(passwordInput).toHaveAttribute('type', 'text');
});

test('signup form shares promo copy and hint text', () => {
  render(
    <MemoryRouter>
      <SignUp />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: '新規登録' })).toHaveClass(
    'auth-title'
  );
  expect(
    screen.getByText('球速を記録して、選手別ランキングで振り返ろう')
  ).toBeInTheDocument();
  expect(
    screen.getByText('6文字以上のパスワードを設定してください')
  ).toBeInTheDocument();

  const passwordInput = screen.getByLabelText('パスワード');
  expect(passwordInput).toHaveClass('input');
});
