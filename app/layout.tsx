import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JIWW - Jump In, Water's Wet",
  description: "Generate complete genre-based MIDI song sketches.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
