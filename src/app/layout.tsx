import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber-Heart // Biomechanical Specimen",
  description:
    "Standalone 3D Anatomical Cyber-Heart Wireframe Biomechanical Specimen with Saturated Analog 808 Sub-Bass Audio Engine and Kelvin-Voigt Physics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased font-mono selection:bg-neutral-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
