'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ClassAvatar from '@/components/ClassAvatar';

/** Fetches a single avatar DTO and renders its server-derived class uniform. */
export default function CreatedClassAvatar({ avatarId }: { avatarId: string }) {
  const query = useQuery({
    queryKey: ['avatar', avatarId],
    queryFn: () => api.avatar(avatarId),
  });
  const appearance = query.data?.data.appearance;
  if (!appearance) return null;
  return <ClassAvatar appearance={appearance} size={48} />;
}
