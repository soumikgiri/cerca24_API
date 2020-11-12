const ctrl = require('../controllers/cybersource.controller');

module.exports = (router) => {
  /**
   * @apiGroup Payment
   * @apiVersion 1.0.0
   * @api {post} /v1/payment/cybersource/callback  Cybersource webhook
   * @apiDescription Cybersource webhook for sale completed event
   * @apiPermission all
   */
  router.post(
    '/v1/payment/cybersource/callback',
    Middleware.Request.log,
    ctrl.callback,
    Middleware.Response.success('callback')
  );
};
