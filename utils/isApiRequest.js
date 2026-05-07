function isApiRequest(req) {
    return req.originalUrl.startsWith('/api');
}

module.exports = isApiRequest;