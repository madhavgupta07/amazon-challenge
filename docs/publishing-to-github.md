# Publishing LifePilot to GitHub

The submission needs a **GitHub repository URL** for judging. The repo is already initialized
locally with a first commit (`Initial commit: LifePilot…`) and includes a `LICENSE` (MIT) file.

Choose **one** visibility path:

- **Public + open source** (simplest for judging) — the `LICENSE` file satisfies the requirement.
- **Private + shared** — add the six Amazon/Devpost collaborators (list at the bottom).

---

## Option A — Create and push with the GitHub CLI (fastest)

1. If needed, authenticate once:

   ```bash
   gh auth login
   ```

2. From the repo root (`E:\amazon challenge`), create the remote and push. Use `--public`
   (recommended) or `--private`:

   ```bash
   gh repo create lifepilot --public --source=. --remote=origin --push
   ```

   That creates the repo, adds `origin`, and pushes `master` in one step.

3. Confirm the push:

   ```bash
   git remote -v
   git log --oneline -1
   ```

## Option B — Create the repo on github.com, then push

1. On GitHub, click **New repository** → name it `lifepilot` → **do not** initialize with a README
   (you already have commits) → Create.
2. Copy the repo URL, then from the repo root:

   ```bash
   git remote add origin https://github.com/<your-username>/lifepilot.git
   git branch -M master
   git push -u origin master
   ```

---

## Verify the license is detected (public repos)

After pushing, open the repo on GitHub. The **About** panel (top-right of the repo page) should show
a **"MIT license"** badge, and a `LICENSE` file should appear in the file list. If the badge is
missing, the About panel has an **Edit** control where you can attach the license.

## Make the repo public (if you created it private)

**Settings → General → Danger Zone → Change repository visibility → Make public.**

---

## If you go the private route (shared with testers)

Keep the repo **private**, then:
**Settings → Collaborators and teams → Add people** and add all of these:

| GitHub username | Belongs to |
| --- | --- |
| `chris-trag` | Devpost |
| `knmeiss` | Amazon (Kourtney Meiss) |
| `giolaq` | Amazon (Giovanni Laquidara) |
| `anishamalde` | Amazon (Anisha Malde) |
| `mosesroth` | Amazon (Moses Roth) |
| `emersonsklar` | Amazon (Emerson Sklar) |

Also share access with **`testing@devpost.com`** as instructed by Devpost.

> If the repo is private, an open-source `LICENSE` file is not required — but keeping `LICENSE`
> anyway is harmless and good practice.

---

## Sanity checks before you submit

- [ ] `git status` is clean (no uncommitted changes).
- [ ] `LICENSE` is present and tracked: `git ls-files | grep LICENSE`.
- [ ] `.env` is **not** tracked: `git ls-files | grep -i "\.env"` shows only `.env.example`.
- [ ] `node_modules/` and `client/dist` are **not** tracked.
- [ ] `README.md` renders with working quick-start instructions.
- [ ] The repo URL loads in a private/incognito window (public) or is accessible to the collaborators
      (private).

## Uncommitted files note

New submission docs (`docs/product-feedback.md`, `docs/friction-log.md`,
`docs/submission-checklist.md`, `docs/publishing-to-github.md`, `docs/devpost-description.md`,
`LICENSE`) may not be in the first commit yet. Add and commit them before pushing:

```bash
git add LICENSE docs/devpost-description.md docs/product-feedback.md docs/friction-log.md docs/submission-checklist.md docs/publishing-to-github.md
git commit -m "Add submission docs and MIT license"
```
