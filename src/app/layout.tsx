import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { QueryProvider } from "@/components/shared/query-provider";
import "./globals.css";

// Montserrat serve de fallback da Satoshi (carregada via Fontshare no body),
// espelhando o design system da essenciademenina.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mentorados AE Escala",
  description: "Plataforma white-label de treinamento para revendedores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
