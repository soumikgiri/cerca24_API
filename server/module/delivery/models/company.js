const _ = require('lodash');
const crypto = require('crypto');
const Schema = require('mongoose').Schema;

const schema = new Schema({
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
  type: {
    type: String,
    default: 'delivery',
    index: true
  },
  name: {
    type: String
  },
  logo: {
    type: String,
    default: ''
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
  verificationIssueId: {
    type: Schema.Types.ObjectId,
    ref: 'Media'
  },
  activated: {
    type: Boolean,
    default: false
  },
  emailVerifiedToken: {
    type: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String
  },
  siteCommission: {
    type: Number,
    default: process.env.DELIVERY_DEFAULT_COMMISSION
  },
  deliveryPrice: {
    type: Number,
    default: process.env.DELIVERY_DEFAULT_SHIPPING_PRICE
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

schema.virtual('verificationDocument', {
  ref: 'Media',
  localField: 'verificationIssueId',
  foreignField: '_id',
  justOne: true
});

schema.method('toJSON', function toJSON() {
  const company = this.toObject();
  // TODO - convert avatar url from here
  company.logoUrl = DB.User.getAvatarUrl(company.logo);
  return _.omit(company, [
    'password', 'passwordResetToken', 'salt',
    'avatar'
  ]);
});

schema
  .virtual('logoUrl')
  .get(function logoUrl() {
    return DB.User.getAvatarUrl(this.logo);
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