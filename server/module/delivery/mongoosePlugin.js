/* eslint prefer-arrow-callback: 0 */
const Schema = require('mongoose').Schema;

exports.OrderDetail = (schema) => {
  schema.add({
    driverId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    deliveryCompanyId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    deliveryCategoryId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    deliveryCompanyInfo: {
      type: Schema.Types.Mixed
    },
    deliveryStatus: {
      type: String,
      enum: ['processing', 'pickedUp', 'onTheWay', 'cancelled', 'postponed', 'deliveried'],
      default: 'processing',
      index: true
    },
    deliveryPrice: {
      type: Number,
      default: 0
    },
    // company balance
    deliveryBalance: {
      type: Number,
      default: 0
    },
    // site commission
    deliveryCommission: {
      type: Number,
      default: 0
    },
    deliveryCommissionRate: {
      type: Number,
      default: 0
    },
    deliveryCompletePayout: {
      type: Boolean,
      default: false
    },
    deliveryPayoutRequestId: {
      type: Schema.Types.ObjectId,
      index: true
    }
  });

  schema.virtual('deliveryCompany', {
    ref: 'Company',
    localField: 'deliveryCompanyId',
    foreignField: '_id',
    justOne: true
  });

  schema.virtual('deliveryDriver', {
    ref: 'Driver',
    localField: 'driverId',
    foreignField: '_id',
    justOne: true
  });
};
