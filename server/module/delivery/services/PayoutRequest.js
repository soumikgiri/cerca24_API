const moment = require('moment');

exports.calculateCurrentBalance = async (companyId) => {
  try {
    const data = await DB.OrderDetail.aggregate([{
      $match: {
        deliveryCompletePayout: false,
        deliveryCompanyId: Helper.App.toObjectId(companyId),
        deliveryStatus: 'deliveried'
      }
    }, {
      $group: {
        _id: null,
        balance: { $sum: '$deliveryBalance' },
        commission: { $sum: '$deliveryCommission' },
        totalPrice: { $sum: '$deliveryPrice' },
        totalProduct: { $sum: '$quantity' },
        totalOrder: { $sum: 1 }
      }
    }]);

    return {
      balance: data && data.length ? data[0].balance : 0,
      commission: data && data.length ? data[0].commission : 0,
      totalPrice: data && data.length ? data[0].totalPrice : 0,
      totalProduct: data && data.length ? data[0].totalProduct : 0,
      totalOrder: data && data.length ? data[0].totalOrder : 0
    };
  } catch (e) {
    throw e;
  }
};

exports.getOrdersForPayout = async (companyId) => {
  try {
    return DB.OrderDetail.find({
      deliveryCompletePayout: false,
      deliveryCompanyId: Helper.App.toObjectId(companyId),
      deliveryStatus: 'deliveried'
      // paymentMethod: {
      //   $ne: 'cod'
      // }
    });
  } catch (e) {
    throw e;
  }
};

exports.sendRequest = async (companyId, payoutAccount) => {
  try {
    const company = companyId instanceof DB.Company ? companyId : await DB.Company.findOne({ _id: companyId });
    if (!company) {
      throw new Error('Company not found!');
    }

    // TODO - check previous request
    // if last previous request is still pending, we will alert to admin
    let payoutRequest = await DB.DeliveryPayoutRequest.findOne({
      status: 'pending',
      companyId
    });
    if (payoutRequest) {
      if (moment(payoutRequest.updatedAt).isAfter(moment().add(-1, 'days'))) {
        if (payoutRequest.requestAttempts >= process.env.MAX_PAYOUT_REQUEST_PER_DAY) {
          throw new Error('Send request reach max attempts today');
        } else {
          payoutRequest.maxAttempts++;
        }
      } else {
        payoutRequest.maxAttempts = 1;
      }
    } else {
      payoutRequest = new DB.DeliveryPayoutRequest({
        companyId
      });
    }

    const balance = await this.calculateCurrentBalance(companyId);
    if (!balance.balance) {
      throw new Error('Balance is not enough for payout request');
    }
    // create order items on this time frame
    const orders = await this.getOrdersForPayout(companyId);
    if (!orders.length) {
      throw new Error('Balance is not enough for payout request');
    }
    payoutRequest.requestToTime = new Date();
    payoutRequest.total = balance.totalPrice;
    payoutRequest.commission = balance.commission;
    payoutRequest.companyBalance = balance.balance;
    payoutRequest.totalProduct = balance.totalProduct;
    payoutRequest.totalOrder = balance.totalOrder;
    payoutRequest.payoutAccount = payoutAccount;
    payoutRequest.details = balance;

    await payoutRequest.save();
    // remove previous item then update to this new
    await DB.PayoutItem.remove({ requestId: payoutRequest._id });
    await Promise.all(orders.map((order) => {
      const payoutItem = new DB.PayoutItem({
        requestId: payoutRequest._id,
        itemType: 'order',
        itemId: order._id,
        total: order.totalPrice,
        commission: order.commission,
        balance: order.companyBalance,
        companyId: order.companyId
      });

      return payoutItem.save();
    }));

    // send email to admin
    await Service.Mailer.send('delivery/payout/request-to-admin.html', process.env.EMAIL_NOTIFICATION_PAYOUT_REQUEST, {
      subject: `[Delivery] Payout request from ${company.name}`,
      company: company.toObject(),
      orders,
      payoutRequest
    });
    return payoutRequest;
  } catch (e) {
    throw e;
  }
};

