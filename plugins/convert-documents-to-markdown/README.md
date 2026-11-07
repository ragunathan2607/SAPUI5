# convert-documents-to-markdown

A Claude Code plugin that bundles the `convert-documents-to-markdown` skill from
[firecrawl/anydoc](https://github.com/firecrawl/anydoc) (MIT).

When a task needs the contents of an office document, spreadsheet, presentation,
ebook or PDF, Claude runs `npx -y @firecrawl/anydoc <file>` to turn it into
GitHub-Flavored Markdown. Supported: .doc/.docx, .ppt/.pptx, .xls/.xlsx/.xlsb,
.odt/.ods/.odp, .rtf, .epub, .csv and .pdf. Requires Node.js 20+.

Conversion runs locally. Only scanned/image-only PDF pages need OCR; rerunning
with `--ocr hosted` uploads the file to Firecrawl's servers, so avoid that for
confidential documents.

## Install

```
/plugin marketplace add ragunathan2607/SAPUI5
/plugin install convert-documents-to-markdown@ragunathan-plugins
```
