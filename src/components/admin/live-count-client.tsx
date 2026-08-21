"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface CandidateLive {
  candidate_id: string;
  candidate_number: number;
  name: string;
  class_name: string;
  photo_url: string;
  votes: number;
  percentage: number;
}

interface LiveData {
  electionId: string;
  electionTitle: string;
  candidates: CandidateLive[];
  totalVotes: number;
}

interface Props {
  elections: Array<{ election_id: string; title: string }>;
  defaultElectionId?: string;
}

export function LiveCountClient({ elections, defaultElectionId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultElectionId ?? "");
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!selectedId) return;

    let eventSource: EventSource | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      eventSource = new EventSource(
        `/api/admin/live-count?election_id=${selectedId}`,
      );

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.error) {
            setError(parsed.error);
          } else {
            setData(parsed);
            setError(null);
          }
          retryRef.current = 0;
        } catch {
          // Parse error
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
        retryRef.current++;
        timeout = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      if (timeout) clearTimeout(timeout);
    };
  }, [selectedId]);

  if (error === "NO_ELECTION") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface">
        <p className="text-ink-muted text-lg">Belum ada pemilihan aktif.</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface">
        <p className="text-ink-muted text-lg">Menghubungkan...</p>
      </main>
    );
  }

  const [left, right] = data.candidates;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 overflow-hidden">
      <div className="relative w-full max-w-[1400px] h-[800px] rounded-[70px] overflow-hidden mx-6">
        <div className="absolute inset-0 bg-orange-100 rounded-[70px]" />

        {/* Election selector — hanya tampil jika >1 election */}
        {elections.length > 1 && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
            <Select
              selectedKey={selectedId}
              onSelectionChange={(key) => setSelectedId(String(key))}
              aria-label="Pilih pemilihan"
            >
              <SelectTrigger
                className="w-72 bg-white/80 backdrop-blur"
                aria-label="Pilih pemilihan untuk live count"
              />
              <SelectContent>
                {elections.map((e) => (
                  <SelectItem key={e.election_id} id={e.election_id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Title */}
        <div className="absolute left-1/2 top-[119px] -translate-x-1/2 w-[851px] text-center">
          <h1 className="font-heading text-6xl font-bold text-cyan-950 tracking-wide">
            Live Count
          </h1>
          <p className="font-heading text-xl font-light text-cyan-950 tracking-wide mt-2">
            {data.electionTitle}
          </p>
        </div>

        {/* Candidate Cards */}
        <div className="absolute left-[167px] top-[300px] w-[1066px] flex gap-[42px]">
          {left && (
            <div className="relative w-[512px] h-64 bg-peach rounded-3xl overflow-hidden flex">
              {left.photo_url ? (
                <Image
                  src={left.photo_url}
                  alt={left.name}
                  className="w-48 h-64 rounded-3xl object-cover"
                />
              ) : (
                <div className="w-48 h-64 rounded-3xl bg-ink/5 flex items-center justify-center shrink-0">
                  <span className="font-heading text-5xl font-bold text-ink/40">
                    {left.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col justify-center pl-14 pr-6 w-full">
                <span className="text-xl font-bold text-cyan-950 font-heading tracking-wide">
                  Kandidat {String(left.candidate_number).padStart(2, "0")}
                </span>
                <h3 className="text-3xl font-bold text-cyan-950 font-heading tracking-wide">
                  {left.name}
                </h3>
                <p className="text-xl text-cyan-950 font-heading tracking-wide">
                  {left.class_name}
                </p>
                <p className="text-3xl font-bold text-cyan-950 font-heading tracking-wide mt-4">
                  {left.percentage}%
                </p>
              </div>
            </div>
          )}

          {right && (
            <div className="relative w-[512px] h-64 bg-peach rounded-3xl overflow-hidden flex flex-row-reverse">
              {right.photo_url ? (
                <Image
                  src={right.photo_url}
                  alt={right.name}
                  className="w-48 h-64 rounded-3xl object-cover"
                />
              ) : (
                <div className="w-48 h-64 rounded-3xl bg-ink/5 flex items-center justify-center shrink-0">
                  <span className="font-heading text-5xl font-bold text-ink/40">
                    {right.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col justify-center items-end pr-14 pl-6 w-full text-right">
                <span className="text-xl font-bold text-cyan-950 font-heading tracking-wide">
                  Kandidat {String(right.candidate_number).padStart(2, "0")}
                </span>
                <h3 className="text-3xl font-bold text-cyan-950 font-heading tracking-wide">
                  {right.name}
                </h3>
                <p className="text-xl text-cyan-950 font-heading tracking-wide">
                  {right.class_name}
                </p>
                <p className="text-3xl font-bold text-cyan-950 font-heading tracking-wide mt-4">
                  {right.percentage}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute left-[182px] top-[606px] w-[1024px] h-9 rounded-[64px] overflow-hidden bg-muted flex">
          {left && (
            <div
              className="h-full bg-cyan-950 rounded-[64px] transition-all duration-700 ease-out"
              style={{ width: `${left.percentage}%` }}
            />
          )}
          {right && (
            <div
              className="h-full bg-amber-500 rounded-[64px] transition-all duration-700 ease-out"
              style={{ width: `${right.percentage}%` }}
            />
          )}
        </div>

        <p className="absolute left-1/2 bottom-[40px] -translate-x-1/2 text-ink-muted text-sm">
          Total suara masuk: {data.totalVotes}
        </p>
      </div>
    </main>
  );
}
