import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxtral + Anam Avatar Demo",
  description:
    "A voice AI agent powered by Mistral's full inference stack with a real-time lip-synced avatar by Anam.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
