const Joi = require('joi');
const _ = require('lodash');
const Csv = require('json2csv').Transform;
const Readable = require('stream').Readable;
const moment = require('moment');

exports.getUserShop = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isShop || !req.user.shopId) {
      return next(PopulateResponse.error({
        message: 'You dont have any shop. please try to register'
      }, 'ERR_NO_SHOP'));
    }

    const shop = await DB.Shop.findOne({
      _id: req.user.shopId
    })
      .populate('owner')
      .populate('logo')
      .populate('banner')
      .populate('verificationIssue');

    const data = shop.toObject();
    data.logo = shop.logo;
    data.banner = shop.banner;
    data.verificationIssue = shop.verificationIssue;
    data.owner = shop.owner ? shop.owner.getPublicProfile() : null;

    res.locals.shop = data; // owner can see all information
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.details = async (req, res, next) => {
  try {
    const condition = {};
    if (Helper.App.isObjectId(req.params.shopId)) {
      condition._id = req.params.shopId;
    } else {
      condition.alias = req.params.shopId;
    }

    const query = DB.Shop.findOne(condition)
      .populate('owner')
      .populate('logo')
      .populate('banner');
    const isAdmin = req.user && req.user.role === 'admin';
    if (isAdmin) {
      query.populate('verificationIssue');
    }
    const shop = await query.exec();

    const data = shop.toObject();
    data.owner = shop.owner ? shop.owner.getPublicProfile() : null;
    data.logo = shop.logo;
    data.banner = shop.banner;
    data.verificationIssue = shop.verificationIssue;

    if (!shop) {
      return next(PopulateResponse.notFound());
    }

    res.locals.shop = data;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.search = async (req, res, next) => {
  // TODO - define me
  const page = Math.max(0, req.query.page - 1) || 0; // using a zero-based page index for use with skip()
  const take = parseInt(req.query.take, 10) || 10;

  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const query = Helper.App.populateDbQuery(req.query, {
      text: ['name', 'address', 'city', 'state', 'area', 'zipcode', 'returnAddress', 'email'],
      boolean: isAdmin ? ['verified', 'activated', 'featured', 'doCOD'] : ['featured'],
      equal: ['ownerId']
    });

    // TODO - define platform (admin or seller or user) here
    let defaultSort = true;
    if (!isAdmin) {
      query.verified = true;
      query.activated = true;
      defaultSort = false;
    }

    if (req.query.q) {
      query.name = {
        $regex: req.query.q.trim(),
        $options: 'i'
      };
    }
    const sort = Object.assign(defaultSort ? {} : {
      featured: -1
    }, Helper.App.populateDBSort(req.query));
    const lat = parseFloat(req.query.latitude);
    const lng = parseFloat(req.query.longitude);
    // The latitude must be a number between -90 and 90 and the longitude between -180 and 180.
    if (lat && lng && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const distance = parseFloat(req.query.distance);
      query.location = {
        $nearSphere: [parseFloat(req.query.longitude), parseFloat(req.query.latitude)]
      };
      if (distance) {
        // in km
        // https://stackoverflow.com/questions/12180290/convert-kilometers-to-radians
        query.location.$maxDistance = distance / 6371;
      }
    }

    const count = await DB.Shop.count(query);
    if (req.query.sort === 'random') {
      const randomData = await DB.Shop.aggregate([{
        $match: query
      },
      {
        $sample: {
          size: take
        }
      },
      {
        $project: {
          _id: 1
        }
      }
      ]);
      if (randomData && randomData.length) {
        query._id = {
          $in: randomData.map(p => p._id)
        };
      }
    }

    const queryItems = DB.Shop.find(query)
      .collation({
        locale: 'en'
      })
      .populate('owner')
      .populate('logo')
      .populate('banner');
    if (isAdmin) {
      queryItems.populate('verificationIssue');
    }

    const items = await (query.location ? queryItems : queryItems.sort(sort))
      .skip(page * take)
      .limit(take)
      .exec();

    res.locals.search = {
      count,
      items: items.map((item) => {
        const data = item.toObject();
        data.logo = item.logo;
        data.banner = item.banner;
        data.verificationIssue = item.verificationIssue;
        data.owner = item.owner ? item.owner.getPublicProfile() : null;
        return data;
      })
    };
    next();
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      ownerId: Joi.string().required(),
      name: Joi.string().allow([null, '']).required(),
      alias: Joi.string().allow([null, '']).optional(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().required(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      returnAddress: Joi.string().allow([null, '']).optional(),
      pickUpAddress: Joi.array().items(Joi.object()).optional(),
      location: Joi.array().items(Joi.number()).length(2).optional(), // [longitude, latitude]
      verificationIssueId: Joi.string().allow([null, '']).optional(),
      businessInfo: Joi.object().keys({
        name: Joi.string().allow([null, '']).optional(),
        identifier: Joi.string().allow([null, '']).optional(),
        address: Joi.string().allow([null, '']).optional()
      }).optional(),
      bankInfo: Joi.object().keys({
        bankName: Joi.string().allow([null, '']).optional(),
        swiftCode: Joi.string().allow([null, '']).optional(),
        bankId: Joi.string().allow([null, '']).optional(),
        bankBranchId: Joi.string().allow([null, '']).optional(),
        bankBranchName: Joi.string().allow([null, '']).optional(),
        accountNumber: Joi.string().allow([null, '']).optional(),
        accountName: Joi.string().allow([null, '']).optional()
      }).optional(),
      socials: Joi.object().keys({
        facebook: Joi.string().allow([null, '']).optional(),
        twitter: Joi.string().allow([null, '']).optional(),
        google: Joi.string().allow([null, '']).optional(),
        linkedin: Joi.string().allow([null, '']).optional(),
        youtube: Joi.string().allow([null, '']).optional(),
        instagram: Joi.string().allow([null, '']).optional(),
        flickr: Joi.string().allow([null, '']).optional()
      }).optional(),
      socialConnected: Joi.object().keys({
        facebook: Joi.boolean().optional(),
        twitter: Joi.boolean().optional(),
        google: Joi.boolean().optional(),
        linkedin: Joi.boolean().optional()
      }).optional(),
      logoId: Joi.string().allow([null, '']).optional(),
      bannerId: Joi.string().allow([null, '']).optional(),
      verified: Joi.boolean().optional().default(true), // valid with admin only
      activated: Joi.boolean().optional(), // valid with admin only
      featured: Joi.boolean().optional(), // valid with admin only
      featuredTo: Joi.string().optional(), // valid with admin only
      gaCode: Joi.string().allow([null, '']).optional(),
      headerText: Joi.string().allow([null, '']).optional(),
      doCOD: Joi.boolean().optional(),
      notifications: Joi.object().keys({
        lowInventory: Joi.boolean().optional()
      }).optional(),
      storeWideShipping: Joi.boolean().optional(),
      shippingSettings: Joi.object().keys({
        defaultPrice: Joi.number().optional(),
        perProductPrice: Joi.number().optional(),
        perQuantityPrice: Joi.number().optional(),
        processingTime: Joi.string().optional(),
        shippingPolicy: Joi.string().optional(),
        refundPolicy: Joi.string().optional(),
        shipFrom: Joi.string().optional(),
      }).optional(),
      announcement: Joi.string().allow([null, '']).optional(),
      commission: Joi.number().allow([null]).optional()
    });
    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const user = await DB.User.findOne({
      _id: validate.value.ownerId
    });
    if (!user) {
      return next(PopulateResponse.error({
        message: 'User is not exist'
      }));
    }
    if (user.isShop) {
      return next(PopulateResponse.error({
        message: 'This account has already registered with a shop!'
      }, 'ERR_ACCOUNT_HAVE_SHOP'));
    }

    const shop = new DB.Shop(validate.value);
    shop.location = await Service.Shop.getLocation(shop);
    await shop.save();
    await DB.User.update({
      _id: user._id
    }, {
      $set: {
        isShop: true,
        shopId: shop._id
      }
    });

    if (shop.verified) {
      await Service.Shop.sendEmailApprove(shop);
    }

    res.locals.create = shop;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const schema = Joi.object().keys({
      name: Joi.string().allow([null, '']).optional(),
      alias: Joi.string().allow([null, '']).optional(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().allow([null, '']).optional(),
      address: Joi.string().allow([null, '']).optional(),
      area: Joi.string().allow([null, '']).optional(),
      city: Joi.string().allow([null, '']).optional(),
      state: Joi.string().allow([null, '']).optional(),
      country: Joi.string().allow([null, '']).optional(),
      zipcode: Joi.string().allow([null, '']).optional(),
      returnAddress: Joi.string().allow([null, '']).optional(),
      location: Joi.array().items(Joi.number()).length(2).optional(), // [longitude, latitude]
      verificationIssueId: Joi.string().allow([null, '']).optional(),
      businessInfo: Joi.object().keys({
        name: Joi.string().allow([null, '']).optional(),
        identifier: Joi.string().allow([null, '']).optional(),
        address: Joi.string().allow([null, '']).optional()
      }).optional(),
      bankInfo: Joi.object().keys({
        bankName: Joi.string().allow([null, '']).optional(),
        swiftCode: Joi.string().allow([null, '']).optional(),
        bankId: Joi.string().allow([null, '']).optional(),
        bankBranchId: Joi.string().allow([null, '']).optional(),
        bankBranchName: Joi.string().allow([null, '']).optional(),
        accountNumber: Joi.string().allow([null, '']).optional(),
        accountName: Joi.string().allow([null, '']).optional()
      }).optional(),
      socials: Joi.object().keys({
        facebook: Joi.string().allow([null, '']).optional(),
        twitter: Joi.string().allow([null, '']).optional(),
        google: Joi.string().allow([null, '']).optional(),
        linkedin: Joi.string().allow([null, '']).optional(),
        youtube: Joi.string().allow([null, '']).optional(),
        instagram: Joi.string().allow([null, '']).optional(),
        flickr: Joi.string().allow([null, '']).optional()
      }).optional(),
      socialConnected: Joi.object().keys({
        facebook: Joi.boolean().optional(),
        twitter: Joi.boolean().optional(),
        google: Joi.boolean().optional(),
        linkedin: Joi.boolean().optional()
      }).optional(),
      logoId: Joi.string().allow([null, '']).optional(),
      bannerId: Joi.string().allow([null, '']).optional(),
      verified: Joi.boolean().optional(), // valid with admin only
      activated: Joi.boolean().optional(), // valid with admin only
      featured: Joi.boolean().optional(), // valid with admin only
      featuredTo: Joi.string().optional(), // valid with admin only
      gaCode: Joi.string().allow([null, '']).optional(),
      headerText: Joi.string().allow([null, '']).optional(),
      doCOD: Joi.boolean().optional(),
      pickUpAtStore: Joi.boolean().optional(),
      pickUpAddress: Joi.array().items(Joi.object()).optional(),
      vatRegistrationNumber: Joi.string().allow([null, '']).optional(),
      tpinNumber: Joi.string().allow([null, '']).optional(),
      notifications: Joi.object().keys({
        lowInventory: Joi.boolean().optional()
      }).optional(),
      storeWideShipping: Joi.boolean().optional(),
      shippingSettings: Joi.object().keys({
        defaultPrice: Joi.number().allow([null, '']).optional(),
        perProductPrice: Joi.number().allow([null, '']).optional(),
        perQuantityPrice: Joi.number().allow([null, '']).optional(),
        processingTime: Joi.string().allow([null, '']).optional(),
        shippingPolicy: Joi.string().allow([null, '']).optional(),
        refundPolicy: Joi.string().allow([null, '']).optional(),
        shipFrom: Joi.string().allow([null, '']).optional(),
      }).optional(),
      announcement: Joi.string().allow([null, '']).optional(),
      commission: Joi.number().allow([null]).optional()
    });

    const validate = Joi.validate(req.body, schema);
    if (validate.error) {
      return next(PopulateResponse.validationError(validate.error));
    }

    const shop = await DB.Shop.findOne({
      _id: req.params.shopId
    });
    if (shop.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(PopulateResponse.forbidden());
    }

    const sendMailApprove = !shop.verified && req.user.role === 'admin' && validate.value.verified;
    const value = req.user.role !== 'admin' ? _.omit(validate.value, ['verified', 'activated', 'featured', 'commission']) : validate.value;
    _.merge(shop, value);
    shop.location = await Service.Shop.getLocation(shop);
    if (value.pickUpAddress) {
      shop.pickUpAddress = value.pickUpAddress;
      shop.markModified('pickUpAddress');
    }
    await shop.save();

    if (sendMailApprove) {
      await Service.Shop.sendEmailApprove(shop);
    }
    res.locals.update = shop;
    return next();
  } catch (e) {
    return next(e);
  }
};

exports.toCsv = async (req, res, next) => {
  try {
    const query = Helper.App.populateDbQuery(req.query, {
      text: ['name', 'address', 'city', 'state', 'area', 'zipcode', 'returnAddress', 'email'],
      boolean: ['verified', 'activated', 'featured', 'doCOD'],
      equal: ['ownerId']
    });

    const sort = Helper.App.populateDBSort(req.query);
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
    if (req.query.q) {
      query.name = {
        $regex: req.query.q.trim(),
        $options: 'i'
      };
    }

    const csvData = await DB.Shop.find(query)
      .collation({ locale: 'en' })
      .populate('owner')
      .sort(sort)
      .exec();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${req.query.fileName || 'shops'}.csv`);
    const readStream = new Readable();
    const stringData = JSON.stringify(csvData);
    const json2csv = new Csv({
      fields: [{
        label: 'Name',
        value: 'name'
      }, {
        label: 'Email',
        value: 'email'
      }, {
        label: 'Phone',
        value: 'phoneNumber'
      }, {
        label: 'Area',
        value: 'area'
      }, {
        label: 'City',
        value: 'city'
      }, {
        label: 'Address',
        value: 'address'
      }, {
        label: 'Return address',
        value: 'returnAddress'
      }, {
        label: 'Featured',
        value: row => (row.featured ? 'Y' : 'N')
      }, {
        label: 'Verified',
        value: row => (row.verified ? 'Y' : 'N')
      }, {
        label: 'Active',
        value: row => (row.activated ? 'Y' : 'N')
      }, {
        label: 'Date',
        value: row => moment(row.createdAt).format('DD/MM/YYYY HH:mm')
      }],
      header: true
    }, {
      highWaterMark: 16384,
      encoding: 'utf-8'
    });
    readStream._read = () => {};
    // TODO: Reduce the pace of pushing data here
    readStream.push(stringData);
    readStream.push(null);
    return readStream.pipe(json2csv).pipe(res);
  } catch (e) {
    return next(e);
  }
};
