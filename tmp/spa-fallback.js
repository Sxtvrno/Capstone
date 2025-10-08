function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';

  // Do not rewrite API calls
  if (uri.startsWith('/api')) {
    return request;
  }

  // If the request looks like a file (has an extension), leave it
  var hasExtension = uri.includes('.') && !uri.endsWith('.');
  if (hasExtension) {
    return request;
  }

  // Otherwise, rewrite to SPA entry point
  request.uri = '/index.html';
  return request;
}
