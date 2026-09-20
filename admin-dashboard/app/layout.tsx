import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import type { ReactNode } from "react";

export const metadata = {
  title: "DentalOS Admin Dashboard",
  description: "Knowledge management for DentalOS clinics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
