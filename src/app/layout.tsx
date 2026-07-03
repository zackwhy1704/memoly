import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

// The homepage is the SEO/acquisition-critical page — Google was indexing the
// old "Centre Admin" title for it. Default to a marketing title; a page/segment
// can still override via the `%s` template. OG/Twitter give proper link previews.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://apalchi.com";
const TITLE = "Apalchi — the AI study buddy that learns your child's own notes";
const DESCRIPTION =
  "Upload your notes and Mochi builds bite-size lessons, quizzes and practice from YOUR material — LEARN → TEST → PROVE. For students and tuition centres.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Apalchi",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Apalchi",
    images: [{ url: "/mochi-base-transparent.png", width: 512, height: 512, alt: "Mochi, the Apalchi mascot" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/mochi-base-transparent.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-bg antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
