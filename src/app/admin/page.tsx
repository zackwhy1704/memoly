'use client';

import Link from 'next/link';

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Platform overview</h1>
        <p className="text-ink3 text-sm mt-1">Manage centres, users, and invites.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card href="/admin/centres" title="Centres" description="View all organisations and create invite tokens." />
        <Card href="/admin/users" title="Users" description="Browse all user accounts and their subscription status." />
        <Card href="/admin/safety" title="Safety flags" description="Review flagged content and moderation actions." />
      </div>
    </div>
  );
}

function Card({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-surface border border-line p-5 hover:border-accent hover:shadow-sm transition"
    >
      <p className="font-bold text-ink mb-1">{title}</p>
      <p className="text-xs text-ink3 leading-relaxed">{description}</p>
    </Link>
  );
}
