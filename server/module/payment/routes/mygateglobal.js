const mygateglobalController = require('../controllers/mygateglobal.controller');

module.exports = (router) => {
  /**
   * @apiGroup Payment
   * @apiVersion 1.0.0
   * @api {get} /v1/payment/mygateglobal/callback  Mygateglobal callback return url
   * @apiDescription update transaction base on request
   * @apiPermission all
   */
  router.get(
    '/v1/payment/mygateglobal/callback',
    Middleware.Request.log,
    mygateglobalController.callback,
    Middleware.Response.success('callback')
  );

  /**
   * @apiGroup Payment
   * @apiVersion 1.0.0
   * @api {post} /v1/payment/mygateglobal/hook  Mygateglobal webhook
   * @apiDescription Mygateglobal webhook for sale completed event
   * @apiPermission all
   */
  router.post(
    '/v1/payment/mygateglobal/callback',
    Middleware.Request.log,
    mygateglobalController.callback,
    Middleware.Response.success('callback')
  );
};
