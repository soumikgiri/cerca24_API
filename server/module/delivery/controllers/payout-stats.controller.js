exports.balance = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.company._id;
    const data = await Service.DeliveryPayoutRequest.calculateCurrentBalance(companyId);
    res.locals.balance = data;
    next();
  } catch (e) {
    next(e);
  }
};

exports.stats = async (req, res, next) => {
  try {
    const options = req.query;
    if (req.user.role !== 'admin') {
      options.companyId = req.company._id;
    }

    res.locals.stats = await Service.DeliveryPayoutRequest.stats(options);
    return next();
  } catch (e) {
    return next(e);
  }
};
