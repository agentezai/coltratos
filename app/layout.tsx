import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COLTRATOS",
  description: "Análisis de elegibilidad para licitaciones públicas colombianas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preload Geist Variable per ADR-016 / NFR-01 — eliminates the FOUT on the
            critical path. The static @font-face declarations in globals.css cover
            older browsers; this preload is the progressive enhancement. */}
        <link
          rel="preload"
          as="font"
          type="font/ttf"
          href="/fonts/Geist-VariableFont_wght.ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
