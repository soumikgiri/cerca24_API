const orderCtrl = require('../controllers/order.controller');

module.exports = (router) => {
  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/orders Get Orders
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.get(
    '/v1/companies/delivery/orders',
    Middleware.isCompany,
    orderCtrl.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/orders/:orderId Get Order detail
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.get(
    '/v1/companies/delivery/orders/:orderDetailId',
    Middleware.isCompany,
    orderCtrl.details,
    Middleware.Response.success('details')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/delivery/orders/:orderDetailId/assign/drivers Assign order to driver
   * @apiParam {String} driverId Driver of company
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.post(
    '/v1/companies/delivery/orders/:orderDetailId/assign/drivers',
    Middleware.isCompany,
    orderCtrl.assignDriver,
    Middleware.Response.success('assignDriver')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/delivery/orders/assign/drivers Assign orders to driver
   * @apiParam {String} driverId Driver of company
   * @apiParam {String[]} orderDetailIds
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.post(
    '/v1/companies/delivery/orders/assign/drivers',
    Middleware.isCompany,
    orderCtrl.assignDriverMultiple,
    Middleware.Response.success('assignDriverMultiple')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/delivery/orders/:orderDetailId/categories Update category
   * @apiParam {String} categoryId Shop category Id
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.put(
    '/v1/companies/delivery/orders/:orderDetailId/categories',
    Middleware.isCompany,
    orderCtrl.updateCategory,
    Middleware.Response.success('updateCategory')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/delivery/orders/:orderDetailId/status Update delivery
   * @apiParam {String} orderDetailId
   * @apiParam {String} status 'processing', 'pickedUp', 'onTheWay', 'cancelled', 'postponed', 'deliveried'
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.put(
    '/v1/companies/delivery/orders/:orderDetailId/status',
    Middleware.isCompany,
    orderCtrl.updateDeliveryStatus,
    Middleware.Response.success('updateDeliveryStatus')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/orders/:orderDetailId/pdf Get pdf
   * @apiParam {String} orderDetailId
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.get(
    '/v1/companies/delivery/orders/:orderDetailId/pdf',
    Middleware.isCompany,
    orderCtrl.downloadPdf
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/delivery/orders/:orderDetailId/status Driver update delivery
   * @apiParam {String} orderDetailId
   * @apiParam {String} status 'deliveried', 'pickedUp', 'onTheWay', 'postponed'
   * @apiUse authRequest
   *
   * @apiPermission driver
   */
  router.put(
    '/v1/drivers/delivery/orders/:orderDetailId/status',
    Middleware.isDriver,
    orderCtrl.updateDeliveryStatus,
    Middleware.Response.success('updateDeliveryStatus')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers/delivery/orders Get driver Orders
   * @apiUse authRequest
   *
   * @apiPermission driver
   */
  router.get(
    '/v1/drivers/delivery/orders',
    Middleware.isDriver,
    orderCtrl.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers/delivery/orders/:orderId Get driver order detail
   * @apiUse authRequest
   *
   * @apiPermission driver
   */
  router.get(
    '/v1/drivers/delivery/orders/:orderDetailId',
    Middleware.isDriver,
    orderCtrl.details,
    Middleware.Response.success('details')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers/delivery/orders/:orderDetailId/driver/location Get driver location by order
   * @apiUse authRequest
   *
   * @apiPermission driver
   */
  router.get(
    '/v1/drivers/delivery/orders/:orderDetailId/driver/location',
    // Middleware.isAuthenticated,
    orderCtrl.getOrderDriverLocation,
    Middleware.Response.success('location')
  );
};
