<p align="center">
  <img src="docs/images/banner.png" alt="Markwiz" width="100%">
</p>

# Markwiz

*[한국어](README.md) | English*

A Typora-style WYSIWYG Markdown editor built on Tiptap (ProseMirror). It renders Mermaid and
PlantUML diagrams entirely client-side, with no backend server required. Web and desktop (Tauri)
share the same codebase.

**Current version: 0.1.5** (2026-11-15). See the [release notes](#release-notes) for what changed.

![Markwiz screenshot](docs/images/screenshot.png)

## Key features

- **Real-time WYSIWYG editing** — Markdown syntax (`# `, `**bold**`, `- `, `> `, ` ``` `, `[]()`, etc.)
  turns into formatting the moment you type it, and the raw syntax is shown only on the line the
  cursor is on (Typora-style).
- **Multiple document tabs** — open and edit several `.md` files at once from a tab strip below
  the ribbon. Each tab keeps its own undo history, and closing a tab with unsaved changes asks
  whether to save first.
- **Diagrams** — ` ```mermaid ` and ` ```plantuml ` code blocks render as diagrams. No backend
  server needed.
- **Print and export to PDF / Word / HTML** — printing (PDF), generating a real `.docx` (Word), and writing a single
  `.html` file all happen in the browser/webview, with no server involved.
- **Typora-identical shortcuts** — `keymap.json` maps Windows/Linux and macOS separately and can be
  edited directly to remap keys.
- **Word-style ribbon toolbar + status bar** — formatting/insert buttons, word/character counts,
  current block type.
- **Lossless round-trip** — opening and saving Markdown keeps the file byte-for-byte identical
  (verified by round-trip tests).
- **Web + desktop** — only file open/save differ by platform (web: file picker/download, desktop:
  real filesystem); the UI is 100% shared.

Supported syntax: headings (H1–H6), bold/italic/strikethrough/inline code, blockquotes,
ordered/unordered lists, checkboxes, code blocks (syntax highlighting), tables (GFM), links,
images, horizontal rules, footnotes.

## Installation (Windows)

You can install from a release build without building anything. No developer tools (Node.js, Rust, …) are needed.

1. Download one of these files from the [Releases page](https://github.com/objectworld/markwiz/releases/latest).

   | File | Description |
   |---|---|
   | `Markwiz_0.1.5_x64-setup.exe` | Installer (recommended). Lets you pick Korean/English and installs WebView2 automatically if missing |
   | `Markwiz_0.1.5_x64_en-US.msi` | MSI package (English) |
   | `Markwiz_0.1.5_x64_ko-KR.msi` | MSI package (Korean) |
   | `Markwiz_0.1.5_x64_portable.exe` | Standalone executable, no installation (requires the WebView2 runtime; no `.md` file association) |

2. Run the downloaded file. The app isn't code-signed, so Windows SmartScreen may warn ("Windows protected your PC") —
   choose **More info → Run anyway**.
3. Follow the installer. `setup.exe` first asks for the installer language (한국어/English), which also becomes the app's
   default language (you can change it later under **Help > 언어 / Language**). Leave the **Open Markdown files with Markwiz**
   checkbox (checked by default) on to open `.md` files by double-clicking them in File Explorer.
4. Start **Markwiz** from the Start menu.

- **Requirements**: 64-bit (x64) Windows 10/11. The WebView2 runtime ships with Windows 11; the installer adds it if missing.
- **Updating**: download the newer installer and install over the existing version (close Markwiz first).
- **Uninstalling**: remove Markwiz from Windows **Settings > Apps > Installed apps**.
- **Verifying the download (optional)**: compare `Get-FileHash .\Markwiz_0.1.5_x64-setup.exe` with the release's `SHA256SUMS.txt`.

Installers for macOS/Linux aren't provided yet.

## Development setup

Only needed to run or build from source. To just use the app, [Installation (Windows)](#installation-windows) above is enough.

### 1. Required software

Running the web version only requires **Node.js** and **pnpm**. Building the desktop app also
needs the Rust toolchain and platform-specific tools.

| Software | Purpose | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) 22 LTS or later | Dev server, build | Developed with v22.19 |
| [pnpm](https://pnpm.io) | Package manager | Pinned for this project |
| [Rust](https://rustup.rs) 1.77.2 or later | Desktop build | Install via `rustup` |
| C++ build tools | Desktop build | Windows: Visual Studio Build Tools |
| WebView2 runtime | Running the desktop app | Included by default on Windows 11 |

#### Windows (PowerShell)

```powershell
# Node.js LTS, pnpm
winget install OpenJS.NodeJS.LTS
npm install -g pnpm

# Only needed to build the desktop app: Rust + C++ build tools
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Open a new terminal afterward and confirm `node -v`, `pnpm -v`, and `rustc --version` all print a
version. Build Tools is large (several GB) and can take a while.

#### macOS / Linux

Follow Tauri's official [prerequisites](https://v2.tauri.app/start/prerequisites/) (Xcode Command
Line Tools on macOS, system libraries such as `webkit2gtk` on Linux).
Development and testing have only been done **on Windows**; macOS/Linux builds have not been
verified yet.

### 2. Get the source and install dependencies

```bash
git clone https://github.com/objectworld/markwiz.git
cd markwiz
pnpm install
```

## Running and building

### Development mode

```bash
pnpm dev          # web dev server — http://localhost:5173
pnpm tauri dev    # desktop app dev mode (requires Rust)
```

### Web build

```bash
pnpm build        # output: dist/ (static files)
pnpm preview      # preview the build locally — http://localhost:4173
```

`dist/` can be deployed as-is to static hosting (Nginx, GitHub Pages, etc.). The built
`index.html` includes a CSP `<meta>` tag allowing `'wasm-unsafe-eval'` so PlantUML (WebAssembly)
works. If your server sets its own CSP header, it must allow the same policy (see `csp.ts`).

### Desktop app build (Windows)

```bash
pnpm tauri build
```

Artifacts are written to `src-tauri/target/release/`.

| File | Description |
|---|---|
| `bundle/nsis/Markwiz_0.1.5_x64-setup.exe` | Installer (recommended; installs WebView2 automatically if missing) |
| `bundle/msi/Markwiz_0.1.5_x64_en-US.msi` | MSI package (English) |
| `bundle/msi/Markwiz_0.1.5_x64_ko-KR.msi` | MSI package (Korean) |
| `markwiz.exe` | Standalone executable, no installation |

- Running the exe alone (without an installer) requires the **WebView2 runtime** on the target PC.
- The app isn't code-signed, so Windows SmartScreen may warn on first launch ("More info → Run
  anyway").
- The build fails to overwrite `markwiz.exe` if it's currently running at the build location. Quit
  the app before building.
- To check that the app compiles without producing installers, use `pnpm tauri build --no-bundle`.

### Tests

```bash
pnpm test         # run the full Vitest suite
pnpm test:watch   # watch mode
```

### Replacing the icon

The originals are `docs/images/logo.svg` (vector) and `logo.png` (1024px). To use a different
image, prepare a 1024×1024 PNG and run:

```bash
pnpm tauri icon path/to/icon.png
```

This regenerates the `.ico`/`.icns` and per-size PNGs under `src-tauri/icons/`. It also creates
`android/` and `ios/` folders for mobile targets, which you can delete since this project doesn't
support mobile. The web favicon is `public/favicon.svg`.

## Usage

### Screen layout

| Area | Description |
|---|---|
| Window title | Current document name (`document.md - Markwiz`) |
| Menu bar (desktop) | File / Edit / Font / Paragraph / Insert / Diagram / View / Help. Mirrors the toolbar, with shortcuts shown alongside each item. Export lives in the **File > Export** submenu |
| Toolbar | File / Edit (undo·redo) / Font / Paragraph / Insert / Diagram / Export / View groups. Hover a button to see its name and shortcut |
| Sidebar | Document outline (heading list). Open by default; toggle with `Ctrl+Shift+L`. Drag its right edge to resize it (double-click to reset); the width is remembered |
| Document area | An ivory-colored workspace with a single sheet of white paper. Clicking empty space still starts editing |
| Status bar | Document name, word count, character count (excluding spaces), selected character count, current block type |

- **Font group**: style dropdown (body text, heading 1–6), bold, italic, strikethrough, inline
  code, clear formatting
- **Insert group**: table, image, link, code block, horizontal rule, footnote
- Formatting applied at the cursor position is shown as a highlighted button.

### Typing Markdown directly

Typing the patterns below converts them to formatting immediately. The line the cursor is on shows
the raw syntax (`#`, `**`, etc.) dimmed alongside the rendered text.

| Input | Result |
|---|---|
| `# ` through `###### ` + space | Heading 1–6 |
| `**bold**` | **bold** |
| `*italic*` or `_italic_` | *italic* |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `` `code` `` | inline code |
| `> ` + space | blockquote |
| `- `, `* `, `+ ` + space | bulleted list |
| `1. ` + space | numbered list |
| `[ ] `, `[x] ` (start of line) | checkbox |
| ` ```language ` + space (e.g. ` ```js `) | code block (syntax highlighting) |
| `---` | horizontal rule |
| `[text](url)` | link |
| `![alt](url)` | image |

