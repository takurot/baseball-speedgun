import { render, screen } from '@testing-library/react';
import AddRecordModal from './AddRecordModal';

test('renders modal with shared form styles', () => {
  render(
    <AddRecordModal isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />
  );

  expect(
    screen.getByRole('heading', { name: '新しい記録を追加' })
  ).toBeInTheDocument();

  expect(screen.getByLabelText('日付')).toHaveClass('input');
  expect(screen.getByLabelText('選手名')).toHaveClass('input');
  expect(screen.getByLabelText('球速 (km/h)')).toHaveClass('input');

  expect(screen.getByRole('button', { name: '追加' })).toHaveClass(
    'btn',
    'btn-primary'
  );
});
