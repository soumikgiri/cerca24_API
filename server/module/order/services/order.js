/* eslint no-param-reassign: 0, no-await-in-loop: 0, no-restricted-syntax: 0, no-continue: 0, guard-for-in: 0 */
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const url = require('url');
const nconf = require('nconf');
const moment = require('moment');
const Queue = require('../../../kernel/services/queue');

const orderQ = Queue.create('order');
const COMMISSION_RATE = process.env.COMMISSION_FEE;
const SITE_CURRENCY = process.env.SITE_CURRENCY;

exports.getCommission = async () => {
  try {
    const config = await DB.Config.findOne({
      key: 'siteCommission'
    });
    if (!config || config.value > 1 || config.value < 0) {
      return COMMISSION_RATE;
    }

    return config.value;
  } catch (e) {
    return process.env.COMMISSION_FEE;
  }
};

exports.create = async (data, user) => {
  try {
    // get currency if have
    const userCurrency = SITE_CURRENCY;
    const currencyExchangeRate = 1;

    const productIds = data.products.map(p => p.productId);
    const products = await DB.Product.find({
      _id: {
        $in: productIds
      }
    })
      .populate('shop')
      .populate('mainImage');
    if (!products.length) {
      throw new Error('No products');
    }
    const mappingProducts = data.products;
    mappingProducts.filter((product) => {
      const p = products.find(i => i._id.toString() === product.productId);
      if (p) {
        product.product = p;
        product.shop = p.shop;
        return true;
      }

      return false;
    });
    const customerInfo = _.pick(data, [
      'phoneNumber', 'firstName', 'lastName', 'email',
      'city', 'state', 'country', 'zipCode',
      'streetAddress', 'shippingAddress', 'paymentMethod',
      'userIP', 'userAgent'
    ]);
    // TODO - check product stock quanntity, check shipping method or COD
    const orderDetails = [];
    const order = new DB.Order(Object.assign(customerInfo, {
      customerId: user._id,
      currency: SITE_CURRENCY,
      trackingCode: Helper.String.randomString(7).toUpperCase(),
      userCurrency,
      currencyExchangeRate
    }));
    let totalProducts = 0;
    let totalPrice = 0;
    // TODO - check shipping fee deeply with shop settings
    for (const product of mappingProducts) {
      let taxPrice = 0;
      let unitPrice = product.product.salePrice;
      let basePrice = product.product.price;
      let variant;
      let company;
      let deliveryZone;

      const orderDetail = new DB.OrderDetail(Object.assign(customerInfo, {
        orderId: order._id,
        customerId: user._id || null,
        shopId: product.shop._id,
        productId: product.product._id,
        productVariantId: product.productVariantId,
        variantOptions: product.variantOptions,
        userNote: product.userNote,
        userPickUpInfo: product.userPickUpInfo,
        trackingCode: Helper.String.randomString(7).toUpperCase(),
        quantity: product.quantity,
        unitPrice,
        basePrice,
        currency: SITE_CURRENCY,
        productDetails: product.product, // TODO - just pick go needed field
        userCurrency,
        currencyExchangeRate,
        deliveryCompanyId: product.deliveryCompanyId,
        deliveryZoneId: product.deliveryZoneId,
        pickUpAddressObj: product.pickUpAddressObj
      }));
      if (product.productVariantId) {
        variant = await DB.ProductVariant.findOne({
          _id: product.productVariantId
        });
        if (variant) {
          unitPrice = variant.salePrice || product.salePrice;
          basePrice = variant.price || product.price;
          if (variant.stockQuantity <= 0) {
            // TODO - check here and throw error?
            continue;
          }
        }

        orderDetail.variantDetails = variant;
      }

      if (product.deliveryCompanyId) {
        company = await DB.Company.findOne({
          _id: product.deliveryCompanyId
        });
        if (company) {
          orderDetail.deliveryCompanyInfo = _.pick(company, ['email', 'name', 'logoUrl', 'address', 'city', 'state', 'country']);
        }
        deliveryZone = await DB.DeliveryZone.findOne({
          _id: product.deliveryZoneId
        });
        if (deliveryZone) {
          orderDetail.deliveryCommissionRate = company.siteCommission;
          orderDetail.deliveryCommission = Math.round(deliveryZone.deliveryPrice * company.siteCommission * 100) / 100;
          orderDetail.deliveryBalance = deliveryZone.deliveryPrice - orderDetail.deliveryCommission;
          orderDetail.deliveryPrice = deliveryZone.deliveryPrice;
          orderDetail.deliveryZoneDetail = deliveryZone;
        }
      }

      // calculate and update coupon data
      let discountPercentage = 0;
      if (product.couponCode) {
        const coupon = await Service.Coupon.checkValid(product.shop.id, product.couponCode);
        if (coupon && coupon !== false) {
          orderDetail.discountPercentage = coupon.discountPercentage;
          orderDetail.couponCode = coupon.code;
          orderDetail.couponName = coupon.name;

          coupon.usedCount++;
          await coupon.save();
          discountPercentage = coupon.discountPercentage;
        }
      }

      taxPrice = product.product.taxPercentage ? unitPrice * (product.product.taxPercentage / 100) : 0;
      orderDetail.taxPrice = taxPrice * product.quantity;
      orderDetail.taxClass = product.product.taxClass;
      orderDetail.taxPercentage = product.product.taxPercentage;
      orderDetail.userTaxPrice = taxPrice * currencyExchangeRate * product.quantity;

      const priceBeforeDiscount = unitPrice * product.quantity;
      const productPrice = discountPercentage ? priceBeforeDiscount - (priceBeforeDiscount * (discountPercentage / 100)) : priceBeforeDiscount;
      totalProducts += product.quantity;

      // shipping calculator
      let shippingPrice = 0;
      let userShippingPrice = 0;
      // check freeship setting for the area
      let freeShip = false;
      if (!product.product.freeShip) {
        _.each(product.product.restrictFreeShipAreas, (area) => {
          if (area.areaType === 'zipcode' && data.zipCode && area.value === data.zipCode) {
            freeShip = true;
          } else if (area.areaType === 'city' && data.city && area.value === data.city) {
            freeShip = true;
          } else if (area.areaType === 'state' && data.state && area.value === data.state) {
            freeShip = true;
          } else if (area.areaType === 'country' && data.country && area.country === data.country) {
            freeShip = true;
          }
        });
      }
      if (!freeShip && !product.product.freeShip && product.shop.storeWideShipping) {
        shippingPrice = product.shop.shippingSettings.defaultPrice;
        if (product.quantity > 1) {
          shippingPrice += product.shop.shippingSettings.perQuantityPrice * (product.quantity - 1);
        }
        userShippingPrice = shippingPrice * currencyExchangeRate;
      }
      orderDetail.shippingPrice = shippingPrice;
      orderDetail.userShippingPrice = userShippingPrice;

      // TODO - check here for shipping price
      const deliveryPrice = orderDetail.deliveryPrice ? orderDetail.deliveryPrice : 0;
      orderDetail.productPrice = productPrice;
      orderDetail.totalPrice = Math.round((productPrice + orderDetail.taxPrice + shippingPrice + deliveryPrice) * 100) / 100; // TODO - round me

      // fee base on order total price
      orderDetail.commissionRate = product.shop.commission;
      // change commission base on VAT (16% in Zambia)
      const newCommision = (orderDetail.basePrice * product.quantity * product.shop.commission) + (orderDetail.basePrice * product.quantity * product.shop.commission * 0.16);
      orderDetail.commission = Math.round(newCommision * 100) / 100;

      orderDetail.balance = orderDetail.totalPrice - orderDetail.commission;

      totalPrice += orderDetail.totalPrice;
      orderDetail.userTotalPrice = orderDetail.totalPrice * currencyExchangeRate;
      orderDetail.pickUpAtStore = product.shop.pickUpAtStore;
      orderDetail.pickUpAddress = product.pickUpAddress ? product.pickUpAddress : product.shop.address;
      orderDetail.shopDetail = _.pick(product.shop, '_id', 'name', 'alias', 'phoneNumber', 'email');
      orderDetails.push(orderDetail);
    }

    order.totalProducts = totalProducts;
    order.totalPrice = totalPrice;
    order.userTotalPrice = totalPrice * currencyExchangeRate;
    await order.save();
    await Promise.all(orderDetails.map(orderDetail => orderDetail.save()));

    // update quantity for order detail and
    await Service.Order.updateProductQuantity(orderDetails);
    if (order.paymentMethod === 'cod') {
      await this.sendEmailSummary(order._id);
    }

    return order;
  } catch (e) {
    throw e;
  }
};