exports.approveRequest = async (requestId, options) => {
  try {
    const payoutRequest = requestId instanceof DB.DeliveryPayoutRequest ? requestId : await DB.DeliveryPayoutRequest.findOne({ _id: requestId });
    if (!payoutRequest) {
      throw new Error('Request not found');
    }

    if (payoutRequest.status === 'approved') {
      throw new Error('Payout request status is invalid');
    }

    payoutRequest.status = 'approved';
    if (options.note) {
      payoutRequest.note = options.note;
    }
    await payoutRequest.save();
    await DB.PayoutItem.updateMany({ requestId: payoutRequest._id }, {
      status: 'approved'
    });
    const payoutItems = await DB.PayoutItem.find({ requestId: payoutRequest._id });
    await Promise.all(payoutItems.map(payoutItem => DB.OrderDetail.update({ _id: payoutItem.itemId }, {
      $set: {
        deliveryCompletePayout: true,
        deliveryPayoutRequestId: payoutItem.requestId
      }
    })));
    const company = await DB.Company.findOne({ _id: payoutRequest.companyId });
    await Service.Mailer.send('delivery/payout/approve-notify-to-company.html', company.email, {
      subject: `Payout request #${payoutRequest.code} is approved`,
      company: company.toObject(),
      payoutRequest
    });
    return payoutRequest;
  } catch (e) {
    throw e;
  }
};

exports.rejectRequest = async (requestId, options) => {
  try {
    const payoutRequest = requestId instanceof DB.DeliveryPayoutRequest ? requestId : await DB.DeliveryPayoutRequest.findOne({ _id: requestId });
    if (!payoutRequest) {
      throw new Error('Request not found');
    }

    if (payoutRequest.status === 'approved') {
      throw new Error('Payout request status is invalid');
    }

    payoutRequest.status = 'rejected';
    if (options.rejectReason) {
      payoutRequest.rejectReason = options.rejectReason;
    }
    if (options.note) {
      payoutRequest.note = options.note;
    }
    await payoutRequest.save();
    await DB.PayoutItem.updateMany({ requestId: payoutRequest._id }, {
      status: 'rejected'
    });
    const company = await DB.Company.findOne({ _id: payoutRequest.companyId });
    await Service.Mailer.send('delivery/payout/reject-notify-to-company.html', company.email, {
      subject: `Payout request #${payoutRequest.code} is rejected`,
      company: company.toObject(),
      payoutRequest
    });
    return payoutRequest;
  } catch (e) {
    throw e;
  }
};

exports.getItemDetails = async (requestId) => {
  try {
    const items = await DB.PayoutItem.find({ requestId });
    // just support order for now
    return Promise.all(items.map(item => DB.OrderDetail.findOne({
      _id: item.itemId
    })));
  } catch (e) {
    throw e;
  }
};

exports.stats = async (options) => {
  try {
    const matchQuery = {};
    if (options.companyId) {
      matchQuery.companyId = Helper.App.toObjectId(options.companyId);
    }
    if (options.startDate && options.toDate) {
      matchQuery.requestToTime = {
        $gte: moment(options.startDate).startOf('day').toDate(),
        $lte: moment(options.toDate).endOf('day').toDate()
      };
    }

    const pendingRequest = await DB.DeliveryPayoutRequest.aggregate([{
      $match: Object.assign({
        status: 'pending'
      }, matchQuery)
    }, {
      $group: {
        _id: null,
        balance: { $sum: '$companyBalance' },
        commission: { $sum: '$commission' },
        totalPrice: { $sum: '$total' },
        totalProduct: { $sum: '$totalProduct' },
        totalOrder: { $sum: '$totalOrder' }
      }
    }]);
    const approvedRequest = await DB.DeliveryPayoutRequest.aggregate([{
      $match: Object.assign({
        status: 'approved'
      }, matchQuery)
    }, {
      $group: {
        _id: null,
        balance: { $sum: '$companyBalance' },
        commission: { $sum: '$commission' },
        totalPrice: { $sum: '$total' },
        totalProduct: { $sum: '$totalProduct' },
        totalOrder: { $sum: '$totalOrder' }
      }
    }]);

    return {
      pending: {
        companyBalance: pendingRequest && pendingRequest.length ? pendingRequest[0].balance : 0,
        commission: pendingRequest && pendingRequest.length ? pendingRequest[0].commission : 0,
        totalPrice: pendingRequest && pendingRequest.length ? pendingRequest[0].totalPrice : 0,
        totalProduct: pendingRequest && pendingRequest.length ? pendingRequest[0].totalProduct : 0,
        totalOrder: pendingRequest && pendingRequest.length ? pendingRequest[0].totalOrder : 0
      },
      approved: {
        companyBalance: approvedRequest && approvedRequest.length ? approvedRequest[0].balance : 0,
        commission: approvedRequest && approvedRequest.length ? approvedRequest[0].commission : 0,
        totalPrice: approvedRequest && approvedRequest.length ? approvedRequest[0].totalPrice : 0,
        totalProduct: approvedRequest && approvedRequest.length ? approvedRequest[0].totalProduct : 0,
        totalOrder: approvedRequest && approvedRequest.length ? approvedRequest[0].totalOrder : 0
      }
    };
  } catch (e) {
    throw e;
  }
};
