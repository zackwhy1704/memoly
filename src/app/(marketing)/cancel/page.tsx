import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Checkout cancelled — Apalchi',
};

export default function CancelPage() {
  return (
    <div
      data-mkt="1"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(160deg, #f4f0ff 0%, #fff 60%)',
        fontFamily: 'Nunito, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <Image
        src="/mochi-base-transparent.png"
        alt="Mochi"
        width={100}
        height={100}
        style={{ objectFit: 'contain', marginBottom: 24 }}
      />

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
        Checkout cancelled
      </h1>
      <p style={{ fontSize: 14, color: '#6B618A', marginBottom: 32, maxWidth: 360 }}>
        No charge was made. You can pick a plan and try again whenever you&apos;re ready.
      </p>

      <Link
        href="/account/billing"
        style={{
          display: 'inline-block',
          padding: '14px 28px',
          background: '#7042ED',
          color: '#fff',
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 16,
          textDecoration: 'none',
        }}
      >
        Try again
      </Link>
    </div>
  );
}
