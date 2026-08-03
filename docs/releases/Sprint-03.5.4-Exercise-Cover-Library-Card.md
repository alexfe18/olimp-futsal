# Sprint 03.5.4 — Exercise Cover in Library Card

## Status

Ready for merge.

## Fixed

- Exercise cover images stored as relative Supabase Storage paths are converted to public URLs in the Exercise Library.
- The cover is displayed in the visual header of each library card.
- A dark gradient keeps category, title, source tier and code readable over bright images.
- Cards without a cover keep the existing branded navy fallback.
- The cover on Exercise Details continues to use the same saved media file.

## QA

1. Open `/admin/coach/exercises`.
2. Confirm an exercise with a saved cover displays it in the card header.
3. Confirm category, title, tier and code remain readable.
4. Confirm an exercise without a cover still displays the branded fallback.
5. Open the exercise Details page and confirm the same cover appears in the hero.
