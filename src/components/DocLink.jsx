import { saveDocument } from '../lib/download.js';

// A download link for a PDF. Without JavaScript it is an ordinary download link; with it, the file is checked and saved by name.
export default function DocLink({ file, name, onClick, children, ...rest }) {
  const label = name || file;
  const go = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    saveDocument(file, label);
  };
  return <a href={file} download={label} onClick={go} {...rest}>{children}</a>;
}
