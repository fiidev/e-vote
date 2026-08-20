import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    election: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    candidate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    voter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    emailLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ default: dbMock }));

import {
  createCandidate,
  createElection,
  createVoter,
  deleteCandidate,
  deleteElection,
  deleteVoter,
  getCandidate,
  getElection,
  getVoter,
  listCandidates,
  listElections,
  listRecentEmailLogs,
  listVoters,
  updateCandidate,
  updateElection,
  updateVoter,
} from "./service";

function resetMocks() {
  for (const model of Object.values(dbMock)) {
    for (const fn of Object.values(model)) {
      fn.mockReset();
    }
  }
}

beforeEach(resetMocks);

describe("Election CRUD", () => {
  it("listElections: query dengan include _count", async () => {
    dbMock.election.findMany.mockResolvedValue([{ election_id: "e-1" }]);
    const rows = await listElections();
    expect(rows).toHaveLength(1);
    expect(dbMock.election.findMany).toHaveBeenCalledWith({
      orderBy: { start_time: "desc" },
      include: {
        _count: { select: { candidates: true, votes: true, tokens: true } },
      },
    });
  });

  it("createElection: role_weights kosong disimpan sebagai undefined", async () => {
    dbMock.election.create.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await createElection({
      title: "Pilketos 2026",
      start_time: new Date(),
      end_time: new Date(),
      is_active: true,
      is_weighted: false,
      eligible_roles: ["SISWA"],
    });
    const call = dbMock.election.create.mock.calls[0][0];
    expect(call.data.eligible_roles).toEqual(["SISWA"]);
    expect(call.data.role_weights).toBeUndefined();
  });

  it("updateElection: role_weights kosong dikonversi ke null", async () => {
    dbMock.election.update.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await updateElection({
      election_id: "e-1",
      role_weights: {},
      is_weighted: true,
    });
    const call = dbMock.election.update.mock.calls[0][0];
    expect(call.data.role_weights).toBe(Prisma.JsonNull);
  });

  it("deleteElection memanggil delete", async () => {
    dbMock.election.delete.mockResolvedValue({});
    await deleteElection("e-1");
    expect(dbMock.election.delete).toHaveBeenCalledWith({
      where: { election_id: "e-1" },
    });
  });

  it("getElection include candidates & _count", async () => {
    dbMock.election.findUnique.mockResolvedValue({ election_id: "e-1" });
    await getElection("e-1");
    expect(dbMock.election.findUnique).toHaveBeenCalledWith({
      where: { election_id: "e-1" },
      include: {
        candidates: { orderBy: { candidate_number: "asc" } },
        _count: { select: { votes: true, tokens: true } },
      },
    });
  });
});

