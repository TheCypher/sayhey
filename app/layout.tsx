import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hey",
  description: "Voice-first journal with optional replies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
