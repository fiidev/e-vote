"use client";

import { useActionState, useRef, useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { castVoteAction } from "@/app/actions/voting";
import type { VoteActionState } from "@/app/actions/voting";
import {
  CandidateCard,
  type CandidateCardData,
} from "@/components/public/candidate-card";
import { ErrorAlert } from "@/components/public/error-alert";

/**
 * Langkah 2 — Pilih kandidat.
 * - Kartu kandidat dari server (getActiveElection)
 * - "Pilih" → ConfirmDialog → submit castVoteAction (hidden candidateId)
 * - "Visi Misi" → Dialog detail visi/misi
 * - Navigasi pakai router.replace (anti tombol Back) — redirect di action.
 */
export function VoteClient({ candidates }: { candidates: CandidateCardData[] }) {
  const [state, formAction, isPending] = useActionState(castVoteAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<CandidateCardData | null>(null);
  const [visionCandidate, setVisionCandidate] = useState<CandidateCardData | null>(null);

  const confirm = () => {
    if (selected) formRef.current?.requestSubmit();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Pilih Kandidat
        </h1>
        <p className="text-sm text-ink-muted">
          Pilih salah satu kandidat, lalu konfirmasi pilihanmu.
        </p>
      </div>

      {state?.error && <ErrorAlert code={state.error} />}

      <form ref={formRef} action={formAction} className="hidden" aria-hidden="true">
        <input type="hidden" name="candidateId" value={selected?.candidate_id ?? ""} />
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.candidate_id}
            candidate={candidate}
            onShowVision={setVisionCandidate}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Konfirmasi pilihan */}
      <Dialog isOpen={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogHeader>
          <DialogTitle>Konfirmasi Pilihan</DialogTitle>
          <DialogDescription>
            Kamu memilih{" "}
            <span className="font-semibold text-ink">
              {selected?.name}
            </span>{" "}
            — nomor urut {selected?.candidate_number}. Pilihan tidak bisa
            diubah setelah dikirim.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onPress={() => setSelected(null)}>
            Batal
          </Button>
          <Button onPress={confirm} isDisabled={isPending}>
            {isPending ? "Mengirim…" : "Ya, Pilih Ini"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Visi & Misi */}
      <Dialog
        isOpen={visionCandidate !== null}
        onOpenChange={(open) => !open && setVisionCandidate(null)}
      >
        <DialogHeader>
          <DialogTitle>
            Visi &amp; Misi — {visionCandidate?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-sm text-ink">
          <section className="flex flex-col gap-1">
            <h3 className="font-semibold text-ink">Visi</h3>
            <p className="text-ink-muted">{visionCandidate?.vision}</p>
          </section>
          <section className="flex flex-col gap-1">
            <h3 className="font-semibold text-ink">Misi</h3>
            <p className="whitespace-pre-line text-ink-muted">
              {visionCandidate?.mission}
            </p>
          </section>
        </div>
        <DialogFooter>
          <Button onPress={() => setVisionCandidate(null)}>Tutup</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}