### Inserting links and images

Clicking the link/image buttons in the toolbar's **Insert** group (or pressing `Ctrl+K`,
`Ctrl+Shift+I`) opens an insert dialog.

- **Web address**: type `https://example.com`. Leaving off `https://` (e.g. `example.com`) adds it
  automatically.
- **A file on your computer** (desktop app): use the **Choose file…** button, or type a path
  directly, e.g. `C:\Users\me\a.png`. The image is shown immediately. The address that gets stored
  depends on where the file is:
  - A file **in the document's folder or a subfolder** → a relative path (`./img/a.png`). The link
    keeps working if you move the document and the file together.
  - A file anywhere else (a parent folder, a different drive, etc.), or a document that hasn't been
    saved yet → an absolute path (`file:///C:/Users/me/a.png`).
  Links apply to the selected text if there is a selection; otherwise you're asked for **display
  text**.
- Clearing the address field and confirming removes the link.
- In the web version, only image files (1MB or smaller) can be chosen, and they're embedded as data
  in the document. Links can't point to local files on the web.

Tables and footnotes are inserted from the toolbar's **Insert** button (or `Ctrl+T` for a table).
Opening a Markdown file that already contains `|` tables or `[^1]` footnotes reads them as tables
and footnotes as-is.

#### Editing tables (right-click)

