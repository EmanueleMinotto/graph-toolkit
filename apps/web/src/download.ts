/** Saves `blob` as a file through a temporary object URL. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);

  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

/** Saves `text` as a file. */
export function download(name: string, text: string): void {
  downloadBlob(name, new Blob([text], { type: 'text/plain' }));
}
