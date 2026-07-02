import { getCleanAndFormattedHTML, highlightHTML, wrapInBoilerplate } from './html-generator.js';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  saveThemePreference,
  loadThemePreference,
  copyToClipboard,
  downloadAsHTML,
  debounce
} from './utils.js';

// DOM Elements
const editor = document.getElementById('wysiwyg-editor');
const codeViewer = document.getElementById('code-viewer');
const lineNumbers = document.getElementById('line-numbers');
const wordCountEl = document.getElementById('word-count');
const charCountEl = document.getElementById('char-count');
const themeToggle = document.getElementById('theme-toggle');
const divider = document.getElementById('panel-divider');
const leftPanel = document.getElementById('left-panel');
const rightPanel = document.getElementById('right-panel');
const toggleFullPage = document.getElementById('toggle-full-page');
const toggleIgnitionMode = document.getElementById('toggle-ignition-mode');
const togglePreviewMode = document.getElementById('toggle-preview-mode');
const btnBinding = document.getElementById('btn-binding');
const divider2 = document.getElementById('panel-divider-2');
const previewPanel = document.getElementById('preview-panel');
const previewVariablesList = document.getElementById('preview-variables-list');

let mockVariables = {};
let isLivePreviewActive = false;


// Toolbar Buttons
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnClear = document.getElementById('btn-clear');
const colorText = document.getElementById('color-text');
const colorBg = document.getElementById('color-bg');
const textForeColorInput = document.getElementById('text-forecolor-input');
const textBgColorInput = document.getElementById('text-bgcolor-input');
const IGNITION_TEXT_COLORS = [
  'black', 'blue', 'cyan', 'darkGray', 'gray', 'green', 'lightGray',
  'magenta', 'orange', 'pink', 'red', 'white', 'yellow'
];
const IGNITION_COLOR_SWATCHES = {
  black: '#000000',
  blue: '#0000ff',
  cyan: '#00ffff',
  darkGray: '#404040',
  gray: '#808080',
  green: '#008000',
  lightGray: '#c0c0c0',
  magenta: '#ff00ff',
  orange: '#ffa500',
  pink: '#ffc0cb',
  red: '#ff0000',
  white: '#ffffff',
  yellow: '#ffff00'
};

// Dropdowns
const fontStyleSelect = document.getElementById('font-style');
const fontSizeSelect = document.getElementById('font-size');

// Modals
const linkModal = document.getElementById('modal-link');
const imageModal = document.getElementById('modal-image');
const tableModal = document.getElementById('modal-table');
const pythonVarModal = document.getElementById('modal-python-var');

// Modal Form Elements
const pythonVarType = document.getElementById('python-var-type');
const pythonVarSubmit = document.getElementById('python-var-submit');
const linkUrlInput = document.getElementById('link-url');
const linkTextInput = document.getElementById('link-text');
const linkSubmit = document.getElementById('link-submit');

const imageSrcInput = document.getElementById('image-src');
const imageUploadInput = document.getElementById('image-upload');
const imageAltInput = document.getElementById('image-alt');
const imageWidthInput = document.getElementById('image-width');
const imageHeightInput = document.getElementById('image-height');
const imageSubmit = document.getElementById('image-submit');

const tableRowsInput = document.getElementById('table-rows');
const tableColsInput = document.getElementById('table-cols');
const tableHeaderInput = document.getElementById('table-header');
const tableSubmit = document.getElementById('table-submit');

// Global Editor State
let undoStack = [];
let redoStack = [];
const MAX_STACK_SIZE = 50;
let lastSavedSelection = null;

// Context Menu & Table Properties State
const contextMenu = document.getElementById('custom-context-menu');
const ctxBold = document.getElementById('ctx-bold');
const ctxItalic = document.getElementById('ctx-italic');
const ctxUnderline = document.getElementById('ctx-underline');
const ctxDividerTable = document.getElementById('ctx-divider-table');
const ctxEditTable = document.getElementById('ctx-edit-table');

const propTableModal = document.getElementById('modal-table-properties');
const propTableBg = document.getElementById('prop-table-bg');
const propTableBorder = document.getElementById('prop-table-border');
const propCellBg = document.getElementById('prop-cell-bg');
const propAddRow = document.getElementById('prop-add-row');
const propDelRow = document.getElementById('prop-del-row');
const propAddCol = document.getElementById('prop-add-col');
const propDelCol = document.getElementById('prop-del-col');
const propTableSubmit = document.getElementById('prop-table-submit');

let currentEditingTable = null;
let currentEditingCell = null;
let currentEditingAnchor = null;

// Initialize Editor
document.addEventListener('DOMContentLoaded', () => {
  setupEditor();
  setupToolbar();
  setupModals();
  setupContextMenu();
  setupResizer();
  setupTheme();
});

const FACTORY_HTML = `
  <h1>Welcome to the HTML Code Editor!</h1>
  <p>This is a premium, real-time HTML editor. You can write rich text here on the left panel, format it using the toolbar above, and see clean, indented HTML code generated with syntax highlighting in the right panel.</p>
  <p>Try testing some features:</p>
  <ul>
    <li>Use <b>bold</b>, <i>italic</i>, or <u>underlined</u> text.</li>
    <li>Create headings and tables.</li>
    <li>Toggle between light and dark modes in the bottom right corner.</li>
  </ul>
  <blockquote>"Simplicity is the ultimate sophistication." — Leonardo da Vinci</blockquote>
  <p style="opacity: 0.3; font-size: 0.65rem; margin-top: 3rem;">Created by: Ricardo Hernandez-Chang - 2026</p>
`;

