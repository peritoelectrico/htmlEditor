/**
 * HTML Code Editor - HTML Parser, Beautifier & Syntax Highlighter
 */

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 
  'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'font', 'img'
]);

const SELF_CLOSING_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const URL_ATTRIBUTES = new Set([
  'action', 'background', 'cite', 'formaction', 'href', 'poster', 'src', 'xlink:href'
]);

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|tel):|\/|#|\?|\.{1,2}\/)/i;
const SAFE_IMAGE_DATA_URL_PATTERN = /^data:image\/(?:gif|png|jpe?g|webp|svg\+xml);base64,/i;

/**
 * Converts a contenteditable DOM element into clean, formatted, and indented HTML.
 * @param {HTMLElement} element - The WYSIWYG editor DOM node
 * @param {boolean} isIgnitionMode - Whether to strip unsupported scripts/styles
 * @returns {string} - Clean, formatted HTML string
 */
export function getCleanAndFormattedHTML(element, isIgnitionMode = false) {
  if (!element) return '';
  
  let targetElement = element;
  
  if (isIgnitionMode) {
    targetElement = element.cloneNode(true);
    // Strip scripts, styles, and links
    const scripts = targetElement.querySelectorAll('script, style, link');
    scripts.forEach(s => s.remove());
    return formatIgnitionHTML(targetElement);
  }
  
  return formatNodeChildren(targetElement, 0, isIgnitionMode).trim();
}

function escapeTextNode(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isSafeIgnitionAttribute(name, value) {
  if (name === 'style' || name === 'srcdoc' || name.startsWith('on')) {
    return false;
  }

  if (!URL_ATTRIBUTES.has(name)) {
    return true;
  }

  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return true;
  }

  return SAFE_URL_PATTERN.test(trimmedValue) || SAFE_IMAGE_DATA_URL_PATTERN.test(trimmedValue);
}

function parseStyleAttribute(styleText) {
  return (styleText || '').split(';').reduce((styles, declaration) => {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex === -1) return styles;
    
    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (property && value) styles[property] = value;
    
    return styles;
  }, {});
}

function isIgnitionBlockTag(tag) {
  return ['address', 'article', 'aside', 'blockquote', 'div', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'section'].includes(tag);
}

const IGNITION_COLOR_NAMES = new Set([
  'black', 'blue', 'cyan', 'darkgray', 'gray', 'green', 'lightgray',
  'magenta', 'orange', 'pink', 'red', 'white', 'yellow'
]);

const IGNITION_HEX_TO_NAME = {
  '#000000': 'black',
  '#0000ff': 'blue',
  '#00ffff': 'cyan',
  '#404040': 'darkGray',
  '#808080': 'gray',
  '#008000': 'green',
  '#00ff00': 'green',
  '#c0c0c0': 'lightGray',
  '#ff00ff': 'magenta',
  '#ffa500': 'orange',
  '#ffc0cb': 'pink',
  '#ff0000': 'red',
  '#ffffff': 'white',
  '#ffff00': 'yellow'
};