exports.updateProductQuantity = async (orderDetail) => {
  try {
    const orderDetails = Array.isArray(orderDetail) ? orderDetail : [orderDetail];
    return Promise.all(orderDetails.map(({
      productId,
      productVariantId,
      quantity
    }) => Service.Product.updateQuantity({
      productId,
      productVariantId,
      quantity
    })));
  } catch (e) {
    throw e;
  }
};

exports.updatePaid = async (orderId, transactionId) => {
  try {
    const order = orderId instanceof DB.Order ? orderId : await DB.Order.findOne({
      _id: orderId
    });
    if (!order) {
      throw new Error('Order not found');
    }
    await DB.Order.update({
      _id: orderId
    }, {
      $set: {
        paymentStatus: 'paid',
        transactionId
      }
    });
    await DB.OrderDetail.updateMany({
      orderId
    }, {
      $set: {
        paymentStatus: 'paid',
        transactionId
        // status: 'completed'
      }
    });

    const orderDetails = await DB.OrderDetail.find({
      orderId
    });
    await Promise.all(orderDetails.map(orderDetail => Service.Order.sendDigitalLink(orderDetail)));

    // send email order success to user & shop
    await this.sendEmailSummary(orderId);

    // send SMS to user
    if (order.phoneNumber) {
      await Service.Sms.send({
        text: `Thank you for shopping with Shop Online Zambia.
Your order number ${order.trackingCode} of ZMW ${order.totalPrice} have been generated.
Call +260762300300 for any inquiries.`,
        to: order.phoneNumber
      });
    }

    await this.addLog({
      eventType: 'updatePaid',
      changedBy: orderDetails.customerId || null,
      orderId,
      oldData: {
        paymentStatus: 'pending'
      },
      newData: {
        paymentStatus: 'paid'
      }
    });

    return true;
  } catch (e) {
    throw e;
  }
};