function setupEditor() {
  // Load initial content from local storage or set default
  const savedContent = loadFromLocalStorage();
  if (savedContent) {
    editor.innerHTML = savedContent;
  } else {
    editor.innerHTML = FACTORY_HTML;
  }

  // Initial render
  updateOutput();
  saveState();

  // Input Listeners
  editor.addEventListener('input', debounce(() => {
    updateOutput();
    saveState();
  }, 300));

  // Paste Listener (Auto-disable Ignition Mode for rich pastes)
  editor.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const isRichHTML = clipboardData && clipboardData.types && Array.from(clipboardData.types).includes('text/html');
    
    if (isRichHTML && toggleIgnitionMode && toggleIgnitionMode.checked) {
      toggleIgnitionMode.checked = false;
      if (toggleFullPage) toggleFullPage.disabled = false;
      if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
      
      setTimeout(() => {
        updateOutput();
        saveState();
        alert('Rich HTML was pasted, so Ignition Mode was automatically turned OFF to preserve your formatting. You can manually toggle it back ON to sanitize the new content.');
      }, 50);
    }
  });

  // Allow escaping block elements (tables, blockquotes) by clicking empty space
  editor.addEventListener('click', (e) => {
    if (e.target === editor) {
      const lastChild = editor.lastElementChild;
      // If the editor ends with a trapping block element, append an empty paragraph
      if (lastChild && ['TABLE', 'BLOCKQUOTE', 'UL', 'OL', 'DIV'].includes(lastChild.tagName)) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editor.appendChild(p);
        
        // Focus the newly created paragraph
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        
        updateOutput();
        saveState();
      } else if (!lastChild) {
        // If completely empty, insert a paragraph
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editor.appendChild(p);
        
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  });

  // Keydown shortcuts (bold, italic, etc. are default, but we intercept custom ones)
  editor.addEventListener('keydown', (e) => {
    // Tab support inside editor
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
    
    // Handle Enter inside blockquote to prevent splitting
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        let node = sel.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        
        if (node.closest && node.closest('blockquote')) {
          e.preventDefault();
          document.execCommand('insertLineBreak');
          updateOutput();
          saveState();
          return;
        }
      }
    }
    
    // Explicitly handle formatting shortcuts to ensure immediate preview sync
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      let cmd = null;
      if (e.key.toLowerCase() === 'b') cmd = 'bold';
      else if (e.key.toLowerCase() === 'i') cmd = 'italic';
      else if (e.key.toLowerCase() === 'u') cmd = 'underline';
      
      if (cmd) {
        e.preventDefault();
        document.execCommand(cmd, false, null);
        updateOutput();
        saveState();
      }
    }
  });

  // Track selection for modal insertions
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Check if selection is within the editor
      if (editor.contains(range.commonAncestorContainer)) {
        lastSavedSelection = range.cloneRange();
      }
    }
  });

  const enforceMutuallyExclusiveToggles = (activeToggleId) => {
    const toggles = [
      { id: 'toggle-full-page', el: toggleFullPage },
      { id: 'toggle-ignition-mode', el: toggleIgnitionMode },
      { id: 'toggle-preview-mode', el: togglePreviewMode }
    ];
    
    toggles.forEach(t => {
      if (t.id !== activeToggleId && t.el && t.el.checked) {
        t.el.checked = false;
        if (t.id === 'toggle-preview-mode') {
          isLivePreviewActive = false;
          deactivateLivePreview();
        }
      }
    });
  };

  // Toggle Full HTML Page listener
  if (toggleFullPage) {
    toggleFullPage.addEventListener('change', () => {
      if (toggleFullPage.checked) enforceMutuallyExclusiveToggles('toggle-full-page');
      updateOutput();
      updateToolbarButtonStates();
    });
  }

  // Toggle Ignition Mode listener
  if (toggleIgnitionMode) {
    const updateIgnitionState = () => {
      if (toggleIgnitionMode.checked && toggleFullPage) {
        toggleFullPage.checked = false;
        toggleFullPage.disabled = true;
      } else if (toggleFullPage) {
        toggleFullPage.disabled = false;
      }
      updateOutput();
    };

    toggleIgnitionMode.addEventListener('change', (e) => {
      if (toggleIgnitionMode.checked) {
        if (!confirm('Switching to Ignition Mode will permanently convert the editor content to Ignition-compatible HTML. Do you want to continue?')) {
          toggleIgnitionMode.checked = false;
          return;
        }
        enforceMutuallyExclusiveToggles('toggle-ignition-mode');
        
        const ignitionHTML = getCleanAndFormattedHTML(editor, true);
        editor.innerHTML = ignitionHTML.replace(/^<html>\s*/i, '');
        saveState();
      }
      updateIgnitionState();
      updateToolbarButtonStates(); // Update button visibility/disabled states
    });
    
    // Call once on init to handle browser state restoration
    updateIgnitionState();
  }

  // Toggle Live Data Preview listener
  if (togglePreviewMode) {
    togglePreviewMode.addEventListener('change', () => {
      isLivePreviewActive = togglePreviewMode.checked;
      if (isLivePreviewActive) {
        if (!confirm('Switching to Python Interpolation will change the generated code output into a Python body string and temporarily replace placeholders in the editor preview. Do you want to continue?')) {
          togglePreviewMode.checked = false;
          isLivePreviewActive = false;
          updateOutput();
          updateToolbarButtonStates();
          return;
        }
        enforceMutuallyExclusiveToggles('toggle-preview-mode');
        activateLivePreview();
      } else {
        deactivateLivePreview();
      }
      updateOutput();
      updateToolbarButtonStates();
    });
  }
}