function normalizeIgnitionColor(color) {
  if (!color) return '';
  const trimmed = color.trim();
  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  
  if (rgbMatch) {
    const hexColor = '#' + rgbMatch.slice(1, 4)
      .map(part => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
      .join('');
    return IGNITION_HEX_TO_NAME[hexColor] || 'black';
  }
  
  const lowerColor = trimmed.toLowerCase();
  if (IGNITION_COLOR_NAMES.has(lowerColor)) {
    return lowerColor === 'darkgray' ? 'darkGray' : lowerColor === 'lightgray' ? 'lightGray' : lowerColor;
  }
  
  return IGNITION_HEX_TO_NAME[lowerColor] || 'black';
}

function wrapIgnitionInline(html, wrappers) {
  return wrappers.reduceRight((wrapped, wrapper) => {
    if (wrapper.tag === 'font') {
      return `<font color="${escapeAttributeValue(wrapper.color)}">${wrapped}</font>`;
    }
    return `<${wrapper.tag}>${wrapped}</${wrapper.tag}>`;
  }, html);
}

function formatIgnitionHTML(element) {
  const body = formatIgnitionChildren(element).replace(/(?:<br>\s*)+$/g, '').trim();
  return body ? `<html>\n${body}` : '<html>';
}

function formatIgnitionChildren(element) {
  return Array.from(element.childNodes).map(formatIgnitionNode).join('');
}

function formatIgnitionNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeTextNode(node.textContent).replace(/\s+/g, ' ');
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const tag = node.tagName.toLowerCase();
  const styles = parseStyleAttribute(node.getAttribute('style'));
  const wrappers = [];
  let innerHTML = formatIgnitionChildren(node);
  
  if (!innerHTML.trim() && tag !== 'br') {
    return '';
  }
  
  if (styles.color) {
    wrappers.push({ tag: 'font', color: normalizeIgnitionColor(styles.color) });
  }
  
  if (styles['text-align'] && styles['text-align'].toLowerCase() === 'center') {
    wrappers.push({ tag: 'center' });
  }
  
  if (styles['text-decoration']) {
    const decoration = styles['text-decoration'].toLowerCase();
    if (decoration.includes('underline')) wrappers.push({ tag: 'u' });
    if (decoration.includes('line-through')) wrappers.push({ tag: 's' });
  }
  
  switch (tag) {
    case 'html':
    case 'body':
    case 'span':
    case 'font':
      if (tag === 'font' && node.getAttribute('color')) {
        wrappers.push({ tag: 'font', color: normalizeIgnitionColor(node.getAttribute('color')) });
      }
      return wrapIgnitionInline(innerHTML, wrappers);
    case 'b':
    case 'strong':
      return wrapIgnitionInline(innerHTML, [...wrappers, { tag: 'b' }]);
    case 'u':
      return wrapIgnitionInline(innerHTML, [...wrappers, { tag: 'u' }]);
    case 's':
    case 'strike':
    case 'del':
      return wrapIgnitionInline(innerHTML, [...wrappers, { tag: 's' }]);
    case 'br':
      return '<br>\n';
    case 'center':
      return wrapIgnitionInline(innerHTML, [...wrappers, { tag: 'center' }]);
    case 'ul':
    case 'ol':
      return `<${tag}>\n${innerHTML.trim()}\n</${tag}>\n`;
    case 'li':
      return `<li>${wrapIgnitionInline(innerHTML, wrappers)}</li>\n`;
    case 'tr':
      return `${innerHTML.trim()}<br>\n`;
    case 'td':
    case 'th':
      return `${wrapIgnitionInline(innerHTML, wrappers)} `;
    case 'table':
    case 'thead':
    case 'tbody':
      return innerHTML;
    case 'a':
      return wrapIgnitionInline(innerHTML, wrappers);
    default:
      if (isIgnitionBlockTag(tag)) {
        return `${wrapIgnitionInline(innerHTML, wrappers)}<br>\n`;
      }
      return wrapIgnitionInline(innerHTML, wrappers);
  }
}

/**
 * Recursively formats children of a node
 * @param {Node} element - Parent DOM node
 * @param {number} indentLevel - Current level of indentation
 * @returns {string} - Formatted HTML
 */
