# Sprint 05.3.3 — Player Login & First Sign-in

Release: `0.6.0-alpha.4`

This sprint introduces the first authenticated player experience after account provisioning.

Implemented:
- phone + password player login page;
- normalized Ukrainian phone entry;
- authenticated self-context RPC;
- forced first-password-change flow;
- self-service completion RPC and audit event;
- player landing page;
- logout/session handling;
- admin route gate based on roles;
- owner/admin regression protection;
- QA checklist and verification tooling.

Important runtime dependency:
Supabase Phone authentication must be enabled before a provisioned phone-only player can use `signInWithPassword`. SMS is only required for flows that actually send phone verification/OTP; the provisioned player accounts are already phone-confirmed by the trusted Admin provisioning flow.