/**
 * Saves current editor state to undo history
 */
function saveState() {
  const currentHTML = editor.innerHTML;
  
  // If stack already has the same last element, don't push
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentHTML) {
    return;
  }
  
  undoStack.push(currentHTML);
  if (undoStack.length > MAX_STACK_SIZE) {
    undoStack.shift();
  }
  redoStack = []; // Clear redo stack on new action
  
  // Save to local storage
  saveToLocalStorage(currentHTML);
  updateToolbarButtonStates();
}

function updateToolbarButtonStates() {
  btnUndo.disabled = undoStack.length <= 1;
  btnRedo.disabled = redoStack.length === 0;
  
  btnUndo.style.opacity = btnUndo.disabled ? '0.4' : '1';
  btnRedo.style.opacity = btnRedo.disabled ? '0.4' : '1';
  
  if (toggleIgnitionMode) {
    const isIgnition = toggleIgnitionMode.checked;
    
    // Ignition supports text color via <font color="...">, but not CSS background highlighting.
    if (colorText) {
      colorText.disabled = false;
      colorText.style.opacity = '1';
      colorText.style.cursor = 'pointer';
    }
    if (colorBg) {
      colorBg.disabled = isIgnition;
      colorBg.style.opacity = isIgnition ? '0.4' : '1';
      colorBg.style.cursor = isIgnition ? 'not-allowed' : 'pointer';
    }
    
    if (btnBinding) {
      const bindingActive = isIgnition || isLivePreviewActive;
      btnBinding.disabled = !bindingActive;
      btnBinding.style.opacity = !bindingActive ? '0.4' : '1';
      btnBinding.style.cursor = !bindingActive ? 'not-allowed' : 'pointer';
    }
    
    // Hide incompatible context menu items
    if (ctxEditTable) ctxEditTable.style.display = isIgnition ? 'none' : 'block';
    if (ctxDividerTable) ctxDividerTable.style.display = isIgnition ? 'none' : 'block';
  }
}

function getIgnitionColorMenu() {
  let menu = document.getElementById('ignition-color-menu');
  if (menu) return menu;
  
  menu = document.createElement('div');
  menu.id = 'ignition-color-menu';
  menu.className = 'ignition-color-menu';
  
  IGNITION_TEXT_COLORS.forEach(colorName => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'ignition-color-option';
    option.dataset.color = colorName;
    
    const swatch = document.createElement('span');
    swatch.className = 'ignition-color-swatch';
    swatch.style.backgroundColor = IGNITION_COLOR_SWATCHES[colorName];
    
    const label = document.createElement('span');
    label.textContent = colorName;
    
    option.appendChild(swatch);
    option.appendChild(label);
    option.addEventListener('click', () => {
      applyIgnitionTextColor(colorName);
      hideIgnitionColorMenu();
      editor.focus();
      updateOutput();
      saveState();
    });
    
    menu.appendChild(option);
  });
  
  document.body.appendChild(menu);
  return menu;
}

function applyIgnitionTextColor(colorName) {
  editor.focus();
  
  if (lastSavedSelection) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastSavedSelection);
  }
  
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    
    if (!range.collapsed && editor.contains(range.commonAncestorContainer)) {
      const font = document.createElement('font');
      font.setAttribute('color', colorName);
      font.appendChild(range.extractContents());
      range.insertNode(font);
      
      const newRange = document.createRange();
      newRange.setStartAfter(font);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      lastSavedSelection = newRange.cloneRange();
      return;
    }
  }
  
  editor.innerHTML = `<font color="${colorName}">${editor.innerHTML}</font>`;
}

function showIgnitionColorMenu(anchor) {
  const sel = window.getSelection();
  if (sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    lastSavedSelection = sel.getRangeAt(0).cloneRange();
  }
  
  const menu = getIgnitionColorMenu();
  const rect = anchor.getBoundingClientRect();
  
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.classList.add('active');
}

function hideIgnitionColorMenu() {
  const menu = document.getElementById('ignition-color-menu');
  if (menu) menu.classList.remove('active');
}

function resetToFactoryState() {
  if (isLivePreviewActive) {
    deactivateLivePreview();
  }

  editor.innerHTML = FACTORY_HTML;
  mockVariables = {};
  isLivePreviewActive = false;
  lastSavedSelection = null;
  currentEditingTable = null;
  currentEditingCell = null;
  currentEditingAnchor = null;
  undoStack = [];
  redoStack = [];
  
  if (toggleIgnitionMode) toggleIgnitionMode.checked = false;
  if (toggleFullPage) {
    toggleFullPage.checked = false;
    toggleFullPage.disabled = false;
  }
  if (togglePreviewMode) togglePreviewMode.checked = false;
  if (divider2) divider2.style.display = 'none';
  if (previewPanel) previewPanel.style.display = 'none';
  if (previewVariablesList) previewVariablesList.innerHTML = '';
  if (contextMenu) contextMenu.classList.remove('active');
  document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
  
  updateOutput();
  saveState();
  editor.focus();
}

/**
 * Restore editor state from stack
 */
