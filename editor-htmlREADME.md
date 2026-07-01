# HTML Code Editor

A premium, client-side, real-time WYSIWYG HTML Code Editor. It features an intuitive, dual-panel split layout: input rich text, tables, list items, and insert styles on the left, and view perfectly indented HTML code generated dynamically on the right with full syntax highlighting.

## Key Features

- **Split Workspace Layout:** Responsive side-by-side view with a draggable divider to resize panels.
- **WYSIWYG Formatting:** Full support for:
  - Text styles: Bold, Italic, Underline, Strikethrough.
  - Heading tags: H1 through H6 headings, standard Paragraph formatting.
  - Lists: Ordered and unordered list elements.
  - Alignment: Left, Center, Right, and Justified text.
  - Custom Color Pickers: Change text color and text background highlighting color.
  - Quotes: Blockquote wrapping blocks.
- **Custom Modals:** Premium popups to insert:
  - **Links:** Specify URL and link display text.
  - **Tables:** Custom rows, columns, and optional headers.
  - **Images:** Reference external image URLs or upload local images (converted to embedded Base64 strings, ideal for serverless setups).
- **Code Display & Real-Time Sync:**
  - Automatic indented tag structure formatting.
  - Highlighting for elements, attributes, attribute values, and comments.
  - Built-in syntax line numbers.
  - Copy generated code to clipboard with a single click.
  - Download code as an `.html` file.
- **Session Backup & History:**
  - Auto-saved draft states backed up in `localStorage` on modifications.
  - Custom Undo and Redo actions.
- **Premium Aesthetics:** Sleek dark-mode theme by default, clean glassmorphism accents, and a dynamic Light/Dark mode switcher.

## Folder Architecture

```text
html-editor/
├── editor-html.html          # Main HTML markup and UI templates
├── editor-htmlcss/
│   └── style.css            # Stylesheets, color schemes, themes, layouts, transitions
└── editor-htmljs/
    ├── editor.js            # Controller handling event hooks, modals, toolbar triggers, state stack
    ├── html-generator.js    # Beautifier formatter and syntax tokenizer highlighting parser
    └── utils.js             # Utility helpers for localStorage, downloader, clipboard, debounce
```

## How to Run Locally

Since this project relies on **ES6 JavaScript modules** (`import` / `export` keywords), modern browsers block them when loading files directly using the `file://` protocol due to CORS policy. 

To open and run the editor:
1. Open the project folder in VS Code or any editor.
2. Serve it using a lightweight local web server (e.g., using VS Code **Live Server** extension, or by running `npx serve` or `python -m http.server` in the directory).
3. Access the served URL (e.g., `http://127.0.0.1:5500/editor-html.html` or `http://localhost:8000/editor-html.html`).

## GitHub Pages Deployment

To host this editor for free on GitHub Pages:
1. Initialize a git repository in the folder: `git init`
2. Commit all files:
   ```bash
   git add .
   git commit -m "Initial commit of HTML Code Editor"
   ```
3. Push to a repository on GitHub.
4. Go to repository Settings > Pages.
5. Under **Build and deployment**, set source to **Deploy from a branch**, choose `main` branch, and set the folder to `/ (root)`.
6. Save. After a few minutes, your editor will be live at `https://<your-username>.github.io/<your-repo-name>/editor-html.html`.
