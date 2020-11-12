/* eslint no-param-reassign: 0 */
const Joi = require('joi');

const validateSchema = Joi.object().keys({
  name: Joi.string().required(),
  city: Joi.string().required(),
  areas: Joi.array().items(Joi.string()).allow([null, '']).optional(),
  companyId: Joi.string().allow([null, '']).optional(),
  deliveryPrice: Joi.number().min(0).required()
});

exports.findOne = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.deliveryZoneId || req.body.deliveryZoneId;
    const query = {};
    if (Helper.App.isMongoId(id)) {
      query._id = id;
    }
    if (!id) {
      return next(PopulateResponse.validationError());
    }
    const deliveryZone = await DB.DeliveryZone.findOne(query);
    if (!deliveryZone) {
      return res.status(404).send(PopulateResponse.notFound());
    }

    req.deliveryZone = deliveryZone;
    res.locals.deliveryZone = deliveryZone;
    return next();
  } catch (e) {
    return next(e);
  }
};

// find zone by city/area
exports.findOneByArea = async (req, res, next) => {
  try {
    const query = Helper.App.populateDbQuery(req.query, {
      text: ['city']
    });
    query.companyId = req.params.companyId;

    const count = await DB.DeliveryZone.count(query);
    const items = await DB.DeliveryZone.find(query).collation({
      locale: 'en'
    });

    res.locals.list = {
      count,
      items
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * Create a new zone base on city & delivery company
 */
exports.create = async (req, res, next) => {
  try {
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const data = validate.value;
    if (req.user.role !== 'admin') {
      data.companyId = req.company._id;
    }
    const deliveryZone = new DB.DeliveryZone(data);
    await deliveryZone.save();
    res.locals.deliveryZone = deliveryZone;
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * do update zone
 */
exports.update = async (req, res, next) => {
  try {
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    Object.assign(req.deliveryZone, validate.value);

    await req.deliveryZone.save();
    res.locals.update = req.deliveryZone;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && !req.company) {
      return next(PopulateResponse.forbidden());
    }
    await req.deliveryZone.remove();
    res.locals.remove = {
      message: 'Success'
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * get list delivery zones
 */
exports.list = async (req, res, next) => {
  const page = Math.max(0, req.query.page - 1) || 0; // using a zero-based page index for use with skip()
  const take = parseInt(req.query.take, 10) || 10;

  try {
    const query = Helper.App.populateDbQuery(req.query, {
      text: ['name', 'city'],
      equal: ['companyId']
    });

    if (!req.query.companyId && req.company) {
      query.companyId = req.company._id;
    }

    const sort = Helper.App.populateDBSort(req.query);
    const count = await DB.DeliveryZone.count(query);
    const items = await DB.DeliveryZone.find(query)
      .collation({
        locale: 'en'
      })
      .sort(sort)
      .skip(page * take)
      .limit(take)
      .exec();

    res.locals.list = {
      count,
      items
    };
    next();
  } catch (e) {
    next(e);
  }
};