function restoreState(isUndo) {
  if (isUndo && undoStack.length > 1) {
    const currentState = undoStack.pop();
    redoStack.push(currentState);
    
    const prevState = undoStack[undoStack.length - 1];
    editor.innerHTML = prevState;
    updateOutput();
    saveToLocalStorage(prevState);
  } else if (!isUndo && redoStack.length > 0) {
    const nextState = redoStack.pop();
    undoStack.push(nextState);
    
    editor.innerHTML = nextState;
    updateOutput();
    saveToLocalStorage(nextState);
  }
  updateToolbarButtonStates();
}

function isPythonInterpolationPlaceholder(rawVar) {
  return rawVar && rawVar.startsWith('%');
}

function normalizePythonVarName(name, fallback) {
  const cleaned = (name || fallback)
    .trim()
    .replace(/\W/g, '_')
    .replace(/^(\d)/, '_$1');
  
  return cleaned || fallback;
}

function getDefaultMockVariableName(rawVar, index) {
  const mappingMatch = rawVar.match(/^%\(([a-zA-Z0-9_]+)\)/);
  if (mappingMatch) {
    return mappingMatch[1];
  }

  const ignitionMatch = rawVar.match(/^\{([a-zA-Z0-9_.\s]+)\}$/);
  if (ignitionMatch) {
    const propertyName = ignitionMatch[1].trim().split(/[.\s]+/).pop();
    return normalizePythonVarName(propertyName, `Var${index}`);
  }

  return `Var${index}`;
}

function toPythonTuplePlaceholder(rawVar) {
  const mappingMatch = rawVar.match(/^%\([a-zA-Z0-9_]+\)((?:\.[0-9]+)?[sdiuxf])$/);
  if (mappingMatch) {
    return `%${mappingMatch[1]}`;
  }

  return rawVar;
}

function escapePythonTripleQuotedString(html) {
  const placeholderTokens = [];
  let protectedHTML = html.replace(/(%(?:\([a-zA-Z0-9_]+\))?(?:\.[0-9]+)?[sdiuxf])/g, (match) => {
    const token = `__PY_PLACEHOLDER_${placeholderTokens.length}__`;
    placeholderTokens.push({ token, value: match });
    return token;
  });

  protectedHTML = protectedHTML
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"')
    .replace(/%/g, '%%');

  placeholderTokens.forEach(({ token, value }) => {
    protectedHTML = protectedHTML.replace(token, value);
  });

  return protectedHTML;
}

function buildPythonInterpolationCode(html, pyVars) {
  const indentedHTML = escapePythonTripleQuotedString(html)
    .split('\n')
    .map(line => '    ' + line)
    .join('\n');
  let pyCode = `body = """\n<html>\n<body>\n${indentedHTML}\n</body>\n</html> """`;
  
  if (pyVars.length > 0) {
    pyCode += ` % (${pyVars.join(', ')}${pyVars.length === 1 ? ',' : ''})`;
  }
  
  return pyCode;
}

/**
 * Formats clean HTML, generates syntax highlighting, calculates stats and line numbers
 */
function updateOutput() {
  const isIgnitionMode = toggleIgnitionMode && toggleIgnitionMode.checked;
  
  // Create a source node to extract HTML from
  let sourceNode = editor;
  let pyVars = [];
  
  if (isLivePreviewActive) {
    sourceNode = editor.cloneNode(true);
    const pills = sourceNode.querySelectorAll('.mock-var');
    pills.forEach((pill, index) => {
      const pId = pill.getAttribute('data-id');
      const rawVar = pill.getAttribute('data-raw');
      let outputVar = rawVar;
      if (isPythonInterpolationPlaceholder(rawVar) && mockVariables[pId]) {
        pyVars.push(normalizePythonVarName(mockVariables[pId].name, getDefaultMockVariableName(rawVar, index + 1)));
        outputVar = toPythonTuplePlaceholder(rawVar);
      }
      const textNode = document.createTextNode(outputVar);
      pill.parentNode.replaceChild(textNode, pill);
    });
  }
  
  const cleanHTML = getCleanAndFormattedHTML(sourceNode, isIgnitionMode);
  
  // If Ignition mode is on, boilerplate is ignored
  let displayHTML = (toggleFullPage && toggleFullPage.checked && !isIgnitionMode) ? wrapInBoilerplate(cleanHTML) : cleanHTML;
  
  if (isLivePreviewActive) {
    displayHTML = buildPythonInterpolationCode(displayHTML, pyVars);
  }
  
  // Update Syntax Highlight Output
  codeViewer.innerHTML = highlightHTML(displayHTML);
  
  // Render Line Numbers
  const lines = displayHTML.split('\n');
  const lineCount = Math.max(lines.length, 1);
  let numbersHTML = '';
  for (let i = 1; i <= lineCount; i++) {
    numbersHTML += `${i}<br>`;
  }
  lineNumbers.innerHTML = numbersHTML;
  
  // Stats
  const text = editor.innerText || editor.textContent;
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  charCountEl.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
}

/**
 * Toolbar setup and events
 */
