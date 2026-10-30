export function createServiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.isServiceError = true;
  return error;
}

export function toServiceError(error, messages, fallbackMessage) {
  if (error?.isServiceError) {
    return error;
  }

  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  const message = Object.hasOwn(messages, code) ? messages[code] : fallbackMessage;
  return createServiceError(`transaction/${code}`, message);
}