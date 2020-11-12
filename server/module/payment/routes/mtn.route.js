const ctrl = require('../controllers/mtn.controller');

module.exports = (router) => {
  /**
   * @apiGroup Payment
   * @apiVersion 1.0.0
   * @api {post} /v1/payment/mtn/callback  MTN webhook
   * @apiDescription MTN webhook for sale completed event
   * @apiPermission all
   */
  router.post(
    '/v1/payment/mtn/callback',
    Middleware.Request.log,
    ctrl.callback
  );
};