**Right-click** inside a table to open a menu.

- **Insert row above/below, delete row, insert column left/right, delete column, delete table** —
  applied relative to the cell you right-clicked.
- **Merge cells** — drag with the mouse to select several cells, then right-click one of the
  selected cells (the selection is kept only if you click inside it). The item is disabled unless
  several cells are selected.
- **Split cell** — available when a single merged cell is selected.
- GFM tables can't express merged cells, so **only tables that contain a merge** are saved as an
  HTML `<table>` inside the Markdown. Reopening restores the merge as-is, and tables without
  merges are still saved as `|` tables. (Other Markdown viewers such as GitHub show it as an HTML
  table.)
- The keyboard context-menu key (`Shift+F10`) opens it too.

### Zoom

Zooms the document (the paper) and source code mode; the toolbar and menus stay the same size.
The range is 50%–300%.

- The zoom in / zoom out / actual size buttons in the toolbar's **View** group, **View** in the
  menu, or shortcuts (`Ctrl+Shift+=` zoom in, `Ctrl+Shift+-` zoom out, `Ctrl+Shift+9` actual size)
- Hold `Ctrl` (`Cmd` on macOS) and use the mouse wheel / trackpad pinch
- Click the zoom level on the right of the status bar (e.g. `120%`) to go back to 100%
- Zoom isn't applied when printing or exporting to PDF/HTML

### Opening and saving files

