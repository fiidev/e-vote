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
  isSelected,
}: {
  candidate: CandidateCardData;
  onShowVision: (candidate: CandidateCardData) => void;
  onSelect: (candidate: CandidateCardData) => void;
  isSelected?: boolean;
}) {
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      className={`relative w-[512px] h-64 bg-peach rounded-3xl overflow-hidden flex cursor-pointer transition-all text-left ${
        isSelected
          ? "ring-4 ring-cyan-950"
          : "hover:ring-2 hover:ring-cyan-950/40"
      }`}
    >
      <div className="relative w-48 h-64 shrink-0">
        {candidate.photo_url ? (
          // biome-ignore lint/performance/noImgElement: dynamic URL from DB
          <img
            src={candidate.photo_url}
            alt={`Foto ${candidate.name}`}
            className="w-48 h-64 rounded-3xl object-cover"
          />
        ) : (
          <div className="w-48 h-64 rounded-3xl bg-ink/5 flex items-center justify-center">
            <span className="font-heading text-5xl font-bold text-ink/40">
              {initials}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center pl-14 pr-6 gap-1">
        <span className="text-xl font-bold text-cyan-950 font-heading tracking-wide">
          Kandidat {String(candidate.candidate_number).padStart(2, "0")}
        </span>
        <h3 className="text-3xl font-bold text-cyan-950 font-heading tracking-wide">
          {candidate.name}
        </h3>
        <p className="text-xl font-normal text-cyan-950 font-heading tracking-wide">
          {candidate.class_name}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowVision(candidate);
          }}
          className="mt-4 h-14 w-60 rounded-full border-2 border-cyan-950 bg-transparent text-cyan-950 text-xl font-semibold font-heading capitalize tracking-wide transition-colors hover:bg-cyan-950/10"
        >
          Lihat Visi &amp; Misi
        </button>
      </div>
    </button>
  );
}
