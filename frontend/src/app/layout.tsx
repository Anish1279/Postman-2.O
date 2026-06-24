import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postman Clone",
  description: "A staged Postman-style API client built with Next.js and FastAPI"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

