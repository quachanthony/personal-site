# Personal site

Source for Anthony Quach's personal portfolio, “I'm a builder.”

The site uses plain HTML, CSS, and JavaScript. The editable site files are in `dist/`; there is no build step or dependency installation.

## Local preview

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:8000>. Stop the server with Ctrl+C.

## Files

- `dist/index.html`: page content and structure.
- `dist/style.css`: layout, responsive styles, and visual presentation.
- `dist/app.js`: scroll animation and the motion toggle.
- `dist/assembly.js`: the “Some assembly required” exploded drawings, drawn as isometric SVG and assembled on scroll.
- `dist/journey.js`: interactive professional journey.
- `dist/assets/`: illustrations and company logos.
- `wrangler.jsonc`: Cloudflare production and branch-preview configuration.
- `.openai/hosting.json`: existing ChatGPT Sites hosting configuration.

## Publishing

Production is hosted by Cloudflare at <https://anthonyquach.com/>. The GitHub integration automatically deploys pushes and merges to `main` after a successful build. No build command or dependency installation is needed for this static site.

Cloudflare uses these commands:

- Production (`main`): `npx wrangler deploy`.
- Branch previews: `npx wrangler preview`.

`wrangler.jsonc` declares `dist/` as the assets directory and includes the empty `previews` block required for branch previews.

GitHub Actions maintains one "Cloudflare preview — latest commit" comment on each open PR from a branch in this repository. On PR updates it reads the current head commit and waits up to five minutes for Cloudflare's result. The comment links to that commit's build details and is updated rather than duplicated. Cloudflare's own comment remains separate. After this workflow is merged to `main`, Cloudflare check events and manual runs from the Actions tab can also refresh comments. No Cloudflare token is required.

The existing ChatGPT Sites preview at <https://anthony-quach-builder.tunedape.chatgpt.site/> is configured and published separately through `.openai/hosting.json`.
