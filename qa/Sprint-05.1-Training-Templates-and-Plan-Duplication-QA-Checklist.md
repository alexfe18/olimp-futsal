# Sprint 05.1 — QA Checklist

## Migration

- [ ] SQL migration completes without errors.
- [ ] `training_templates` exists.
- [ ] `training_template_blocks` exists.
- [ ] RLS is enabled for both tables.
- [ ] `save_training_template_draft` is available through PostgREST.

## Plan duplication

- [ ] Duplicate action is available on a plan card.
- [ ] Duplicate action is available in plan editor.
- [ ] User can change the proposed copy title.
- [ ] Copied plan has a new UUID.
- [ ] Copied plan status is `draft`.
- [ ] Copied plan date is empty.
- [ ] Library exercises are copied with `exercise_id`.
- [ ] Manual blocks are copied with `exercise_id = null`.
- [ ] Block order, duration and notes are preserved.
- [ ] Editing the copy does not change the source plan.

## Create template

- [ ] Template can be created manually.
- [ ] Template can be created from plan list.
- [ ] Template can be created from plan editor.
- [ ] Title validation works.
- [ ] At least one block is required.
- [ ] Total duration is calculated before insert.
- [ ] Template opens after save.

## Template list

- [ ] Active templates are displayed by default.
- [ ] Search works by title, team, age and objective.
- [ ] Status filter works.
- [ ] Intensity filter works.
- [ ] Age filter works.
- [ ] Duration filters work at 45 and 75 minute boundaries.
- [ ] Archive removes the item from the default active filter.
- [ ] Archived template cannot be used to create a new plan until restored.
- [ ] Restore returns the template to active list.
- [ ] Delete removes template and its blocks.

## Template editor

- [ ] Template has no session date field.
- [ ] Active / archived status can be edited.
- [ ] Library and manual blocks can be mixed.
- [ ] Quick View works for library exercises.
- [ ] Unsaved changes protection works.
- [ ] Create-plan-from-template action is available.

## Plan from template

- [ ] New-plan route loads template data.
- [ ] Source template label is shown.
- [ ] Date is empty.
- [ ] Status is `draft`.
- [ ] All blocks are copied with new client IDs.
- [ ] Saving creates a new plan UUID.
- [ ] Editing the new plan does not change template data.
- [ ] Archiving or deleting template does not change created plan.

## Regression

- [ ] Existing plan list loads.
- [ ] Existing plan edit/save works.
- [ ] Manual-only plan works.
- [ ] Library-only plan works.
- [ ] Mixed plan works.
- [ ] Exercise Quick View works.
- [ ] Production build passes on macOS before deployment.
