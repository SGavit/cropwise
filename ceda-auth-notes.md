# CEDA Agmarknet authentication diagnosis

On 21 August 2026, the official CEDA Swagger UI at `https://api.ceda.ashoka.edu.in/documentation/` identified the Agmarknet authorization scheme as `bearerAuth` using HTTP Bearer authentication. The existing provider adapter had sent an `api-key` header, which explains the repeated HTTP 401 responses even after the credential was refreshed.

The adapter and credential-validation test must send `Authorization: Bearer <CEDA_AGMARKNET_API_KEY>` before re-validating the provider.
