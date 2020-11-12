const Joi = require('joi');

exports.register = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      name: Joi.string().required(),
      email: Joi.string().email().required(), // email of shop, or useremail
      password: Joi.string().min(6).optional(),
      phoneNumber: Joi.string().required(),
      address: Joi.string().required(),
      area: Joi.string().allow(['', null]).optional(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().required(),
      zipcode: Joi.string().allow(['', null]).optional(),
      verificationIssueId: Joi.string().required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    await Service.Company.register(validate.value);
    res.locals.register = {
      success: true
    };
    return next();
  } catch (e) {
    throw e;
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      // TODO - verify about file size, and type
      return next(PopulateResponse.error({
        message: 'Missing file!'
      }, 'ERR_MISSING_FILE'));
    }

    const file = new DB.Media({
      type: 'file',
      systemType: 'company_verification_issue',
      name: req.file.filename,
      mimeType: req.file.mimetype,
      originalPath: req.file.path,
      filePath: req.file.path,
      convertStatus: 'done'
    });
    await file.save();

    res.locals.document = {
      _id: file._id,
      name: req.file.filename
    };
    return next();
  } catch (e) {
    return next(e);
  }
};
