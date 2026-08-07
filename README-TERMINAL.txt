SPRINT 05.3.1 — TERMINAL INSTALL

Run from Terminal after downloading the ZIP:

cd ~/Downloads
rm -rf ~/Desktop/sprint-05.3.1-dataset-fix
unzip -o "Sprint-05.3.1-Database-Foundation-Terminal-Ready.zip" \
  -d ~/Desktop/sprint-05.3.1-dataset-fix
bash ~/Desktop/sprint-05.3.1-dataset-fix/\
Sprint-05.3.1-Database-Foundation-Dataset-Fix/\
install-sprint-05.3.1.sh

The script:
- checks the expected Git branch;
- replaces the whole patch in the project;
- preserves private-imports because rsync does not delete unrelated files;
- runs nvm use when available;
- runs npm ci, typecheck and production build;
- prints final Git status.

It does NOT execute the database migration automatically.
