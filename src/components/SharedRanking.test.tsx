import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedRanking from './SharedRanking';

jest.mock('../firebase', () => ({
  auth: {},
  db: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return jest.fn();
  });
});

test('renders shared ranking snapshot for signed-out viewer', async () => {
  mockOnSnapshot.mockImplementation((_ref, onNext) => {
    onNext({
      exists: () => true,
      data: () => ({
        periodFilter: 'all',
        stats: { topSpeed: 150, averageSpeed: 145.5, playerCount: 2 },
        players: [
          {
            rank: 1,
            name: 'Sato',
            speed: 150,
            updatedAt: { toDate: () => new Date('2024-05-02') },
          },
          {
            rank: 2,
            name: 'Ito',
            speed: 141,
            updatedAt: { toDate: () => new Date('2024-05-01') },
          },
        ],
        expiresAt: null,
      }),
    });
    return jest.fn();
  });

  render(
    <MemoryRouter initialEntries={['/share/share-123']}>
      <Routes>
        <Route path="/share/:shareId" element={<SharedRanking />} />
      </Routes>
    </MemoryRouter>
  );

  expect(
    await screen.findByRole('heading', { name: '共有ランキング' })
  ).toBeInTheDocument();
  expect(screen.getByText('Sato')).toBeInTheDocument();
  expect(screen.getByText('Ito')).toBeInTheDocument();
  expect(screen.getByText('自分用に作る')).toBeInTheDocument();
});

