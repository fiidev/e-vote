/** Kartu kandidat — presentational, dipakai di CandidateGrid (vote). */
export interface CandidateCardData {
  candidate_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  vision: string;
  mission: string;
}

export function CandidateCard({
  candidate,
  onShowVision,
  onSelect,
}: {
  candidate: CandidateCardData;
  onShowVision: (candidate: CandidateCardData) => void;
  onSelect: (candidate: CandidateCardData) => void;
}) {
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-peach shadow-[var(--shadow-otp)]">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-ink/5">
        {candidate.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photo_url}
            alt={`Foto ${candidate.name}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="font-heading text-5xl font-bold text-ink/40">
            {initials}
          </span>
        )}
        <span className="absolute top-3 left-3 inline-flex size-10 items-center justify-center rounded-full bg-ink font-heading text-lg font-bold text-white">
          {candidate.candidate_number}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-ink">
            {candidate.name}
          </h3>
          <p className="text-sm text-ink-muted">{candidate.class_name}</p>
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => onShowVision(candidate)}
            className="h-10 flex-1 rounded-full border border-line bg-surface text-sm font-medium text-ink transition-colors hover:bg-surface/70"
          >
            Visi Misi
          </button>
          <button
            type="button"
            onClick={() => onSelect(candidate)}
            className="h-10 flex-1 rounded-full bg-ink text-sm font-semibold text-white transition-colors hover:bg-ink/90"
          >
            Pilih
          </button>
        </div>
      </div>
    </article>
  );
}