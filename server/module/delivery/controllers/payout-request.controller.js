const Joi = require('joi');

exports.request = async (req, res, next) => {
  try {
    const validateSchema = Joi.object().keys({
      payoutAccountId: Joi.string().required()
    });
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const payoutAccount = await DB.DeliveryPayoutAccount.findOne({
      _id: req.body.payoutAccountId
    });
    if (!payoutAccount) {
      return next(PopulateResponse.notFound());
    }

    const data = await Service.DeliveryPayoutRequest.sendRequest(req.company._id, payoutAccount);
    res.locals.request = data;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const validateSchema = Joi.object().keys({
      rejectReason: Joi.string().allow([null, '']).optional(),
      note: Joi.string().allow([null, '']).optional()
    });
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    await Service.DeliveryPayoutRequest.rejectRequest(req.params.requestId, validate.value);
    res.locals.reject = { success: true };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const validateSchema = Joi.object().keys({
      note: Joi.string().allow([null, '']).optional()
    });
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    await Service.DeliveryPayoutRequest.approveRequest(req.params.requestId, validate.value);
    res.locals.approve = { success: true };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(0, req.query.page - 1) || 0; // using a zero-based page index for use with skip()
    const take = parseInt(req.query.take, 10) || 10;
    const query = Helper.App.populateDbQuery(req.query, {
      equal: ['type', 'companyId', 'status'],
      text: ['code']
    });
    const sort = Helper.App.populateDBSort(req.query);

    if (req.user.role !== 'admin') {
      query.companyId = req.company._id;
    }

    const count = await DB.DeliveryPayoutRequest.count(query);
    const items = await DB.DeliveryPayoutRequest.find(query)
      .populate('company')
      .collation({ locale: 'en' })
      .sort(sort)
      .skip(page * take)
      .limit(take)
      .exec();
    res.locals.list = {
      count,
      items
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.findOne = async (req, res, next) => {
  try {
    const payoutRequest = await DB.DeliveryPayoutRequest.findOne({ _id: req.params.requestId }).populate('company');
    if (!payoutRequest) {
      return next(PopulateResponse.notFound());
    }
    if (req.user.role !== 'admin' && payoutRequest.companyId.toString() !== req.company._id.toString()) {
      return next(PopulateResponse.forbbiden());
    }

    const data = payoutRequest.toObject();
    data.items = await Service.DeliveryPayoutRequest.getItemDetails(payoutRequest._id);
    // load details order of this item
    res.locals.payoutRequest = data;
    return next();
  } catch (e) {
    return next();
  }
};
