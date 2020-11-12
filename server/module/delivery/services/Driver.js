/* eslint no-param-reassign: 0, no-restricted-syntax: 0, no-await-in-loop: 0 */
const Queue = require('../../../kernel/services/queue');

const driverQ = Queue.create('driver');

driverQ.process(async (job, done) => {
  try {
    const data = job.data;

    if (data.action === 'updatePosition') {
      const driverId = data.driverId;
      const location = data.location;
      await DB.Driver.update({ _id: driverId }, {
        $set: {
          lastLocation: location
        }
      });

      await Service.Driver.notifyLocationChange(driverId, location);
    }

    done();
  } catch (e) {
    done();
  }
});

exports.notifyLocationChange = async (driverId, location) => {
  try {
    const orders = await DB.OrderDetail.find({
      deliveryStatus: {
        $in: ['processing', 'pickedUp', 'onTheWay']
      },
      driverId
    });
    for (const order of orders) {
      await Service.Pusher.emitToChannel(order._id, 'driver_location_change', {
        location,
        driverId,
        subOrderId: order._id,
        orderId: order._id
      });
    }
  } catch (e) {
    throw e;
  }
};

exports.create = async (data) => {
  try {
    const count = await DB.Driver.count({
      email: data.email.toLowerCase()
    });
    if (count) {
      throw new Error('This email has already token');
    }

    const driver = new DB.Driver(data);
    const password = data.password || Helper.String.randomString(7);
    driver.password = password;
    await driver.save();

    // email to admin & send email confirmation to shop
    await Service.Mailer.send('delivery/new-driver-created.html', driver.email, {
      subject: 'Welcome to zambia driver app',
      driver: driver.toObject(),
      password
    });

    return driver;
  } catch (e) {
    throw e;
  }
};

exports.update = async (driverId, data) => {
  try {
    const driver = driverId instanceof DB.Driver ? driverId : await DB.Driver.findOne({ _id: driverId });
    if (!driver) {
      throw new Error('Driver not found');
    }

    if (!data.password) {
      delete data.password;
    }
    Object.assign(driver, data);
    return driver.save();
  } catch (e) {
    throw e;
  }
};

exports.updatePosition = async (driverId, location) => {
  try {
    return driverQ.createJob({
      action: 'updatePosition',
      driverId,
      location
    }).save();
  } catch (e) {
    throw e;
  }
};
