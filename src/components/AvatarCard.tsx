import Link from 'next/link';
import { Avatar, characterEmoji, subjectColor } from '@/lib/api';

interface AvatarCardProps {
  avatar: Avatar;
}

export default function AvatarCard({ avatar }: AvatarCardProps) {
  const emoji = characterEmoji(avatar.characterType);
  const subjectCls = subjectColor(avatar.subject);
  const isCentre = avatar.centreManaged === true;
  const brandName = avatar.centreBrandName ?? avatar.name;
  const accentHex = avatar.centreAccentColor ?? '#7042ED';

  // Border colour: centre avatars use their accent colour, personal use outline
  const borderStyle = isCentre
    ? { borderColor: accentHex, borderWidth: 2 }
    : {};

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
      style={borderStyle}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: isCentre ? `${accentHex}18` : '#EBE0FF' }}
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base truncate">
              {isCentre ? brandName : avatar.name}
            </h3>
            {isCentre && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded text-white shrink-0"
                style={{ backgroundColor: accentHex }}
              >
                CENTRE
              </span>
            )}
          </div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${subjectCls}`}>
            {avatar.subject}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-[#7042ED]">{avatar.wikiPageCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Wiki pages</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{avatar.fileCount ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">Files</p>
        </div>
      </div>

      {/* Brain state badge */}
      {avatar.brainState && avatar.brainState !== 'READY' && (
        <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-1.5">
          <span className="animate-spin inline-block">⚙️</span>
          Brain compiling…
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/dashboard/analysis?avatarId=${avatar.id}`}
          className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-[#EBE0FF] text-[#7042ED] hover:bg-[#7042ED] hover:text-white transition-colors"
        >
          View Brain
        </Link>
        {!isCentre && (
          <Link
            href={`/dashboard/upload?avatarId=${avatar.id}`}
            className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-[#7042ED] text-white hover:bg-[#5a35c4] transition-colors"
          >
            Upload
          </Link>
        )}
        {isCentre && (
          <Link
            href={`/dashboard/upload?avatarId=${avatar.id}`}
            className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: accentHex }}
          >
            Upload Content
          </Link>
        )}
      </div>
    </div>
  );
}
