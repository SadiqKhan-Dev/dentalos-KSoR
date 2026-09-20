import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-8">
                  <Link href="/dashboard/knowledge" className="text-xl font-bold text-gray-900">
                    DentalOS Admin
                  </Link>
                  <Link href="/dashboard/knowledge" className="text-gray-600 hover:text-gray-900">
                    Knowledge
                  </Link>
                </div>
                <div className="flex items-center">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </SignedIn>
    </>
  );
}
