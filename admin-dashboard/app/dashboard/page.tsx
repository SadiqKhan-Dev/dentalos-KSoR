import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getClinicSlug, isPlatformAdmin } from "@/lib/tenant";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const clinicSlug = getClinicSlug(userId);
  const isAdmin = isPlatformAdmin(userId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Your Role</h2>
          <p className="mt-2 text-sm text-gray-500">
            {isAdmin ? "Platform Admin" : clinicSlug ? `Clinic Admin (${clinicSlug})` : "No tenant assigned"}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link
              href="/dashboard/knowledge"
              className="block text-blue-600 hover:text-blue-800"
            >
              Manage Knowledge Documents
            </Link>
            <Link
              href="/dashboard/knowledge/new"
              className="block text-blue-600 hover:text-blue-800"
            >
              Create New Document
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">KSoR Status</h2>
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>Generation: 1</p>
            <p>Documents: 5</p>
            <p>Abstention Floor: 0.627</p>
          </div>
        </div>
      </div>
    </div>
  );
}
