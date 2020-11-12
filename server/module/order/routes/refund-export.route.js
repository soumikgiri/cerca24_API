const importExportController = require('../controllers/refund-export.controller');

module.exports = (router) => {
  /**
   * @apiGroup Export_Import
   * @apiVersion 1.0.0
   * @api {get} /v1/refundRequests/export/csv?startDate&toDate&fileName Export refund request to csv
   * @apiDescription generate order to csv. Add `access_token` in the query string for authenticated
   * @apiParam {String}   [startDate] start time in UTC format
   * @apiParam {String}   [toDate] to time in UTC format
   * @apiParam {String}   [fileName] File name server will response
   * @apiUse authRequest
   * @apiPermission seller
   */
  router.get(
    '/v1/refundRequests/export/csv',
    Middleware.isAuthenticated,
    Middleware.isAdminOrSeller,
    importExportController.toCsv
  );
};
