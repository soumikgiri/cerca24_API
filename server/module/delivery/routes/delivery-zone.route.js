const zoneController = require('../controllers/delivery-zone.controller');

module.exports = (router) => {
  /**
   * @apiDefine deliveryZoneRequest
   * @apiParam {String}   name        Zone name required
   * @apiParam {String}   [city] city required
   * @apiParam {Array}   [areas] areas in city
   * @apiParam {Number}   [deliveryPrice] required
   * @apiParam {String}   [companyId] available with admin only
   */

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/zones?:name&:companyId  Get list zones
   * @apiDescription Get list zones base on company
   * @apiParam {String}   [name]      zone name
   * @apiPermission Admin or Company
   */
  router.get(
    '/v1/companies/delivery/zones',
    Middleware.isCompany,
    zoneController.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/delivery/zones  Create new zone
   * @apiDescription Create new zone
   * @apiUse authRequest
   * @apiUse deliveryZoneRequest
   * @apiPermission Admin or Company
   */
  router.post(
    '/v1/companies/delivery/zones',
    Middleware.isCompany,
    zoneController.create,
    Middleware.Response.success('deliveryZone')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/delivery/zones/:id  Update a zone
   * @apiDescription Update a zone
   * @apiUse authRequest
   * @apiUse deliveryZoneRequest
   * @apiPermission Admin or Company
   */
  router.put(
    '/v1/companies/delivery/zones/:id',
    Middleware.isCompany,
    zoneController.findOne,
    zoneController.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {delete} /v1/companies/delivery/zones/:id Remove a category
   * @apiDescription Remove a zone
   * @apiUse authRequest
   * @apiParam {String}   id        zone id
   * @apiPermission Admin or Company
   */
  router.delete(
    '/v1/companies/delivery/zones/:id',
    Middleware.isCompany,
    zoneController.findOne,
    zoneController.remove,
    Middleware.Response.success('remove')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/zones/:id Get zone details
   * @apiDescription Get zone details
   * @apiParam {String}   id        zone id
   * @apiPermission Admin or Company
   */
  router.get(
    '/v1/companies/delivery/zones/:id',
    Middleware.isCompany,
    zoneController.findOne,
    Middleware.Response.success('deliveryZone')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/:companyId/delivery/zones Get zone details
   * @apiDescription Get zone details by area
   * @apiParam {String}   companyId        companyId
   * @apiParam {String}   area        if city have not areas, city = area
   * @apiPermission All
   */
  router.get(
    '/v1/companies/:companyId/delivery/zones',
    zoneController.findOneByArea,
    Middleware.Response.success('list')
  );
};
