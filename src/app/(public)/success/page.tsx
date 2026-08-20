import { SuccessClient } from "@/components/public/success-client";

/** Langkah 3 — /success. Halaman statis; session sudah di-clear di action. */
export default function SuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
      <SuccessClient />
    </main>
  );
}