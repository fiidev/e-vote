import "dotenv/config";
import { randomInt } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

/**
 * Seed dev: 1 pemilu aktif (jendela = sekarang ± jam) + 2 kandidat
 * + 5 pemilih (role campuran, salah satunya GUKAR untuk demo VOTER_NOT_ELIGIBLE)
 * + 5 token (8 digit unik, format "XXXX-XXXX").
 *
 * Jalankan: pnpm prisma db seed
 * Idempotent: menghapus data voting lama lalu membuat ulang.
 */

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter });

function generateToken(existing: Set<string>): string {
  let code: string;
  do {
    code = randomInt(0, 100_000_000).toString().padStart(8, "0");
  } while (existing.has(code));
  existing.add(code);
  return code;
}

async function main(): Promise<void> {
  console.log("🌱 Seeding...");

  // Bersihkan data lama (urutan penting karena FK).
  await db.$transaction([
    db.vote.deleteMany(),
    db.voteToken.deleteMany(),
    db.emailLog.deleteMany(),
    db.candidate.deleteMany(),
    db.election.deleteMany(),
    db.voter.deleteMany(),
  ]);

  const now = new Date();
  const election = await db.election.create({
    data: {
      title: "Pemilihan Ketua OSIS 2026/2027",
      description: "Pilih ketua OSIS periode 2026/2027. Satu suara per siswa.",
      start_time: new Date(now.getTime() - 60 * 60 * 1000), // mulai 1 jam lalu
      end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 jam ke depan
      is_active: true,
      eligible_roles: [Role.SISWA, Role.OSIS, Role.MPK],
      candidates: {
        create: [
          {
            candidate_number: 1,
            name: "Ahmad Fauzi",
            class_name: "XI RPL 1",
            photo_url: "/placeholder/candidate-1.png",
            vision: "Menjadikan OSIS wadah aspirasi dan kolaborasi siswa.",
            mission:
              "Membuka ruang aspirasi rutin; mengadakan pelatihan soft skill; membangun ekosistem organisasi yang transparan.",
          },
          {
            candidate_number: 2,
            name: "Siti Nurhaliza",
            class_name: "XI TKJ 2",
            photo_url: "/placeholder/candidate-2.png",
            vision: "OSIS yang inklusif, kreatif, dan berdampak nyata.",
            mission:
              "Program kerja berbasis data kebutuhan siswa; kolaborasi antar ekstrakurikuler; transparansi laporan kegiatan.",
          },
        ],
      },
    },
    include: { candidates: true },
  });

  const voters = await db.voter.createManyAndReturn({
    data: [
      {
        name: "Budi Santoso",
        email: "budi@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "33",
      },
      {
        name: "Ani Lestari",
        email: "ani@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "34",
      },
      {
        name: "Citra Dewi",
        email: "citra@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "35",
      },
      {
        name: "Dedi Kurniawan",
        email: "dedi@student.smktelkom-mlg.sch.id",
        role: Role.OSIS,
        generation: "33",
      },
      {
        name: "Eka Puspita",
        email: "eka@student.smktelkom-mlg.sch.id",
        role: Role.GUKAR,
        generation: "35",
      },
    ],
  });

  const usedCodes = new Set<string>();
  const tokens = voters.map((voter) => ({
    voter_id: voter.voter_id,
    election_id: election.election_id,
    token_code: generateToken(usedCodes),
  }));
  await db.voteToken.createMany({ data: tokens });

  console.log("✅ Seed selesai:");
  console.log(`   Pemilu  : ${election.title}`);
  console.log(`   Kandidat: ${election.candidates.length} (nomor 1 & 2)`);
  console.log(
    `   Pemilih : ${voters.length} (termasuk 1 GUKAR → demo VOTER_NOT_ELIGIBLE)`,
  );
  console.log(
    `   Token   : ${tokens.length} — lihat dengan query vote_tokens di studio.`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
