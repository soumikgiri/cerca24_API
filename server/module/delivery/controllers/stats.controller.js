exports.deliveryStats = async (req, res, next) => {
  try {
    const statuses = ['processing', 'pickedUp', 'onTheWay', 'cancelled', 'postponed', 'deliveried'];
    const promises = statuses.map((status) => {
      const query = {
        deliveryStatus: status,
        $or: [{
          paymentStatus: 'paid',
          paymentMethod: { $ne: 'cod' }
        }, {
          paymentMethod: 'cod'
        }]
      };
      if (req.user.role !== 'admin' || req.headers.platform !== 'admin') {
        query.deliveryCompanyId = req.company._id;
      } else if (req.user.role === 'admin' && req.query.deliveryCompanyId) {
        query.deliveryCompanyId = req.query.deliveryCompanyId;
      }
      return DB.OrderDetail.count(query)
        .then(count => ({ count, status }));
    });

    const data = await Promise.all(promises);
    const result = {};
    let count = 0;
    data.forEach((item) => {
      count += item.count;
      result[item.status] = item.count;
    });
    result.all = count;

    res.locals.stats = result;
    next();
  } catch (e) {
    next(e);
  }
};

exports.saleStats = async (req, res, next) => {
  try {
    const query = {
      $or: [{
        paymentStatus: 'paid',
        paymentMethod: { $ne: 'cod' }
      }, {
        paymentMethod: 'cod'
      }],
      deliveryStatus: 'deliveried'
    };
    if (req.user.role !== 'admin' || req.headers.platform !== 'admin') {
      query.deliveryCompanyId = Helper.App.toObjectId(req.company._id);
    } else if (req.user.role === 'admin' && req.query.deliveryCompanyId) {
      query.deliveryCompanyId = Helper.App.toObjectId(req.query.deliveryCompanyId);
    }
    const data = await DB.OrderDetail.aggregate([{
      $match: query
    }, {
      $group: {
        _id: null,
        balance: { $sum: '$deliveryBalance' },
        commission: { $sum: '$deliveryCommission' },
        totalPrice: { $sum: '$deliveryPrice' },
        totalProduct: { $sum: '$quantity' },
        totalOrder: { $sum: 1 }
      }
    }]);
    const result = {
      balance: 0,
      commission: 0,
      totalPrice: 0,
      totalProduct: 0,
      totalOrder: 0
    };
    if (data && data.length) {
      result.balance = data[0].balance;
      result.commission = data[0].commission;
      result.totalPrice = data[0].totalPrice;
      result.totalProduct = data[0].totalProduct;
      result.totalOrder = data[0].totalOrder;
    }

    res.locals.saleStats = result;
    next();
  } catch (e) {
    next(e);
  }
};
