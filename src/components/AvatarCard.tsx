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
  const accentHex = avatar.centreAccentColor ?? '#DD5E3A';

  const borderStyle = isCentre
    ? { borderColor: accentHex, borderWidth: 2 }
    : {};

  return (
    <div
      className="bg-panel rounded-xl border border-line hover:border-accent/40 transition-colors p-5"
      style={borderStyle}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-panel2"
          style={isCentre ? { backgroundColor: `${accentHex}20` } : {}}
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-ink text-base truncate">
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
        <div className="bg-panel2 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-accent">{avatar.wikiPageCount ?? 0}</p>
          <p className="text-xs text-ink3 mt-0.5">Wiki pages</p>
        </div>
        <div className="bg-panel2 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-ink2">{avatar.fileCount ?? '—'}</p>
          <p className="text-xs text-ink3 mt-0.5">Files</p>
        </div>
      </div>

      {/* Brain state badge */}
      {avatar.brainState && avatar.brainState !== 'READY' && (
        <div className="mb-3 px-3 py-1.5 bg-warn/10 border border-warn/30 rounded-lg text-xs text-warn flex items-center gap-1.5">
          <span className="animate-spin inline-block">⚙️</span>
          Brain compiling…
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/dashboard/content/analysis?avatarId=${avatar.id}`}
          className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
        >
          View Brain
        </Link>
        <Link
          href={`/dashboard/content/upload?avatarId=${avatar.id}`}
          className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/80 transition-colors"
        >
          Upload
        </Link>
      </div>
    </div>
  );
}
