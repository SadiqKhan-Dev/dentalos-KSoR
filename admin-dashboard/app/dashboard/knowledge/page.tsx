import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getClinicSlug, isPlatformAdmin } from "@/lib/tenant";

// Mock data for dev; in production, fetch from KSoR outline
const MOCK_DOCUMENTS = [
  {
    slug: "smile-care-karachi/booking-policy",
    title: "Booking Policy",
    status: "stable" as const,
    audience: ["public"],
    owner: "human:smile-care-admin",
    approval: { by: "human:smile-care-admin", at: "2026-09-20T22:00:00+05:00" },
  },
  {
    slug: "smile-care-karachi/faq-general",
    title: "General Frequently Asked Questions",
    status: "stable" as const,
    audience: ["public"],
    owner: "human:smile-care-admin",
    approval: { by: "human:smile-care-admin", at: "2026-09-20T22:00:00+05:00" },
  },
  {
    slug: "smile-care-karachi/faq-procedures",
    title: "Procedure Frequently Asked Questions",
    status: "stable" as const,
    audience: ["public"],
    owner: "human:smile-care-admin",
    approval: { by: "human:smile-care-admin", at: "2026-09-20T22:00:00+05:00" },
  },
  {
    slug: "smile-care-karachi/recall-reminders",
    title: "Recall and Reminder Rules",
    status: "stable" as const,
    audience: ["public"],
    owner: "human:smile-care-admin",
    approval: { by: "human:smile-care-admin", at: "2026-09-20T22:00:00+05:00" },
  },
  {
    slug: "smile-care-karachi/refund-and-rescheduling",
    title: "Refund and Rescheduling Procedures",
    status: "stable" as const,
    audience: ["staff"],
    owner: "human:smile-care-admin",
    approval: { by: "human:smile-care-admin", at: "2026-09-20T22:00:00+05:00" },
  },
];

const STATUS_COLORS = {
  draft: "bg-yellow-100 text-yellow-800",
  stable: "bg-green-100 text-green-800",
  deprecated: "bg-red-100 text-red-800",
};

export default async function KnowledgePage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in to access the dashboard.</div>;
  }

  const clinicSlug = getClinicSlug(userId);
  const isAdmin = isPlatformAdmin(userId);

  // Filter documents by tenant (platform admins see all)
  const documents = isAdmin
    ? MOCK_DOCUMENTS
    : clinicSlug
    ? MOCK_DOCUMENTS.filter((d) => d.slug.startsWith(clinicSlug))
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clinicSlug ? `Managing knowledge for ${clinicSlug}` : "Platform-wide knowledge"}
          </p>
        </div>
        <Link
          href="/dashboard/knowledge/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          New Document
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Audience
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Approved
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.slug} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                  <div className="text-sm text-gray-500">{doc.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[doc.status]}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.audience.join(", ")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.owner || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.approval ? (
                    <div>
                      <div>{doc.approval.by}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(doc.approval.at).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/dashboard/knowledge/${doc.slug}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/knowledge/${doc.slug}/approve`}
                    className="text-green-600 hover:text-green-900"
                  >
                    Approve
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
