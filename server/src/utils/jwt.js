'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('./errors');
const { ERROR_CODES } = require('../config/constants');

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      tv: Number(user.token_version || 1),
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: config.tokenIssuer,
    },
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      issuer: config.tokenIssuer,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('登录已过期，请重新登录', ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError('无效的登录凭证', ERROR_CODES.TOKEN_INVALID);
  }
}

function extractBearerToken(header) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1].trim() || null;
}

module.exports = {
  signToken,
  verifyToken,
  extractBearerToken,
};
