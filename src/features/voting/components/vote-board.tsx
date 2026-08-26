"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { castVoteAction } from "@/features/voting/actions";
import {
  CandidateCard,
  type CandidateCardData,
} from "@/features/voting/components/candidate-card";
import { voteErrorMessage } from "@/features/voting/error-messages";

export function VoteBoard({
  candidates,
  organizationName,
  electionTitle,
}: {
  candidates: CandidateCardData[];
  organizationName?: string;
  electionTitle?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    castVoteAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<CandidateCardData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [visionCandidate, setVisionCandidate] =
    useState<CandidateCardData | null>(null);

  useEffect(() => {
    if (state?.error) {
      // Session expired → redirect otomatis ke verify
      if (state.error === "NO_VOTE_SESSION") {
        toast.error(voteErrorMessage(state.error), { id: "vote-error" });
        router.replace("/verify");
        return;
      }
      toast.error(voteErrorMessage(state.error), { id: "vote-error" });
    }
  }, [state?.error, router]);

  const confirm = () => {
    if (selected) {
      setConfirmOpen(false);
      formRef.current?.requestSubmit();
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 overflow-hidden">
      <div className="relative w-full max-w-[1400px] h-[800px] rounded-[70px] overflow-hidden mx-6">
        <div className="absolute inset-0 bg-orange-100 rounded-[70px]" />

        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-[-54px] top-[402px] w-96 h-[618px] object-cover opacity-60"
        />

        <div className="absolute top-[134px] left-1/2 -translate-x-1/2 flex items-center">
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Selesai"
            >
              <title>Selesai</title>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div className="h-1 w-28 bg-ink" />
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            2
          </span>
          <div className="h-1 w-28 bg-muted" />
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-ink-muted text-xs font-bold">
            3
          </span>
        </div>

        <div className="absolute left-1/2 top-[219px] -translate-x-1/2 w-[851px] text-center">
          <h1 className="font-heading text-6xl font-bold text-cyan-950 tracking-wide">
            Pilih Kandidat
          </h1>
          <p className="font-heading text-xl font-light text-cyan-950 tracking-wide mt-2">
            {organizationName
              ? `${electionTitle ?? "Pemilihan"} — ${organizationName}`
              : "Kenali dulu kandidatnya sebelum vote.."}
          </p>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="hidden"
          aria-hidden="true"
        >
          <input
            type="hidden"
            name="candidateId"
            value={selected?.candidate_id ?? ""}
          />
        </form>

        <div className="absolute left-[167px] top-[382px] w-[1066px] flex gap-[42px]">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.candidate_id}
              candidate={candidate}
              onShowVision={setVisionCandidate}
              onSelect={setSelected}
              isSelected={selected?.candidate_id === candidate.candidate_id}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!selected || isPending}
          className="absolute right-[49px] bottom-[45px] h-14 w-32 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ease-out active:scale-95 hover:shadow-lg cursor-pointer"
        >
          {isPending ? "Mengirim…" : "Kirim"}
        </button>

        <Dialog
          isOpen={confirmOpen && selected !== null}
          onOpenChange={setConfirmOpen}
        >
          <DialogHeader>
            <DialogTitle>Konfirmasi Pilihan</DialogTitle>
            <DialogDescription>
              Kamu memilih{" "}
              <span className="font-semibold text-ink">{selected?.name}</span> —
              nomor urut {selected?.candidate_number}. Pilihan tidak bisa diubah
              setelah dikirim.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button onPress={confirm} isDisabled={isPending}>
              {isPending ? "Mengirim…" : "Ya, Kirim"}
            </Button>
          </DialogFooter>
        </Dialog>

        <Dialog
          isOpen={visionCandidate !== null}
          onOpenChange={(open) => !open && setVisionCandidate(null)}
        >
          <DialogHeader>
            <DialogTitle>Visi &amp; Misi — {visionCandidate?.name}</DialogTitle>
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
    </main>
  );
}
