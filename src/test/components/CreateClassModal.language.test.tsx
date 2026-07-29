import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateClassModal from '@/app/dashboard/classes/modals/CreateClassModal';
import { api } from '@/lib/api';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/components/MochiUploader', () => ({
  default: () => <div data-testid="mochi-uploader" />,
}));
vi.mock('@/components/AvatarPickerModal', () => ({
  default: () => <div data-testid="avatar-picker-modal" />,
}));
vi.mock('@/components/MochiAvatar', () => ({ default: () => <div data-testid="mochi-avatar" /> }));
vi.mock('@/app/dashboard/classes/[classId]/components/ContentReviewPanel', () => ({
  ContentReviewPanel: () => <div data-testid="content-review-panel" />,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createClass: vi.fn(),
      setMochiConfig: vi.fn().mockResolvedValue({ data: {} }),
      avatar: vi.fn(),
      setContentLanguage: vi.fn(),
    },
  };
});

const CREATED = { data: { id: 'class-1', name: 'P4 华文', subject: 'CHINESE', joinCode: 'XYZ789', corpusAvatarId: 'corpus-avatar-1', characterType: 'MOCHI', studentCount: 0 } };

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateClassModal orgId="org-1" onClose={vi.fn()} onCreated={vi.fn()} />
    </QueryClientProvider>
  );
}

// Drive identity → avatar with a given teaching language, then click Create.
async function createWithLanguage(langValue: string) {
  fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 华文' } });
  fireEvent.change(screen.getByRole('combobox', { name: /Teaching language/i }), { target: { value: langValue } });
  fireEvent.click(screen.getByRole('button', { name: 'Next →' }));                    // identity → avatar
  fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));   // fires createMut
}

describe('CreateClassModal — teaching language', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a Teaching language select defaulting to English', () => {
    renderModal();
    const select = screen.getByRole('combobox', { name: /Teaching language/i }) as HTMLSelectElement;
    expect(select.value).toBe('en');
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '中文 (Simplified)' })).toBeInTheDocument();
  });

  it('creating with zh sets content-language on the corpus avatar BEFORE the upload step is reachable', async () => {
    (api.createClass as ReturnType<typeof vi.fn>).mockResolvedValue(CREATED);
    (api.setContentLanguage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    renderModal();
    // The uploader must NOT be present before creation.
    expect(screen.queryByTestId('mochi-uploader')).not.toBeInTheDocument();

    await createWithLanguage('zh');

    // The language is PATCHed with the corpus avatar id, and it happens before the upload step renders.
    await waitFor(() =>
      expect(api.setContentLanguage).toHaveBeenCalledWith('corpus-avatar-1', 'zh')
    );
    await waitFor(() => expect(screen.getByTestId('mochi-uploader')).toBeInTheDocument());
  });

  it('a failed language PATCH surfaces an error and does NOT advance to upload (not fully configured)', async () => {
    (api.createClass as ReturnType<typeof vi.fn>).mockResolvedValue(CREATED);
    (api.setContentLanguage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    renderModal();

    await createWithLanguage('zh');

    // Loud error, and the class is NOT presented as configured: no uploader, and a retry affordance.
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('mochi-uploader')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry & continue/i })).toBeInTheDocument();
  });

  it('creating with English does NOT call setContentLanguage (corpus avatar is en by default)', async () => {
    (api.createClass as ReturnType<typeof vi.fn>).mockResolvedValue(CREATED);
    renderModal();

    await createWithLanguage('en');

    await waitFor(() => expect(screen.getByTestId('mochi-uploader')).toBeInTheDocument());
    expect(api.setContentLanguage).not.toHaveBeenCalled();
  });
});
