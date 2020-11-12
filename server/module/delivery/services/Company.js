/* eslint no-param-reassign: 0, no-restricted-syntax: 0, no-await-in-loop: 0, guard-for-in: 0 */
const zones = require('../../../data/area.json');
const _ = require('lodash');
const url = require('url');

exports.register = async (data) => {
  try {
    const count = await DB.Company.count({
      email: data.email.toLowerCase()
    });
    if (count) {
      throw new Error('This email has already token');
    }

    const company = new DB.Company(data);
    // company.emailVerifiedToken = Helper.String.randomString(48);
    await company.save();

    // email to admin & send email confirmation to shop
    await Service.Mailer.send('delivery/new-company-register-alert-admin.html', process.env.EMAIL_NOTIFICATION_NEW_COMPANY_REGISTER, {
      subject: `New ${company.type} company registered`,
      company: company.toObject(),
      companyUpdateUrl: url.resolve(process.env.adminWebUrl, `/delivery/companies/${company._id}/update`)
    });

    // await Service.Mailer.send('delivery/verify-email-address.html', company.email, {
    //   subject: 'Please verify your email address',
    //   company: company.toObject(),
    //   emailVerifyLink: url.resolve(nconf.get('baseUrl'), `v1/auth/verifyEmail/${company.emailVerifiedToken}?type=${company}`)
    // });

    // seed default price
    await this.seedDefaultZonesFromExisting(company._id);

    return company;
  } catch (e) {
    throw e;
  }
};

