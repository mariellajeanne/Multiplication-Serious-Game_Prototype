# Batch & Carry v34 — GitHub Pages deployment

This folder contains the **original v34 playable standalone HTML**, renamed to `index.html` for GitHub Pages. It is not v35 or v36. All game styles and scripts are embedded; no separate assets, libraries, or build tools are needed.

## First deployment

1. Create a **public** GitHub repository (e.g. `batch-and-carry`).
2. Open the repository's **Add file → Upload files** screen.
3. Upload `index.html` from this folder into the **repository root** (not a nested folder or the ZIP).
4. Commit the upload to branch `main`.
5. Go to **Settings → Pages → Build and deployment**.
6. Choose **Deploy from a branch → main → /(root)**, and save.
7. The URL will be `https://YOUR-USERNAME.github.io/batch-and-carry/` (if that is your repository name).

## Updating without changing the URL

Keep the same repository and branch. When you have a new standalone HTML build, rename it to `index.html` and replace the existing repository-root `index.html`. Commit the change. The GitHub Pages URL stays the same. The browser may need a hard refresh after publication.

## Progress / saved games

v34 uses the browser's `localStorage` key `batch-carry-v34`. Deploying it on GitHub Pages gives it **a new origin**; progress saved while opening the local HTML file does **not** automatically migrate to the website. Avoid changing the storage key in later v34-compatible updates unless you intentionally want to reset progress.

If you use the built-in Export Save feature, keep a backup before major changes.
