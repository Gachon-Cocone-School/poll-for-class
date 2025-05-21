import "~/styles/globals.css";

import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { AdminAuthProvider } from "~/hooks/useAdminAuth";
import AdminLogin from "~/components/AdminLogin";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GCS Poll",
  description: "A simple polling application using Firebase and the T3 Stack",
  icons: {
    icon: [
      { url: "/gcs-logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/gcs-logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    // Safari의 경우 apple-touch-icon도 설정
    apple: [
      { url: "/gcs-logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/gcs-logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    // 기본 파비콘 설정도 media 쿼리로 추가
    shortcut: [
      { url: "/gcs-logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/gcs-logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider>
          <AdminAuthProvider>
            <main className="container mx-auto px-4 py-8">{children}</main>
            <AdminLogin />
          </AdminAuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
