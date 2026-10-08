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
- `.openai/hosting.json`: existing ChatGPT Sites hosting configuration.

## Publishing

The website is hosted by ChatGPT Sites at <https://anthony-quach-builder.tunedape.chatgpt.site/>. Publishing uses the Sites workflow for the existing project in `.openai/hosting.json`.

Pushing to this GitHub repository does not automatically publish the website.
