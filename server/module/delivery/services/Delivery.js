/* eslint no-param-reassign: 0, no-await-in-loop: 0, no-restricted-syntax: 0, no-continue: 0 */
const url = require('url');

exports.getStatusText = (status) => {
  switch (status) {
    case 'processing':
      return 'Items eady for pick up';
    case 'pickedUp':
      return 'Items picked up';
    case 'onTheWay':
      return 'Items on the way';
    case 'deliveried':
      return 'Deliveried';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

exports.changeStatus = async (options) => {
  try {
    await DB.OrderDetail.update({ _id: options.orderDetail._id }, {
      $set: {
        deliveryStatus: options.status
      }
    });

    await Service.Order.addLog({
      eventType: 'updateDeliveryStatus',
      changedBy: options.user._id || null,
      orderId: options.orderDetail.orderId,
      orderDetailId: options.orderDetail._id,
      oldData: {
        deliveryStatus: options.orderDetail.deliveryStatus
      },
      newData: {
        deliveryStatus: options.status
      }
    });


    const order = await DB.Order.findOne({ _id: options.orderDetail.orderId });
    if (order) {
      const linkOrder = url.resolve(process.env.userWebUrl, `invoices/tracking/${order.trackingCode}`);
      await Service.Mailer.send('delivery/status-change-to-customer.html', order.email, {
        subject: `Order #${options.orderDetail.trackingCode} delivery status change`,
        orderDetail: options.orderDetail.toObject(),
        qrSummary: `https://chart.googleapis.com/chart?chs=75x75&cht=qr&chl=${encodeURIComponent(linkOrder)}&chld=L|1&choe=UTF-8`,
        orderLink: order.customerId ? url.resolve(process.env.userWebUrl, `orders/view/${order.orderId}`) : ''
      });

      if (options.orderDetail.phoneNumber) {
        const status = this.getStatusText(options.status);
        await Service.Sms.send({
          text: `Your order #${options.orderDetail.trackingCode} delivery status changed to: ${status}.
Call +260762300300 for any inquiries.`,
          to: options.orderDetail.phoneNumber
        });
      }
    }

    return true;
  } catch (e) {
    throw e;
  }
};

exports.getCsvData = async (query = {}, sort = { createdAt: -1 }) => {
  try {
    query.$or = [{
      paymentStatus: 'paid',
      paymentMethod: { $ne: 'cod' }
    }, {
      paymentMethod: 'cod'
    }];

    const items = await DB.OrderDetail.find(query)
      .populate('customer')
      .populate('shop')
      .sort(sort)
      .exec();
    const resutls = items.map((item) => {
      const data = item.toJSON();
      if (item.customer) {
        data.customer = item.customer.toJSON();
      }
      data.details = item.details || [];
      return data;
    });
    return resutls;
  } catch (e) {
    throw e;
  }
};
