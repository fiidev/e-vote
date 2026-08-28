"use client";

import { Crown, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

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
  className?: string;
}

export function LiveCountClient({
  elections,
  defaultElectionId,
  className,
}: Props) {
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

  if (error === "NO_ELECTION" || elections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Live Count
          </h1>
          <p className="text-sm text-muted-foreground">
            Siaran langsung perolehan suara pemilihan secara real-time.
          </p>
        </div>
        <EmptyState
          title="Belum ada pemilihan aktif"
          description="Silakan aktifkan sesi pemilihan terlebih dahulu di menu Pemilihan."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Live Count
          </h1>
          <p className="text-sm text-muted-foreground">
            Siaran langsung perolehan suara pemilihan secara real-time.
          </p>
        </div>
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Menghubungkan ke siaran langsung suara (SSE)...
        </div>
      </div>
    );
  }

  const candidateCount = data.candidates.length;
  const isDuelMode = candidateCount === 2;
  const sortedCandidates = [...data.candidates].sort(
    (a, b) => b.votes - a.votes,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Live Count
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Siaran langsung perolehan suara diperbarui otomatis setiap kali
            pemilih menyelesaikan voting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedId && (
            <a
              href={`/api/admin/elections/recap?election_id=${selectedId}`}
              download
            >
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
              >
                <Download className="size-3.5" />
                Unduh Rekap (.xlsx)
              </Button>
            </a>
          )}
          {elections.length > 1 && (
            <Select
              selectedKey={selectedId}
              onSelectionChange={(key) => setSelectedId(String(key))}
              aria-label="Pilih pemilihan"
            >
              <SelectTrigger className="w-56 bg-background text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {elections.map((e) => (
                  <SelectItem
                    key={e.election_id}
                    id={e.election_id}
                    textValue={e.title}
                  >
                    <span className="truncate">{e.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isDuelMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Candidate 1 (Left) */}
            {data.candidates[0] &&
              (() => {
                const isLead = data.candidates[1]
                  ? data.candidates[0].votes > data.candidates[1].votes
                  : data.candidates[0].votes > 0;
                return (
                  <Card
                    className={cn(
                      "overflow-hidden border border-border p-4 transition-all",
                      isLead && "border-amber-400/60 shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 shrink-0 rounded-xl bg-muted">
                        {isLead && (
                          <div
                            className="absolute -top-3.5 -left-2.5 z-20 select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transform -rotate-[18deg]"
                            title="Peringkat 1"
                          >
                            <Crown className="size-6 text-amber-500 fill-amber-400" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "w-full h-full rounded-xl overflow-hidden",
                            isLead && "ring-2 ring-amber-400 ring-offset-1",
                          )}
                        >
                          {data.candidates[0].photo_url ? (
                            // biome-ignore lint/performance/noImgElement: dynamic user image
                            <img
                              src={data.candidates[0].photo_url}
                              alt={data.candidates[0].name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-sm">
                              #{data.candidates[0].candidate_number}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
                          Kandidat{" "}
                          {String(data.candidates[0].candidate_number).padStart(
                            2,
                            "0",
                          )}
                        </p>
                        <h3 className="font-heading text-base font-bold text-foreground truncate">
                          {data.candidates[0].name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {data.candidates[0].class_name}
                        </p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {data.candidates[0].percentage}%{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({data.candidates[0].votes} suara)
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {/* Candidate 2 (Right) */}
            {data.candidates[1] &&
              (() => {
                const isLead = data.candidates[0]
                  ? data.candidates[1].votes > data.candidates[0].votes
                  : data.candidates[1].votes > 0;
                return (
                  <Card
                    className={cn(
                      "overflow-hidden border border-border p-4 transition-all",
                      isLead && "border-amber-400/60 shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 shrink-0 rounded-xl bg-muted">
                        {isLead && (
                          <div
                            className="absolute -top-3.5 -left-2.5 z-20 select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transform -rotate-[18deg]"
                            title="Peringkat 1"
                          >
                            <Crown className="size-6 text-amber-500 fill-amber-400" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "w-full h-full rounded-xl overflow-hidden",
                            isLead && "ring-2 ring-amber-400 ring-offset-1",
                          )}
                        >
                          {data.candidates[1].photo_url ? (
                            // biome-ignore lint/performance/noImgElement: dynamic user image
                            <img
                              src={data.candidates[1].photo_url}
                              alt={data.candidates[1].name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-sm">
                              #{data.candidates[1].candidate_number}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
                          Kandidat{" "}
                          {String(data.candidates[1].candidate_number).padStart(
                            2,
                            "0",
                          )}
                        </p>
                        <h3 className="font-heading text-base font-bold text-foreground truncate">
                          {data.candidates[1].name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {data.candidates[1].class_name}
                        </p>
                        <p className="text-lg font-bold text-amber-600 mt-1">
                          {data.candidates[1].percentage}%{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({data.candidates[1].votes} suara)
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}
          </div>

          {/* Central Split Progress Bar */}
          <div className="w-full bg-muted h-5 rounded-full overflow-hidden flex border border-border">
            {data.candidates[0] && (
              <div
                className="h-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${data.candidates[0].percentage}%` }}
              />
            )}
            {data.candidates[1] && (
              <div
                className="h-full bg-amber-500 transition-[width] duration-300 ease-out"
                style={{ width: `${data.candidates[1].percentage}%` }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full py-4">
          <Card
            className={cn(
              "w-full max-w-3xl border border-border shadow-xs",
              className,
            )}
          >
            <CardHeader className="pb-6">
              <CardTitle className="font-heading text-2xl font-bold">
                {data.electionTitle}
              </CardTitle>
              <CardDescription className="text-sm">
                Live count perolehan suara • Total {data.totalVotes} suara masuk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {sortedCandidates.map((item, index) => {
                const isRank1 = index === 0 && item.votes > 0;
                return (
                  <div
                    key={item.candidate_id}
                    className="flex items-center gap-3 sm:gap-5 py-1.5"
                  >
                    <span className="w-5 sm:w-7 text-center text-sm sm:text-base font-semibold text-muted-foreground font-mono">
                      {index + 1}
                    </span>
                    <div className="relative shrink-0">
                      {isRank1 && (
                        <div
                          className="absolute -top-3.5 -left-2.5 z-20 select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transform -rotate-[18deg]"
                          title="Peringkat 1"
                        >
                          <Crown className="size-6 text-amber-500 fill-amber-400" />
                        </div>
                      )}
                      <Avatar
                        className={cn(
                          "size-10 sm:size-12 rounded-xl",
                          isRank1 && "ring-2 ring-amber-400 ring-offset-1",
                        )}
                      >
                        <AvatarImage
                          src={item.photo_url}
                          alt={item.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="font-bold text-xs sm:text-sm">
                          {item.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm sm:text-base font-semibold text-foreground">
                        #{item.candidate_number} {item.name}
                      </p>
                      {item.class_name && (
                        <p className="truncate text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {item.class_name} • {item.votes} suara
                        </p>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-bold font-heading text-primary shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
