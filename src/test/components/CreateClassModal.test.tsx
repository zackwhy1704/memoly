import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateClassModal from '@/app/dashboard/classes/modals/CreateClassModal';
import { api } from '@/lib/api';

// Silence analytics.
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

// MochiUploader is step-2 only (needs a successful create first).
vi.mock('@/components/MochiUploader', () => ({
  default: () => <div data-testid="mochi-uploader" />,
}));

// AvatarPickerModal — stub so the full canvas doesn't render in jsdom.
vi.mock('@/components/AvatarPickerModal', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="avatar-picker-modal">
      <button onClick={onDismiss}>Close picker</button>
    </div>
  ),
}));

// MochiAvatar — stub the canvas-based avatar so jsdom doesn't explode.
vi.mock('@/components/MochiAvatar', () => ({
  default: () => <div data-testid="mochi-avatar" />,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createClass: vi.fn(),
      setMochiConfig: vi.fn(),
    },
  };
});

function renderModal(props?: Partial<Parameters<typeof CreateClassModal>[0]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const defaultProps = {
    orgId: 'org-1',
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={client}>
      <CreateClassModal {...defaultProps} />
    </QueryClientProvider>
  );
}

describe('CreateClassModal — step 1 (class identity)', () => {
  it('renders the step 1 heading and subtitle', () => {
    renderModal();
    expect(screen.getByText('New class')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/)).toBeInTheDocument();
  });

  it('renders the Mochi studio: preview + customise button', () => {
    renderModal();
    expect(screen.getByTestId('mochi-avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose a style or customise/i })).toBeInTheDocument();
  });

  it('opens AvatarPickerModal when the customise button is clicked', () => {
    renderModal();
    expect(screen.queryByTestId('avatar-picker-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Choose a style or customise/i }));
    expect(screen.getByTestId('avatar-picker-modal')).toBeInTheDocument();
  });

  it('closes the picker when onDismiss is triggered', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Choose a style or customise/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }));
    expect(screen.queryByTestId('avatar-picker-modal')).not.toBeInTheDocument();
  });

  it('renders the class name, subject, and level inputs', () => {
    renderModal();
    expect(screen.getByPlaceholderText('P4 Math')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('P4')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders the brand name and accent colour inputs', () => {
    renderModal();
    expect(screen.getByPlaceholderText('Bright Minds P4 Math')).toBeInTheDocument();
    expect(screen.getByLabelText(/Accent colour/i)).toBeInTheDocument();
  });

  it('submit button is disabled when class name is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Create & add content/i })).toBeDisabled();
  });

  it('submit button enables once class name has text', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    expect(screen.getByRole('button', { name: /Create & add content/i })).not.toBeDisabled();
  });

  it('submit button goes back to disabled when class name is cleared', () => {
    renderModal();
    const input = screen.getByPlaceholderText('P4 Math');
    fireEvent.change(input, { target: { value: 'P4 Science' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Create & add content/i })).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls api.createClass with correct body on submit and then calls setMochiConfig', async () => {
    const createdClass = {
      id: 'class-1',
      name: 'P4 Science',
      subject: 'SCIENCE',
      level: null,
      joinCode: 'ABC123',
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
    vi.mocked(api.createClass).mockResolvedValue({ data: createdClass } as ReturnType<typeof api.createClass> extends Promise<infer R> ? R : never);
    vi.mocked(api.setMochiConfig).mockResolvedValue({} as ReturnType<typeof api.setMochiConfig> extends Promise<infer R> ? R : never);

    renderModal();
    fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
    fireEvent.click(screen.getByRole('button', { name: /Create & add content/i }));

    await waitFor(() => {
      expect(api.createClass).toHaveBeenCalledWith('org-1', expect.objectContaining({
        name: 'P4 Science',
        characterType: 'MOCHI',
      }));
    });

    await waitFor(() => {
      expect(api.setMochiConfig).toHaveBeenCalledWith('org-1', 'class-1', expect.objectContaining({
        body: expect.any(Number),
      }));
    });
  });
});