| Action | Shortcut (Windows/Linux) | Description |
|---|---|---|
| New | `Ctrl+N` | Blank document |
| Open | `Ctrl+O` | `.md` / `.markdown` file |
| Save | `Ctrl+S` | Overwrites the open file, or falls back to "Save As" if none is open |
| Save As | `Ctrl+Shift+S` | |
| Print | `Ctrl+P` | The system print dialog (see "Printing and exporting" below) |
| Find | `Ctrl+F` | Edit menu. Match-case option; Enter / Shift+Enter for next / previous |
| Replace | `Ctrl+H` | Edit menu. Replace / Replace All (undone in one step) |

- **Desktop app**: uses the OS's file open/save dialogs and writes to the real file. The same
  actions are also available from the top menu (File, etc.).
- **Web browser**: opening shows a file picker, and saving triggers a browser download (browsers
  can't overwrite a local file directly).

#### Opening `.md` files by double-clicking

Both the NSIS and MSI installers show a checkbox during installation asking **whether to open
`.md`/`.markdown` files with Markwiz** (checked by default). Installing with it checked lets you
double-click a file in Explorer, or choose "Open with → Markwiz", to open it.

- If Markwiz is already open, it opens the file in the existing window instead of a new one (and
  brings that window to the front).
- Doesn't apply if you just copy the standalone `markwiz.exe` without using an installer.
- Unattended installs (NSIS's `/P` flag, MSI's `/qn`/`/qb`) don't show the checkbox and associate
  the file type by default, as in earlier versions.
- Verified on Windows only. The setting exists for macOS/Linux too but hasn't been verified there.

#### Recently opened files

**File > Recently Opened Files** in the desktop app lets you quickly reopen a recent file.

- Remembers up to **10** files, most recent first. Reopening a file already in the list moves it to
  the top instead of duplicating it.
- Files opened via **Open**, and files saved via **Save As** (or a first save), are recorded. The
  list survives restarting the app.
- Each entry shows its containing folder dimmed on the right; hover to see the full path.
- If a file has been moved or deleted, it's dropped from the list and a notice appears in the
  status bar.
- **Clear List** empties it.
- Not available on the web, since file paths aren't known there.

### Diagrams

Setting a code block's language to `mermaid` or `plantuml` renders it as a diagram. The toolbar's
**Diagram** group buttons can also insert a block with example content.

````markdown
```mermaid
graph LR
  A[Markdown] --> B[Markwiz]
```

```plantuml
Alice -> Bob : Hello
```
````

- The **view code / preview** buttons at the top-right of a block switch between the raw code and
  the rendered diagram. A newly created empty block starts in code mode.
- Edits redraw the diagram automatically about 0.4s later. The raw code stays editable even if
  there's a syntax error.
- PlantUML is fairly large (~5MB), so it's loaded on a separate thread the **first time** a
  PlantUML block appears in the document. The first render can take a few seconds; later ones are
  fast. `@startuml`/`@enduml` can be omitted.
- **Clicking a diagram opens a popup** where you can look at it larger. Inside it, the `+`/`-`
  buttons and `Ctrl` + mouse wheel zoom just that diagram (10%–800%), you can drag to pan, and there
  are **fit to window** / **100%** buttons. `Esc` or a click outside closes it. It's independent
  of the document zoom.

### Printing and exporting to PDF / Word / HTML

**Print** (`Ctrl+P`, the toolbar's File group, **File > Print**) opens the system print dialog. The three buttons in the toolbar's **Export** group (also under **File > Export** in the menu) save the current document in
another format.

- **Print**: uses the same print layout as PDF below (menu, toolbar, sidebar, and status bar left out; diagrams as images). The paper is the same A4 width as on screen, so line breaks match what you see.
- **Export to HTML**: saves what is rendered on screen, with its CSS, as one standalone `.html` file. Diagrams become their rendered SVG, code blocks keep their syntax highlighting, and checkboxes stay as read-only boxes. Local images (`file://`, relative paths) are embedded as PNG data so they still show after the file is moved; internet (`https:`) images keep their address. A local image that can't be read is replaced by its alt text. Opened in a browser it looks like the same A4 sheet as on screen, and printing it gives a normal document with 0.75in margins. Pressing it in Source Code Mode switches back to the preview first (a notice appears and nothing is exported if that fails).

- **Export to PDF**: uses the browser's/webview's print feature. Pick "Save as PDF" ("Microsoft
  Print to PDF" on Windows) in the print dialog. The menu, toolbar, sidebar, and status bar are
  left out of the printout, and diagrams always render as images regardless of their current
  code/preview toggle state. Pressing it in Source Code Mode switches back to the preview first
  (a notice appears in the status bar and nothing prints if that conversion fails).
- **Export to Word**: builds a real `.docx` file (converting the document tree directly, not
  printing). It carries over headings, bold/italic/strikethrough/inline code, blockquotes,
  bulleted/numbered lists (including nesting, using Word's own numbering), checklists (shown as
  `☐`/`☑` characters — not a native Word list), code blocks, tables, footnotes, links, and
  horizontal rules. Images and diagrams are captured from what's already rendered on screen — via
  canvas, with no network request — so local files and data-URL images always work, but external
  images that don't allow CORS can't be read due to browser security and are replaced with
  `[image: description]` text instead.
- The desktop app asks where to save; the web version downloads it directly.

### Key shortcuts

macOS generally swaps `Ctrl` for `Cmd`, but a few (★) use a different combination entirely. The
full list is in [`src/commands/keymap.json`](src/commands/keymap.json).

| Action | Windows / Linux | macOS |
|---|---|---|
| Bold / Italic | `Ctrl+B` / `Ctrl+I` | `Cmd+B` / `Cmd+I` |
| Strikethrough ★ | `Alt+Shift+5` | `` Control+Shift+` `` |
| Inline code | `` Ctrl+Shift+` `` | `` Cmd+Shift+` `` |
| Clear formatting | `Ctrl+\` | `Cmd+\` |
| Heading 1–6 / Body | `Ctrl+1`–`6` / `Ctrl+0` | `Cmd+1`–`6` / `Cmd+0` |
| Blockquote ★ | `Ctrl+Shift+Q` | `Cmd+Alt+Q` |
| Numbered list ★ | `Ctrl+Shift+[` | `Cmd+Alt+O` |
| Bulleted list ★ | `Ctrl+Shift+]` | `Cmd+Alt+U` |
| Code block ★ | `Ctrl+Shift+K` | `Cmd+Alt+C` |
| Insert table ★ | `Ctrl+T` | `Cmd+Alt+T` |
| Link | `Ctrl+K` | `Cmd+K` |
| Image ★ | `Ctrl+Shift+I` | `Cmd+Control+I` |
| Zoom in / out / actual size | `Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+9` | `Cmd+Shift+=` / `Cmd+Shift+-` / `Cmd+Shift+9` |

### Remapping shortcuts

1. **Edit the source** — change the `win`/`mac` values for a command in
   `src/commands/keymap.json` and rebuild.
2. **Change it instantly on the web** — save just the overrides you want in your browser's
   dev-tools console, then reload.

   ```js
   localStorage.setItem('markwiz:keymap-overrides', JSON.stringify({
     'format.bold': { win: 'Ctrl+Shift+B', mac: 'Cmd+Shift+B' },
   }));
   ```

   To clear the saved overrides, run `localStorage.removeItem('markwiz:keymap-overrides')`. There's
   no settings UI for this yet.

## Known limitations

- **Word export**: nested numbered lists count independently from 1 at each level (no multi-level
  numbering like "1.1."). Checklists are `☐`/`☑` characters, not a native Word list. It's saved as
  a separate file from the document (no "Save As" link back), and there's no way to import a Word
  file back into Markdown — export is one-way only.
- **PDF export** goes through the browser's/webview's print dialog rather than writing a file
  directly — it isn't a one-click "save straight to PDF" feature.
- The sidebar only has the document outline (heading list), not a file tree. `Toggle Sidebar` and
  `Outline` toggle the same panel.
- While in Source Code Mode, the toolbar's formatting buttons act on an editor that isn't visible
  on screen — use formatting after turning Source Code Mode off.
- A local file outside the document's folder, or one chosen before the document was saved, is
  stored as an absolute path (`file:///…`) and won't open if you move the document to another
  computer.
- Relative paths are resolved against the folder the document was saved in. "Save As" to a
  different folder doesn't rewrite existing relative paths automatically — move the referenced
  files along with the document.
- Relative-path images only render in the desktop app, and only once the document has been
  saved or opened from a real location. Paths pointing to a parent folder (`../a.png`) render if
  typed directly, but the insert dialog won't generate them automatically.
- Whether clicking a link in the editor opens it in an external browser/default app on the desktop
  app hasn't been verified.
- `.md` file association only applies when installed via an installer (NSIS/MSI); it doesn't apply
  to the standalone `markwiz.exe`.
- The web version's menu bar has no Recently Opened Files (the web can't remember file paths).
- PlantUML's `!theme`, standard library includes (`!include <...>`), and dark mode aren't
  supported.
- Tables with merged cells are saved as an HTML `<table>`, so other viewers such as GitHub show them
  as HTML tables. A hand-written HTML table is read as a table only if it starts with `<table` and ends with `</table>`; other HTML
  stays as literal text.
- Only a light theme is supported.

## Release notes

### 0.1.5 (2026-11-15)

- **Find / Replace**: **Find** (`Ctrl+F`) and **Replace** (`Ctrl+H`) in the Edit menu. Matches are highlighted in the document, with a **Match case** option, previous/next (Enter / Shift+Enter), Replace, and Replace All (undone in one step)
- **External change prompt**: when a file you have open is changed by another program, returning to the window shows a **dialog asking whether to reload it** (desktop). If you have unsaved changes it warns that they would be lost
- Printing now outputs only the document body, without a header or footer

### 0.1.4 (2026-11-12)

- **Print**: `Ctrl+P` (`Cmd+P` on macOS), the Print button in the toolbar's File group, or **File > Print**. The menu, toolbar, sidebar, and status bar are left out and diagrams print as images
- **Export to HTML**: added to the Export group/submenu. Saves one standalone `.html` file with styles, diagrams, and images included
- **Document zoom**: `Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+9` (actual size), `Ctrl`+wheel/pinch, and the zoom button in the status bar. The paper is always A4 wide and its width scales with the zoom, so it looks like the printed page
- **Diagram popup**: click a rendered Mermaid/PlantUML diagram to open a window where you can zoom and drag it independently of the document
- **Table right-click menu**: insert/delete rows and columns, merge/split cells, delete the table. Tables with merged cells are saved as an HTML `<table>` inside the Markdown because GFM can't express them
- **Resizable outline panel**: drag its right edge or use the ←/→ keys; double-click to reset. The width is remembered
- **Fixed marker position**: the Markdown marks that appear while you edit numbered lists, bullets, headings, quotes, and checkboxes (`1. `, `- `, `# `, …) now sit in the left margin instead of pushing the text sideways

### 0.1.3 (2026-10-29)

- **Multiple document tabs**: open and edit several `.md` files at once as tabs. Each tab keeps its
  own undo history, cursor, and scroll position, and closing a tab with unsaved changes (●) asks
  whether to save first. Opening a file that is already open switches to its tab. The tab strip
  sits right below the ribbon
- **Menu bar on the web too**: the web version now shows the same menu bar as the desktop app
  (Windows/Linux). Help (view README) and language switching are available on the web as well.
  There is no Recently Opened Files on the web

### 0.1.2 (2026-09-24)

- **Korean / English UI**: every menu, toolbar button, status bar, dialog, and the sample document
  is available in Korean and English. Switch any time from **Help > 언어 / Language**; the choice
  is remembered. The NSIS installer asks for a language at startup (and shows its own pages in
  it); MSI comes as one file per language (`_ko-KR.msi`, `_en-US.msi`). The language picked at
  install time becomes the app's default on first launch. Without an installer (web, standalone
  exe) the browser/OS language is used
- **Export to PDF / Word**: a new "Export" group in the toolbar and menu. PDF uses the
  browser's/webview's print feature; Word is built by converting the document tree directly into a
  `.docx` (headings, formatting, lists, tables, footnotes, images, and diagrams included). See
  [Printing and exporting to PDF / Word / HTML](#printing-and-exporting-to-pdf--word--html) for details
- **`.md`/`.markdown` file association**: installing via an installer (NSIS/MSI) lets you
  double-click `.md` files in File Explorer to open them directly. Both installers show a checkbox
  (checked by default) asking whether to associate the file type. If Markwiz is already open, files
  open in the existing window instead of a new one. Doesn't apply to the standalone `markwiz.exe`

### 0.1.1 (2026-09-23)

- **Recently opened files**: a Recently Opened Files submenu in the File menu (up to 10 entries).
  Shows the containing folder for each, and drops files that can no longer be opened, notifying via
  the status bar
- **Relative paths for local files**: inserting a file in the document's folder or a subfolder as a
  link/image now stores a relative path (`./img/a.png`) instead of an absolute one. Links keep
  working when the document and file are moved together
- **Help > About Markwiz**: added a window showing the version and an introduction
- Various small fixes, including test stability improvements

### 0.1.0 (2026-09-20)

First release.

- **Editing**: Markdown syntax converts to formatting the instant you type it, with raw syntax
  shown only on the current line. Headings, bold/italic/strikethrough, blockquotes, lists,
  checkboxes, code blocks (syntax highlighting), tables, links, images, horizontal rules, footnotes
- **Diagrams**: Mermaid and PlantUML render with no server (PlantUML loads only on first use, in a
  Web Worker)
- **Files**: open/save/save-as `.md` on desktop; file picker/download on the web. Round-trip
  conversion keeps content identical after saving and reopening
- **Shortcuts**: the full Typora shortcut mapping, remappable via `keymap.json`
- **Screen**: Word-style toolbar and status bar, desktop menu bar, document outline sidebar
- **View modes**: Source Code Mode, Focus Mode, Typewriter Mode, zoom
- **Link/image insert dialog**: type a web address or choose a file from your computer
- **Help**: view this README inside the app from the Help menu, and check Markwiz's version/intro
- **Distribution**: Windows x64 installer (NSIS), MSI, standalone executable. Not code-signed
- Verified on Windows only; macOS/Linux builds haven't been checked

## Project structure

```
src/
  editor/        Tiptap editor, extensions (input rules, raw-syntax reveal, footnotes, etc.), diagram NodeViews
  ribbon/        Ribbon toolbar and status bar
  menu/          Desktop menu bar, menu model, Help dialog
  commands/      Command registry, keymap.json, file commands
  markdown/      Markdown <-> document tree conversion (round-trip tests included)
  export/        Print / PDF (print) / Word (.docx) / HTML export
  platform/      Web / desktop platform abstraction (file open/save, native menu)
  workers/       PlantUML rendering Web Worker
src-tauri/       Tauri (Rust) desktop wrapper and icons
docs/images/     Logo, banner, screenshot
```

Development conventions and design decisions are documented in [`CLAUDE.md`](CLAUDE.md) (Korean).

## Tech stack

- **Editor engine**: [Tiptap](https://tiptap.dev) (ProseMirror)
- **UI**: React + TypeScript + Tailwind CSS
- **Desktop**: [Tauri](https://tauri.app) v2
- **Diagrams**: [Mermaid](https://mermaid.js.org), [`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core) (PlantUML compiled via TeaVM)
- **Markdown**: markdown-it + prosemirror-markdown
- **Export**: PDF via browser print, Word via [`docx`](https://www.npmjs.com/package/docx), HTML from the cleaned-up rendered DOM
- **Tests**: Vitest

## License

[GNU Lesser General Public License v2.1](LICENSE) (`LGPL-2.1-only`) © [objectworld](https://github.com/objectworld)

Bundled third-party components follow their own licenses (mostly MIT/Apache-2.0/ISC/BSD; Mermaid's
`elkjs` dependency is EPL-2.0, and `dompurify` is MPL-2.0 or Apache-2.0).