function setupToolbar() {
  // Simple Formatting Buttons
  const formatButtons = [
    { id: 'btn-bold', cmd: 'bold' },
    { id: 'btn-italic', cmd: 'italic' },
    { id: 'btn-underline', cmd: 'underline' },
    { id: 'btn-strike', cmd: 'strikeThrough' },
    { id: 'btn-align-left', cmd: 'justifyLeft' },
    { id: 'btn-align-center', cmd: 'justifyCenter' },
    { id: 'btn-align-right', cmd: 'justifyRight' },
    { id: 'btn-align-justify', cmd: 'justifyFull' },
    { id: 'btn-list-ul', cmd: 'insertUnorderedList' },
    { id: 'btn-list-ol', cmd: 'insertOrderedList' },
    { id: 'btn-blockquote', cmd: 'formatBlock', val: 'blockquote' }
  ];

  formatButtons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand(btn.cmd, false, btn.val || null);
        editor.focus();
        updateOutput();
        saveState();
      });
    }
  });

  // Undo/Redo Click
  btnUndo.addEventListener('click', (e) => {
    e.preventDefault();
    restoreState(true);
    editor.focus();
  });
  
  btnRedo.addEventListener('click', (e) => {
    e.preventDefault();
    restoreState(false);
    editor.focus();
  });

  // Clear / Reset Editor
  btnClear.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to restore the factory default settings? This will erase all your current work.')) {
      resetToFactoryState();
    }
  });

  // Copy to Clipboard
  btnCopy.addEventListener('click', async (e) => {
    e.preventDefault();
    const isIgnitionMode = toggleIgnitionMode && toggleIgnitionMode.checked;
    const cleanHTML = getCleanAndFormattedHTML(editor, isIgnitionMode);
    const exportHTML = (toggleFullPage && toggleFullPage.checked && !isIgnitionMode) ? wrapInBoilerplate(cleanHTML) : cleanHTML;
    const success = await copyToClipboard(exportHTML);
    
    if (success) {
      const originalText = btnCopy.innerHTML;
      btnCopy.innerHTML = `<i data-lucide="check"></i> Copied!`;
      lucide.createIcons();
      btnCopy.classList.add('btn-primary');
      
      setTimeout(() => {
        btnCopy.innerHTML = originalText;
        btnCopy.classList.remove('btn-primary');
        lucide.createIcons();
      }, 2000);
    } else {
      alert('Failed to copy to clipboard.');
    }
  });

  // Download File
  btnDownload.addEventListener('click', async (e) => {
    e.preventDefault();
    const isIgnitionMode = toggleIgnitionMode && toggleIgnitionMode.checked;
    const cleanHTML = getCleanAndFormattedHTML(editor, isIgnitionMode);
    const exportHTML = (toggleFullPage && toggleFullPage.checked && !isIgnitionMode) ? wrapInBoilerplate(cleanHTML) : cleanHTML;
    await downloadAsHTML('edited-page.html', exportHTML);
  });

  // Dropdown Formats (Heading styles)
  fontStyleSelect.addEventListener('change', () => {
    const val = fontStyleSelect.value;
    if (val) {
      document.execCommand('formatBlock', false, val);
      fontStyleSelect.selectedIndex = 0; // reset
      editor.focus();
      updateOutput();
      saveState();
    }
  });

  // Dropdown Font Sizes
  fontSizeSelect.addEventListener('change', () => {
    const val = fontSizeSelect.value;
    if (val) {
      document.execCommand('fontSize', false, val);
      fontSizeSelect.selectedIndex = 0; // reset
      editor.focus();
      updateOutput();
      saveState();
    }
  });

  // Custom Color Pickers
  colorText.addEventListener('click', (e) => {
    e.preventDefault();
    if (toggleIgnitionMode && toggleIgnitionMode.checked) {
      showIgnitionColorMenu(colorText);
      return;
    }
    
    textForeColorInput.click();
  });

  textForeColorInput.addEventListener('input', () => {
    document.execCommand('foreColor', false, textForeColorInput.value);
    updateOutput();
    saveState();
  });

  colorBg.addEventListener('click', (e) => {
    e.preventDefault();
    textBgColorInput.click();
  });

  textBgColorInput.addEventListener('input', () => {
    document.execCommand('hiliteColor', false, textBgColorInput.value);
    updateOutput();
    saveState();
  });
  
  if (btnBinding) {
    btnBinding.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLivePreviewActive) {
        openModal(pythonVarModal);
      } else {
        insertHTMLAtCursor('{Path.To.Property}');
        updateOutput();
        saveState();
      }
    });
  }
}

/**
 * Custom insert tools at the current selection cursor
 */
function insertHTMLAtCursor(html) {
  editor.focus();
  
  // If we have a saved selection range, restore it
  if (lastSavedSelection) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastSavedSelection);
  }

  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    
    // Create elements from HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const fragment = document.createDocumentFragment();
    let node;
    let lastNode;
    
    while ((node = tempDiv.firstChild)) {
      lastNode = fragment.appendChild(node);
    }
    
    range.insertNode(fragment);
    
    // Position cursor after inserted content
    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      lastSavedSelection = newRange.cloneRange();
    }
  } else {
    // If no cursor active, just append to editor
    editor.innerHTML += html;
  }
  
  updateOutput();
  saveState();
}

/**
 * Modals setup and event handlers
 */
