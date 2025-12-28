import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import SignUp from './SignUp';

jest.mock('../firebase', () => ({
  auth: {},
}));

test('login form uses shared styles', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'ログイン' })).toHaveClass(
    'auth-title'
  );
  expect(screen.getByLabelText('メールアドレス')).toHaveClass('input');
  expect(screen.getByLabelText('パスワード')).toHaveClass('input');
  expect(screen.getByRole('button', { name: 'ログイン' })).toHaveClass(
    'btn',
    'btn-primary'
  );
});

test('signup form uses shared styles', () => {
  render(
    <MemoryRouter>
      <SignUp />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: '新規登録' })).toHaveClass(
    'auth-title'
  );
  expect(screen.getByLabelText('メールアドレス')).toHaveClass('input');
  expect(screen.getByLabelText('パスワード')).toHaveClass('input');
  expect(screen.getByRole('button', { name: '登録する' })).toHaveClass(
    'btn',
    'btn-success'
  );
});
