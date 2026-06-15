/**
 * Tests for the split components under src/app/review/[token]/_components/
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Header } from '@/app/review/[token]/_components/Header';
import { LoadingCard } from '@/app/review/[token]/_components/LoadingCard';
import { SuccessCard } from '@/app/review/[token]/_components/SuccessCard';
import { GoneCard } from '@/app/review/[token]/_components/GoneCard';
import { MessageCard } from '@/app/review/[token]/_components/MessageCard';
import { ReviewBody } from '@/app/review/[token]/_components/ReviewBody';
import { type ReviewContent } from '@/lib/review-api';

// ── Header ──────────────────────────────────────────────────────────────────

describe('Header', () => {
  it('renders the app name', () => {
    render(<Header />);
    expect(screen.getByText('Apalchi')).toBeInTheDocument();
  });

  it('renders the review invitation text', () => {
    render(<Header />);
    expect(
      screen.getByText('A student asked you to check this study guide.')
    ).toBeInTheDocument();
  });
});

// ── LoadingCard ──────────────────────────────────────────────────────────────

describe('LoadingCard', () => {
  it('renders without crashing', () => {
    render(<LoadingCard />);
  });

  it('contains the loading message', () => {
    render(<LoadingCard />);
    expect(screen.getByText('Loading the study guide…')).toBeInTheDocument();
  });
});

// ── SuccessCard ──────────────────────────────────────────────────────────────

describe('SuccessCard', () => {
  it('renders the thank-you heading', () => {
    render(<SuccessCard />);
    expect(screen.getByText("Thanks — we've let them know!")).toBeInTheDocument();
  });

  it('shows the feedback-sent confirmation', () => {
    render(<SuccessCard />);
    expect(
      screen.getByText('Your feedback has been sent to the student.')
    ).toBeInTheDocument();
  });

  it('contains a Learn more link pointing to apalchi.com', () => {
    render(<SuccessCard />);
    const link = screen.getByRole('link', { name: /Learn more/ });
    expect(link).toHaveAttribute('href', 'https://apalchi.com');
  });
});

// ── MessageCard ──────────────────────────────────────────────────────────────

describe('MessageCard', () => {
  it('renders the emoji, title and body props', () => {
    render(<MessageCard emoji="🚀" title="All done" body="Nothing to do here." />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All done' })).toBeInTheDocument();
    expect(screen.getByText('Nothing to do here.')).toBeInTheDocument();
  });
});

// ── GoneCard ─────────────────────────────────────────────────────────────────

describe('GoneCard', () => {
  it('shows the expired title when status is EXPIRED', () => {
    render(<GoneCard status="EXPIRED" />);
    expect(screen.getByText('This link has expired')).toBeInTheDocument();
    expect(screen.getByText('Ask them to send a fresh one.')).toBeInTheDocument();
  });

  it('shows the already-reviewed title when status is APPROVED', () => {
    render(<GoneCard status="APPROVED" />);
    expect(screen.getByText('This guide has already been reviewed')).toBeInTheDocument();
  });

  it('shows the already-reviewed title when status is FLAGGED', () => {
    render(<GoneCard status="FLAGGED" />);
    expect(screen.getByText('This guide has already been reviewed')).toBeInTheDocument();
  });

  it('shows the no-longer-active title when status is REVOKED', () => {
    render(<GoneCard status="REVOKED" />);
    expect(
      screen.getByText('This review link is no longer active.')
    ).toBeInTheDocument();
  });

  it('shows the default inactive title for an unknown status', () => {
    render(<GoneCard status="UNKNOWN_XYZ" />);
    expect(
      screen.getByText('This review link is no longer active.')
    ).toBeInTheDocument();
  });
});

// ── ReviewBody ────────────────────────────────────────────────────────────────

const sampleContent: ReviewContent = {
  pageTitle: 'Chapter 3 Summary',
  subject: 'Science',
  contentMarkdown: 'Photosynthesis converts sunlight into energy.',
  status: 'PENDING',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('ReviewBody', () => {
  it('renders the page title and subject', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    expect(screen.getByText('Chapter 3 Summary')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
  });

  it('renders the content markdown as text', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    expect(
      screen.getByText(/Photosynthesis converts sunlight into energy/)
    ).toBeInTheDocument();
  });

  it('shows the "Does this look accurate?" prompt', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    expect(screen.getByText('Does this look accurate?')).toBeInTheDocument();
  });

  it('shows Looks good and Something\'s off buttons in idle mode', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Looks good/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Something/ })).toBeInTheDocument();
  });

  it('clicking "Looks good" reveals the Confirm button and Back button', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Looks good/ }));
    expect(screen.getByRole('button', { name: /Confirm — looks good/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('clicking "Something\'s off" reveals the note textarea and Send feedback button', () => {
    render(
      <ReviewBody
        token="tok-abc"
        content={sampleContent}
        onDone={vi.fn()}
        onGone={vi.fn()}
        onNotFound={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Something/ }));
    expect(
      screen.getByPlaceholderText(/e\.g\. The date for the second event/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeInTheDocument();
  });
});
