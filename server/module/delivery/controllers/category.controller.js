/* eslint no-param-reassign: 0 */
const Joi = require('joi');

const validateSchema = Joi.object().keys({
  name: Joi.string().required(),
  description: Joi.string().allow([null, '']).optional(),
  ordering: Joi.number().allow([null, '']).optional(),
  parentId: Joi.string().allow([null, '']).optional(),
  companyId: Joi.string().allow([null, '']).optional(),
  mainImage: Joi.string().allow([null, '']).optional().default(null)
});

exports.findOne = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.companyCategoryId || req.body.companyCategoryId;
    const query = {};
    if (Helper.App.isMongoId(id)) {
      query._id = id;
    } else {
      query.alias = id;
    }
    if (!id) {
      return next(PopulateResponse.validationError());
    }
    const companyCategory = await DB.CompanyCategory.findOne(query).populate('mainImage');
    if (!companyCategory) {
      return res.status(404).send(PopulateResponse.notFound());
    }

    req.companyCategory = companyCategory;
    res.locals.companyCategory = companyCategory;
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * Create a new media companyCategory
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
    const companyCategory = new DB.CompanyCategory(data);
    await companyCategory.save();
    res.locals.companyCategory = companyCategory;
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * do update for user profile or admin update
 */
exports.update = async (req, res, next) => {
  try {
    const validate = Joi.validate(req.body, validateSchema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    Object.assign(req.companyCategory, validate.value);

    await req.companyCategory.save();
    res.locals.update = req.companyCategory;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // allow to delete if have no sub category and product
    const subChildCount = await DB.CompanyCategory.count({ parentId: req.companyCategory._id });
    if (subChildCount) {
      return next(PopulateResponse.error(null, 'Please delete sub categories first.'));
    }

    await req.companyCategory.remove();

    res.locals.remove = {
      message: 'Category is deleted'
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

/**
 * get list companyCategory
 */
exports.list = async (req, res, next) => {
  const page = Math.max(0, req.query.page - 1) || 0; // using a zero-based page index for use with skip()
  const take = parseInt(req.query.take, 10) || 10;

  try {
    const query = Helper.App.populateDbQuery(req.query, {
      text: ['name']
    });

    if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const sort = Helper.App.populateDBSort(req.query);
    const count = await DB.CompanyCategory.count(query);
    const items = await DB.CompanyCategory.find(query)
      .collation({ locale: 'en' })
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

exports.tree = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.company._id;
    const categories = await DB.CompanyCategory.find({ companyId })
      .sort({ ordering: -1 });
    const tree = Helper.Utils.unflatten(categories.map(c => c.toJSON()));

    res.locals.tree = tree;
    next();
  } catch (e) {
    next(e);
  }
};

