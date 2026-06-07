import Link from 'next/link';
import { Avatar } from '@/lib/api';

const CHARACTER_EMOJI: Record<string, string> = {
  MOCHI: '🐻',
  NOMI: '🐰',
  ZUZU: '👻',
  BOLT: '🦖',
  LUMI: '🦊',
  QUILL: '👾',
  FERN: '🍄',
  CLEO: '🐱',
  PIKO: '🌈',
  FIZZ: '🫧',
  TANKO: '🤖',
  WISP: '🔥',
};

const SUBJECT_COLOR: Record<string, string> = {
  MATH: 'bg-blue-100 text-blue-700',
  SCIENCE: 'bg-green-100 text-green-700',
  ENGLISH: 'bg-purple-100 text-purple-700',
  HISTORY: 'bg-amber-100 text-amber-700',
  GEOGRAPHY: 'bg-teal-100 text-teal-700',
  CHEMISTRY: 'bg-red-100 text-red-700',
  PHYSICS: 'bg-indigo-100 text-indigo-700',
  BIOLOGY: 'bg-emerald-100 text-emerald-700',
};

interface AvatarCardProps {
  avatar: Avatar;
}

export default function AvatarCard({ avatar }: AvatarCardProps) {
  const emoji = CHARACTER_EMOJI[avatar.characterType] ?? '🐾';
  const subjectColor = SUBJECT_COLOR[avatar.subject] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-[#EBE0FF] flex items-center justify-center text-2xl flex-shrink-0">
          {emoji}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-base truncate">{avatar.name}</h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${subjectColor}`}>
            {avatar.subject}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-[#7042ED]">{avatar.wikiPageCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Wiki pages</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">—</p>
          <p className="text-xs text-gray-500 mt-0.5">Students</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/dashboard/analysis?avatarId=${avatar.id}`}
          className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-[#EBE0FF] text-[#7042ED] hover:bg-[#7042ED] hover:text-white transition-colors"
        >
          View Analysis
        </Link>
        <Link
          href={`/dashboard/upload?avatarId=${avatar.id}`}
          className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-[#7042ED] text-white hover:bg-[#5a35c4] transition-colors"
        >
          Upload
        </Link>
      </div>
    </div>
  );
}
