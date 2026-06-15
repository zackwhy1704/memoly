'use client';

import { useState } from 'react';
import { mochiFor } from '@/lib/centre-mochis';

export default function MochiBadge({
  characterType,
  size = 40,
}: {
  characterType: string;
  size?: number;
}) {
  const m = mochiFor(characterType);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span style={{ fontSize: size * 0.7 }}>{m.emoji}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.image}
      alt={m.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="object-contain"
    />
  );
}
