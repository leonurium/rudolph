"use strict";

// Legacy serverless handler — Vercel zero-config NestJS uses src/main.ts instead.
// Kept for local reference; the api/ folder is listed in .vercelignore.

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    const { getVercelListener } = require("../dist/vercel-listener");
    cachedHandler = await getVercelListener();
  }
  return cachedHandler;
}

module.exports = async function handler(req, res) {
  const listener = await getHandler();
  return listener(req, res);
};