function formatNodeChildren(element, indentLevel, isIgnitionMode = false) {
  const indent = '  '.repeat(indentLevel);
  let html = '';
  
  const childNodes = Array.from(element.childNodes);
  
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    
    // 1. Text Node
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      const parentTag = element.tagName ? element.tagName.toLowerCase() : '';
      
      // If we are inside pre or code, preserve whitespaces exactly
      if (parentTag === 'pre' || parentTag === 'code') {
        html += escapeTextNode(text);
      } else {
        // Collapse multiple spaces/newlines into a single space
        const cleanedText = text.replace(/\s+/g, ' ');
        // If text is not empty, append it
        if (cleanedText !== '' && cleanedText !== ' ') {
          // If it starts with space but previous text didn't end with space, add it
          if (text.startsWith(' ') && html.length > 0 && !html.endsWith(' ')) {
            html += ' ';
          }
          html += escapeTextNode(cleanedText.trim());
          if (text.endsWith(' ') && !html.endsWith(' ')) {
            html += ' ';
          }
        }
      }
    }
    
    // 2. Element Node
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      
      // Clean attributes (removing chrome extensions junk, spellcheck, contenteditable etc.)
      const attributes = [];
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (
          !name.startsWith('data-') && 
          name !== 'spellcheck' && 
          name !== 'contenteditable' &&
          name !== 'g-id'
        ) {
          if (isIgnitionMode && !isSafeIgnitionAttribute(name, attr.value)) continue;
          
          attributes.push(`${attr.name}="${escapeAttributeValue(attr.value)}"`);
        }
      }
      
      const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
      const isInline = INLINE_TAGS.has(tag);
      
      if (isInline) {
        if (tag === 'br') {
          html += '<br>';
        } else if (tag === 'img') {
          html += `<img${attrStr}>`;
        } else {
          // Recursively serialize inline children (indent = 0 to keep inline)
          const innerHTML = formatNodeChildren(child, 0, isIgnitionMode);
          html += `<${tag}${attrStr}>${innerHTML}</${tag}>`;
        }
      } else {
        // Block tag
        const isSelfClosing = SELF_CLOSING_TAGS.has(tag);
        
        // Ensure new line before block elements
        if (html.length > 0 && !html.endsWith('\n')) {
          html += '\n';
        }
        
        if (isSelfClosing) {
          html += `${indent}<${tag}${attrStr}>\n`;
        } else {
          // Recursively get inner content with next indentation level
          const innerHTML = formatNodeChildren(child, indentLevel + 1, isIgnitionMode);
          
          const trimmedInner = innerHTML.trim();
          const containsNewLine = innerHTML.includes('\n');
          const isComplexTag = ['table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'blockquote', 'pre', 'div'].includes(tag);
          
          if (containsNewLine || isComplexTag) {
            // Complex structure, indent opening/closing tags and body
            html += `${indent}<${tag}${attrStr}>\n`;
            if (trimmedInner) {
              html += `${innerHTML.endsWith('\n') ? innerHTML : innerHTML + '\n'}`;
            }
            html += `${indent}</${tag}>\n`;
          } else if (trimmedInner === '') {
            // Empty element
            html += `${indent}<${tag}${attrStr}></${tag}>\n`;
          } else {
            // Simple single line text/inline content inside a block tag
            html += `${indent}<${tag}${attrStr}>${trimmedInner}</${tag}>\n`;
          }
        }
      }
    }
    
    // 3. Comment Node
    else if (child.nodeType === Node.COMMENT_NODE) {
      if (html.length > 0 && !html.endsWith('\n')) {
        html += '\n';
      }
      html += `${indent}<!--${child.nodeValue}-->\n`;
    }
  }
  
  return html;
}

/**
 * Escapes characters in attribute values
 */
