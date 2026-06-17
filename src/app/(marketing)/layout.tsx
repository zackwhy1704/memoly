import type { ReactNode } from 'react';
import { Fredoka, Nunito } from 'next/font/google';
import './marketing.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
});

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`mkt-root ${fredoka.variable} ${nunito.variable}`}
      data-mkt="1"
    >
      {children}
    </div>
  );
}
