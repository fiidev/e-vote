import "dotenv/config";
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

async function main(): Promise<void> {
  console.log("🌱 Seeding Multi-Tenant E-Vote...");

  // Bersihkan data lama
  await db.$transaction([
    db.vote.deleteMany(),
    db.voteToken.deleteMany(),
    db.emailLog.deleteMany(),
    db.candidate.deleteMany(),
    db.voter.deleteMany(),
    db.election.deleteMany(),
    db.adminSession.deleteMany(),
    db.adminAccount.deleteMany(),
    db.adminUser.deleteMany(),
    db.organization.deleteMany(),
  ]);

  // 1. Buat Organisasi Induk & Sub-Organisasi
  const osis = await db.organization.create({
    data: {
      name: "OSIS",
      slug: "osis",
      code: "OSS",
      type: "MAIN_ORGANIZATION",
      description: "Organisasi Siswa Intra Sekolah SMK Telkom Malang",
    },
  });

  const metic = await db.organization.create({
    data: {
      name: "METIC",
      slug: "metic",
      code: "MTC",
      type: "SUB_ORGANIZATION",
      parentId: osis.id,
      description: "Moklet English Club",
    },
  });

  const pustel = await db.organization.create({
    data: {
      name: "PUSTEL",
      slug: "pustel",
      code: "PST",
      type: "SUB_ORGANIZATION",
      parentId: osis.id,
      description: "Perpustakaan Telkom",
    },
  });

  const now = new Date();

  // 2. Buat Pemilihan terhubung ke OSIS
  const election = await db.election.create({
    data: {
      organizationId: osis.id,
      title: "Pemilihan Ketua OSIS 2026/2027",
      description: "Pilih ketua OSIS periode 2026/2027. Satu suara per siswa.",
      start_time: new Date(now.getTime() - 60 * 60 * 1000),
      end_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      is_active: true,
      eligible_roles: [Role.SISWA],
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

  // 3. Buat DPT Pemilih
  const voters = await db.voter.createManyAndReturn({
    data: [
      {
        election_id: election.election_id,
        name: "Budi Santoso",
        email: "budi@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "33",
      },
      {
        election_id: election.election_id,
        name: "Ani Lestari",
        email: "ani@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "34",
      },
      {
        election_id: election.election_id,
        name: "Citra Dewi",
        email: "citra@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "35",
      },
      {
        election_id: election.election_id,
        name: "Dedi Kurniawan",
        email: "dedi@student.smktelkom-mlg.sch.id",
        role: Role.SISWA,
        generation: "33",
      },
      {
        election_id: election.election_id,
        name: "Eka Puspita",
        email: "eka@student.smktelkom-mlg.sch.id",
        role: Role.GUKAR,
        generation: "35",
      },
    ],
  });

  const tokens = voters.map((voter) => ({
    voter_id: voter.voter_id,
    election_id: election.election_id,
    token_code: `OSS-${voter.voter_id.slice(0, 4).toUpperCase()}-${voter.voter_id.slice(4, 8).toUpperCase()}`,
  }));
  await db.voteToken.createMany({ data: tokens });

  console.log("✅ Seed selesai:");
  console.log(`   Organisasi: ${osis.name}, ${metic.name}, ${pustel.name}`);
  console.log(`   Pemilu    : ${election.title}`);
  console.log(`   Kandidat  : ${election.candidates.length}`);
  console.log(`   Pemilih   : ${voters.length}`);
  console.log(`   Token     : ${tokens.length}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
