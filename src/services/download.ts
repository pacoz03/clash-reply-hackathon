export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export function downloadPng(image: string, filename: string) {
  const bytes = Uint8Array.from(
    atob(image.slice(image.indexOf(",") + 1)),
    (c) => c.charCodeAt(0),
  );
  downloadBlob(new Blob([bytes], { type: "image/png" }), filename);
}
