import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${inter.variable} ${poppins.variable} min-h-screen bg-slate-950 antialiased`}>
        {children}
      </body>
    </html>
  );
}
