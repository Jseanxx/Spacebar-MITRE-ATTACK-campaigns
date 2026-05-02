# Contributing

## Editing Your Campaign

1. Edit only your assigned `campaigns/SB-XX.html` file unless the team agrees otherwise.
2. Keep the shared layout and table structure consistent.
3. Use MITRE ATT&CK Technique IDs where possible.
4. Keep the page concise enough to read as a campaign reference.
5. Put detailed execution commands, PoC notes, and BAS implementation details in a private repository.

## Pull Request Checklist

- [ ] The page renders locally.
- [ ] No real credentials, tokens, keys, passwords, or private operational details are included.
- [ ] Technique IDs and names are checked.
- [ ] The campaign description is written in a realistic, portfolio-safe tone.
- [ ] Links from `campaigns/index.html` still work.

## Suggested Workflow

```bash
git checkout -b update-sb-XX
python3 -m http.server 8091
git add campaigns/SB-XX.html
git commit -m "Update SB-XX campaign"
git push origin update-sb-XX
```

Then open a pull request.
