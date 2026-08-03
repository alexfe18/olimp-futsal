Sprint 03.5.2 — Exercise Edit Submit Fix

1. Copy the app and docs folders into the olimp-futsal project root.
2. Choose Merge / Replace for matching files.
3. Run:
   npx tsc --noEmit
   npm run dev
4. Open an exercise in Edit and click "Зберегти зміни".

Fix:
The Save/Publish action is rendered in the workspace hero outside the HTML form.
This release explicitly binds that button to the shared exercise form.
