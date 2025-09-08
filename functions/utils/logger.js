const functions = require('firebase-functions')

function withMeta(meta) {
  if (!meta || typeof meta !== 'object') return {}
  return meta
}

module.exports = {
  info(message, meta) {
    functions.logger.info(message, withMeta(meta))
  },
  warn(message, meta) {
    functions.logger.warn(message, withMeta(meta))
  },
  error(message, meta) {
    functions.logger.error(message, withMeta(meta))
  },
}

