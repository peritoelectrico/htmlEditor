# HTML Code Editor - Markdown Specification
## Project Overview
Create an HTML editor that allows users to input text, tables, images, and other elements in a WYSIWYG interface on the left panel, with real-time HTML code generation in the right panel. This tool will help programmers quickly create and format HTML content.

## Requirements
### Core Features
#### Left Panel - WYSIWYG Editor
- Text formatting toolbar (bold, italic, underline, strikethrough)
- Heading levels (H1-H6)
- List formatting (ordered, unordered)
- Text alignment (left, center, right, justify)
- Font size selection
- Color pickers for text and background
- Table insertion and contextual editing (with custom context menus)
- Image insertion with base64 local upload capability and external URLs
- Link insertion (context-aware editing for existing links)
- Blockquote formatting

#### Right Panel - HTML Code Display
- Real-time HTML code generation
- Syntax highlighting
- Line numbers

#### Third Panel - Python Variables
- Slides in dynamically when Python Interpolation Mode is active.
- Allows defining Variable Names and Test Values for dynamically extracted placeholders (e.g. `%s`, `%(name)s`, `{Property}`).
- Visually injects test values into the WYSIWYG editor non-destructively.

#### Header Actions & Toggles (Mutually Exclusive)
- **Full HTML Page:** Wraps output in boilerplate `<html><body>` tags.
- **Ignition Mode:** Strips inline styles to ensure compatibility with Inductive Automation's Ignition software. Automatically disables if rich HTML is pasted to protect formatting.
- **Python Interpolation:** Modifies right-panel output to render as a multi-line Python script snippet (e.g., `body = """...""" % (Vars)`). Replaces the Ignition Binding button with a Python Placeholder insertion modal.
- Copy to clipboard functionality
- Download as HTML file option
- Reset/Clear editor option

### Additional Features
- Undo/redo functionality (Stack-based history)
- Save/load from local storage
- Responsive flexbox layout with draggable panel dividers
- Dark/light theme options

## Technical Architecture
### Frontend Technologies
- HTML5: Base structure
- CSS3: Styling, layout, and UI components
- JavaScript: Core functionality, DOM manipulation, syntax parsing, and real-time processing
- LocalStorage: Session persistence

### File Structure
```text
html-editor/
├── editor-html.html
├── editor-htmlcss/
│   └── style.css
├── editor-htmljs/
│   ├── editor.js
│   ├── html-generator.js
│   └── utils.js
```

## Implementation Approach
### WYSIWYG Editor Implementation
- Create `contenteditable` div for user input
- Implement toolbar with formatting buttons utilizing `document.execCommand()`
- Implement custom modal overlays for complex insertions (Tables, Links, Images, Python Variables).
- Intercept paste events to handle clipboard sanitization.

### HTML Generation Engine
- Convert WYSIWYG content to clean HTML (`html-generator.js`)
- Handle element stripping and un-wrapping for specific modes
- Generate formatting and syntax highlighting via regex
- Dynamic string formatting for Python Interpolation Mode.

### Deployment Requirements
- Static hosting (GitHub Pages)
- No backend required
- Pure client-side JavaScript

## License & Attribution
This project will be released under an open-source license (MIT recommended) with proper attribution to the original creators and contributors.
