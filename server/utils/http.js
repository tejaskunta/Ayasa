const express = require('express');

/**
 * Wrap an async route handler so thrown errors reach the error middleware.
 *
 * Express 4 does not catch rejected promises from async handlers. Without this,
 * a DB error inside an async controller becomes an unhandled rejection and the
 * request hangs — a classic source of "reliability bugs".
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Central error handler. One place decides the status + shape, so every error
 * response looks the same to the client.
 */
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.publicMessage || 'Internal server error' });
}

function httpError(status, publicMessage) {
  const err = new Error(publicMessage);
  err.status = status;
  err.publicMessage = publicMessage;
  return err;
}

module.exports = { asyncHandler, errorHandler, httpError };