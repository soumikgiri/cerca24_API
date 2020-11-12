const Csv = require('json2csv').Transform;
const Readable = require('stream').Readable;
const moment = require('moment');

exports.toCsv = async (req, res, next) => {
  try {
    const query = Helper.App.populateDbQuery(req.query);
    if (req.user.role !== 'admin') {
      return next();
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

    const csvData = await Service.Order.getRefundCsvData(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${req.query.fileName || 'refund'}.csv`);
    const readStream = new Readable();
    const stringData = JSON.stringify(csvData);
    const json2csv = new Csv({
      fields: [{
        label: 'Order number',
        value: 'orderDetail.trackingCode'
      }, {
        label: 'Product name',
        value: 'orderDetail.productDetails.name'
      }, {
        label: 'Reason',
        value: row => (row.reason || '')
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