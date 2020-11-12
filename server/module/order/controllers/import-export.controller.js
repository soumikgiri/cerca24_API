/* eslint no-restricted-syntax: 0, no-await-in-loop: 0 */
const Csv = require('json2csv').Transform;
const Readable = require('stream').Readable;
const moment = require('moment');

exports.toCsv = async (req, res, next) => {
  try {
    const query = Helper.App.populateDbQuery(req.query, {
      equal: ['status', 'paymentMethod']
    });
    if (req.user.role !== 'admin') {
      query.shopId = req.user.shopId;
    } else if (req.query.shopId) {
      query.shopId = req.query.shopId;
    } else if (req.query.deliveryCompanyId) {
      query.deliveryCompanyId = req.query.deliveryCompanyId;
    }

    if (req.query.startDate) {
      query.createdAt = {
        $gte: moment(req.query.startDate).toDate()
      };
    }
    if (req.query.toDate) {
      if (query.createdAt) {
        query.createdAt.$lte = moment(req.query.toDate).toDate();
      } else {
        query.createdAt = {
          $lte: moment(req.query.toDate).toDate()
        };
      }
    }

    const csvData = await Service.Order.getCsvData(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${req.query.fileName || 'orders'}.csv`);
    const readStream = new Readable();
    const stringData = JSON.stringify(csvData);
    Log.deep(csvData)
    const json2csv = new Csv({
      fields: [{
        label: 'Order number',
        value: row => (row.trackingCode || '')
      }, {
        label: 'Product',
        value: 'productDetails.name'
      }, {
        label: 'Variants',
        value: (row) => {
          if (!row.variantDetails || !row.variantDetails.options || !row.variantDetails.options.length) {
            return '';
          }
          const text = [];
          row.variantDetails.options.forEach(v => text.push(`${(v.displayText || v.key)}: ${v.value}`));
          return text.join('; ');
        }
      }, {
        label: 'Quantity',
        value: row => (row.quantity || 0)
      }, {
        label: 'Unit price',
        value: row => (row.unitPrice || '')
      }, {
        label: 'Total price',
        value: row => (row.totalPrice || '')
      }, {
        label: 'Status',
        value: row => (row.status || '')
      }, {
        label: 'Tax price',
        value: row => (row.taxPrice || 0)
      }, {
        label: 'User note',
        value: row => (row.userNote || '')
      }, {
        label: 'Email',
        value: row => (row.email || '')
      }, {
        label: 'First Name',
        value: row => (row.firstName || '')
      }, {
        label: 'lastName',
        value: row => (row.lastName || '')
      }, {
        label: 'Street',
        value: row => (row.streetAddress | '')
      }, {
        label: 'City',
        value: row => (row.city || '')
      }, {
        label: 'State',
        value: row => (row.state || '')
      }, {
        label: 'Zipcode',
        value: row => (row.zipcode | '')
      }, {
        label: 'Payment method',
        value: (row) => {
          if (row.paymentMethod === 'cod') {
            return 'COD';
          }

          if (row.paymentMethod === 'paypal') {
            return 'Paypal';
          }

          if (row.paymentMethod === 'stripe' || row.paymentMethod === 'mygateglobal' || row.paymentMethod === 'cybersource') {
            return 'CC';
          }

          if (row.paymentMethod === 'mtn') {
            return 'Mobile Money';
          }

          return 'N/A';
        }
      }, {
        label: 'Commission rate',
        value: row => (row.commissionRate || 0)
      }, {
        label: 'Commission',
        value: row => (row.commission || 0)
      }, {
        label: 'Balance',
        value: row => (row.balance || 0)
      }, {
        label: 'User IP',
        value: row => (row.userIP || '')
      }, {
        label: 'Date',
        value: row => moment(row.createdAt).format('DD/MM/YYYY HH:mm')
      }],
      header: true
    }, {
      highWaterMark: 16384,
      encoding: 'utf-8'
    });
    readStream._read = () => {};
    // TODO: Reduce the pace of pushing data here
    readStream.push(stringData);
    readStream.push(null);
    return readStream.pipe(json2csv).pipe(res);
  } catch (e) {
    return next(e);
  }
};

exports.saleStatsCsv = async (req, res, next) => {
  try {
    const shopQuery = Helper.App.populateDbQuery(req.query, {
      text: ['name', 'address', 'city', 'state', 'area', 'zipcode', 'returnAddress', 'email'],
      boolean: ['verified', 'activated', 'featured', 'doCOD'],
      equal: ['ownerId']
    });

    const sort = Helper.App.populateDBSort(req.query);
    if (req.query.shopId) {
      shopQuery._id = req.query.shopId;
    }
    const shops = await DB.Shop.find(shopQuery)
      .collation({
        locale: 'en'
      })
      .populate('owner')
      .sort(sort)
      .exec();
    const results = [];
    for (const shop of shops) {
      const cond = Object.assign({}, req.query, {
        shopId: shop._id
      });
      const data = await Service.Order.getSaleStats(cond);
      data.shop = shop;
      results.push(data);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${req.query.fileName || 'seller-sales'}.csv`);
    const readStream = new Readable();
    const stringData = JSON.stringify(results);
    const json2csv = new Csv({
      fields: [{
        label: 'Shop',
        value: 'shop.name'
      }, {
        label: 'Total Orders',
        value: row => (row.totalOrder || 0)
      }, {
        label: 'Total Products',
        value: row => (row.totalProduct || 0)
      }, {
        label: 'Tax',
        value: row => (row.taxPrice || 0)
      }, {
        label: 'Total Price',
        value: row => (row.totalPrice || 0)
      }, {
        label: 'Service Fee (Include 16% VAT)',
        value: row => (row.commission || 0)
      }, {
        label: 'Pay To Seller',
        value: row => (row.balance || 0)
      }],
      header: true
    }, {
      highWaterMark: 16384,
      encoding: 'utf-8'
    });
    readStream._read = () => {};
    // TODO: Reduce the pace of pushing data here
    readStream.push(stringData);
    readStream.push(null);
    return readStream.pipe(json2csv).pipe(res);
  } catch (e) {
    return next(e);
  }
};