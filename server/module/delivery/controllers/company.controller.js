const _ = require('lodash');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const Image = require('../../media/components/image');

exports.findOne = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.company._id;
    const company = await DB.Company.findOne({
      _id: companyId
    }).populate('verificationDocument');

    if (!company) {
      return next(PopulateResponse.notFound());
    }

    req.company = _.omit(company.toObject(), ['password', 'salt']);
    res.locals.company = req.company;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      name: Joi.string().allow([null, '']).optional(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().allow([null, '']).optional(),
      password: Joi.string().allow([null, '']).optional(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      verificationIssueId: Joi.string().allow([null]).optional(),
      logoId: Joi.string().allow([null, '']).optional(),
      activated: Joi.boolean().allow([null]).optional(),
      emailVerified: Joi.boolean().allow([null]).optional(),
      verified: Joi.boolean().allow([null]).optional(),
      siteCommission: Joi.number().allow([null]).optional(),
      deliveryPrice: Joi.number().allow([null]).optional()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    // user is company
    const companyId = req.user && req.user.role === 'admin' ? req.params.companyId : req.company._id;
    const value = req.user.role !== 'admin' ? _.omit(validate.value, ['verified', 'activated', 'siteCommission', 'deliveryPrice']) : validate.value;
    const company = await Service.Company.update(companyId, value);
    res.locals.update = _.omit(company.toObject(), ['password', 'salt']);
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      name: Joi.string().allow([null, '']).required(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().allow([null, '']).optional(),
      password: Joi.string().allow([null, '']).optional(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      verificationIssueId: Joi.string().allow([null]).optional(),
      logoId: Joi.string().allow([null, '']).optional(),
      activated: Joi.boolean().allow([null]).optional(),
      emailVerified: Joi.boolean().allow([null]).optional(),
      verified: Joi.boolean().allow([null]).optional()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const company = await Service.Company.create(validate.value);
    res.locals.create = _.omit(company.toObject(), ['password', 'salt']);
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
      text: ['name', 'phoneNumber', 'email'],
      boolean: ['activated', 'emailVerified', 'verified']
    });

    const sort = Helper.App.populateDBSort(req.query);
    const count = await DB.Company.count(query);
    const items = await DB.Company.find(query)
      .populate('verificationDocument')
      .collation({
        locale: 'en'
      })
      .sort(sort)
      .skip(page * take)
      .limit(take)
      .exec();

    res.locals.list = {
      count,
      items: items.map(item => _.omit(item.toObject(), ['password', 'salt']))
    };
    next();
  } catch (e) {
    next(e);
  }
};


/**
 * update driver avatar
 */
exports.updateLogo = async (req, res, next) => {
  try {
    const company = req.params.companyId ? await DB.Company.findOne({ _id: req.params.companyId }) : req.company;
    if (!company) {
      return next(PopulateResponse.notFound());
    }

    // create thumb for the avatar
    const thumbPath = await Image.resize({
      input: req.file.path,
      width: process.env.COMPANY_LOGO_SIZE_WIDTH || 250,
      height: process.env.COMPANY_LOGO_SIZE_HEIGHT || 250,
      resizeOption: '^'
    });
    const update = {
      logo: thumbPath
    };

    if (process.env.USE_S3 === 'true') {
      const s3Data = await Service.S3.uploadFile(thumbPath, {
        ACL: 'public-read',
        fileName: `logo/${Helper.String.getFileName(thumbPath)}`
      });
      update.logo = s3Data.url;
    }

    await DB.Company.update({ _id: company._id }, {
      $set: update
    });

    // unlink old avatar
    if (company.logo && !Helper.String.isUrl(company.logo) && fs.existsSync(path.resolve(company.logo))) {
      fs.unlinkSync(path.resolve(company.logo));
    }
    // remove tmp file
    if (fs.existsSync(path.resolve(req.file.path))) {
      fs.unlinkSync(path.resolve(req.file.path));
    }

    // TODO - remove old avatar in S3?
    if (process.env.USE_S3 === 'true' && fs.existsSync(path.resolve(thumbPath))) {
      fs.unlinkSync(path.resolve(thumbPath));
    }

    res.locals.updateLogo = {
      url: DB.User.getAvatarUrl(update.logo)
    };

    return next();
  } catch (e) {
    return next(e);
  }
};

// public delivery companies, user can select in the frontend side
exports.deliveryCompanies = async (req, res, next) => {
  try {
    const query = {
      type: 'delivery',
      activated: true,
      verified: true
    };
    const count = await DB.Company.count(query);
    const items = await DB.Company.find(query)
      .collation({
        locale: 'en'
      })
      .exec();

    res.locals.list = {
      count,
      items: items.map(item => ({
        _id: item._id,
        name: item.name,
        logoUrl: item.logoUrl,
        deliveryPrice: item.deliveryPrice,
        address: item.address
      }))
    };
    return next();
  } catch (e) {
    return next(e);
  }
};
