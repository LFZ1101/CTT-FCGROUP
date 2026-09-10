const ALLOWED = new Set([
  'application/pdf',
  'text/html',
  'application/xhtml+xml',
  'text/plain',
]);

export function isAllowedMime(mime: string) {
  return ALLOWED.has(mime.toLowerCase());
}

export function extensionForMime(mime: string) {
  switch (mime.toLowerCase()) {
    case 'application/pdf':
      return 'pdf';
    case 'text/html':
    case 'application/xhtml+xml':
      return 'html';
    case 'text/plain':
      return 'txt';
    default:
      return 'bin';
  }
}
