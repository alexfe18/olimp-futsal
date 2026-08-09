# Sprint 05.3.3.2 — Player Access Context Fix

Internal corrective patch for Sprint 05.3.3. Release version remains `0.6.0-alpha.4`.

The first real phone/password sign-in successfully passed Supabase Auth but
failed on the subsequent `get_my_access_context()` RPC.

Root cause: the first implementation aggregated team roles with GROUP BY and
then ordered the grouped result by `team_memberships.is_primary` and
`team_memberships.created_at`. PostgreSQL rejected those non-grouped ORDER BY
expressions when the PL/pgSQL statement was first executed.

Fix:
1. resolve the primary adult-team membership in a non-aggregate query;
2. aggregate active team roles in a separate query;
3. preserve player/member and Owner/admin routing semantics;
4. add a runtime SQL verification for both a provisioned player and Owner;
5. improve browser-side PostgREST error logging.
