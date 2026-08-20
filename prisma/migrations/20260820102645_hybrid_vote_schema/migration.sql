-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SISWA', 'OSIS', 'MPK', 'GUKAR');

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "voter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SISWA',
    "generation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voters_pkey" PRIMARY KEY ("voter_id")
);

-- CreateTable
CREATE TABLE "elections" (
    "election_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "eligible_roles" "Role"[] DEFAULT ARRAY['SISWA']::"Role"[],
    "is_weighted" BOOLEAN NOT NULL DEFAULT false,
    "role_weights" JSONB,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("election_id")
);

-- CreateTable
CREATE TABLE "vote_tokens" (
    "token_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "token_code" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "email_sent_at" TIMESTAMP(3),
    "email_error" TEXT,

    CONSTRAINT "vote_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "candidate_id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "candidate_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "mission" TEXT NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "votes" (
    "vote_id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("vote_id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "log_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_session_token_key" ON "admin_session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_account_issuer_accountId_key" ON "admin_account"("issuer", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "voters_email_key" ON "voters"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vote_tokens_token_code_key" ON "vote_tokens"("token_code");

-- CreateIndex
CREATE UNIQUE INDEX "vote_tokens_voter_id_election_id_key" ON "vote_tokens"("voter_id", "election_id");

-- CreateIndex
CREATE INDEX "votes_election_id_idx" ON "votes"("election_id");

-- CreateIndex
CREATE INDEX "votes_candidate_id_idx" ON "votes"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voter_id_election_id_key" ON "votes"("voter_id", "election_id");

-- AddForeignKey
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_account" ADD CONSTRAINT "admin_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_tokens" ADD CONSTRAINT "vote_tokens_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("voter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_tokens" ADD CONSTRAINT "vote_tokens_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("election_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("election_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("election_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("voter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "vote_tokens"("token_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("voter_id") ON DELETE CASCADE ON UPDATE CASCADE;
