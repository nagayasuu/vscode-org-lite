# Org Lite

Org Lite brings the core experience of [Org mode](https://orgmode.org/) to Visual Studio Code in a simple, fast, and user-friendly way.
It focuses on intuitive table editing, clickable links, TODO management, and a clean outline view—making your plain text organization productive and enjoyable.

## Features

- **Org Table Editing**
  - `Tab`, `Shift+Tab`, and `Enter` for intuitive cell navigation
  - Automatic table formatting and alignment, including support for full-width (ambiguous-width) characters
  - Add, remove, and move columns left/right with keyboard shortcuts
  - Indentation-aware editing for nested tables

- **Hyperlink Support**
  - `[[LINK]]` style links are highlighted and clickable
  - Ctrl+Click (Cmd+Click) to open local files or URLs in the browser
  - Path suggestion (completion) when editing inside `[[...` (experimental)

- **TODO State Rotation & Task List**
  - Quickly cycle `TODO` states with `Alt+Right/Left`
  - Simple task list management

- **Outline Support**
  - Org headings are recognized and shown in a [cleaner outline view](https://orgmode.org/org.html#Clean-View)

- **Text Markup**
  - Bold text markup supported

## Requirements

No special requirements. Just install the extension and start editing `.org` files in VS Code (version 1.102.0 or later).
All features work out of the box—no additional setup needed.

## Known Issues

- Some advanced Org mode features (e.g. clocking, agenda, advanced markup) are not supported
- Path completion in links is experimental and may not work in all cases

## References

This extension was inspired by and references the following projects:

- [vscode-org-mode](https://github.com/vscode-org-mode/vscode-org-mode)
- [vscode-text-tables](https://github.com/rpeshkov/vscode-text-tables)
