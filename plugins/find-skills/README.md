# find-skills

A Claude Code plugin that bundles the `find-skills` skill from
[vercel-labs/skills](https://github.com/vercel-labs/skills).

When you ask things like "is there a skill for X?" or "how do I do X?", Claude
searches the open agent skills ecosystem ([skills.sh](https://skills.sh/)) with
`npx skills find <query>`, checks install counts and source reputation, and
offers to install a matching skill with `npx skills add <owner/repo@skill>`.

## Install

```
/plugin marketplace add ragunathan2607/SAPUI5
/plugin install find-skills@sapui5-plugins
```

Inside this repository it is enabled automatically through `.claude/settings.json`.
Requires Node.js (for `npx`).
