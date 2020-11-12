/* eslint no-restricted-syntax: 0, guard-for-in: 0 */
const request = require('request');
const url = require('url');

// use for Manila redirect
exports.getRedirectLinks = async (transaction) => {
  try {
    const data = {
      return_url: process.env.userWebUrl,
      cancel_url: process.env.userWebUrl,
      order_id: transaction._id,
      description: transaction.description,
      services: {
        mobile_money: true,
        cards: true,
        bank: true
      },
      currency: transaction.currency, // 'ZMW'
      amount: transaction.price,
      items: (transaction.products || []).map(product => ({
        name: product.description,
        quantity: product.quantity,
        description: product.description,
        amount: product.price
      }))
    };
    if (transaction.meta) {
      if (transaction.meta.redirectSuccessUrl) {
        data.return_url = transaction.meta.redirectSuccessUrl;
      }

      if (transaction.meta.redirectCancelUrl) {
        data.cancel_url = transaction.meta.redirectCancelUrl;
      }
    }

    if (transaction.type === 'order') {
      const order = await DB.Order.findOne({ _id: transaction.itemId });
      if (!order) {
        throw new Error('Order not found!');
      }
      data.cust_address = order.streetAddress;
      data.cust_city = order.city;
      data.cust_email = order.email;
      data.cust_lastname = order.lastName || '';
      data.cust_firstname = order.firstName || '';
      data.return_url = Helper.String.updateQueryStringParameter(data.return_url, 'trackingCode', order.trackingCode);
    } else if (transaction.type === 'shop_featured') {
      const user = await DB.User.findOne({ _id: transaction.userId });
      if (!user) {
        throw new Error('User not found!');
      }
      data.cust_address = user.address;
      data.cust_city = ''; // TODO - check me
      data.cust_email = user.email;
      data.cust_lastname = user.lastName || user.name;
      data.cust_firstname = user.firstName || '';
    }

    const options = {
      uri: 'https://manilla.nsano.com/checkout/payment',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MTN_MERCHANT_ID}`
      },
      json: data
    };

    return new Promise((resolve, reject) => request(options, (error, response, body) => {
      if (!error && response.statusCode !== 200) {
        return reject(error || body);
      }

      if (body.status !== '00') {
        return reject(body);
      }

      return resolve(body.data.links);
    }));
  } catch (e) {
    throw e;
  }
};

// use for Manila redirect
exports.verify = async (transactionId) => {
  try {
    const options = {
      uri: 'https://manilla.nsano.com/checkout/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MTN_MERCHANT_ID}`
      },
      json: {
        order_id: transactionId,
        merchant_apiKey: process.env.MTN_MERCHANT_API_KEY
      }
    };

    return new Promise((resolve, reject) => request(options, (err, response, body) => {
      if (err) {
        return reject(err);
      }
      // TODO - remove me
      // check here for response data only
      return resolve(body);
    }));
  } catch (e) {
    throw e;
  }
};

exports.sendRequest = async (transaction) => {
  try {
    const baseEndpoint = process.env.MTN_MODE === 'sandbox' ? 'https://sandbox.nsano.com:7003' : 'https://fs1.nsano.com:4001';
    return new Promise((resolve, reject) => request.post({
      url: url.resolve(baseEndpoint, `/api/fusion/tp/${process.env.MTN_API_KEY}`),
      form: {
        kuwaita: 'malipo', // mikopo == Credit      malipo == Debit
        amount: transaction.price,
        mno: 'MTNZM',
        refID: transaction._id.toString(),
        msisdn: transaction.phoneNumber // phone number as discussed
      },
      rejectUnauthorized: false
    }, async (error, response, body) => {
      await Service.Logger.create({
        path: 'mtn',
        body: {
          request: {
            kuwaita: 'malipo',
            amount: transaction.price,
            mno: 'MTNZM',
            refID: transaction._id.toString(),
            msisdn: transaction.phoneNumber // phone number as discussed
          },
          response: body
        }
      });

      if (!error && response.statusCode !== 200) {
        return reject(error || body);
      }

      let data = body;
      if (!body.code) {
        data = JSON.parse(body);
      }

      if (data.code !== '00') {
        return reject(data);
      }

      return resolve(data);
    }));
  } catch (e) {
    throw e;
  }
};

exports.checkStatus = async (refId) => {
  try {
    const baseEndpoint = process.env.MTN_MODE === 'sandbox' ? 'https://sandbox.nsano.com:7003' : 'https://fs1.nsano.com:4001';
    return new Promise((resolve, reject) => request.get({
      url: url.resolve(baseEndpoint, `/api/fusion/tp/metadata/${refId}/${process.env.MTN_API_KEY}`),
      rejectUnauthorized: false
    }, async (error, response, body) => {
      if (!error && response.statusCode !== 200) {
        return reject(error || body);
      }

      let data = body;
      if (!body.code) {
        data = JSON.parse(body);
      }

      await Service.Logger.create({
        path: 'mtn',
        body: {
          request: refId,
          response: body
        }
      });

      return resolve(data);
    }));
  } catch (e) {
    throw e;
  }
};
