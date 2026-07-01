/**
 * HTML Code Editor - Utility Functions
 */

export const STORAGE_KEY = 'html_editor_content';
export const THEME_KEY = 'html_editor_theme';

/**
 * Saves HTML content to local storage
 * @param {string} content - The HTML content to save
 */
export function saveToLocalStorage(content) {
  try {
    localStorage.setItem(STORAGE_KEY, content);
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

/**
 * Loads HTML content from local storage
 * @returns {string|null} - The saved HTML content or null
 */
export function loadFromLocalStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return null;
  }
}

/**
 * Saves theme preference to local storage
 * @param {string} theme - 'dark' or 'light'
 */
export function saveThemePreference(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Error saving theme to localStorage:', e);
  }
}

/**
 * Loads theme preference from local storage
 * @returns {string|null} - The saved theme preference or null
 */
export function loadThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    console.error('Error loading theme from localStorage:', e);
    return null;
  }
}

/**
 * Copies text to the system clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} - Resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text using Clipboard API:', err);
    }
  }

  // Fallback method for older browsers or insecure contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error('Fallback copy method failed:', err);
    return false;
  }
}

/**
 * Downloads a string content as an HTML file
 * @param {string} fileName - Name of the file to save
 * @param {string} content - Content of the file
 */
export async function downloadAsHTML(fileName, content) {
  const defaultName = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
  
  // Try modern File System Access API first for Save As dialog
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: 'HTML Document',
          accept: {'text/html': ['.html']},
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled the dialog
      console.warn('showSaveFilePicker failed, falling back to legacy download', err);
    }
  }
  
  // Fallback for browsers that don't support showSaveFilePicker
  const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.setAttribute('download', defaultName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Debounce utility to delay execution of a function
 * @param {Function} func - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}
