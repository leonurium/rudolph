"use strict";

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    const { getVercelListener } = require("../dist/src/vercel-listener");
    cachedHandler = await getVercelListener();
  }
  return cachedHandler;
}

module.exports = async function handler(req, res) {
  const listener = await getHandler();
  return listener(req, res);
};
