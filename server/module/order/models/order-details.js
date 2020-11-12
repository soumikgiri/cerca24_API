const Schema = require('mongoose').Schema;

const schema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User'
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  shopId: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Shop'
  },
  productId: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Product'
  },
  productVariantId: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'ProductVariant'
  },
  variantOptions: [{
    type: Schema.Types.Mixed,
    index: true
  }],
  quantity: {
    type: Number,
    default: 1
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  basePrice: {
    type: Number,
    default: 0
  },
  // site currency
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  productPrice: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  currencyExchangeRate: {
    type: Number,
    default: 1
  },
  // price in the user side include tax, shipping price
  userTotalPrice: {
    type: Number,
    default: 0
  },
  userCurrency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  deliveryPrice: {
    type: Number,
    default: 0
  },
  deliveryZoneId: {
    type: Schema.Types.ObjectId
  },
  deliveryZoneDetail: {
    type: Schema.Types.Mixed
  },
  shopDetail: {
    type: Schema.Types.Mixed
  },
  productDetails: {
    type: Schema.Types.Mixed
  },
  variantDetails: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    index: true,
    default: 'pending',
    enum: ['pending', 'progressing', 'shipping', 'completed', 'refunded', 'cancelled']
  },
  userNote: {
    type: String
  },
  shopNote: {
    type: String
  },
  trackingCode: {
    type: String,
    index: true
  },
  shippingPrice: {
    type: Number,
    default: 0
  },
  userShippingPrice: {
    type: Number,
    default: 0
  },
  shippingMethod: {
    type: String
  },
  shippingAddress: {
    type: String
  },
  pickUpAtStore: {
    type: Boolean,
    default: false
  },
  pickUpAddress: {
    type: Schema.Types.Mixed
  },
  pickUpAddressObj: {
    type: Schema.Types.Mixed
  },
  userPickUpInfo: {
    type: Schema.Types.Mixed
  },
  shippingCode: {
    type: String
  },
  taxClass: {
    type: String
  },
  taxPercentage: {
    type: Number,
    default: 0
  },
  taxPrice: {
    type: Number,
    default: 0
  },
  userTaxPrice: {
    type: Number,
    default: 0
  },
  // customer information
  email: {
    type: String,
    lowercase: true
  },
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
  streetAddress: {
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
  paymentMethod: {
    type: String,
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    default: 'pending',
    index: true
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  // site commission
  commission: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  userAgent: {
    type: String
  },
  userIP: {
    type: String
  },
  couponName: {
    type: String
  },
  couponCode: {
    type: String
  },
  discountPercentage: {
    type: Number
  },
  completePayout: {
    type: Boolean,
    default: false
  },
  markPayoutRequest: {
    type: Boolean,
    default: false
  },
  payoutRequestId: {
    type: Schema.Types.ObjectId
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
  }
});

schema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true
});

schema.virtual('shop', {
  ref: 'Shop',
  localField: 'shopId',
  foreignField: '_id',
  justOne: true
});

module.exports = schema;
