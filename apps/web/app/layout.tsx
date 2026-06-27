import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoChamber — AI Expert Roundtable",
  description:
    "Open a live voice room with grounded AI avatars of real startup experts. They debate each other and you, in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
