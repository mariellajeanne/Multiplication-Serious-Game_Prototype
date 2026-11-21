# Safe preview cleanup — November 2026

The repository cleanup command removes **only known, unreferenced historical screenshots**
under `docs/previews/`, never production game art, source code, tests, economy data,
Co-Baker networking files or student save data.

The installer backs up **all existing preview screenshots** to a ZIP in Downloads
before deleting anything. The cleanup script verifies each candidate PNG against
its SHA-256 in an audited manifest and rereads current documentation/source
references. Changed or newly referenced images are preserved. It also adds
rules to `.gitignore` for new generated screenshots, test outputs and Android
build caches (existing Git-tracked screenshots remain tracked).

The uploaded source snapshot had 202 unreferenced PNGs (48.6 MiB), but the
cleanup is designed to safely skip mismatches if the current checkout differs.
The uploaded archive is **not** the newer Android Co-Baker source tree, so this
cleanup does not attempt any multiplayer changes or architectural refactors.

This cleanup **does not rewrite Git history**. Committed historical images remain
in prior commits and may still occupy space in `.git`. The worktree cleanup can
be reviewed with `git status`. To undo deletions, restore tracked files from
Git or extract the backup ZIP; undo any `.gitignore` changes separately.
