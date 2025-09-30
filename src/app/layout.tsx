import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voces Anónimas",
  description:
    "Comparte tus pensamientos de forma segura y sin revelar tu identidad en nuestra comunidad anónima.",
  metadataBase: new URL("https://voces-anonimas.local"),
  openGraph: {
    title: "Voces Anónimas",
    description:
      "Un refugio digital para expresarte libremente, conectar con otras personas y sentirte escuchada.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
