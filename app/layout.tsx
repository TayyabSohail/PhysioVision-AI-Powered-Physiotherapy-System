"use client"; // Mark this as a Client Component

import "./css/style.css"; // Custom CSS file
import { Inter } from "next/font/google"; // Google Font (Inter)
import localFont from "next/font/local"; // Local Fonts
import Header from "@/components/ui/header"; // Custom Header Component
import { usePathname } from "next/navigation"; // Client-side hook to get current path
import { UserProvider } from "@/contexts/AppContext"; // Import UserProvider
import { AudioProvider } from "@/contexts/AudioContexts";

// Load fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nacelle = localFont({
  src: [
    {
      path: "../public/fonts/nacelle-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/nacelle-semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/nacelle-semibolditalic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-nacelle",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Get current path

  // Conditional rendering based on pathname
  const shouldShowHeader =
    pathname === "/" ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot");

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${nacelle.variable} bg-gray-950 font-inter text-base text-gray-200 antialiased`}
      >
        <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip">
          {shouldShowHeader && <Header />}
          {/* Wrap entire app with UserProvider */}
          <UserProvider>
            <AudioProvider>{children}</AudioProvider>
          </UserProvider>
        </div>
      </body>
    </html>
  );
}
