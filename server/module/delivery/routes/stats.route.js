const statsController = require('../controllers/stats.controller');

module.exports = (router) => {
  /**
   * @apiGroup Delivery Statistic
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/orders/stats?deliveryCompanyId Order stats
   * @apiDescription Get stats for order. Allow company or admin
   * @apiUse authRequest
   * @apiParam {String} [deliveryCompanyId] Allow to filter by shop if admin
   * @apiPermission company
   *  {
   *     "code": 200,
   *     "message": "OK",
   *     "data": {
   *         "processing": 1,
   *         "pickedUp": 1,
   *         "onTheWay": 1,
   *         "cancelled": 1,
   *         "postponed": 1,
   *         "deliveried": 1,
   *         "all": 1
   *     },
   *     "error": false
   *  }
   */
  router.get(
    '/v1/companies/delivery/orders/stats',
    Middleware.isCompany,
    statsController.deliveryStats,
    Middleware.Response.success('stats')
  );

  /**
   * @apiGroup Delivery Statistic
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/orders/stats/sales?deliveryCompanyId Sale stats
   * @apiDescription Get stats sale. Allow admin or selle
   * @apiUse authRequest
   * @apiParam {String} [deliveryCompanyId] Allow to filter by shop if admin
   * @apiPermission company
   * @apiSuccessExample {json} Success-Response:
   *  {
   *     "code": 200,
   *     "message": "OK",
   *     "data": {
   *         "balance": 1,
   *         "commission": 1,
   *         "totalPrice": 1,
   *         "totalOrder": 1,
   *         "totalProduct": 1
   *     },
   *     "error": false
   *  }
   */
  router.get(
    '/v1/companies/delivery/orders/stats/sales',
    Middleware.isCompany,
    statsController.saleStats,
    Middleware.Response.success('saleStats')
  );
};
