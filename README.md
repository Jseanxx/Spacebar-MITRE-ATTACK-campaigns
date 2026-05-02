# Spacebar MITRE ATT&CK Campaigns

MITRE ATT&CK-inspired campaign pages for Spacebar incident response training.

This repository contains static campaign pages created by the Spacebar team. Each page models a realistic enterprise-like victim environment, maps observed attack behavior to MITRE ATT&CK Techniques, and serves as a reference for later BAS, ELK, and incident response playbook work.

## Pages

- `content/campaigns/SB-01.md`: campaign source files that team members edit
- `content/campaign-template.md`: copyable writing template
- `campaigns/index.html`: campaign list
- `campaigns/SB-01.html` ~ `campaigns/SB-06.html`: generated campaign pages

Do not edit generated HTML directly. Edit `content/campaigns/SB-XX.md`, then run the build.
Some existing detailed pages use `format: html` in frontmatter to preserve rich tables and custom blocks. New or rewritten pages can use normal Markdown without that field.

## Authoring Options

Recommended authoring styles:

- Markdown source: edit `content/campaigns/SB-XX.md`. Vercel runs `npm run build`, converts it to `campaigns/SB-XX.html`, and deploys it automatically.
- HTML body source: keep the file in `content/campaigns/SB-XX.md`, add `format: html` in frontmatter, and write the page body as HTML. The shared header, sidebar, campaign index, and site style still apply.
- Fully custom HTML: place a standalone `.html` file directly under `campaigns/`. Vercel can serve it, but it will not be managed by the Markdown build or automatically added to the campaign index unless the index/build script is updated.

Avoid editing generated `campaigns/SB-XX.html` directly. Those files can be overwritten the next time `npm run build` runs.

## Build

```bash
npm run build
```

## Local Preview

```bash
npm run build
python3 -m http.server 8091
```

Open:

```text
http://127.0.0.1:8091/campaigns/
```

## Deployment

This is a static site and can be deployed with Vercel or GitHub Pages.

Recommended:

- Vercel project name: `spacebar-mitre-attack-campaigns`
- Root directory: repository root
- Build command: `npm run build`
- Output directory: none

GitHub Pages alternative:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/`

## Collaboration

Each team member owns one `content/campaigns/SB-XX.md` page. Keep public pages portfolio-safe:

- Do not commit real credentials, SSH keys, tokens, or private IPs that identify a real environment.
- Use sanitized or lab-only descriptions.
- Keep destructive exploitation details in private runbooks, not public campaign pages.
- Write Techniques Used in a campaign-report style, not as a step-by-step exploit guide.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by MITRE. MITRE ATT&CK is referenced only as a public framework for organizing adversary behavior.