function escapeAttributeValue(val) {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes normal HTML text
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlights Ignition property bindings {Path} in text nodes
 */
function highlightBindings(text) {
  return text.replace(/(\{[^{}]+\})/g, '<span class="syn-binding">$1</span>');
}

/**
 * Tokenizes and highlights HTML strings using regex wrappers for styling.
 * @param {string} html - Formatted HTML code string
 * @returns {string} - Highlighted HTML with css span classes
 */
export function highlightHTML(html) {
  if (!html) return '';
  
  // Match comments: Group 1
  // Match tag patterns: Group 2
  const tokenRegex = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9:-]+(?:\s+[a-zA-Z0-9:-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>)/g;
  
  let lastIndex = 0;
  let highlighted = '';
  let match;
  
  while ((match = tokenRegex.exec(html)) !== null) {
    // 1. Text node before the tag/comment
    const textBefore = html.slice(lastIndex, match.index);
    if (textBefore) {
      highlighted += highlightBindings(escapeHTML(textBefore));
    }
    
    const commentMatch = match[1];
    const tagMatch = match[2];
    
    // 2. Process comments
    if (commentMatch) {
      highlighted += `<span class="syn-comment">${escapeHTML(commentMatch)}</span>`;
    } 
    // 3. Process tags
    else if (tagMatch) {
      const isClosing = tagMatch.startsWith('</');
      const isSelfClosing = tagMatch.endsWith('/>');
      
      // Extract tag content between < / >
      let startOffset = isClosing ? 2 : 1;
      let endOffset = isSelfClosing ? 2 : 1;
      const tagContent = tagMatch.slice(startOffset, tagMatch.length - endOffset);
      
      // Parse tag name and attributes
      const spaceIndex = tagContent.search(/\s/);
      const tagName = spaceIndex === -1 ? tagContent : tagContent.slice(0, spaceIndex);
      const attributesPart = spaceIndex === -1 ? '' : tagContent.slice(spaceIndex);
      
      let highlightedTag = `<span class="syn-tag">&lt;${isClosing ? '/' : ''}${tagName}</span>`;
      
      if (attributesPart.trim()) {
        // Regex to parse key=value attributes
        const attrRegex = /(\s+)([a-zA-Z0-9:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attrMatch;
        let attrLastIndex = 0;
        
        while ((attrMatch = attrRegex.exec(attributesPart)) !== null) {
          // Add any raw space/characters before the attribute name
          highlightedTag += attributesPart.slice(attrLastIndex, attrMatch.index);
          
          const whitespace = attrMatch[1];
          const attrName = attrMatch[2];
          const attrVal = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5];
          
          highlightedTag += `${whitespace}<span class="syn-attr">${attrName}</span>`;
          
          if (attrVal !== undefined) {
            const quote = attrMatch[3] !== undefined ? '"' : attrMatch[4] !== undefined ? "'" : '';
            highlightedTag += `=<span class="syn-val">${quote}${escapeHTML(attrVal)}${quote}</span>`;
          }
          
          attrLastIndex = attrRegex.lastIndex;
        }
        // Append any trailing string in attribute block
        highlightedTag += attributesPart.slice(attrLastIndex);
      }
      
      highlightedTag += `<span class="syn-tag">${isSelfClosing ? '/' : ''}&gt;</span>`;
      highlighted += highlightedTag;
    }
    
    lastIndex = tokenRegex.lastIndex;
  }
  
  // Append any final trailing text
  const remainingText = html.slice(lastIndex);
  if (remainingText) {
    highlighted += highlightBindings(escapeHTML(remainingText));
  }
  
  return highlighted;
}

/**
 * Wraps clean inner HTML code in a standard boilerplate web page structure.
 * @param {string} innerHTML - The formatted inner HTML body
 * @returns {string} - The full deployable HTML page
 */
export function wrapInBoilerplate(innerHTML) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deployable Web Page</title>
  <style>
    :root {
      --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      --bg-color: #f8fafc;
      --text-color: #1e293b;
      --heading-color: #0f172a;
      --border-color: #cbd5e1;
      --accent-color: #4f46e5;
    }
    
    body {
      font-family: var(--font-family);
      line-height: 1.6;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 2rem 1.5rem;
    }
    
    main {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
      border: 1px solid var(--border-color);
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: var(--heading-color);
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    
    h1 { font-size: 2.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
    h2 { font-size: 1.75rem; }
    h3 { font-size: 1.35rem; }
    
    p { margin-bottom: 1.25rem; }
    
    a {
      color: var(--accent-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    
    ul, ol {
      margin-bottom: 1.25rem;
      padding-left: 1.5rem;
    }
    
    li { margin-bottom: 0.5rem; }
    
    blockquote {
      border-left: 4px solid var(--accent-color);
      padding: 0.5rem 1rem;
      margin: 1.5rem 0;
      background-color: #f1f5f9;
      color: #475569;
      border-radius: 0 6px 6px 0;
      font-style: italic;
    }
    
    pre {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    
    code {
      font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
      font-size: 0.9em;
      background-color: #f1f5f9;
      padding: 0.15rem 0.3rem;
      border-radius: 4px;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
      font-size: inherit;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5rem 0;
      font-size: 0.95rem;
    }
    
    th, td {
      border: 1px solid var(--border-color);
      padding: 0.75rem 1rem;
      text-align: left;
    }
    
    th {
      background-color: #f1f5f9;
      color: var(--heading-color);
      font-weight: 600;
    }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1.5rem 0;
      display: block;
    }
  </style>
</head>
<body>
  <main>
${innerHTML.split('\n').map(line => '    ' + line).join('\n')}
  </main>
</body>
</html>`;
}
