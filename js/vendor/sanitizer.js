/**
 * AXIOM INVENTORY INTELLIGENCE - SECURITY & MARKDOWN SANITIZATION ENGINE
 * Prevents Stored, Reflected, and DOM-based Cross-Site Scripting (XSS).
 * Strictly sanitizes HTML and parses Markdown securely.
 */

(function(root) {
  'use strict';

  /**
   * Escape raw HTML special characters
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validate URL to block javascript:, vbscript:, data:text/html
   */
  function isSafeURL(url) {
    if (!url) return false;
    const clean = url.trim().toLowerCase();
    if (clean.startsWith('javascript:') || clean.startsWith('vbscript:') || clean.startsWith('data:text/html')) {
      return false;
    }
    return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('#') || clean.startsWith('/') || clean.startsWith('./');
  }

  /**
   * Sanitize an HTML string by removing dangerous tags, attributes, and event handlers
   */
  function sanitizeHTML(dirty) {
    if (!dirty) return '';

    // If running in browser with DOMParser
    if (typeof document !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(dirty, 'text/html');

      // Disallowed tags
      const dangerousTags = [
        'script', 'iframe', 'object', 'embed', 'style', 'link', 'meta',
        'base', 'form', 'input', 'button', 'textarea', 'frame', 'frameset',
        'applet', 'svg', 'math'
      ];

      dangerousTags.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
      });

      // Walk all remaining elements and strip event handlers and dangerous attributes
      const allElements = doc.body.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove all on* event handler attributes (e.g. onerror, onload, onclick)
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
          const name = attr.name.toLowerCase();
          const val = attr.value;
          if (name.startsWith('on')) {
            el.removeAttribute(attr.name);
          } else if ((name === 'href' || name === 'src' || name === 'action') && !isSafeURL(val)) {
            el.removeAttribute(attr.name);
          } else if (name === 'style' && (val.includes('javascript:') || val.includes('expression(') || val.includes('url('))) {
            el.removeAttribute(attr.name);
          }
        });
      });

      return doc.body.innerHTML;
    }

    // Fallback regex sanitizer (for non-DOM or unit test environments)
    let clean = dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'>]*/gi, '');

    return clean;
  }

  /**
   * Safely convert Markdown text into sanitized HTML
   */
  function safeMarkdownToHTML(markdownText) {
    if (!markdownText) return '';

    // Step 1: Normalize newlines
    let text = String(markdownText).replace(/\r\n/g, '\n');

    // Step 2: Escape raw HTML tags first to neutralize script/img tags inside markdown
    text = escapeHTML(text);

    // Step 3: Parse markdown syntax from safe text
    // Headings
    text = text.replace(/^### (.*$)/gim, '<h3 style="font-family:var(--syne);font-size:0.95rem;color:var(--cyan);margin:0.5rem 0 0.3rem;">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 style="font-family:var(--syne);font-size:1.05rem;color:var(--text);margin:0.6rem 0 0.4rem;">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 style="font-family:var(--syne);font-size:1.2rem;color:var(--text);margin:0.8rem 0 0.4rem;">$1</h1>');

    // Bold & Italics
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text);font-weight:600;">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code
    text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(0,229,255,0.1);color:var(--cyan);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:0.85em;">$1</code>');

    // Unordered lists
    text = text.replace(/^\s*[-•]\s*(.*$)/gim, '<li style="margin-left:1.2rem;margin-bottom:0.25rem;">$1</li>');

    // Numbered lists
    text = text.replace(/^\s*(\d+)\.\s*(.*$)/gim, '<li style="margin-left:1.2rem;margin-bottom:0.25rem;list-style-type:decimal;">$2</li>');

    // Line breaks
    text = text.replace(/\n\n/g, '<div style="margin-bottom:0.6rem;"></div>');
    text = text.replace(/\n/g, '<br/>');

    // Step 4: Final defense-in-depth sanitization pass
    return sanitizeHTML(text);
  }

  const AxiomSanitizer = {
    escapeHTML,
    isSafeURL,
    sanitizeHTML,
    safeMarkdownToHTML
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AxiomSanitizer;
  }
  if (typeof window !== 'undefined') {
    window.AxiomSanitizer = AxiomSanitizer;
  }

})(typeof window !== 'undefined' ? window : global);
