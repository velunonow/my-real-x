# My Real X

My own calm collection: **only the people and posts I chose — then go make something.**
A small static web app on GitHub Pages. No X API, no server, no feed.

Live: https://velunonow.github.io/my-real-x/

## What's inside

| Tab | What it does |
|---|---|
| **Collection** | The home page: everything you kept, as a two-column wall of cards with photos. Search, and filter by tag. |
| **+** | One box for everything: paste a link (post, video, article, profile) or write a thought. It works out the rest. |
| **Create** | Ideas, drafts and published posts. A daily prompt, a making streak, "Post on X". |
| **People** | Trusted people and newcomers on a 14-day trial. Visit on purpose; keep or drop. |

## Design

- [`PRODUCT.md`](PRODUCT.md) explains who the app is for and why.
- [`DESIGN.md`](DESIGN.md) has the exact look (colours, type, spacing, components) in the [DESIGN.md format](https://github.com/google-labs-code/design.md).
- [`.claude/skills/my-taste/`](.claude/skills/my-taste/SKILL.md) is my portable design taste. Copy this folder into another project's `.claude/skills/` (or into `~/.claude/skills/` for every project), and Claude designs the way I like there too.

## Link previews

[`.github/workflows/previews.yml`](.github/workflows/previews.yml) runs whenever `data.json` changes. It fetches preview images, titles, X post text and profile photos for new links, then commits them back. It needs no API keys: web pages are read for their preview tags, and X posts come from the public FxTwitter API. YouTube and GitHub previews are built by the app itself.

If the job can't push, go to repo Settings → Actions → General → Workflow permissions and choose **Read and write**.

## Sync across devices

Changes are saved in the browser by default. To sync phone and laptop: Settings → Sync → paste a fine-grained GitHub token (this repo only, **Contents: Read and write**). Every change is then committed to `data.json`. The repo is public, so the collection is public too.

## Files

`index.html`, `style.css`, `app.js` hold the whole app (no build step). `data.json` is the data. `manifest.webmanifest` and `sw.js` provide Add to Home Screen and offline use. `design/taste.html` is the taste quiz.