exports.requestRefund = async (data) => {
  try {
    const details = await DB.OrderDetail.findOne({
      _id: data.orderDetailId
    });
    if (!details) {
      throw new Error('Order detail not found');
    }

    if (details.status === 'refunded') {
      throw new Error('Order has been refunded');
    }

    // notify email to seller and admin
    const refundRequest = new DB.RefundRequest({
      orderDetailId: details._id,
      orderId: details.orderId,
      shopId: details.shopId,
      reason: data.reason,
      customerId: details.customerId
    });
    await refundRequest.save();

    // notify email
    const order = await DB.Order.findOne({
      _id: details.orderId
    });
    const shop = await DB.Shop.findOne({
      _id: details.shopId
    });
    if (order && shop) {
      const customer = await DB.User.findOne({
        _id: details.customerId
      });
      if (shop.email) {
        Service.Mailer.send('order/refund-request-shop.html', shop.email, {
          subject: `Refund request for order #${details.trackingCode}`,
          customer: customer.toObject(),
          order,
          subOrder: details,
          refundRequest: refundRequest.toObject()
        });
      }

      Service.Mailer.send('order/refund-request-admin.html', process.env.EMAIL_NOTIFICATION_REFUND, {
        subject: `Refund request for sub order #${details.trackingCode} or order #${order.trackingCode}`,
        customer: customer.toObject(),
        order,
        subOrder: details,
        refundRequest: refundRequest.toObject(),
        shop: shop.toObject()
      });
    }

    return refundRequest;
  } catch (e) {
    throw e;
  }
};

exports.getRefundCsvData = async (query = {}, sort = {
  createdAt: -1
}) => {
  try {
    return DB.RefundRequest.find(query)
      .populate('customer')
      .populate('orderDetail')
      .populate('shop')
      .sort(sort)
      .exec();
  } catch (e) {
    throw e;
  }
};

