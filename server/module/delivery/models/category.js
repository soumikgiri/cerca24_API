const Schema = require('mongoose').Schema;

const schema = new Schema({
  name: {
    type: String
  },
  description: {
    type: String
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCategory'
  },
  mainImage: {
    type: Schema.Types.ObjectId,
    ref: 'Media'
  },
  companyId: {
    type: Schema.Types.ObjectId
  },
  ordering: {
    type: Number,
    default: 0
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

module.exports = schema;
