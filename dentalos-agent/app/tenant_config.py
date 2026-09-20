"""Per-tenant configuration mapping clinics to their KSoR knowledge subtrees."""

from pydantic_settings import BaseSettings


class TenantConfig(BaseSettings):
    """Maps a clinic slug to its KSoR MCP server URL and knowledge subtree."""

    model_config = {"env_prefix": "DENTALOS_"}

    # Default KSoR MCP endpoint (local dev)
    ksor_mcp_url: str = "http://127.0.0.1:8080/mcp"

    # Tenant-to-subtree mapping: clinic_slug -> knowledge path prefix
    # In production this would come from NeonDB; here we use env vars for dev.
    tenant_subtrees: dict[str, str] = {
        "smile-care-karachi": "smile-care-karachi",
    }


# Singleton
tenant_config = TenantConfig()
