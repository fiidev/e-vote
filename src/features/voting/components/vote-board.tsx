"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
import { VotingStepper } from "@/features/voting/components/voting-stepper";
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

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  useEffect(() => {
    if (state?.error) {
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

  const isDuel = candidates.length <= 2;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-2.5 sm:p-6 overflow-x-hidden">
      <div className="relative w-full max-w-[1400px] min-h-[640px] sm:min-h-[760px] rounded-[32px] sm:rounded-[60px] overflow-hidden bg-orange-100 flex flex-col justify-between p-4 sm:p-8 md:p-10 shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-[-24px] sm:left-[-54px] bottom-0 w-44 sm:w-64 lg:w-80 h-auto object-cover opacity-15 sm:opacity-20 pointer-events-none select-none z-0"
        />

        <div className="flex flex-col items-center gap-3 z-10">
          <VotingStepper currentStep={2} />

          <div className="text-center max-w-2xl px-2 sm:px-4">
            <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold text-cyan-950 tracking-tight">
              Pilih Kandidat
            </h1>
            <p className="font-heading text-xs sm:text-base md:text-lg font-light text-cyan-950/80 tracking-wide mt-1">
              {organizationName
                ? `${electionTitle ?? "Pemilihan"} — ${organizationName} (${candidates.length} Calon)`
                : "Pilih salah satu kandidat di bawah untuk memberikan suara."}
            </p>
          </div>
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

        <div className="flex-1 w-full my-3 sm:my-4 z-10 flex flex-col items-center justify-center">
          {isDuel ? (
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 w-full max-w-4xl py-2">
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
          ) : (
            <div className="w-full max-w-5xl px-2 sm:px-14 relative flex flex-col items-center">
              <Carousel
                setApi={setApi}
                opts={{
                  align: "start",
                  dragFree: false,
                }}
                className="w-full py-2"
              >
                <CarouselContent className="-ml-3 sm:-ml-6">
                  {candidates.map((candidate) => (
                    <CarouselItem
                      key={candidate.candidate_id}
                      className="pl-3 sm:pl-6 basis-auto flex justify-center"
                    >
                      <CandidateCard
                        candidate={candidate}
                        onShowVision={setVisionCandidate}
                        onSelect={setSelected}
                        isSelected={
                          selected?.candidate_id === candidate.candidate_id
                        }
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="size-9 sm:size-11 left-0 sm:-left-8 bg-white/90 hover:bg-cyan-950 hover:text-white border border-cyan-950/15 shadow-md" />
                <CarouselNext className="size-9 sm:size-11 right-0 sm:-right-8 bg-white/90 hover:bg-cyan-950 hover:text-white border border-cyan-950/15 shadow-md" />
              </Carousel>

              {count > 1 && (
                <div className="flex items-center gap-1.5 mt-3">
                  {Array.from({ length: count }, (_, idx) => `dot-${idx}`).map(
                    (dotId, idx) => (
                      <button
                        key={dotId}
                        type="button"
                        onClick={() => api?.scrollTo(idx)}
                        aria-label={`Slide ${idx + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          current === idx + 1
                            ? "w-6 bg-cyan-950 shadow-xs"
                            : "w-2 bg-cyan-950/20 hover:bg-cyan-950/40"
                        }`}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full flex justify-end items-center z-10 pt-2">
          <Button
            type="button"
            onPress={() => setConfirmOpen(true)}
            isDisabled={!selected || isPending}
            className="w-full sm:w-auto h-12 px-8 rounded-full bg-cyan-950 text-white font-heading text-lg font-semibold tracking-wide hover:bg-cyan-900 disabled:opacity-40 transition-colors duration-150 cursor-pointer shadow-md"
          >
            {isPending ? "Mengirim…" : "Kirim Pilihan ➔"}
          </Button>
        </div>

        <Dialog
          isOpen={confirmOpen && selected !== null}
          onOpenChange={setConfirmOpen}
        >
          <DialogHeader>
            <DialogTitle>Konfirmasi Pilihan Suara</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memilih{" "}
              <span className="font-bold text-ink">
                #{selected?.candidate_number} {selected?.name}
              </span>
              ? Pilihan bersifat rahasia dan tidak dapat diubah setelah
              dikirimkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setConfirmOpen(false)}
              isDisabled={isPending}
            >
              Batal
            </Button>
            <Button onPress={confirm} isDisabled={isPending}>
              {isPending ? "Mengirim Suara…" : "Ya, Kirim Suara"}
            </Button>
          </DialogFooter>
        </Dialog>

        <Dialog
          isOpen={visionCandidate !== null}
          onOpenChange={(open) => !open && setVisionCandidate(null)}
        >
          <DialogHeader>
            <DialogTitle>
              Visi &amp; Misi — #{visionCandidate?.candidate_number}{" "}
              {visionCandidate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm text-ink max-h-[60vh] overflow-y-auto pr-1">
            <section className="bg-stone-50 p-4 rounded-xl border border-line">
              <h3 className="font-bold text-ink text-xs uppercase tracking-wider text-cyan-950 mb-1">
                Visi
              </h3>
              <p className="text-ink-muted leading-relaxed">
                {visionCandidate?.vision}
              </p>
            </section>
            <section className="bg-stone-50 p-4 rounded-xl border border-line">
              <h3 className="font-bold text-ink text-xs uppercase tracking-wider text-cyan-950 mb-1">
                Misi
              </h3>
              <p className="whitespace-pre-line text-ink-muted leading-relaxed">
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