exports.update = async (companyId, data) => {
  try {
    const company = companyId instanceof DB.Company ? companyId : await DB.Company.findOne({ _id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const sendMailApprove = !company.verified && data.verified;
    if (!data.password) {
      delete data.password;
    }
    Object.assign(company, data);
    await company.save();

    if (sendMailApprove) {
      await Service.Mailer.send('delivery/company-verified.html', company.email, {
        subject: 'Congrats! Your company account has been verified',
        company: company.toObject(),
        loginUrl: process.env.DELIVERY_WEB_URL
      });
    }

    return company;
  } catch (e) {
    throw e;
  }
};

exports.create = async (data) => {
  try {
    const count = await DB.Company.count({
      email: data.email.toLowerCase()
    });
    if (count) {
      throw new Error('This email has already token');
    }

    const company = new DB.Company(data);
    await company.save();
    // seed default price
    await this.seedDefaultZonesFromExisting(company._id);
    return company;
  } catch (e) {
    throw e;
  }
};

exports.assignDriver = async (orderDetailId, driverId) => {
  try {
    const orderDetail = orderDetailId instanceof DB.OrderDetail ? orderDetailId : await DB.OrderDetail.findOne({ _id: orderDetailId });
    if (!orderDetail) {
      throw new Error('Order not found!');
    }
    const driver = driverId instanceof DB.Driver ? driverId : await DB.Driver.findOne({ _id: driverId });
    if (!driver) {
      throw new Error('Driver not found!');
    }

    await DB.OrderDetail.update({ _id: orderDetail._id }, {
      driverId: driver._id
    });
    // notify driver
    const customer = {
      name: orderDetail.name || `${orderDetail.firstName} ${orderDetail.lastName}`,
      email: orderDetail.email,
      phoneNumber: orderDetail.phoneNumber
    };
    await Service.Mailer.send('delivery/new-order-assign-driver.html', driver.email, {
      subject: `Order #${orderDetail.trackingCode} has been assigned`,
      orderDetail: orderDetail.toObject(),
      customer,
      driver: driver.toObject()
    });
    // sms notification
    if (driver.phoneNumber) {
      await Service.Sms.send({
        text: 'A new order has been assigned to you. Please check your driver app to know more details.',
        to: driver.phoneNumber
      });
    }
  } catch (e) {
    throw e;
  }
};

exports.assignDriverMultipleOrders = async (orderDetailIds, driverId) => {
  try {
    const driver = driverId instanceof DB.Driver ? driverId : await DB.Driver.findOne({ _id: driverId });
    if (!driver) {
      throw new Error('Driver not found!');
    }

    await Promise.all(orderDetailIds.map(async (orderDetailId) => {
      const orderDetail = orderDetailId instanceof DB.OrderDetail ? orderDetailId : await DB.OrderDetail.findOne({ _id: orderDetailId });
      if (!orderDetail) {
        return Promise.resolve();
      }

      await DB.OrderDetail.update({ _id: orderDetail._id }, {
        driverId: driver._id
      });
      // notify driver
      const customer = {
        name: orderDetail.name || `${orderDetail.firstName} ${orderDetail.lastName}`,
        email: orderDetail.email,
        phoneNumber: orderDetail.phoneNumber
      };
      return Service.Mailer.send('delivery/new-order-assign-driver.html', driver.email, {
        subject: `Order #${orderDetail.trackingCode} has been assigned`,
        orderDetail: orderDetail.toObject(),
        customer,
        driver: driver.toObject()
      });
    }));

    // sms notification
    if (driver.phoneNumber) {
      await Service.Sms.send({
        text: 'A new order has been assigned to you. Please check your driver app to know more details.',
        to: driver.phoneNumber
      });
    }
  } catch (e) {
    throw e;
  }
};

exports.getPdfOrderStream = async (orderDetailId) => {
  try {
    const order = orderDetailId instanceof DB.OrderDetail ? orderDetailId : await DB.OrderDetail.findOne({ _id: orderDetailId });
    if (!order) {
      throw new Error('Order not found');
    }
    const driver = order.driverId ? await DB.Driver.findOne({ _id: order.driverId }) : null;

    const template = 'delivery/details.html';
    const orderLink = url.resolve(process.env.userWebUrl, `invoices/detail/${order.trackingCode}`);
    return Service.Pdf.toStreamFromTemplate(template, {
      orderDetail: order.toObject(),
      qrLink: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(orderLink)}&chld=L|1&choe=UTF-8`,
      driver: driver ? driver.toObject() : {
        firstName: 'N/A',
        lastName: 'N/A',
        phoneNumber: 'N/A'
      }
    });
  } catch (e) {
    throw e;
  }
};

exports.seedDefaultZones = async (companyId = null, defaultPrice = 1) => {
  try {
    // map data from zone
    // city
    //    ZONE ORIENTATION -> [area]
    const data = {};
    const cities = _.uniqBy(zones, 'Cities').map(c => c.Cities);
    cities.forEach((city) => {
      data[city] = {
        zones: _.uniqBy(zones.filter(z => z.Cities === city), 'ZONE ORIENTATION').map((z) => {
          const ret = {
            name: z['ZONE ORIENTATION'],
            areas: _.uniq(zones.filter(z1 => z1.Cities === city && z1['ZONE ORIENTATION'] === z['ZONE ORIENTATION']).map(a => a.AREAS))
          };
          return ret;
        })
      };
    });

    const query = { type: 'delivery' };
    if (companyId) {
      query._id = companyId;
    }
    const companies = await DB.Company.find(query);
    for (const company of companies) {
      for (const city in data) {
        for (const zone of data[city].zones) {
          const item = new DB.DeliveryZone({
            companyId: company._id,
            name: zone.name,
            areas: zone.areas,
            city,
            deliveryPrice: defaultPrice
          });
          await item.save();
        }
      }
    }
  } catch (e) {
    throw e;
  }
};

exports.seedDefaultZonesFromExisting = async (companyId) => {
  try {
    const existingCompany = await DB.DeliveryZone.findOne({
      companyId: {
        $ne: companyId
      }
    });
    if (!existingCompany) {
      await this.seedDefaultZones();
    }

    const newZones = await DB.DeliveryZone.find({ companyId: existingCompany.companyId });
    for (const zone of newZones) {
      const data = zone.toObject();
      delete data._id;
      data.companyId = companyId;
      const item = new DB.DeliveryZone(data);
      await item.save();
    }
  } catch (e) {
    throw e;
  }
};

