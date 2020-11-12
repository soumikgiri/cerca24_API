const Joi = require('joi');
const Csv = require('json2csv').Transform;
const Readable = require('stream').Readable;
const moment = require('moment');

exports.create = async (req, res, next) => {
  try {
    const validateSchema = Joi.object().keys({
      content: Joi.string().required()
    });
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const complain = await Service.Complain.create(req.user._id, validate.value);
    res.locals.create = complain;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(0, req.query.page - 1) || 0;
    const take = parseInt(req.query.take, 10) || 10;
    const query = Helper.App.populateDbQuery(req.query, {
      equal: ['status']
    });
    // TODO - define query

    if (req.query.startDate) {
      query.createdAt = {
        $gte: moment(req.query.startDate).toDate()
      };
    }

    if (req.query.toDate) {
      query.createdAt = {
        $lte: moment(req.query.toDate).toDate()
      };
    }

    const sort = Helper.App.populateDBSort(req.query);
    const count = await DB.Complain.count(query);
    const items = await DB.Complain.find(query)
      .populate('user')
      .sort(sort)
      .skip(page * take)
      .limit(take)
      .exec();

    res.locals.list = {
      count,
      items: items.map((item) => {
        const data = item.toObject();
        if (item.user) {
          data.user = item.user.getPublicProfile();
        }
        return data;
      })
    };
    next();
  } catch (e) {
    next(e);
  }
};

exports.findOne = async (req, res, next) => {
  try {
    const complain = await DB.Complain.findOne({
      _id: req.params.complainId
    })
      .populate('user');
    if (!complain) {
      return res.status(404).send(PopulateResponse.notFound());
    }

    const data = complain.toObject();
    if (complain.user) {
      data.user = complain.user.getPublicProfile();
    }

    req.complain = complain;
    res.locals.complain = complain;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await DB.Complain.remove({
      _id: req.params.complainId
    });
    res.locals.remove = {
      success: true
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const validateSchema = Joi.object().keys({
      content: Joi.string().optional(),
      note: Joi.string().optional(),
      status: Joi.string().valid(['pending', 'rejected', 'resolved']).optional()
    });
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const complain = await Service.Complain.update(req.params.complainId, validate.value);
    res.locals.update = complain;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.toCsv = async (req, res, next) => {
  try {
    const query = Helper.App.populateDbQuery(req.query, {
      equal: ['status']
    });
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
    const sort = Helper.App.populateDBSort(req.query);
    const csvData = await DB.Complain.find(query)
      .populate('user')
      .sort(sort)
      .exec();


    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${req.query.fileName || 'complaints'}.csv`);
    const readStream = new Readable();
    const stringData = JSON.stringify(csvData);
    const json2csv = new Csv({
      fields: [{
        label: 'User',
        value: 'user.name'
      }, {
        label: 'User type',
        value: row => (row.user.isShop ? 'Seller' : 'User')
      }, {
        label: 'Content',
        value: 'content'
      }, {
        label: 'Status',
        value: 'status'
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
    next(e);
  }
};