function setupModals() {
  const modalTriggers = [
    { btnId: 'btn-image', modal: imageModal },
    { btnId: 'btn-table', modal: tableModal }
  ];

  modalTriggers.forEach(trigger => {
    const btn = document.getElementById(trigger.btnId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(trigger.modal);
      });
    }
  });

  const btnLink = document.getElementById('btn-link');
  if (btnLink) {
    btnLink.addEventListener('click', (e) => {
      e.preventDefault();
      
      linkUrlInput.value = '';
      linkTextInput.value = '';
      currentEditingAnchor = null;
      
      if (lastSavedSelection) {
        const node = lastSavedSelection.commonAncestorContainer;
        const anchor = node.nodeType === Node.TEXT_NODE ? node.parentElement.closest('a') : (node.closest ? node.closest('a') : null);
        
        if (anchor && editor.contains(anchor)) {
          // Editing existing link
          currentEditingAnchor = anchor;
          linkUrlInput.value = anchor.getAttribute('href') || '';
          linkTextInput.value = anchor.textContent || '';
        } else {
          // New link with selected text
          linkTextInput.value = lastSavedSelection.toString() || '';
        }
      }
      openModal(linkModal);
    });
  }

  // Close modals clicking on background or close button
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
    
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeModal(overlay);
      });
    }
    
    const altCloseBtn = overlay.querySelector('.modal-close-btn');
    if (altCloseBtn) {
      altCloseBtn.addEventListener('click', () => {
        closeModal(overlay);
      });
    }
  });

  // Handle file uploads as Base64 source
  imageUploadInput.addEventListener('change', () => {
    const file = imageUploadInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imageSrcInput.value = e.target.result; // Set file content as base64 in src field
      };
      reader.readAsDataURL(file);
    }
  });

  // Link Submission
  linkSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    const url = linkUrlInput.value.trim();
    let text = linkTextInput.value.trim();
    
    if (!url) return alert('Please enter a valid URL.');
    if (!text) text = url; // Default text to URL if empty
    
    if (currentEditingAnchor) {
      // Update existing link
      currentEditingAnchor.setAttribute('href', url);
      currentEditingAnchor.textContent = text;
      updateOutput();
      saveState();
    } else {
      // Insert new link
      const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      insertHTMLAtCursor(linkHTML);
    }
    
    closeModal(linkModal);
    
    // Clear inputs
    linkUrlInput.value = '';
    linkTextInput.value = '';
    currentEditingAnchor = null;
  });

  // Image Submission
  imageSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    const src = imageSrcInput.value.trim();
    const alt = imageAltInput.value.trim() || 'inserted image';
    const width = imageWidthInput.value.trim();
    const height = imageHeightInput.value.trim();
    
    if (!src) return alert('Please enter an image URL or choose a file to upload.');
    
    let styleStr = '';
    if (width) styleStr += `width: ${width}px; `;
    if (height) styleStr += `height: ${height}px; `;
    
    const styleAttr = styleStr ? ` style="${styleStr}"` : '';
    const imageHTML = `<img src="${src}" alt="${alt}"${styleAttr}>`;
    
    insertHTMLAtCursor(imageHTML);
    closeModal(imageModal);
    
    // Clear inputs
    imageSrcInput.value = '';
    imageUploadInput.value = '';
    imageAltInput.value = '';
    imageWidthInput.value = '';
    imageHeightInput.value = '';
  });

  // Python Variable Submission
  if (pythonVarSubmit) {
    pythonVarSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      const val = pythonVarType.value;
      
      // If we are in live preview, we must deactivate first to restore raw text nodes
      if (isLivePreviewActive) {
        deactivateLivePreview();
      }
      
      insertHTMLAtCursor(val);
      closeModal(pythonVarModal);
      
      if (isLivePreviewActive) {
        activateLivePreview();
        updateOutput();
      }
    });
  }

  // Table Submission
  tableSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    const rows = parseInt(tableRowsInput.value) || 3;
    const cols = parseInt(tableColsInput.value) || 3;
    const hasHeader = tableHeaderInput.checked;
    
    let tableHTML = '<table>';
    
    if (hasHeader) {
      tableHTML += '<thead><tr>';
      for (let c = 0; c < cols; c++) {
        tableHTML += `<th>Header ${c+1}</th>`;
      }
      tableHTML += '</tr></thead>';
    }
    
    tableHTML += '<tbody>';
    for (let r = 0; r < rows; r++) {
      tableHTML += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHTML += '<td>Cell Data</td>';
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    insertHTMLAtCursor(tableHTML);
    closeModal(tableModal);
  });
}

/**
 * Context Menu and Contextual Table Editing
 */
function setupContextMenu() {
  if (!contextMenu) return;

  // Prevent default context menu inside editor
  editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Check if clicked inside a table
    const target = e.target;
    currentEditingCell = target.closest('td, th');
    currentEditingTable = target.closest('table');
    
    if (currentEditingTable) {
      ctxDividerTable.style.display = 'block';
      ctxEditTable.style.display = 'flex';
    } else {
      ctxDividerTable.style.display = 'none';
      ctxEditTable.style.display = 'none';
    }
    
    // Position the context menu
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.add('active');
  });

  // Hide context menu on click elsewhere
  document.addEventListener('click', (e) => {
    if (e.target !== contextMenu && !contextMenu.contains(e.target)) {
      contextMenu.classList.remove('active');
    }
    
    const ignitionColorMenu = document.getElementById('ignition-color-menu');
    if (
      ignitionColorMenu &&
      !ignitionColorMenu.contains(e.target) &&
      e.target !== colorText &&
      !colorText.contains(e.target)
    ) {
      hideIgnitionColorMenu();
    }
  });

  // Context Menu Actions
  const ctxPaste = document.getElementById('ctx-paste');
  if (ctxBold) ctxBold.addEventListener('click', () => applyContextFormatting('bold'));
  if (ctxItalic) ctxItalic.addEventListener('click', () => applyContextFormatting('italic'));
  if (ctxUnderline) ctxUnderline.addEventListener('click', () => applyContextFormatting('underline'));
  
  if (ctxPaste) {
    ctxPaste.addEventListener('click', () => {
      contextMenu.classList.remove('active');
      alert('Due to browser security restrictions, please click inside the editor and use your keyboard (Ctrl+V or Cmd+V) to paste text and HTML.');
    });
  }
  
  if (ctxEditTable) ctxEditTable.addEventListener('click', () => {
    contextMenu.classList.remove('active');
    openTableProperties();
  });
  
  setupTablePropertiesLogic();
}

