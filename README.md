# Spacebar MITRE ATT&CK Campaigns

MITRE ATT&CK-inspired campaign pages for Spacebar incident response training.

This repository contains static campaign pages created by the Spacebar team. Each page models a realistic enterprise-like victim environment, maps observed attack behavior to MITRE ATT&CK Techniques, and serves as a reference for later BAS, ELK, and incident response playbook work.

## Pages

- `campaigns/index.html`: campaign list
- `campaigns/SB-01.html`: PipelineKey
- `campaigns/SB-02.html` ~ `campaigns/SB-06.html`: team member campaign pages
- `campaigns/template.html`: page template for new campaigns

## Local Preview

```bash
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
- Build command: none
- Output directory: none

GitHub Pages alternative:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/`

## Collaboration

Each team member owns one `SB-XX.html` page. Keep public pages portfolio-safe:

- Do not commit real credentials, SSH keys, tokens, or private IPs that identify a real environment.
- Use sanitized or lab-only descriptions.
- Keep destructive exploitation details in private runbooks, not public campaign pages.
- Write Techniques Used in a campaign-report style, not as a step-by-step exploit guide.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by MITRE. MITRE ATT&CK is referenced only as a public framework for organizing adversary behavior.
