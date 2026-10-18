const bcrypt = require('bcryptjs');
const env = require('../config/env');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