function applyContextFormatting(command) {
  document.execCommand(command, false, null);
  updateOutput();
  saveState();
  contextMenu.classList.remove('active');
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#ffffff';
  let sep = rgb.indexOf(",") > -1 ? "," : " ";
  let rgba = rgb.substr(4).split(")")[0].split(sep);
  if (rgba.length < 3) return '#ffffff';
  let r = (+rgba[0]).toString(16),
      g = (+rgba[1]).toString(16),
      b = (+rgba[2]).toString(16);
  if (r.length == 1) r = "0" + r;
  if (g.length == 1) g = "0" + g;
  if (b.length == 1) b = "0" + b;
  return "#" + r + g + b;
}

function openTableProperties() {
  if (!currentEditingTable) return;
  
  // Read current styles to populate modal
  const tableBg = window.getComputedStyle(currentEditingTable).backgroundColor;
  const tableBorder = window.getComputedStyle(currentEditingTable).borderColor;
  propTableBg.value = rgbToHex(tableBg);
  propTableBorder.value = rgbToHex(tableBorder);
  
  if (currentEditingCell) {
    const cellBg = window.getComputedStyle(currentEditingCell).backgroundColor;
    propCellBg.value = rgbToHex(cellBg);
  } else {
    propCellBg.value = '#ffffff';
  }
  
  openModal(propTableModal);
}

function setupTablePropertiesLogic() {
  if (!propTableModal) return;
  
  propTableSubmit.addEventListener('click', () => {
    if (currentEditingTable) {
      currentEditingTable.style.backgroundColor = propTableBg.value;
      currentEditingTable.style.borderColor = propTableBorder.value;
      
      // Apply border color to all cells if not specified otherwise
      currentEditingTable.querySelectorAll('th, td').forEach(c => {
         c.style.borderColor = propTableBorder.value;
      });
    }
    
    if (currentEditingCell) {
      currentEditingCell.style.backgroundColor = propCellBg.value;
    }
    
    updateOutput();
    saveState();
    closeModal(propTableModal);
  });
  
  // Structural modifications
  propAddRow.addEventListener('click', () => {
    if (!currentEditingTable) return;
    const tbody = currentEditingTable.querySelector('tbody') || currentEditingTable;
    const cols = currentEditingTable.rows[0] ? currentEditingTable.rows[0].cells.length : 1;
    const tr = document.createElement('tr');
    for(let i=0; i<cols; i++) {
      const td = document.createElement('td');
      td.textContent = 'New Cell';
      td.style.borderColor = propTableBorder.value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    updateOutput();
    saveState();
  });
  
  propDelRow.addEventListener('click', () => {
    if (!currentEditingTable || !currentEditingCell) return;
    const tr = currentEditingCell.parentElement;
    if (tr) {
      tr.remove();
      currentEditingCell = null;
      updateOutput();
      saveState();
    }
  });
  
  propAddCol.addEventListener('click', () => {
    if (!currentEditingTable) return;
    const rows = currentEditingTable.rows;
    for(let i=0; i<rows.length; i++) {
      const isHeader = rows[i].cells[0] && rows[i].cells[0].tagName === 'TH';
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.textContent = isHeader ? 'New Header' : 'New Cell';
      cell.style.borderColor = propTableBorder.value;
      rows[i].appendChild(cell);
    }
    updateOutput();
    saveState();
  });
  
  propDelCol.addEventListener('click', () => {
    if (!currentEditingTable || !currentEditingCell) return;
    const tr = currentEditingCell.parentElement;
    const index = Array.from(tr.children).indexOf(currentEditingCell);
    if (index > -1) {
      const rows = currentEditingTable.rows;
      for(let i=0; i<rows.length; i++) {
        if (rows[i].cells[index]) {
          rows[i].cells[index].remove();
        }
      }
      currentEditingCell = null;
      updateOutput();
      saveState();
    }
  });
}

function openModal(modal) {
  modal.classList.add('active');
  // Auto focus first input field in modal if present
  setTimeout(() => {
    const input = modal.querySelector('input:not([type="file"])');
    if (input) input.focus();
  }, 100);
}

function closeModal(modal) {
  modal.classList.remove('active');
}

/**
 * Handle Theme switching (Light / Dark)
 */
function setupTheme() {
  const currentTheme = loadThemePreference() || 'dark';
  document.body.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const activeTheme = document.body.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    saveThemePreference(newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    themeToggle.setAttribute('data-tooltip', 'Switch to Light Mode');
  } else {
    themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    themeToggle.setAttribute('data-tooltip', 'Switch to Dark Mode');
  }
  // Refresh Lucide Icons inside the theme button
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Split panel resizer functionality
 */
function setupResizer() {
  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // Calculate split percentage
    const containerWidth = leftPanel.parentElement.clientWidth;
    const mouseX = e.clientX - leftPanel.parentElement.getBoundingClientRect().left;
    let percentage = (mouseX / containerWidth) * 100;
    
    // Boundaries
    if (percentage < 15) percentage = 15;
    if (percentage > 85) percentage = 85;
    
    leftPanel.style.flex = `0 0 ${percentage}%`;
    rightPanel.style.flex = `0 0 ${100 - percentage}%`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  });
}

/**
 * Live Data Preview Logic
 */
