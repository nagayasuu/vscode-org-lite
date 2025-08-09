# Org Lite

Org Lite brings the core experience of [Org mode](https://orgmode.org/) to Visual Studio Code.
It focuses on intuitive table editing and task management—keeping plain text organization simple and efficient.

## Features

- **Org Table Editing**
  - Intuitive cell navigation with `Tab`, `Shift+Tab`, and `Enter`
  - Automatic table formatting and alignment (supports full-width characters)
  - Add, delete, and move columns left/right (`Ctrl+Alt+Left/Right/K`)
  - Indentation-aware editing for nested tables

- **Hyperlink Support**
  - `[[LINK]]` style links are highlighted and clickable
  - `Ctrl+Click (Cmd+Click)` to open local files or URLs in the browser
  - Path suggestion (completion) when editing inside `[[...` (experimental)

- **TODO State Rotation**
  - Quickly cycle `TODO` states with `Alt+Right/Left`

- **Outline Support**
  - Org headings are recognized and shown in a [cleaner outline view](https://orgmode.org/org.html#Clean-View)

- **Text Markup**
  - Bold text markup supported

## Requirements

No special requirements. Just install the extension and start editing `.org` files in VS Code.
All features work out of the box—no additional setup needed.

## Known Issues

- Some advanced Org mode features (e.g. clocking, agenda, advanced markup) are not supported
- Path completion in links is experimental and may not work in all cases

## References

This extension was inspired by and references the following projects:

- [vscode-org-mode](https://github.com/vscode-org-mode/vscode-org-mode)
- [vscode-text-tables](https://github.com/rpeshkov/vscode-text-tables)
