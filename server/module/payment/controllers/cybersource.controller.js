const Cybersource = require('../components/Cybersource');

// we will check hook notification from server - server
// will not allow client to client
exports.callback = async (req, res, next) => {
  try {
    if (!req.body.req_transaction_uuid || !Helper.App.isObjectId(req.body.req_transaction_uuid)) {
      res.locals.callback = {
        message: 'Request is invalid'
      };
      return next();
    }

    if (!Cybersource.validData(req.body)) {
      return next(new Error('Invalid data'));
    }

    await Service.Payment.updateCybersourceTransaction(req.body.req_transaction_uuid, req.body);
    res.locals.callback = { success: true };
    return next();
  } catch (e) {
    return next(e);
  }
};
