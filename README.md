# Fix repeated Vercel configuration formatting failures

The deployment of `EarthVeda_3.O`, branch `master`, commit `9f748f3`, stopped in Prettier on `vercel.json`. The exact public commit's configuration and `.prettierrc.json` match the source that passes formatting locally. The log does not expose the deployment-time file contents, so the exact cause of the formatting difference is not established. Reformatting the same source again is insufficient as a reliable hosting fix.

## Updated commands

- `npm run check`: lint, source formatting, all 44 unit tests, seven DOM interaction tests and the Vite build. Use locally and in GitHub CI.
- `npm run build:vercel`: lint, the same unit and DOM tests, then the Vite build. Use as Vercel's Build Command.
- `npm run build`: the Vite build alone, unchanged.

The hosting command retains lint and all automated tests. Source formatting remains enforced by GitHub CI, which now runs on both `main` and `master`. Vercel's Git integration and GitHub CI execute independently; this change does not claim Vercel waits for a separate GitHub job.

## Apply the update

Extract `Earthveda_Vercel_Build_Fix.zip` and copy its configuration files and `.github/workflows/ci.yml` into your existing project, preserving their relative paths. Its package file matches the supplied v6 foundation. If you have added dependencies or changed scripts, merge the new `build:vercel` script into your own `package.json` instead of replacing it wholesale. The lockfile is unchanged because no dependencies changed.

In Git Bash, from the folder containing `package.json`, run:

```bash
npm run check
git add package.json vercel.json .github/workflows/ci.yml
git commit -m "Separate source formatting from Vercel build"
git push origin master
```

If you are applying the earlier generated-directory fix for the first time, also stage `.prettierignore`, `.gitignore`, `.prettierrc.json` and `eslint.config.js` before committing. Keep `.vercel/` excluded from formatting, linting and Git.

In the existing Vercel project's Build and Deployment settings, change any Build Command override to `npm run build:vercel`. Keep install `npm ci --include=dev`, output `dist`, Node 24.x and frontend mode `VITE_COMMERCE_MODE=preview`. Verify the linked repository is the intended `EarthVeda_3.O` repository and production branch `master`. The next deployment must use your new commit, not `9f748f3`.

The existing headers, caching and SPA fallback are retained. The current backend/image release remains opt-in on `main`; enabling source verification for `master` does not deploy a backend there.

## Verification

The full local command must pass on normally formatted source. The hosting command is additionally tested with deliberately compact, unformatted but semantically identical `vercel.json`, `VERCEL=1` and `NODE_ENV=production`. This checks the original failure boundary without skipping any image, payment, pricing or DOM tests. It is a local simulation of a formatting mismatch, not a claim that Vercel itself modified the file. A real Vercel deployment still needs to run in the user's account.

The npm cache-dir, ESLint deprecation and install-script warnings are separate from the reported fatal formatting error. This update does not approve arbitrary installation scripts.
