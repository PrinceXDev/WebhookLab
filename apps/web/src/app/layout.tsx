import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
// import { SetupBanner } from "@/components/auth/setup-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WebhookLab — Webhook Inspector & Replay Engine",
  description: "The ngrok + Postman hybrid that actually understands webhooks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {/* <SetupBanner /> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
