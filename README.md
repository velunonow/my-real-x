# My Real X

My own calm version of X: **only the people and posts I chose — then go make something.**

No X API, no server, no feed. A small static website hosted on GitHub Pages that works on phone and laptop.

## Why

| Problem | Fix in this app |
|---|---|
| X bookmarks are a mess | **Library**: every saved item has a *reason* ("why is this worth my time?") and tags. Bulk-add to clean up old bookmarks, then clear them on X. |
| I follow too many people I don't really like | **People**: trusted list + a 14-day **trial** for new people. Keep or drop. Link a private **X List** that shows only them. |
| Too much time on "For You" | **Today**: only N items a day + a daily reading timer. When time is up: "done for today — go create". |
| I want to create, not only consume | **Create**: ideas → drafts → published, a daily prompt, a making streak, "Post on X" button. Every finished read asks for a one-line takeaway or "turn into idea". |

## How to use

- **Add anything:** tap **+ Add** and paste a link.
  - X post → shown embedded. X profile → a person. YouTube video → plays inline. Any other link → article/blog.
  - Saving a post from someone new? Tick *"Also add to People (on trial)"*.
- **Daily loop (≈15 min):** open **Today** → read your 5 → tap **✓ Done** → write a one-line takeaway → **Save + turn into idea** → write in **Create**.
- **Weekly (Sunday, 20 min):** People → check trials (keep or drop), discover new people through the ones you trust.
- **Phone:** open the site → browser Share → **Add to Home Screen**. On Android you can then *Share → My Real X* from any app.
- **Shortcut link:** `https://<you>.github.io/my-real-x/?add=<link>` opens the Add dialog pre-filled (handy for iOS Shortcuts).

## Sync across devices

By default, changes are saved in the browser only. To sync phone + laptop:

1. GitHub → Settings → Developer settings → **Fine-grained token** → Generate new token.
2. Repository access: **Only select repositories** → `my-real-x`.
3. Permissions → Repository → **Contents: Read and write**.
4. In the app: ⚙︎ → *Sync across devices* → paste the token → **Save & sync now**. Do this once per device.

Every change is then committed to `data.json` in this repo. The token never leaves your browser except to talk to GitHub.
Note: the repo is public, so your lists and drafts are public too.

## Publish on GitHub Pages

Repo → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch** → pick the branch that has these files, folder **/ (root)** → Save.
After a minute the site is live at `https://velunonow.github.io/my-real-x/`.

## Files

- `index.html`, `style.css`, `app.js` — the whole app (plain HTML/CSS/JS, no build step).
- `data.json` — your people, library and ideas.
- `manifest.webmanifest`, `sw.js`, icons — "Add to Home Screen" + offline support.
