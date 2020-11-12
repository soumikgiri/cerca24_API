const Joi = require('joi');
const passport = require('passport');

const signToken = require('../auth.service').signToken;

exports.login = async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      const error = err || info;
      if (error) {
        return next(error);
      }
      if (!user) {
        return next(PopulateResponse.notFound());
      }

      // if shop is deactivated, disable login!
      if (req.headers.platform === 'seller') {
        if (!user.isShop || !user.shopId) {
          return next(PopulateResponse.error({
            message: "Your account hasn't regsistered for shop!"
          }));
        }
        // const allowShop = await DB.Shop.count({
        //   _id: user.shopId,
        //   activated: true
        // });
        // if (!allowShop) {
        //   return next(PopulateResponse.error({
        //     message: 'Shop is deactivated!'
        //   }));
        // }
      }

      const expireTokenDuration = 60 * 60 * 24 * 7; // 7 days
      const now = new Date();
      const expiredAt = new Date(now.getTime() + (expireTokenDuration * 1000));
      const token = signToken(user._id, user.role, expireTokenDuration);

      res.locals.login = {
        token,
        expiredAt
      };

      return next();
    } catch (e) {
      return next(e);
    }
  })(req, res, next);
};

exports.companyLogin = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    const company = await DB.Company.findOne({ email: validate.value.email.toLowerCase() });
    if (!company) {
      return next(PopulateResponse.error({
        message: 'Invalid account.'
      }, 'ERR_USER_NOT_FOUND', 400, 400));
    }
    if (!company.authenticate(validate.value.password)) {
      return next(PopulateResponse.error({
        message: 'Password is incorrect.'
      }, 'ERR_PASSWORD_IS_INCORRECT', 400, 400));
    }
    if (!company.verified) {
      return next(PopulateResponse.error({
        message: 'We are verifing your account, please wait!'
      }, 'ERR_USER_NOT_FOUND', 400, 400));
    }
    if (!company.activated) {
      return next(PopulateResponse.error({
        message: 'Your account has been deactivated, please contact admin for more details!'
      }, 'ERR_USER_NOT_FOUND', 400, 400));
    }

    const expireTokenDuration = 60 * 60 * 24 * 7; // 7 days
    const now = new Date();
    const expiredAt = new Date(now.getTime() + (expireTokenDuration * 1000));
    const token = signToken(company._id, 'company', expireTokenDuration);

    res.locals.login = {
      token,
      expiredAt
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.driverLogin = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    const driver = await DB.Driver.findOne({ email: validate.value.email.toLowerCase() });
    if (!driver) {
      return next(PopulateResponse.error({
        message: 'Invalid account.'
      }, 'ERR_USER_NOT_FOUND', 400, 400));
    }
    if (!driver.authenticate(validate.value.password)) {
      return next(PopulateResponse.error({
        message: 'Password is incorrect.'
      }, 'ERR_PASSWORD_IS_INCORRECT', 400, 400));
    }

    if (!driver.activated) {
      return next(PopulateResponse.error({
        message: 'Your account has been deactivated, please contact admin for more details!'
      }, 'ERR_USER_NOT_FOUND', 400, 400));
    }

    const expireTokenDuration = 60 * 60 * 24 * 7; // 7 days
    const now = new Date();
    const expiredAt = new Date(now.getTime() + (expireTokenDuration * 1000));
    const token = signToken(driver._id, 'driver', expireTokenDuration);

    res.locals.login = {
      token,
      expiredAt
    };
    return next();
  } catch (e) {
    return next(e);
  }
};
