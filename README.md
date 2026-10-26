# Properties Lens

**Read, search and diff Java `.properties` message bundles as real text — not `\uXXXX`.**

[한국어 README](README.ko.md)

![Search a message, jump to its definition](images/demo.gif)

Java message bundles store non-ASCII text as Unicode escapes (`\uC8FC\uBB38 \uB0B4\uC5ED`). IntelliJ shows them decoded;
VS Code shows the escapes. Converter extensions rewrite the file in place — and some also decode `%EB%A6%AC` URL encoding by mistake.

Properties Lens never touches your files. It gives you a **read-only decoded view**, a **decoded diff**, a **message search**,
and **inline messages next to keys** in JSP / JS / Java.

## Features

### Decoded view

Open `messages_ko.properties` and you see `order.title=주문 내역`. Only `\uXXXX` is decoded — URL encoding (`%EC%A3%BC`),
HTML entities (`&lt;br/&gt;`) and other escapes stay exactly as stored. Need the raw file? Use the title-bar button; it opens read-only for the session.

![Decoded view](images/decoded.png)

### Messages next to keys

In JSP, JS, Java and other source files, the message text appears right after each key. Hover to see every locale; missing translations are flagged.
Unknown keys (typos) are highlighted. `F12` / `Cmd+Click` jumps to the decoded definition.

![Hover shows every locale](images/hover.png)

### Message search — `Cmd+Alt+M` / `Ctrl+Alt+M`

Search all bundles by text in **any** locale or by key — handy when deciding whether a message can be reused.
`Enter` opens the definition; the row icons copy the key or find its usages.

![Message search](images/search.png)

### Decoded diff

*Compare with HEAD (decoded)* from the editor title or the Source Control context menu, or *Show All Bundle Changes (decoded)*
to review every changed bundle file in one multi-file diff — useful right after regenerating bundles.

![Decoded multi-file diff](images/diff.png)

### Sync

If your bundles are generated (from a spreadsheet, a script, a Maven/Gradle task…), set `propertiesLens.syncCommand`.
Run it from the status bar, then review the decoded changes.

## Getting started

Install, open a project that has message bundles, and open a bundle file. That's it for Spring `<spring:message code="…">`,
JSTL `<fmt:message key="…">` and `getMessage("…")`. For other key styles, add patterns:

```jsonc
// .vscode/settings.json
{
  "propertiesLens.primaryLocale": "ko",
  "propertiesLens.keyPatterns": [
    "<spring:message\\s[^>]*?code\\s*=\\s*\"([^\"]+)\"",
    "\\$\\.i18n\\.([A-Za-z_$][\\w$]*)",          // $.i18n.KEY
    "\\bt\\(\\s*'([^']+)'"                        // t('KEY')
  ],
  "propertiesLens.syncCommand": "./gradlew generateMessages"
}
```

## What counts as a bundle

Files named `<name>_<locale>.properties` (and their `<name>.properties` default) in the same folder, where `<locale>` is a real
language code (`ko`, `en`, `ja`, `zh_CN`, …). `application.properties`, `jdbc_dev.properties` and similar files are left alone —
*Open Decoded View* still works on any `.properties` file.

## Settings

| Setting | Default | Description |
|---|---|---|
| `propertiesLens.bundleGlob` | `**/*.properties` | Candidate files; only locale groups become bundles |
| `propertiesLens.exclude` | `**/{target,build,node_modules,out,dist,.git}/**` | Excluded files |
| `propertiesLens.primaryLocale` | `""` | Locale shown inline and in search. Empty: VS Code display language, then the default file |
| `propertiesLens.keyPatterns` | `spring:message`, `fmt:message`, `getMessage(` | Regexes that find keys; capture group 1 is the key |
| `propertiesLens.decorateFiles` | `**/*.{jsp,jspf,tag,js,ts,html,java}` | Files that get inline messages, hover and go-to-definition |
| `propertiesLens.syncCommand` | `""` | Shell command that regenerates bundles |
| `propertiesLens.syncCwd` | `""` | Working directory of the sync command, relative to the workspace folder |
| `propertiesLens.autoOpenDecoded` | `true` | Open bundle files in the decoded view automatically |

In untrusted workspaces, `syncCommand` and `syncCwd` are read from user settings only.

## Read-only by design

- The extension never writes to `.properties` files. Edit your source of truth (a spreadsheet, a generator…) instead.
- Files with merge-conflict markers or unsaved changes are never swapped to the decoded view.
- Control characters and line/paragraph separators (`\u2028`, `\u2029`) stay escaped so lines never shift.

## Known limitations

- `F12` jumps to the primary locale; other locales are in the hover.
- Changing `decorateFiles` needs a window reload for hover and go-to-definition.
- An open HEAD-side diff is not refreshed after you commit or switch branches — reopen it.

## License

[MIT](LICENSE)
