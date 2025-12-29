import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddRecordModal from './AddRecordModal';

beforeEach(() => {
  localStorage.clear();
});

test('renders modal with shared form styles and helper texts', () => {
  render(
    <AddRecordModal isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />
  );

  expect(
    screen.getByRole('heading', { name: '新しい記録を追加' })
  ).toBeInTheDocument();

  expect(screen.getByLabelText('日付')).toHaveClass('input');
  expect(screen.getByLabelText('選手名')).toHaveClass('input');
  expect(screen.getByLabelText('球速 (km/h)')).toHaveClass('input');

  expect(screen.getByText(/40〜180 km\/h/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '追加' })).toHaveClass(
    'btn',
    'btn-primary'
  );
});

test('prefills player name when presetName is provided', async () => {
  render(
    <AddRecordModal
      isOpen={true}
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      presetName="Sato"
    />
  );

  const nameInput = screen.getByLabelText('選手名') as HTMLInputElement;
  expect(nameInput).toHaveValue('Sato');
  expect(nameInput).toHaveAttribute('readonly');

  await userEvent.click(screen.getByRole('button', { name: '名前を変更' }));
  expect(nameInput).not.toHaveAttribute('readonly');
});

test('remembers last entry and suggests previous names', async () => {
  localStorage.setItem('baseball-speedgun:lastName', 'Ito');
  localStorage.setItem('baseball-speedgun:lastDate', '2024-05-05');

  render(
    <AddRecordModal
      isOpen={true}
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      suggestedNames={['Sato', 'Ito', 'Mori']}
    />
  );

  const nameInput = screen.getByLabelText('選手名') as HTMLInputElement;
  expect(nameInput).toHaveValue('Ito');
  expect(
    screen.getByText('最終入力日: 2024-05-05')
  ).toBeInTheDocument();

  await userEvent.clear(nameInput);

  const listbox = screen.getByRole('listbox', {
    name: 'これまでの選手名候補',
  });
  await userEvent.click(
    within(listbox).getByRole('option', { name: /Sato/ })
  );
  expect(nameInput).toHaveValue('Sato');
});

test('validates speed range and disables submit when invalid', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<AddRecordModal isOpen={true} onClose={jest.fn()} onSubmit={onSubmit} />);

  const nameInput = screen.getByLabelText('選手名');
  const speedInput = screen.getByLabelText('球速 (km/h)');
  const dateInput = screen.getByLabelText('日付');
  const submitButton = screen.getByRole('button', { name: '追加' });

  await userEvent.clear(dateInput);
  await userEvent.type(dateInput, '2024-12-01');
  await userEvent.type(nameInput, 'Yamada');
  await userEvent.clear(speedInput);
  await userEvent.type(speedInput, '30');

  expect(submitButton).toBeDisabled();
  expect(screen.getByText('40〜180km/hで入力してください')).toBeInTheDocument();

  await userEvent.clear(speedInput);
  await userEvent.type(speedInput, '150');

  expect(submitButton).toBeEnabled();
  await userEvent.click(submitButton);
  await screen.findByRole('button', { name: '追加' }); // wait for submit to settle
  expect(onSubmit).toHaveBeenCalledWith('Yamada', '150', '2024-12-01');
});

test('traps focus within the modal and supports escape to close', async () => {
  const handleClose = jest.fn();
  render(<AddRecordModal isOpen={true} onClose={handleClose} onSubmit={jest.fn()} />);

  const dateInput = screen.getByLabelText('日付');
  const cancelButton = screen.getByRole('button', { name: 'キャンセル' });

  dateInput.focus();
  await userEvent.tab({ shift: true });
  expect(cancelButton).toHaveFocus();

  await userEvent.tab();
  expect(dateInput).toHaveFocus();

  await userEvent.keyboard('{Escape}');
  expect(handleClose).toHaveBeenCalled();
});
