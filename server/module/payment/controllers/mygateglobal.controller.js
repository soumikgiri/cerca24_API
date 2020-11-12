exports.callback = async (req, res, next) => {
  try {
    if (!req.query.t) {
      res.locals.callback = {
        message: 'Request is invalid'
      };
      return next();
    }

    const transaction = await Service.Payment.updateMyGateGlobalTransaction(req.query.t, req.body);
    if (req.query.result === 'success' && transaction.meta && transaction.meta.redirectSuccessUrl) {
      let redirectSuccessUrl = transaction.meta.redirectSuccessUrl;
      if (transaction.type === 'order' && transaction.itemId) {
        const order = await DB.Order.findOne({
          _id: transaction.itemId
        });
        if (order) {
          redirectSuccessUrl = Helper.String.updateQueryStringParameter(transaction.meta.redirectSuccessUrl, 'trackingCode', order.trackingCode);
        }
      }
      return res.redirect(redirectSuccessUrl);
    } else if (req.query.result === 'failed' && transaction.meta && transaction.meta.redirectCancelUrl) {
      return res.redirect(transaction.meta.redirectCancelUrl);
    }
    // TODO - validate me
    res.locals.callback = {
      success: true
    };
    return next();
  } catch (e) {
    return next(e);
  }
};
