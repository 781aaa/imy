'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');

function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), config.bcryptRounds);
}

function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compareSync(String(plain), String(hash));
}

module.exports = {
  hashPassword,
  verifyPassword,
};
