const _ = require('lodash');
const crypto = require('crypto');
const Schema = require('mongoose').Schema;

const schema = new Schema({
  avatar: { type: String, default: '' },
  companyId: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Company'
  },
  // customer information
  email: {
    type: String,
    lowercase: true,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String
  },
  salt: String,
  phoneNumber: {
    type: String
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  name: {
    type: String
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  country: {
    type: String
  },
  zipCode: {
    type: String
  },
  activated: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String
  },
  lastLocation: {
    type: [Number], // [<longitude>, <latitude>]
    index: '2d', // create the geospatial index
    default: [0, 0]
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('company', {
  ref: 'Company',
  localField: 'companyId',
  foreignField: '_id',
  justOne: true
});

schema.method('toJSON', function toJSON() {
  const user = this.toObject();
  // TODO - convert avatar url from here
  user.avatarUrl = DB.User.getAvatarUrl(user.avatar);
  return _.omit(user, [
    'password', 'passwordResetToken', 'salt',
    'avatar'
  ]);
});

schema
  .virtual('avatarUrl')
  .get(function avatarUrl() {
    return DB.User.getAvatarUrl(this.avatar);
  });

schema.pre('save', function beforeSave(next) {
  // Handle new/update passwords
  if (!this.isModified('password')) {
    return next();
  }

  // Make salt with a callback
  this.salt = this.makeSalt();
  this.password = this.encryptPassword(this.password);
  return next();
});

/**
 * Methods
 */
schema.methods = {
  authenticate(password) {
    return this.password === this.encryptPassword(password);
  },

  makeSalt() {
    return crypto.randomBytes(16).toString('base64');
  },

  encryptPassword(password) {
    const defaultIterations = 10000;
    const defaultKeyLength = 64;
    const salt = Buffer.from(this.salt).toString('base64');

    return crypto.pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength, 'sha1')
      .toString('base64');
  }
};

module.exports = schema;
