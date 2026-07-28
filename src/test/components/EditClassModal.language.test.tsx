import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditClassModal from '@/app/dashboard/classes/modals/EditClassModal';
import { api } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      avatar: vi.fn(),
      updateClass: vi.fn().mockResolvedValue({ data: {} }),
      setContentLanguage: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
});

const CLS = {
  id: 'class-1', name: 'P4 华文', subject: 'CHINESE', level: 'P4', joinCode: 'X', corpusAvatarId: 'corpus-avatar-1',
  characterType: 'MOCHI', brandName: null, accentColor: null, examDate: null,
  cosmeticEyewear: null, cosmeticClothes: null, cosmeticShoes: null, studentCount: 0,
} as unknown as Parameters<typeof EditClassModal>[0]['cls'];

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EditClassModal orgId="org-1" cls={CLS} onClose={vi.fn()} onSaved={vi.fn()} />
    </QueryClientProvider>
  );
}

describe('EditClassModal — teaching language round-trip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills the select from the corpus avatar content_language', async () => {
    (api.avatar as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { contentLanguage: 'zh' } });
    renderModal();
    const select = () => screen.getByRole('combobox', { name: /Teaching language/i }) as HTMLSelectElement;
    await waitFor(() => expect(select().value).toBe('zh'));
    expect(api.avatar).toHaveBeenCalledWith('corpus-avatar-1');
  });

  it('changing the language and saving PATCHes content-language with the new value', async () => {
    (api.avatar as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { contentLanguage: 'zh' } });
    renderModal();
    const select = screen.getByRole('combobox', { name: /Teaching language/i }) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('zh'));

    fireEvent.change(select, { target: { value: 'en' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(api.updateClass).toHaveBeenCalled());
    await waitFor(() => expect(api.setContentLanguage).toHaveBeenCalledWith('corpus-avatar-1', 'en'));
  });

  it('saving WITHOUT changing the language does NOT PATCH content-language', async () => {
    (api.avatar as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { contentLanguage: 'zh' } });
    renderModal();
    const select = screen.getByRole('combobox', { name: /Teaching language/i }) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('zh'));

    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(api.updateClass).toHaveBeenCalled());
    expect(api.setContentLanguage).not.toHaveBeenCalled();
  });
});
