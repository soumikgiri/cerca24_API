const requestController = require('../controllers/payout-request.controller');

module.exports = (router) => {
  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Send request
   * @api {post} /v1/delivery/payout/request
   * @apiParam {String}   payoutAccountId
   * @apiPermission company
   */
  router.post(
    '/v1/delivery/payout/request',
    Middleware.isCompany,
    requestController.request,
    Middleware.Response.success('request')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Reject
   * @api {post} /v1/delivery/payout/request/:requestId/reject
   * @apiParam {String}   requestId
   * @apiParam {String}   rejectReason Reason why reject this request from admin
   * @apiParam {String}   [note] Custom any note to request
   * @apiPermission admin
   */
  router.post(
    '/v1/delivery/payout/request/:requestId/reject',
    Middleware.hasRole('admin'),
    requestController.reject,
    Middleware.Response.success('reject')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Approve
   * @api {post} /v1/delivery/payout/request/:requestId/approve
   * @apiParam {String}   requestId
   * @apiParam {String}   [note] Custom any note to request
   * @apiPermission admin
   */
  router.post(
    '/v1/delivery/payout/request/:requestId/approve',
    Middleware.hasRole('admin'),
    requestController.approve,
    Middleware.Response.success('approve')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Get list
   * @api {get} /v1/delivery/payout/requests?:type&:shopId&:status&:code
   * @apiUse paginationQuery
   * @apiParam {String} [type] `paypal` or `bank-account`
   * @apiParam {String} [status] Allow empty, `approved` or `rejected`
   * @apiParam {String} [shopId] The shop, allow for admin account only
   * @apiParam {String} [code] search text for code
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/payout/requests',
    Middleware.isCompany,
    requestController.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Delivery Request Payout
   * @apiVersion 1.0.0
   * @apiName Find one
   * @api {get} /v1/delivery/payout/requests/:requestId
   * @apiParam {String} requestId
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/payout/requests/:requestId',
    Middleware.isCompany,
    requestController.findOne,
    Middleware.Response.success('payoutRequest')
  );
};
