# Sprint 03.5.3 — Exercise Media Image Host Fix

Date: 2026-08-01

## Fixed

- Allowed public exercise media from the Supabase Storage host configured by `NEXT_PUBLIC_SUPABASE_URL`.
- Fixed the `next/image` runtime error on Exercise Details after uploading or replacing an exercise cover image.
- Limited the allowed remote path to `/storage/v1/object/public/**` instead of allowing the entire remote host.

## Verification

1. Restart the Next.js development server after replacing `next.config.ts`.
2. Open an exercise with a Supabase-hosted cover image.
3. Confirm that Exercise Details renders without `next-image-unconfigured-host`.
4. Reopen Edit and confirm that the existing cover and diagram previews are displayed.