exports.verifyPhoneCheck = async (data) => {
  try {
    const phoneCheck = await DB.PhoneCheck.findOne(data);
    if (!phoneCheck) {
      throw new Error('Phone verify code is invalid');
    }

    await phoneCheck.remove();
    return true;
  } catch (e) {
    throw e;
  }
};

exports.sendDigitalLink = async (orderDetailId) => {
  try {
    const orderDetail = orderDetailId instanceof DB.OrderDetail ? orderDetailId : await DB.OrderDetail.findOne({
      _id: orderDetailId
    });
    if (!orderDetail) {
      throw new Error('Order detail not found');
    }

    // check product, if it is digital, we will send email to user with digital link.
    // update order status is paid?
    if (!orderDetail.productDetails || orderDetail.productDetails.type !== 'digital') {
      return false;
    }
    let digitalFileId;
    if (orderDetail.variantDetails && orderDetail.variantDetails.digitalFileId) {
      digitalFileId = orderDetail.variantDetails.digitalFileId;
    } else if (orderDetail.productDetails && orderDetail.productDetails.digitalFileId) {
      digitalFileId = orderDetail.productDetails.digitalFileId;
    }
    if (!digitalFileId) {
      return false;
    }

    // send link with jwt encrypt to user with download link
    const expireTokenDuration = 60 * 60 * 24 * 1; // 1 days
    const jwtToken = jwt.sign({
      orderDetailId: orderDetail._id,
      digitalFileId
    }, process.env.SESSION_SECRET, {
      expiresIn: expireTokenDuration
    });
    let customerEmail = orderDetail.email;
    if (orderDetail.customerId) {
      const customer = await DB.User.findOne({
        _id: orderDetail.customerId
      });
      if (customer) {
        customerEmail = customer.email;
      }
    }

    const shop = await DB.Shop.findOne({
      _id: orderDetail.shopId
    });
    await Service.Mailer.send('order/digital-download-link.html', customerEmail, {
      subject: `Download link for order #${orderDetail.trackingCode}`,
      downloadLink: url.resolve(nconf.get('baseUrl'), `v1/orders/details/${orderDetail._id}/digitals/download?token=${jwtToken}`),
      shop,
      orderDetail
    });
    if (['pending', 'progressing', 'shipping'].indexOf(orderDetail.status)) {
      orderDetail.status = 'completed';
      await orderDetail.save();
    }
    return true;
  } catch (e) {
    throw e;
  }
};

exports.getDigitalFileFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    const file = await DB.Media.findOne({
      _id: decoded.digitalFileId
    });
    if (!file) {
      throw new Error('No file found!');
    }

    // if support s3 and this is s3 link, we will create signed url for this link
    if (process.env.USE_S3 === 'true' && Helper.String.isUrl(file.filePath)) {
      return Service.S3.getSignedUrl(file.filePath, {
        expiresInMinutes: 4 * 60
      });
    }

    return file.filePath;
  } catch (e) {
    throw e;
  }
};

exports.getCsvData = async (query = {}, sort = {
  createdAt: -1
}) => {
  try {
    query.$or = [{
      paymentStatus: 'paid',
      paymentMethod: {
        $ne: 'cod'
      }
    }, {
      paymentMethod: 'cod'
    }];

    const items = await DB.OrderDetail.find(query)
      .populate('customer')
      .sort(sort)
      .exec();
    const resutls = items.map((item) => {
      const data = item.toJSON();
      if (item.customer) {
        data.customer = item.customer.toJSON();
      }
      data.details = item.details || [];
      return data;
    });
    return resutls;
  } catch (e) {
    throw e;
  }
};

