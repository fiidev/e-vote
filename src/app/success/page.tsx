import type { Metadata } from "next";
import { VoteSuccess } from "@/features/voting/components/vote-success";

export const metadata: Metadata = {
  title: "Suara Berhasil Terkirim",
  description:
    "Terima kasih telah berpartisipasi dan menggunakan hak suara Anda dalam pemilihan.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuccessPage() {
  return <VoteSuccess />;
}
