const importExportController = require('../controllers/import-export.controller');

module.exports = (router) => {
  /**
   * @apiGroup Company order
   * @apiVersion 1.0.0
   * @apiName Export company order to csv
   * @api {get} /v1/orders/companny/export/csv?&startDate&toDate&fileName&status&deliveryStatus
   * @apiDescription generate order to csv. Add `access_token` in the query string for authenticated
   * @apiParam {String}   [startDate] start time in UTC format
   * @apiParam {String}   [toDate] to time in UTC format
   * @apiParam {String}   [fileName] File name server will response
   * @apiParam {String}   [deliveryStatus] 'pending', 'processing', 'pickedUp', 'onway', 'cancelled', 'postponed'
   * @apiUse authRequest
   * @apiPermission company
   */
  router.get(
    '/v1/companies/delivery/orders/export/csv',
    Middleware.isCompany,
    importExportController.toCsv
  );
};