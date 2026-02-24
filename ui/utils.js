export function today() {
  return new Date().toISOString().split('T')[0];
}

export function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function showError(inputId, msg) {
  const el = document.getElementById(inputId);
  el.style.borderColor = 'var(--danger)';
  el.focus();
  setTimeout(() => (el.style.borderColor = ''), 2000);
  alert(msg);
}
