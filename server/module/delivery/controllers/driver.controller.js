const _ = require('lodash');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const Image = require('../../media/components/image');

exports.findOne = async (req, res, next) => {
  try {
    const driverId = req.params.driverId || req.driver._id;
    const driver = await DB.Driver.findOne({ _id: driverId }).populate('company');

    if (!driver) {
      return next(PopulateResponse.notFound());
    }

    req.driver = _.omit(driver.toObject(), ['password', 'salt']);
    res.locals.driver = req.driver;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      firstName: Joi.string().allow([null, '']).required(),
      lastName: Joi.string().allow([null, '']).required(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().allow([null, '']).optional(),
      password: Joi.string().allow([null, '']).optional(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      companyId: Joi.string().allow([null, '']).optional(),
      activated: Joi.boolean().allow([null]).optional(),
      emailVerified: Joi.boolean().allow([null]).optional()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    if (req.user.role === 'admin' && !validate.value.companyId) {
      return next(PopulateResponse.error('Company ID is required'));
    }
    const value = validate.value;
    if (!value.companyId) {
      value.companyId = req.company._id;
    }
    const driver = await Service.Driver.create(value);
    res.locals.create = _.omit(driver.toObject(), ['password', 'salt']);
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      firstName: Joi.string().allow([null, '']).optional(),
      lastName: Joi.string().allow([null, '']).optional(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().allow([null, '']).optional(),
      password: Joi.string().allow([null, '']).optional(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      driverId: Joi.string().allow([null, '']).optional(),
      activated: Joi.boolean().allow([null]).optional(),
      emailVerified: Joi.boolean().allow([null]).optional()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const driverId = !req.driver ? req.params.driverId : req.driver._id;
    const value = !req.driver ? _.omit(validate.value, ['verified', 'activated']) : validate.value;
    const driver = await Service.Driver.update(driverId, value);
    res.locals.update = _.omit(driver.toObject(), ['password', 'salt']);
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
      text: ['firstName', 'lastName', 'phoneNumber', 'email'],
      boolean: ['activated', 'emailVerified'],
      equal: ['companyId']
    });
    if (req.user.role !== 'admin') {
      query.companyId = req.company._id;
    }

    const sort = Helper.App.populateDBSort(req.query);
    const count = await DB.Driver.count(query);
    const items = await DB.Driver.find(query)
      .populate('company')
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
exports.updateAvatar = async (req, res, next) => {
  try {
    const user = req.params.driverId ? await DB.Driver.findOne({ _id: req.params.driverId }) : req.user;
    if (!user) {
      return next(PopulateResponse.notFound());
    }

    // create thumb for the avatar
    const thumbPath = await Image.resize({
      input: req.file.path,
      width: process.env.AVATAR_SIZE_WIDTH || 250,
      height: process.env.AVATAR_SIZE_HEIGHT || 250,
      resizeOption: '^'
    });
    const update = {
      avatar: thumbPath
    };

    if (process.env.USE_S3 === 'true') {
      const s3Data = await Service.S3.uploadFile(thumbPath, {
        ACL: 'public-read',
        fileName: `avatars/${Helper.String.getFileName(thumbPath)}`
      });
      update.avatar = s3Data.url;
    }

    await DB.Driver.update({ _id: req.params.driverId || req.user._id }, {
      $set: update
    });

    // unlink old avatar
    if (user.avatar && !Helper.String.isUrl(user.avatar) && fs.existsSync(path.resolve(user.avatar))) {
      fs.unlinkSync(path.resolve(user.avatar));
    }
    // remove tmp file
    if (fs.existsSync(path.resolve(req.file.path))) {
      fs.unlinkSync(path.resolve(req.file.path));
    }

    // TODO - remove old avatar in S3?
    if (process.env.USE_S3 === 'true' && fs.existsSync(path.resolve(thumbPath))) {
      fs.unlinkSync(path.resolve(thumbPath));
    }

    res.locals.updateAvatar = {
      url: DB.User.getAvatarUrl(update.avatar)
    };

    return next();
  } catch (e) {
    return next(e);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      location: Joi.array().items(Joi.number()).min(2).max(2)
        .required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    await Service.Driver.updatePosition(req.user._id, validate.value.location);
    res.locals.updateLocation = { success: true };
    return next();
  } catch (e) {
    return next(e);
  }
};
