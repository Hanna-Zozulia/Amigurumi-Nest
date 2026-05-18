/**
 * Returns true when the request path appears to be an API endpoint.
 */
function isApiRequest(req) {
    return req.originalUrl.startsWith('/api');
}

module.exports = isApiRequest;