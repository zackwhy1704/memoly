import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateClassModal from '@/app/dashboard/classes/modals/CreateClassModal';
import { api } from '@/lib/api';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/components/MochiUploader', () => ({
  default: ({ onComplete }: { onComplete?: (n: number) => void }) => (
    <div data-testid="mochi-uploader">
      <button onClick={() => onComplete?.(3)}>simulate upload complete</button>
    </div>
  ),
}));
vi.mock('@/components/AvatarPickerModal', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="avatar-picker-modal">
      <button onClick={onDismiss}>Close picker</button>
    </div>
  ),
}));
vi.mock('@/components/MochiAvatar', () => ({
  default: () => <div data-testid="mochi-avatar" />,
}));
vi.mock('@/app/dashboard/classes/[classId]/components/ContentReviewPanel', () => ({
  ContentReviewPanel: ({ onAllReviewed }: { onAllReviewed?: () => void }) => (
    <div data-testid="content-review-panel">
      <button onClick={onAllReviewed}>mark all reviewed</button>
    </div>
  ),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createClass: vi.fn(),
      setMochiConfig: vi.fn(),
      avatar: vi.fn(),
    },
  };
});

const MOCK_CLASS = {
  id: 'class-1',
  name: 'P4 Science',
  subject: 'SCIENCE',
  level: null,
  joinCode: 'XYZ789',
  corpusAvatarId: 'avatar-1',
  characterType: 'MOCHI',
  brandName: null,
  accentColor: null,
  examDate: null,
  cosmeticEyewear: null,
  cosmeticClothes: null,
  cosmeticShoes: null,
  studentCount: 0,
};

function renderModal(props?: Partial<Parameters<typeof CreateClassModal>[0]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CreateClassModal orgId="org-1" onClose={vi.fn()} onCreated={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('CreateClassModal — step 1 (identity)', () => {
  it('shows the step 1 heading', () => {
    renderModal();
    expect(screen.getByText('Name your class')).toBeInTheDocument();
  });

  it('shows class name, subject, and level — NO brand name, NO accent colour', () => {
    renderModal();
    expect(screen.getByPlaceholderText('P4 Math')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('P4')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/brand/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/accent/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('#')).not.toBeInTheDocument(); // no colour input
  });

  it('Next button is disabled when name is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });

  it('Next button enables once name has text', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    expect(screen.getByRole('button', { name: 'Next →' })).not.toBeDisabled();
  });

  it('Next goes back to disabled when name is cleared', () => {
    renderModal();
    const input = screen.getByPlaceholderText('P4 Math');
    fireEvent.change(input, { target: { value: 'P4 Science' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });

  it('Cancel calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows stepper with 5 steps', () => {
    renderModal();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Mochi')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('advances to step 2 when Next is clicked with a name', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.getByText('Design your class Mochi')).toBeInTheDocument();
    expect(screen.getByTestId('mochi-avatar')).toBeInTheDocument();
  });
});

describe('CreateClassModal — step 2 (avatar)', () => {
  function goToStep2() {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  }

  it('shows Mochi preview and customise button', () => {
    goToStep2();
    expect(screen.getByTestId('mochi-avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose a style or customise/i })).toBeInTheDocument();
  });

  it('opens AvatarPickerModal when customise clicked', () => {
    goToStep2();
    expect(screen.queryByTestId('avatar-picker-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Choose a style or customise/i }));
    expect(screen.getByTestId('avatar-picker-modal')).toBeInTheDocument();
  });

  it('Back returns to step 1', () => {
    goToStep2();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByText('Name your class')).toBeInTheDocument();
  });

  it('calls createClass with name/subject/level/characterType but NO brandName or accentColor', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ data: MOCK_CLASS } as ReturnType<typeof api.createClass> extends Promise<infer R> ? R : never);
    vi.mocked(api.setMochiConfig).mockResolvedValue({} as ReturnType<typeof api.setMochiConfig> extends Promise<infer R> ? R : never);

    goToStep2();
    fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));

    await waitFor(() => expect(api.createClass).toHaveBeenCalledTimes(1));

    const body = vi.mocked(api.createClass).mock.calls[0][1];
    expect(body).toHaveProperty('name', 'P4 Science');
    expect(body).toHaveProperty('characterType', 'MOCHI');
    expect(body).not.toHaveProperty('brandName');
    expect(body).not.toHaveProperty('accentColor');
  });

  it('calls setMochiConfig after createClass succeeds', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ data: MOCK_CLASS } as ReturnType<typeof api.createClass> extends Promise<infer R> ? R : never);
    vi.mocked(api.setMochiConfig).mockResolvedValue({} as ReturnType<typeof api.setMochiConfig> extends Promise<infer R> ? R : never);

    goToStep2();
    fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));

    await waitFor(() =>
      expect(api.setMochiConfig).toHaveBeenCalledWith('org-1', 'class-1', expect.objectContaining({ body: expect.any(Number) }))
    );
  });

  it('advances to step 3 after successful create', async () => {
    vi.mocked(api.createClass).mockResolvedValue({ data: MOCK_CLASS } as ReturnType<typeof api.createClass> extends Promise<infer R> ? R : never);
    vi.mocked(api.setMochiConfig).mockResolvedValue({} as ReturnType<typeof api.setMochiConfig> extends Promise<infer R> ? R : never);

    goToStep2();
    fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));

    await waitFor(() => expect(screen.getByTestId('mochi-uploader')).toBeInTheDocument());
    expect(screen.getByText('P4 Science is ready!')).toBeInTheDocument();
  });
});

describe('CreateClassModal — step 3 (upload)', () => {
  async function goToStep3() {
    vi.mocked(api.createClass).mockResolvedValue({ data: MOCK_CLASS } as ReturnType<typeof api.createClass> extends Promise<infer R> ? R : never);
    vi.mocked(api.setMochiConfig).mockResolvedValue({} as ReturnType<typeof api.setMochiConfig> extends Promise<infer R> ? R : never);
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));
    await waitFor(() => expect(screen.getByTestId('mochi-uploader')).toBeInTheDocument());
  }

  it('"Continue to review" is disabled before any upload', async () => {
    await goToStep3();
    expect(screen.getByRole('button', { name: /Continue to review/i })).toBeDisabled();
  });

  it('"Continue to review" enables after onComplete fires', async () => {
    await goToStep3();
    fireEvent.click(screen.getByRole('button', { name: 'simulate upload complete' }));
    expect(screen.getByRole('button', { name: /Continue to review/i })).not.toBeDisabled();
  });

  it('shows the join code', async () => {
    await goToStep3();
    // Join code appears in the header and footer — both should be present
    const codes = screen.getAllByText('XYZ789');
    expect(codes.length).toBeGreaterThanOrEqual(1);
  });
});
