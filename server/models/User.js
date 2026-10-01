const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: 'Friend', trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Stored hashed. `select: false` keeps it out of query results by default,
    // so it can never leak through a careless res.json(user).
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

/**
 * Hash the password whenever it changes.
 *
 * We use a plain async function (no `next` callback). The original used the
 * callback style with a `next` arg that newer Mongoose no longer passes,
 * which is a latent footgun.
 */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.comparePassword = function comparePassword(entered) {
  return bcrypt.compare(entered, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);