exports.updateStatus = async (subOrder, status, pickUpAddressObj = null) => {
  try {
    // prevent change order status back
    if (['completed', 'refunded', 'cancelled'].indexOf(subOrder.status) > -1) {
      throw new Error(`Cannot rollback status if it is ${subOrder.status}!`);
    }

    const updateField = {
      status
    };
    if (pickUpAddressObj) {
      updateField.pickUpAddressObj = pickUpAddressObj;
    }
    subOrder.status = status;
    await DB.OrderDetail.update({
      _id: subOrder._id
    }, {
      $set: updateField
    });

    let customerEmail = subOrder.email;
    if (!customerEmail && subOrder.customer) {
      customerEmail = subOrder.customer.email;
    }

    if (customerEmail) {
      const order = await DB.Order.findOne({
        _id: subOrder.orderId
      });
      if (order) {
        const orderLinkShop = url.resolve(process.env.userWebUrl, `invoices/detail/${subOrder.trackingCode}?shopId=${subOrder.shopId}`);
        await Service.Mailer.send('order/sub-order-status-change.html', customerEmail, {
          subject: `Order sub #${subOrder.trackingCode} of #${order.trackingCode} status has changed`,
          user: order.customer ? order.customer : {
            name: subOrder.fullName || `${subOrder.firstName} ${subOrder.lastName}`
          },
          order,
          subOrder,
          qrLinkUser: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(orderLinkShop)}&chld=L|1&choe=UTF-8`,
          orderLink: url.resolve(process.env.userWebUrl, `orders/view/${order._id}`)
        });
      }
    }

    return subOrder;
  } catch (e) {
    throw e;
  }
};

orderQ.process(async (job, done) => {
  try {
    const data = job.data;
    if (data.action !== 'sendMailSummary') {
      // not support yet
      return done();
    }
    const orderId = data.orderId;
    const order = await DB.Order.findOne({
      _id: orderId
    });
    if (!order) {
      return done();
    }
    const orderDetails = await DB.OrderDetail.find({
      orderId
    }).populate('shop');
    let customer;
    if (order.customerId) {
      customer = await DB.User.findOne({
        _id: order.customerId
      });
    }
    if (!customer) {
      customer = {
        name: order.fullName || `${order.firstName} ${order.lastName}`,
        email: order.email
      };
    }

    const linkOrder = url.resolve(process.env.userWebUrl, `invoices/tracking/${order.trackingCode}`);
    await Service.Mailer.send('order/order-summary-customer.html', order.email || customer.email, {
      subject: `New order #${order.trackingCode}`,
      order: order.toObject(),
      orderDetails: orderDetails.map((o) => {
        const oData = o.toObject();
        oData.shop = o.shop;
        const orderLinkShop = url.resolve(process.env.userWebUrl, `invoices/tracking/${order.trackingCode}?shopId=${o.shop._id}`);
        oData.qrLinkShop = `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(orderLinkShop)}&chld=L|1&choe=UTF-8`;
        return oData;
      }),
      customer,
      qrSummary: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(linkOrder)}&chld=L|1&choe=UTF-8`,
      orderLink: order.customerId ? url.resolve(process.env.userWebUrl, `orders/view/${order._id}`) : ''
    });
    // ! Send each suborder to shop
    /* await Promise.all(orderDetails
      .filter(o => o.shop)
      .map(orderDetail => Service.Mailer.send('order/order-summary-shop.html', orderDetail.shop.email, {
        subject: `New order #${orderDetail.trackingCode}`,
        orderDetail: orderDetail.toObject(),
        customer,
        orderLink: url.resolve(process.env.sellerWebUrl, `orders/view/${orderDetail._id}`)
      }))); */
    // ! =========================
    // group order details by shop
    const combineOrders = {};
    orderDetails.forEach((orderDetail) => {
      if (!combineOrders[orderDetail.shopId.toString()]) {
        combineOrders[orderDetail.shopId.toString()] = {
          orders: [],
          shop: orderDetail.shop
        };
      }
      // const item = orderDetail.toObject();
      // item.orderLink = url.resolve(process.env.sellerWebUrl, `orders/view/${orderDetail._id}`);
      combineOrders[orderDetail.shopId.toString()].orders.push(orderDetail);
    });
    for (const key in combineOrders) {
      const item = combineOrders[key];
      await Service.Mailer.send('order/order-summary-combine-shop.html', item.shop.email, {
        subject: 'New order',
        orderDetails: item.orders,
        trackingCode: order.trackingCode,
        customer,
        shopName: item.shop.name
      });
    }
    await Promise.all(orderDetails
      .filter(o => o.deliveryCompanyInfo)
      .map(orderDetail => Service.Mailer.send('order/order-summary-delivery-company.html', orderDetail.deliveryCompanyInfo.email, {
        subject: `New order #${orderDetail.trackingCode}`,
        orderDetail: orderDetail.toObject(),
        customer,
        orderLink: url.resolve(process.env.DELIVERY_WEB_URL, `orders/view/${orderDetail._id}`)
      })));

    return done();
  } catch (e) {
    await Service.Logger.create({
      level: 'error',
      path: 'send-order-email-summary-queue',
      error: e
    });
    return done();
  }
});

