/* eslint no-param-reassign: 0 */
const _ = require('lodash');
const moment = require('moment');
const Joi = require('joi');

/**
 * list assignee orders
 */
exports.list = async (req, res, next) => {
  try {
    const page = Math.max(0, req.query.page - 1) || 0; // using a zero-based page index for use with skip()
    const take = parseInt(req.query.take, 10) || 10;

    const query = Helper.App.populateDbQuery(req.query, {
      text: ['trackingCode', 'city', 'state', 'pickUpAddressObj.city', 'pickUpAddressObj.area'],
      equal: ['status', 'paymentMethod', 'driverId', 'deliveryStatus', 'shopId']
    });
    const sort = Helper.App.populateDBSort(req.query);
    query.$or = [{
      paymentStatus: 'paid',
      paymentMethod: {
        $ne: 'cod'
      }
    }, {
      paymentMethod: 'cod'
    }];

    if (req.query.startDate) {
      query.createdAt = {
        $gte: moment(req.query.startDate).toDate()
      };
    }
    if (req.query.toDate) {
      if (query.createdAt) {
        query.createdAt.$lte = moment(req.query.toDate).toDate();
      } else {
        query.createdAt = {
          $lte: moment(req.query.toDate).toDate()
        };
      }
    }

    if (req.company) {
      query.deliveryCompanyId = req.user._id;
    } else if (req.driver) {
      query.driverId = req.user._id;
    }

    const count = await DB.OrderDetail.count(query);
    const items = await DB.OrderDetail.find(query)
      .collation({
        locale: 'en'
      })
      .sort(sort)
      .skip(page * take)
      .limit(take)
      .exec();

    // mapping customer and shops and driver
    const customerIds = items.map(item => item.customerId);
    const customers = customerIds.length ? await DB.User.find({
      _id: {
        $in: customerIds
      }
    }) : [];
    // const shopIds = items.map(item => item.shopId);
    // const shops = shopIds.length ? await DB.Shop.find({ _id: { $in: shopIds } }) : [];
    const driverIds = items.map(item => item.driverId);
    const drivers = driverIds.length ? await DB.Driver.find({
      _id: {
        $in: driverIds
      }
    }) : [];

    const categoryIds = items.map(item => item.deliveryCategoryId);
    const categories = categoryIds.length ? await DB.CompanyCategory.find({
      _id: {
        $in: categoryIds
      }
    }) : [];
    // fetch and show main image if it does not include
    const productIds = [];
    items.forEach(item => productIds.push(item.productId));
    if (productIds.length) {
      const products = await DB.Product.find({
        _id: {
          $in: productIds
        }
      }).select('_id mainImage');
      const mediaIds = products.map(p => p.mainImage);
      if (mediaIds) {
        const media = await DB.Media.find({
          _id: {
            $in: mediaIds
          }
        });
        items.forEach((item) => {
          const product = _.find(products, p => p._id.toString() === item.productId.toString());
          if (product && product.mainImage) {
            const image = _.find(media, m => m._id.toString() === product.mainImage.toString());
            if (image) {
              if (!item.productDetails) {
                item.productDetails = {};
              }

              item.productDetails.mainImage = image.toJSON();
            }
          }
        });
      }
    }

    res.locals.list = {
      count,
      items: items.map((item) => {
        const data = item.toObject();
        if (data.customerId) {
          const customer = customers.find(c => c._id.toString() === data.customerId.toString());
          if (customer) {
            // TODO - pick only public information
            data.customer = customer.toJSON();
          }
        }
        if (data.driverId) {
          const driver = drivers.find(c => c._id.toString() === data.driverId.toString());
          if (driver) {
            // TODO - pick only public information
            data.driver = driver.toJSON();
          }
        }

        if (data.deliveryCategoryId) {
          const category = categories.find(c => c._id.toString() === data.deliveryCategoryId.toString());
          if (category) {
            // TODO - pick only public information
            data.deliveryCategory = category.toJSON();
          }
        }

        // if (data.shopId) {
        //   data.shop = shops.find(s => s._id.toString() === data.shopId.toString());
        // }

        data.details = item.details || [];
        return data;
      })
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.details = async (req, res, next) => {
  try {
    const details = await DB.OrderDetail.findOne({
      _id: req.params.orderDetailId
    });
    if (!details) {
      return next(PopulateResponse.notFound());
    }

    const data = details.toObject();
    if (data.customerId) {
      const customer = await DB.User.findOne({
        _id: data.customerId
      });
      if (customer) {
        data.customer = customer.toJSON();
      }
    }

    if (data.driverId) {
      const driver = await DB.Driver.findOne({
        _id: data.driverId
      });
      if (driver) {
        data.driver = driver.toJSON();
      }
    }

    if (data.deliveryCategoryId) {
      const deliveryCategory = await DB.CompanyCategory.findOne({
        _id: data.deliveryCategoryId
      });
      if (deliveryCategory) {
        data.deliveryCategory = deliveryCategory.toJSON();
      }
    }

    // data.shop = await DB.Shop.findOne({ _id: data.shopId });

    // load main image
    const product = await DB.Product.findOne({
      _id: data.productId
    }).populate('mainImage');
    if (product && product.mainImage) {
      if (!data.productDetails) {
        data.productDetails = {};
      }
      data.productDetails.mainImage = product.mainImage.toJSON();
    }

    data.deliveryHistory = await Service.Order.getOrderLogHistory({
      orderDetailId: data._id,
      eventType: 'updateDeliveryStatus'
    });

    res.locals.details = data;
    return next();
  } catch (e) {
    return next(e);
  }
};

// assign driver to order
exports.assignDriver = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      driverId: Joi.string().required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    await Service.Company.assignDriver(req.params.orderDetailId, validate.value.driverId);
    res.locals.assignDriver = {
      success: true
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      categoryId: Joi.string().required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const order = await DB.OrderDetail.findOne({
      _id: req.params.orderDetailId,
      deliveryCompanyId: req.company._id
    });
    if (!order) {
      return next(PopulateResponse.notFound());
    }

    order.deliveryCategoryId = validate.value.categoryId;
    await DB.OrderDetail.update({
      _id: order._id
    }, {
      $set: {
        deliveryCategoryId: validate.value.categoryId
      }
    });
    res.locals.updateCategory = order;
    return next();
  } catch (e) {
    return next(e);
  }
};

// driver or delivery company can update status
exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    const fields = ['deliveried', 'pickedUp', 'onTheWay', 'postponed'];
    if (req.company) {
      fields.push(...['processing', 'cancelled']);
    }
    const schema = Joi.object().keys({
      status: Joi.string().valid(fields).required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const orderDetail = await DB.OrderDetail.findOne({
      _id: req.params.orderDetailId
    });
    if (!orderDetail) {
      return next(PopulateResponse.notFound());
    }
    if (req.driver && req.driver._id.toString() !== orderDetail.driverId.toString()) {
      return next(PopulateResponse.forbidden());
    }

    // TODO - validate permission here!!
    await Service.Delivery.changeStatus({
      orderDetail,
      user: req.user,
      status: req.body.status
    });
    res.locals.updateDeliveryStatus = {
      success: true
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.getOrderDriverLocation = async (req, res, next) => {
  try {
    const orderDetail = await DB.OrderDetail.findOne({
      _id: req.params.orderDetailId
    });
    if (['processing', 'pickedUp', 'onTheWay'].indexOf(orderDetail.deliveryStatus) === -1) {
      return next(PopulateResponse.error({
        message: 'Invalid order status.'
      }));
    }
    if (!orderDetail.driverId) {
      return next(PopulateResponse.error({
        message: 'Not assign driver yet!'
      }));
    }

    const driver = await DB.Driver.findOne({
      _id: orderDetail.driverId
    });
    if (!driver) {
      return next(PopulateResponse.error({
        message: 'Driver not found!'
      }));
    }

    res.locals.location = {
      driver: driver.lastLocation
    };
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const details = await DB.OrderDetail.findOne({
      _id: req.params.orderDetailId,
      deliveryCompanyId: req.company._id
    });
    if (!details) {
      return next(PopulateResponse.notFound());
    }

    const stream = await Service.Company.getPdfOrderStream(details);
    return stream.pipe(res);
  } catch (e) {
    return next(e);
  }
};

exports.assignDriverMultiple = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      driverId: Joi.string().required(),
      orderDetailIds: Joi.array().items(Joi.string()).required()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }
    await Service.Company.assignDriverMultipleOrders(validate.value.orderDetailIds, validate.value.driverId);
    res.locals.assignDriverMultiple = {
      success: true
    };
    return next();
  } catch (e) {
    return next(e);
  }
};
