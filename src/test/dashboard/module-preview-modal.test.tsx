import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModulePreviewModal } from '@/app/dashboard/classes/[classId]/components/ModulePreviewModal';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    moduleContentPreview: vi.fn(),
    regenerateContent: vi.fn(),
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ModulePreviewModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the real module content grouped by stage (the "review the lessons" claim)', async () => {
    (api.moduleContentPreview as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 'a', stage: 'LEARN', type: 'MICRO_CARD', sortOrder: 0, contentJson: JSON.stringify({ title: 'Chloroplasts', body: 'Where photosynthesis happens.' }) },
        { id: 'b', stage: 'TEST', type: 'HOT_TAKE', sortOrder: 0, contentJson: JSON.stringify({ statement: 'Plants eat soil for energy.' }) },
      ],
    });

    wrap(
      <ModulePreviewModal orgId="o" classId="c" moduleId="m" moduleTitle="Intro to Plants" wikiSlug="s" onClose={() => {}} />,
    );

    await waitFor(() => expect(screen.getByText('Chloroplasts')).toBeInTheDocument());
    expect(screen.getByText('Where photosynthesis happens.')).toBeInTheDocument();
    expect(screen.getByText('Plants eat soil for energy.')).toBeInTheDocument();
    // Grouped by stage.
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    // Regenerate reuses the existing content-regenerate path.
    expect(screen.getByRole('button', { name: /regenerate this module/i })).toBeInTheDocument();
    // The payload never carries answerJson (guaranteed by the backend + the type), so no
    // gradeable answer keys can be rendered; the modal states "No answers shown."
    expect(screen.getByText(/no answers shown/i)).toBeInTheDocument();
  });
});
