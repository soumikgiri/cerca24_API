/* eslint no-restricted-syntax: 0, guard-for-in: 0 */
const crypto = require('crypto');
const moment = require('moment');
const url = require('url');

const redirectUrl = url.resolve(process.env.baseUrl, '/v1/redirect');

exports.sign = async (transaction) => {
  try {
    // TODO - get billing address and more information
    // override_custom_cancel_page
    // override_custom_receipt_page

    const signFieldsName = [
      'access_key', 'profile_id', 'transaction_uuid', 'signed_field_names',
      'unsigned_field_names', 'signed_date_time,locale', 'transaction_type', 'reference_number',
      'amount', 'currency', 'bill_to_address_line1', 'bill_to_address_city', 'bill_to_address_country',
      'bill_to_email', 'bill_to_surname', 'bill_to_forename'
    ];
    if (transaction.meta) {
      if (transaction.meta.redirectSuccessUrl) {
        signFieldsName.push('override_custom_receipt_page');
      }

      if (transaction.meta.redirectCancelUrl) {
        signFieldsName.push('override_custom_cancel_page');
      }
    }

    const params = {
      access_key: process.env.CYBERSOURCE_ACCESS_KEY,
      profile_id: process.env.CYBERCOURCE_PROFILE_ID,
      transaction_uuid: transaction._id.toString(),
      signed_field_names: signFieldsName.join(','),
      unsigned_field_names: '',
      signed_date_time: moment().utc().format(),
      locale: 'en',
      transaction_type: 'sale',
      reference_number: transaction.description,
      amount: transaction.price.toFixed(2),
      currency: 'ZMW', // transaction.currency.toUpperCase()
      bill_to_address_line1: '',
      bill_to_address_city: '',
      bill_to_address_country: 'ZM',
      bill_to_email: '',
      bill_to_surname: '',
      bill_to_forename: ''
    };

    if (transaction.type === 'order') {
      const order = await DB.Order.findOne({ _id: transaction.itemId });
      if (!order) {
        throw new Error('Order not found!');
      }
      params.bill_to_address_line1 = order.streetAddress;
      params.bill_to_address_city = order.city;
      params.bill_to_email = order.email;
      params.bill_to_surname = order.lastName || '';
      params.bill_to_forename = order.firstName || '';

      if (signFieldsName.indexOf('override_custom_receipt_page') > -1) {
        params.override_custom_receipt_page = `${redirectUrl}?url=${Helper.String.updateQueryStringParameter(transaction.meta.redirectSuccessUrl, 'trackingCode', order.trackingCode)}`;
      }
      if (signFieldsName.indexOf('override_custom_cancel_page') > -1) {
        params.override_custom_cancel_page = `${redirectUrl}?url=${transaction.meta.redirectCancelUrl}`;
      }
    } else if (transaction.type === 'shop_featured') {
      const user = await DB.User.findOne({ _id: transaction.userId });
      if (!user) {
        throw new Error('User not found!');
      }
      params.bill_to_address_line1 = user.address;
      params.bill_to_address_city = ''; // TODO - check me
      params.bill_to_email = user.email;
      params.bill_to_surname = user.lastName || user.name;
      params.bill_to_forename = user.firstName || '';

      if (signFieldsName.indexOf('override_custom_receipt_page') > -1) {
        params.override_custom_receipt_page = `${redirectUrl}?url=${transaction.meta.redirectSuccessUrl}`;
      }
      if (signFieldsName.indexOf('override_custom_cancel_page') > -1) {
        params.override_custom_cancel_page = `${redirectUrl}?url=${transaction.meta.redirectCancelUrl}`;
      }
    }

    const signData = [];
    for (const k in params) {
      signData.push(`${k}=${params[k]}`);
    }
    const str = signData.join(',');
    const signature = crypto.createHmac('sha256', process.env.CYBERCOURCE_SECRET_KEY)
      .update(str)
      .digest('base64');
    return {
      url: process.env.CYBERCOURCE_MODE === 'sandbox' ?
        'https://testsecureacceptance.cybersource.com/pay' : 'https://secureacceptance.cybersource.com/pay',
      data: Object.assign(params, {
        signature
      })
    };
  } catch (e) {
    throw e;
  }
};

exports.validData = (data) => {
  try {
    if (!data.signed_field_names || !data.signature) {
      throw new Error('Invalid data');
    }
    const fileds = data.signed_field_names.split(',');
    const signData = [];
    fileds.forEach(field => signData.push(`${field}=${data[field]}`));
    const str = signData.join(',');
    const signature = crypto.createHmac('sha256', process.env.CYBERCOURCE_SECRET_KEY)
      .update(str)
      .digest('base64');
    return signature === data.signature;
  } catch (e) {
    throw e;
  }
};
