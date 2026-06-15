import { useQuery } from '@tanstack/react-query';
import { type ClassAvatarAppearance, api } from '@/lib/api';

/** Builds a map of avatarId → server-derived appearance for CENTRE_CLASS avatars. */
export function useClassAvatarMap(): Map<string, ClassAvatarAppearance> {
  const query = useQuery({
    queryKey: ['avatars'],
    queryFn: () => api.avatars(),
  });
  const map = new Map<string, ClassAvatarAppearance>();
  for (const a of query.data?.data?.avatars ?? []) {
    if (a.kind === 'CENTRE_CLASS' && a.appearance) {
      map.set(a.id, a.appearance);
    }
  }
  return map;
}
