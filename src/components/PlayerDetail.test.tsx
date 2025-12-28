import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerDetail from './PlayerDetail';

jest.mock('../firebase', () => ({
  db: {},
  auth: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-placeholder" />,
}));

let snapshotListener: ((snapshot: { forEach: (cb: (doc: any) => void) => void }) => void) | null =
  null;

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/player/Sato']}>
      <Routes>
        <Route path="/player/:name" element={<PlayerDetail />} />
      </Routes>
    </MemoryRouter>
  );

const createSnapshot = (
  records: { id: string; speed: number; date: Date }[]
) => ({
  forEach: (callback: (doc: any) => void) =>
    records.forEach((record) =>
      callback({
        id: record.id,
        data: () => ({
          speed: record.speed,
          date: { toDate: () => record.date },
        }),
      })
    ),
});

beforeEach(() => {
  jest.clearAllMocks();
  snapshotListener = null;
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ uid: 'user-1' });
    return jest.fn();
  });
  mockOnSnapshot.mockImplementation((_query, onSuccess) => {
    snapshotListener = onSuccess;
    return jest.fn();
  });
  mockDeleteDoc.mockResolvedValue(undefined);
  mockSetDoc.mockResolvedValue(undefined);
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      speed: 150,
      updatedAt: { toDate: () => new Date('2024-05-02') },
      name: 'Sato',
    }),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows summary stats and filters by period', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-06-15'));
  renderWithRouter();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        { id: '2024-05-01', speed: 140, date: new Date('2024-05-01') },
        { id: '2024-06-12', speed: 148, date: new Date('2024-06-12') },
        { id: '2024-06-01', speed: 152, date: new Date('2024-06-01') },
      ])
    );
  });

  expect(screen.getByText('最高球速')).toBeInTheDocument();
  const topSpeedCard = screen.getByText('最高球速').closest('.stat-card');
  expect(topSpeedCard).not.toBeNull();
  expect(
    within(topSpeedCard as HTMLElement).getByText('152')
  ).toBeInTheDocument();
  expect(screen.getByText('平均球速')).toBeInTheDocument();
  expect(screen.getByText('直近の記録日')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '直近7日' }));

  const latestDateText = new Intl.DateTimeFormat('ja-JP').format(
    new Date('2024-06-12')
  );
  expect(
    within(topSpeedCard as HTMLElement).getByText('148')
  ).toBeInTheDocument();
  const latestCard = screen.getByText('直近の記録日').closest('.stat-card');
  expect(latestCard).not.toBeNull();
  expect(
    within(latestCard as HTMLElement).getByText(latestDateText)
  ).toBeInTheDocument();
});

test('sorts records and shows undo snackbar after delete', async () => {
  renderWithRouter();
  const format = (date: string) =>
    new Intl.DateTimeFormat('ja-JP').format(new Date(date));

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        { id: '2024-05-01', speed: 140, date: new Date('2024-05-01') },
        { id: '2024-05-03', speed: 155, date: new Date('2024-05-03') },
        { id: '2024-05-10', speed: 150, date: new Date('2024-05-10') },
      ])
    );
  });

  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
    format('2024-05-10')
  );

  await userEvent.selectOptions(
    screen.getByLabelText('記録の並び替え'),
    'speed'
  );
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('155');

  await act(async () => {
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0]);
  });

  expect(await screen.findByText('取り消す')).toBeInTheDocument();
  expect(mockDeleteDoc).toHaveBeenCalled();
});