exports.sendEmailSummary = async (orderId) => {
  try {
    return orderQ.createJob({
      action: 'sendMailSummary',
      orderId
    }).save();
  } catch (e) {
    throw e;
  }
};

exports.getPdfInvoiceStream = async (orderDetailId, forShop) => {
  try {
    const order = orderDetailId instanceof DB.OrderDetail ? orderDetailId : await DB.OrderDetail.findOne({
      _id: orderDetailId
    });
    if (!order) {
      throw new Error('Order not found');
    }

    const template = forShop ? 'order/invoice-shop.html' : 'order/invoice-customer.html';
    const orderLinkUser = url.resolve(process.env.userWebUrl, `invoices/detail/${order.trackingCode}`);
    const orderLinkShop = url.resolve(process.env.sellerWebUrl, `invoices/detail/${order.trackingCode}`);
    return Service.Pdf.toStreamFromTemplate(template, {
      orderDetail: order.toObject(),
      qrLinkUser: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(orderLinkUser)}&chld=L|1&choe=UTF-8`,
      qrLinkShop: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(orderLinkShop)}&chld=L|1&choe=UTF-8`,
    });
  } catch (e) {
    throw e;
  }
};

exports.addLog = async (options) => {
  try {
    // TODO - check me
    return DB.OrderLog.create(options);
  } catch (e) {
    throw e;
  }
};

exports.getOrderLogHistory = async (options) => {
  try {
    const query = options;
    const logs = await DB.OrderLog.find(query).sort({
      createdAt: 1
    });
    const userIds = logs.filter(item => [null, undefined].indexOf(item.changedBy) === -1).map(item => item.changedBy);
    const results = logs.map(log => log.toObject());
    if (userIds.length) {
      const users = await DB.User.find({
        _id: {
          $in: userIds
        }
      })
        .select('_id name firstName lastName type')
        .exec();
      results.filter(item => [null, undefined].indexOf(item.changedBy) === -1).forEach((item) => {
        item.changedBy = users.find(u => u._id.toString() === item.changedBy.toString());
      });
    }
    return results;
  } catch (e) {
    throw e;
  }
};

exports.getSaleStats = async (options) => {
  try {
    const query = {
      $or: [{
        paymentStatus: 'paid',
        paymentMethod: { $ne: 'cod' }
      }, {
        paymentMethod: 'cod'
      }],
      status: 'completed',
      shopId: options.shopId
    };
    if (options.startDate) {
      query.createdAt = {
        $gte: moment(options.startDate).toDate()
      };
    }
    if (options.toDate) {
      if (query.createdAt) {
        query.createdAt.$lte = moment(options.toDate).toDate();
      } else {
        query.createdAt = {
          $lte: moment(options.toDate).toDate()
        };
      }
    }
    const data = await DB.OrderDetail.aggregate([{
      $match: query
    }, {
      $group: {
        _id: null,
        balance: { $sum: '$balance' },
        commission: { $sum: '$commission' },
        totalPrice: { $sum: '$totalPrice' },
        taxPrice: { $sum: '$taxPrice' },
        totalProduct: { $sum: '$quantity' },
        totalOrder: { $sum: 1 }
      }
    }]);
    const result = {
      balance: 0,
      commission: 0,
      totalPrice: 0,
      taxPrice: 0,
      totalProduct: 0,
      totalOrder: 0
    };
    if (data && data.length) {
      result.balance = data[0].balance;
      result.commission = data[0].commission;
      result.totalPrice = data[0].totalPrice;
      result.taxPrice = data[0].taxPrice;
      result.totalProduct = data[0].totalProduct;
      result.totalOrder = data[0].totalOrder;
    }

    return result;
  } catch (e) {
    throw e;
  }
};
