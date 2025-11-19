import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely renders markdown text by converting markdown syntax to HTML
 * and sanitizing it to prevent XSS attacks.
 * 
 * @param text - The markdown text to render
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function renderSafeMarkdown(text: string): string {
  // Convert markdown syntax to HTML
  const withMarkdown = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
  
  // Sanitize HTML to prevent XSS
  return DOMPurify.sanitize(withMarkdown, {
    ALLOWED_TAGS: ['strong', 'br', 'em', 'p', 'ul', 'ol', 'li', 'b', 'i'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
