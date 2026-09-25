import bcrypt from 'bcryptjs';
export const passwordHasher = {
  hash: (password) => bcrypt.hash(password, 12),
  verify: (password, hash) => bcrypt.compare(password, hash)
};
