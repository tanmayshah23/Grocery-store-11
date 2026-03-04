export function notify(message: string, type: 'success' | 'info' = 'success') {
  const event = new CustomEvent('app-notify', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}
