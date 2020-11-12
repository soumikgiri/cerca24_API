const Schema = require('mongoose').Schema;

const schema = new Schema({
  name: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    index: true,
    trim: true
  },
  areas: [{
    type: String,
    trim: true
  }],
  deliveryPrice: {
    type: Number,
    default: 0
  },
  companyId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
}, {
  minimize: false,
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  toJSON: { virtuals: true }
});

schema.virtual('company', {
  ref: 'Company',
  localField: 'companyId',
  foreignField: '_id',
  justOne: true
});

module.exports = schema;
