/**
 * Tenant utilities for the admin dashboard.
 *
 * Maps Clerk user IDs to clinic slugs. In production, this would
 * query NeonDB for the tenant mapping.
 */

// Hardcoded for dev; in production, query from NeonDB
const USER_TENANT_MAP: Record<string, string> = {
  // Map Clerk user IDs to clinic slugs here
  // e.g., "user_123": "smile-care-karachi"
};

export function getClinicSlug(userId: string): string | null {
  return USER_TENANT_MAP[userId] || null;
}

export function getClinicKnowledgePath(clinicSlug: string): string {
  return `knowledge/${clinicSlug}`;
}

export function isPlatformAdmin(userId: string): boolean {
  // In production, check against governance.yaml
  // For dev, check against a list
  const adminIds = process.env.PLATFORM_ADMIN_IDS?.split(",") || [];
  return adminIds.includes(userId);
}
