import "~/styles/globals.css";

import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { AdminAuthProvider } from "~/hooks/useAdminAuth";
import AdminLogin from "~/components/AdminLogin";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Poll App",
  description: "A simple polling application using Firebase and the T3 Stack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
