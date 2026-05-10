import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerDetail from './PlayerDetail';

jest.mock('../firebase', () => ({
  db: {},
  auth: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockDeleteField = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection.apply(null, args),
  deleteField: (...args: unknown[]) => mockDeleteField(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: jest.fn(() => ({})),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
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

const renderSwingWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/player/Sato/swing']}>
      <Routes>
        <Route path="/player/:name/:measurementType" element={<PlayerDetail />} />
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
  mockCollection.mockImplementation((_db, path) => ({ path }));
  mockDoc.mockImplementation((_db, path, id) => ({
    path: id ? `${path}/${id}` : path,
  }));
  mockDeleteField.mockReturnValue('DELETE_FIELD');
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
  mockGetDocs.mockResolvedValue(createDocsSnapshot([]));
  mockQuery.mockImplementation((collectionRef) => collectionRef);
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      speed: 150,
      updatedAt: { toDate: () => new Date('2024-05-02') },
      name: 'Sato',
    }),
  });
});

const createRecordDoc = (id: string, speed: number, date: Date) => ({
  id,
  data: () => ({
    speed,
    date: { toDate: () => date },
  }),
});

const createDocsSnapshot = (docs: ReturnType<typeof createRecordDoc>[]) => ({
  docs,
  forEach: (callback: (doc: ReturnType<typeof createRecordDoc>) => void) =>
    docs.forEach(callback),
});

test('loads swing speed records when the route measurement is swing', async () => {
  renderSwingWithRouter();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        { id: '2024-05-01', speed: 128, date: new Date('2024-05-01') },
      ])
    );
  });

  expect(mockCollection).toHaveBeenCalledWith(
    {},
    'users/user-1/players/Sato/swingRecords'
  );
  expect(screen.getByText('最高スイングスピード')).toBeInTheDocument();
  expect(screen.getByText('スイングスピードの推移')).toBeInTheDocument();
  expect(screen.getByLabelText('記録の並び替え')).toHaveTextContent(
    'スイングスピード（高速順）'
  );
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

test('keeps player document and restores swing summary when deleting final pitch record with swing subcollection data', async () => {
  mockGetDocs.mockImplementation((queryRef?: { path?: string }) => {
    if (queryRef?.path?.endsWith('/swingRecords')) {
      return Promise.resolve(
        createDocsSnapshot([
          createRecordDoc('2024-05-01', 128, new Date('2024-05-01')),
          createRecordDoc('2024-05-03', 132, new Date('2024-05-03')),
        ])
      );
    }
    return Promise.resolve(createDocsSnapshot([]));
  });

  renderWithRouter();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        { id: '2024-05-02', speed: 150, date: new Date('2024-05-02') },
      ])
    );
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: '削除' }));
  });

  await waitFor(() =>
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'users/user-1/players/Sato' },
      {
        name: 'Sato',
        speed: 'DELETE_FIELD',
        updatedAt: 'DELETE_FIELD',
        swingSpeed: 132,
        swingUpdatedAt: new Date('2024-05-03'),
      },
      { merge: true }
    )
  );
  expect(mockDeleteDoc).not.toHaveBeenCalledWith({
    path: 'users/user-1/players/Sato',
  });
});
