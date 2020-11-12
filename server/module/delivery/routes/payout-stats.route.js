const payoutCtrl = require('../controllers/payout-stats.controller');

module.exports = (router) => {
  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Get balance
   * @apiDescription Get current balance of current company
   * @api {get} /v1/delivery/balance
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/balance',
    Middleware.isCompany,
    payoutCtrl.balance,
    Middleware.Response.success('balance')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Get balance by company
   * @apiDescription Get current balance of company
   * @api {get} /v1/delivery/balance/:companyId
   * @apiPermission admin
   */
  router.get(
    '/v1/delivery/balance/:companyId',
    Middleware.hasRole('admin'),
    payoutCtrl.balance,
    Middleware.Response.success('balance')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Stats current company
   * @apiDescription Get statistic for the current company
   * @api {get} /v1/delivery/stats?:companyId&:startDate&:toDate
   * @apiParam {String} [companyId] allow company if admin
   * @apiParam {Date} [startDate] UTC time format
   * @apiParam {Date} [toDate] UTC time format
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/stats',
    Middleware.isCompany,
    payoutCtrl.stats,
    Middleware.Response.success('stats')
  );
};
