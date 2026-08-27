"use client";

import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export interface CandidateCardData {
  candidate_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  vision: string;
  mission: string;
}

interface CandidateCardProps {
  candidate: CandidateCardData;
  onShowVision: (candidate: CandidateCardData) => void;
  onSelect: (candidate: CandidateCardData) => void;
  isSelected?: boolean;
}

export function CandidateCard({
  candidate,
  onShowVision,
  onSelect,
  isSelected,
}: CandidateCardProps) {
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const formattedNumber = String(candidate.candidate_number).padStart(2, "0");

  return (
    // biome-ignore lint/a11y/useSemanticElements: interactive candidate card containing modal trigger
    <div
      role="radio"
      aria-checked={Boolean(isSelected)}
      tabIndex={0}
      onClick={() => onSelect(candidate)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(candidate);
        }
      }}
      className={`group relative w-72 h-[384px] shrink-0 rounded-3xl overflow-hidden cursor-pointer select-none border-3 transition-colors duration-150 ${
        isSelected
          ? "border-cyan-950 ring-2 ring-cyan-950/30 shadow-lg"
          : "border-transparent hover:border-cyan-950/40 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Full Poster Photo */}
      <div className="absolute inset-0 bg-stone-200">
        {candidate.photo_url ? (
          // biome-ignore lint/performance/noImgElement: dynamic user-uploaded URL
          <img
            src={candidate.photo_url}
            alt={`Foto ${candidate.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-peach text-cyan-950/40">
            <span className="font-heading text-6xl font-bold">{initials}</span>
            <span className="text-xs font-mono font-bold mt-2 text-cyan-950/60">
              #{formattedNumber}
            </span>
          </div>
        )}
      </div>

      {/* Top Overlay Badges */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-cyan-950 text-white font-mono text-xs font-bold px-3 py-1 rounded-full shadow-md">
          #{formattedNumber}
        </div>
        {isSelected && (
          <div className="inline-flex items-center gap-1.5 bg-cyan-950 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md font-heading">
            <CheckCircle2 className="size-3.5" />
            Terpilih
          </div>
        )}
      </div>

      {/* Candidate Details Overlay */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-black/5 z-10 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-cyan-950/70 font-heading uppercase tracking-wider">
            Kandidat {formattedNumber}
          </p>
          <h3 className="text-lg font-bold text-cyan-950 font-heading tracking-tight truncate">
            {candidate.name}
          </h3>
          <p className="text-xs font-light text-cyan-950/80 font-heading truncate">
            {candidate.class_name}
          </p>
        </div>

        {/* Arrow Button for Vision & Mission */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowVision(candidate);
          }}
          aria-label={`Lihat visi & misi ${candidate.name}`}
          title="Lihat Visi & Misi"
          className="size-9 rounded-full bg-cyan-950/5 hover:bg-cyan-950 hover:text-white text-cyan-950 flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer"
        >
          <ArrowUpRight className="size-4.5" />
        </button>
      </div>
    </div>
  );
}
