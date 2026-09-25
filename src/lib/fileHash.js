// SHA-256 fingerprint of a File/Blob, hex encoded — sent as documents.file_hashes so the
// database can detect duplicates (find_duplicate_documents RPC + upload trigger).
export async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Files(files) {
  return Promise.all(Array.from(files || []).map(sha256File));
}
