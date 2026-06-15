export function MessageCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 text-center">
      <span className="text-4xl">{emoji}</span>
      <h2 className="text-lg font-bold text-ink mt-3">{title}</h2>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