function activateLivePreview() {
  if (divider2) divider2.style.display = 'block';
  if (previewPanel) previewPanel.style.display = 'flex';

  const existingPills = Array.from(editor.querySelectorAll('.mock-var'));
  if (existingPills.length > 0) {
    const existingPlaceholderIds = existingPills.map((pill, index) => {
      const pId = pill.getAttribute('data-id') || `var_${index}`;
      const rawVar = pill.getAttribute('data-raw') || pill.textContent;
      pill.setAttribute('data-id', pId);
      pill.setAttribute('data-raw', rawVar);
      
      if (!mockVariables[pId]) {
        mockVariables[pId] = {
          raw: rawVar,
          name: getDefaultMockVariableName(rawVar, index + 1),
          value: pill.textContent || rawVar
        };
      }
      
      return pId;
    });
    renderPreviewPanel(existingPlaceholderIds);
    return;
  }
  
  // Regex to find Python string interpolation %s, %(name)s, %d, %.2f and {Property}
  const regex = /(%s|%d|%i|%f|%\.[0-9]+f|%\([a-zA-Z0-9_]+\)[sdiuxf]|{[a-zA-Z0-9_.\s]+})/g;
  
  // We need to walk text nodes to avoid replacing attributes or inner HTML structural tags
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
  let textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  let index = 0;
  let placeholders = [];
  
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    if (regex.test(text)) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;
      
      // Reset regex index
      regex.lastIndex = 0;
      
      while ((match = regex.exec(text)) !== null) {
        // Push preceding text
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        
        const rawVar = match[0];
        const pId = `var_${index}`;
        index++;
        
        // Initialize mock variable if not exists
        if (!mockVariables[pId]) {
          mockVariables[pId] = {
            raw: rawVar,
            name: getDefaultMockVariableName(rawVar, index),
            value: rawVar
          };
        } else {
          // ensure raw is updated if it somehow changed
          mockVariables[pId].raw = rawVar;
        }
        
        placeholders.push(pId);
        
        // Create mock pill
        const span = document.createElement('span');
        span.className = 'mock-var';
        span.setAttribute('data-id', pId);
        span.setAttribute('data-raw', rawVar);
        span.setAttribute('contenteditable', 'false');
        span.textContent = mockVariables[pId].value;
        fragment.appendChild(span);
        
        lastIndex = regex.lastIndex;
      }
      
      // Push remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });
  
  // Clean up mockVariables that no longer exist
  Object.keys(mockVariables).forEach(k => {
    if (!placeholders.includes(k)) {
      delete mockVariables[k];
    }
  });
  
  renderPreviewPanel(placeholders);
}

function deactivateLivePreview() {
  if (divider2) divider2.style.display = 'none';
  if (previewPanel) previewPanel.style.display = 'none';
  
  // Revert pills to text nodes
  const pills = editor.querySelectorAll('.mock-var');
  pills.forEach(pill => {
    const rawVar = pill.getAttribute('data-raw');
    const textNode = document.createTextNode(rawVar);
    pill.parentNode.replaceChild(textNode, pill);
  });
  
  // Normalize to merge adjacent text nodes
  editor.normalize();
}

function renderPreviewPanel(placeholders) {
  if (!previewVariablesList) return;
  previewVariablesList.innerHTML = '';
  
  if (placeholders.length === 0) {
    previewVariablesList.innerHTML = '<div style="color: var(--text-disabled); font-style: italic; font-size: 0.85rem;">No placeholders found. Try inserting %s or {Property}.</div>';
    return;
  }
  
  placeholders.forEach(pId => {
    const data = mockVariables[pId];
    if (!data) return;
    
    const row = document.createElement('div');
    row.className = 'preview-var-row';
    
    // Label showing the raw placeholder type
    const topLabel = document.createElement('div');
    topLabel.className = 'preview-var-label';
    topLabel.textContent = `Placeholder: ${data.raw}`;

    // Variable Name Input Group
    const nameGroup = document.createElement('div');
    nameGroup.style.display = 'flex';
    nameGroup.style.alignItems = 'center';
    nameGroup.style.gap = '0.5rem';
    
    const nameLabel = document.createElement('span');
    nameLabel.textContent = 'Name:';
    nameLabel.style.fontSize = '0.75rem';
    nameLabel.style.color = 'var(--text-muted)';
    nameLabel.style.width = '40px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'preview-var-input';
    nameInput.placeholder = 'e.g. alarmName';
    nameInput.value = data.name;
    
    nameInput.addEventListener('input', () => {
      mockVariables[pId].name = nameInput.value;
      updateOutput();
    });
    
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    
    // Value Input Group
    const valGroup = document.createElement('div');
    valGroup.style.display = 'flex';
    valGroup.style.alignItems = 'center';
    valGroup.style.gap = '0.5rem';
    
    const valLabel = document.createElement('span');
    valLabel.textContent = 'Test:';
    valLabel.style.fontSize = '0.75rem';
    valLabel.style.color = 'var(--text-muted)';
    valLabel.style.width = '40px';
    
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.className = 'preview-var-input';
    valInput.value = data.value;
    
    valInput.addEventListener('input', () => {
      mockVariables[pId].value = valInput.value;
      // Update pill instantly
      const pill = editor.querySelector(`.mock-var[data-id="${pId}"]`);
      if (pill) pill.textContent = valInput.value;
    });
    
    valGroup.appendChild(valLabel);
    valGroup.appendChild(valInput);
    
    row.appendChild(topLabel);
    row.appendChild(nameGroup);
    row.appendChild(valGroup);
    previewVariablesList.appendChild(row);
  });
}