describe("Candidate CRUD", () => {
  it("listCandidates tanpa filter election", async () => {
    dbMock.candidate.findMany.mockResolvedValue([]);
    await listCandidates();
    expect(dbMock.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it("createCandidate menyimpan data", async () => {
    dbMock.candidate.create.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await createCandidate({
      election_id: "e-1",
      candidate_number: 1,
      name: "Budi",
      class_name: "XI-1",
      vision: "visi",
      mission: "misi",
    });
    const call = dbMock.candidate.create.mock.calls[0][0];
    expect(call.data.photo_url).toBe("");
    expect(call.data.candidate_number).toBe(1);
  });

  it("getCandidate memanggil findUnique", async () => {
    dbMock.candidate.findUnique.mockResolvedValue({ candidate_id: "c-1" });
    const row = await getCandidate("c-1");
    expect(row?.candidate_id).toBe("c-1");
    expect(dbMock.candidate.findUnique).toHaveBeenCalledWith({
      where: { candidate_id: "c-1" },
    });
  });

  it("updateCandidate memisahkan id dari payload", async () => {
    dbMock.candidate.update.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await updateCandidate({ candidate_id: "c-1", name: "Budi" });
    const call = dbMock.candidate.update.mock.calls[0][0];
    expect(call.where).toEqual({ candidate_id: "c-1" });
    expect(call.data).toEqual({ name: "Budi", photo_url: "" });
  });

  it("deleteCandidate memanggil delete", async () => {
    dbMock.candidate.delete.mockResolvedValue({});
    await deleteCandidate("c-1");
    expect(dbMock.candidate.delete).toHaveBeenCalledWith({
      where: { candidate_id: "c-1" },
    });
  });
});

describe("Voter list & pagination", () => {
  it("listVoters: page 1 take 50, search membangun OR", async () => {
    dbMock.voter.findMany.mockResolvedValue([]);
    dbMock.voter.count.mockResolvedValue(0);
    await listVoters({ page: 1, search: "budi" });
    const call = dbMock.voter.findMany.mock.calls[0][0];
    expect(call.take).toBe(50);
    expect(call.skip).toBe(0);
    expect(call.where.OR).toHaveLength(2);
  });

  it("listVoters: page 3 skip 100", async () => {
    dbMock.voter.findMany.mockResolvedValue([]);
    dbMock.voter.count.mockResolvedValue(120);
    const result = await listVoters({ page: 3 });
    expect(dbMock.voter.findMany.mock.calls[0][0].skip).toBe(100);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(120);
  });

  it("listVoters: emailStatus NO_EMAIL menambah filter tokens", async () => {
    dbMock.voter.findMany.mockResolvedValue([]);
    dbMock.voter.count.mockResolvedValue(0);
    await listVoters({ emailStatus: "NO_EMAIL" });
    const call = dbMock.voter.findMany.mock.calls[0][0];
    expect(call.where.tokens).toEqual({ some: { email_sent_at: null } });
  });

  it("listVoters: emailStatus FAILED menambah filter email_error", async () => {
    dbMock.voter.findMany.mockResolvedValue([]);
    dbMock.voter.count.mockResolvedValue(0);
    await listVoters({ emailStatus: "FAILED" });
    const call = dbMock.voter.findMany.mock.calls[0][0];
    expect(call.where.tokens).toEqual({ some: { email_error: { not: null } } });
  });
});

describe("Voter CRUD", () => {
  it("createVoter menyimpan data", async () => {
    dbMock.voter.create.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await createVoter({ name: "Ani", email: "ani@x.id", role: "SISWA" });
    expect(dbMock.voter.create).toHaveBeenCalledWith({
      data: { name: "Ani", email: "ani@x.id", role: "SISWA" },
    });
  });

  it("getVoter include tokens", async () => {
    dbMock.voter.findUnique.mockResolvedValue({ voter_id: "v-1", tokens: [] });
    await getVoter("v-1");
    expect(dbMock.voter.findUnique).toHaveBeenCalledWith({
      where: { voter_id: "v-1" },
      include: {
        tokens: { include: { election: { select: { title: true } } } },
      },
    });
  });

  it("updateVoter memisahkan id & cast role", async () => {
    dbMock.voter.update.mockImplementation((args: unknown) =>
      Promise.resolve(args),
    );
    await updateVoter({ voter_id: "v-1", role: "OSIS" });
    const call = dbMock.voter.update.mock.calls[0][0];
    expect(call.where).toEqual({ voter_id: "v-1" });
    expect(call.data.role).toBe("OSIS");
  });

  it("deleteVoter memanggil delete", async () => {
    dbMock.voter.delete.mockResolvedValue({});
    await deleteVoter("v-1");
    expect(dbMock.voter.delete).toHaveBeenCalledWith({
      where: { voter_id: "v-1" },
    });
  });
});

describe("Email logs", () => {
  it("listRecentEmailLogs default limit 20", async () => {
    dbMock.emailLog.findMany.mockResolvedValue([]);
    await listRecentEmailLogs();
    const call = dbMock.emailLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(20);
    expect(call.include.voter.select).toEqual({ name: true, email: true });
  });
});
