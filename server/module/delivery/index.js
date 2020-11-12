require('./config');

exports.model = {
  Company: require('./models/company'),
  Driver: require('./models/driver'),
  CompanyCategory: require('./models/category'),
  DeliveryPayoutRequest: require('./models/payout-request'),
  DeliveryPayoutItem: require('./models/payout-item'),
  DeliveryPayoutAccount: require('./models/payout-account'),
  DeliveryZone: require('./models/delivery-zone')
};

exports.router = (router) => {
  require('./routes/register.route')(router);
  require('./routes/stats.route')(router);
  require('./routes/company.route')(router);
  require('./routes/driver.route')(router);
  require('./routes/order.route')(router);
  require('./routes/category.route')(router);
  require('./routes/import-export.route')(router);
  require('./routes/payout-stats.route')(router);
  require('./routes/payout-request.route')(router);
  require('./routes/payout-account.route')(router);
  require('./routes/delivery-zone.route')(router);
};

exports.services = {
  Company: require('./services/Company'),
  Driver: require('./services/Driver'),
  Delivery: require('./services/Delivery'),
  DeliveryPayoutRequest: require('./services/PayoutRequest')
};

exports.middleware = require('./middlewares');

exports.mongoosePlugin = require('./mongoosePlugin');
