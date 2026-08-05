# Private roster/contact imports

Real phone numbers and personal contact data must **not** be committed to Git.

Store the filled file locally under:

```text
private-imports/adult-team-contacts.csv
```

The entire `private-imports/` directory is ignored by Git.

Validation and DB matching are read-only:

```bash
npm run audit:players-import -- --file private-imports/adult-team-contacts.csv
npm run audit:team-mapping
```

Generated reports are written to `audit-output/` and are also ignored by Git.
The scripts never create Supabase Auth users and never write phone numbers to the database.
