const _ = require('lodash');
const Joi = require('joi');

const validateSchema = Joi.object().keys({
  value: Joi.any().required()
});

exports.findOne = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.configId || req.body.configId;
    if (!id) {
      return next(PopulateResponse.validationError());
    }
    const config = await DB.Config.findOne({ _id: id });
    if (!config) {
      return res.status(404).send(PopulateResponse.notFound());
    }

    req.config = config;
    res.locals.config = config;
    return next();
  } catch (e) {
    return next(e);
  }
};


/**
 * do update
 */
exports.update = async (req, res, next) => {
  try {
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    _.assign(req.config, req.body);
    await req.config.save();
    res.locals.update = req.config;
    return next();
  } catch (e) {
    return next();
  }
};

/**
 * get list config
 */
exports.list = async (req, res, next) => {
  try {
    const query = {};
    const count = await DB.Config.count(query);
    const items = await DB.Config.find(query)
      .exec();

    res.locals.configs = {
      count,
      items
    };
    next();
  } catch (e) {
    next();
  }
};

exports.publicConfig = async (req, res, next) => {
  try {
    const items = await DB.Config.find({ public: true }).exec();
    const data = {};
    items.forEach((item) => {
      data[item.key] = item.value;
    });

    const languages = await DB.I18nLanguage.find({ isActive: true });
    const defaultLanguage = languages.filter(lang => lang.isDefault).map(lang => lang.key);
    data.i18n = {
      languages: languages.map(lang => ({
        key: lang.key,
        name: lang.name
      })),
      defaultLanguage: defaultLanguage && defaultLanguage.length ? defaultLanguage[0] : 'en'
    };
    // use fixed currency for all in this case
    data.customerCurrency = process.env.SITE_CURRENCY;
    data.customerRate = 1;
    data.customerCurrencySymbol = 'ZK';

    res.locals.publicConfig = data;
    next();
  } catch (e) {
    next();
  }
};
