# Contributing

## Editing Your Campaign

1. Edit only your assigned `content/campaigns/SB-XX.md` file unless the team agrees otherwise.
2. Do not edit generated `campaigns/SB-XX.html` files by hand.
3. Use MITRE ATT&CK Technique IDs where possible.
4. Keep the page concise enough to read as a campaign reference.
5. Put detailed execution commands, PoC notes, and BAS implementation details in a private repository.
6. If you need a fresh structure, copy `content/campaign-template.md`.
7. If your page has `format: html` at the top, simple text edits are fine. For a full rewrite, copy the template and remove `format: html`.

## Markdown vs HTML

Use one of these two managed formats for assigned campaign pages:

```markdown
---
id: SB-XX
name: Campaign Name
owner: Your Name
description: Short description
---

## Overview

Write in Markdown.
```

Or, if you already wrote a rich HTML page:

```markdown
---
id: SB-XX
name: Campaign Name
owner: Your Name
description: Short description
format: html
---

<h1>Campaign Name</h1>
<p>Write the body as HTML.</p>
```

Standalone HTML files under `campaigns/` are also served by Vercel, but they are not automatically listed or wrapped by the shared campaign layout.

## Pull Request Checklist

- [ ] The page renders locally.
- [ ] No real credentials, tokens, keys, passwords, or private operational details are included.
- [ ] Technique IDs and names are checked.
- [ ] The campaign description is written in a realistic, portfolio-safe tone.
- [ ] Links from `campaigns/index.html` still work.

## Suggested Workflow

```bash
npm run build
python3 -m http.server 8091

# edit content/campaigns/SB-XX.md
npm run build

git add content/campaigns/SB-XX.md campaigns/SB-XX.html campaigns/index.html
git commit -m "Update SB-XX campaign"
git push origin main
```
