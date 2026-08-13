export async function copyText(text, environment = {}) {
  const navigatorObject = environment.navigator ?? globalThis.navigator;
  const documentObject = environment.document ?? globalThis.document;

  try {
    if (navigatorObject?.clipboard?.writeText) {
      await navigatorObject.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the selection-based fallback below.
  }

  if (!documentObject?.body || typeof documentObject.execCommand !== "function") return false;

  const textarea = documentObject.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  documentObject.body.append(textarea);
  textarea.select();

  try {
    return documentObject.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
