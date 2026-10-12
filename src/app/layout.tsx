import type { Metadata } from "next";
import { Providers, Header, Footer } from "@/components/chrome";
import "./globals.css";
export const metadata: Metadata = {
  title: "BloomDate — A little invitation. A beautiful date.",
  description:
    "A personal invitation for someone special. Plan a beautiful little date together.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
