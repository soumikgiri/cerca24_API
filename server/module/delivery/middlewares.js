const jwt = require('jsonwebtoken');

function getDecoded(req) {
  let token;
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'access_token')) {
    token = req.query.access_token;
    req.headers.authorization = `Bearer ${req.query.access_token}`;
    token = req.query.access_token;
  } else if (!req.headers.authorization) {
    return null;
  } else {
    const tokenSplit = req.headers.authorization.split(' ');
    if (tokenSplit.length !== 2) {
      return null;
    }

    token = tokenSplit[1];
  }

  try {
    return jwt.verify(token, process.env.SESSION_SECRET);
  } catch (e) {
    return null;
  }
}

exports.isCompany = async (req, res, next) => {
  try {
    // check if admin or company, return
    const decoded = getDecoded(req);
    if (!decoded) {
      return next(PopulateResponse.unauthenticated());
    }

    if (decoded.role === 'company') {
      const company = await DB.Company.findOne({
        _id: decoded._id
      });
      if (!company) {
        return next(PopulateResponse.unauthenticated());
      }
      // TODO - check activated, check verified and show error

      req.company = company;
      req.user = company;

      return next();
    }

    // check if is not admin user, throw 403
    const user = await DB.User.findOne({
      _id: decoded._id,
      isActive: true
    });
    if (!user || user.role !== 'admin') {
      return next(PopulateResponse.unauthenticated());
    }

    req.user = user;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.isDriver = async (req, res, next) => {
  try {
    // check if admin or company, return
    const decoded = getDecoded(req);
    if (!decoded || decoded.role !== 'driver') {
      return next(PopulateResponse.unauthenticated());
    }

    const driver = await DB.Driver.findOne({
      _id: decoded._id
    });
    if (!driver) {
      return next(PopulateResponse.unauthenticated());
    }
    // TODO - check activated, check verified and show error

    req.driver = driver;
    req.user = driver;

    return next();
  } catch (e) {
    return next(e);
  }
};
