const multer = require('multer');

const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/avatar/');
    },
    filename(req, file, cb) {
      const fileName = Helper.String.randomString(5) + Helper.String.getExt(file.originalname);
      cb(null, fileName);
    }
  })
});

const driverCtrl = require('../controllers/driver.controller');

module.exports = (router) => {
  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {put} /v1/drivers  Create new driver
   * @apiUse authRequest
   * @apiDescription Update driver
   *
   * @apiParam {String}   email      email address
   * @apiParam {String}   firstName  Driver name
   * @apiParam {String}   lastName  Driver name
   * @apiParam {String}   [address] Driver address
   * @apiParam {String}   [phoneNumber] Driver phone number
   * @apiParam {String}   [city] Driver city
   * @apiParam {String}   [state] Driver state
   * @apiParam {String}   [country] Driver country
   * @apiParam {String}   [zipcode] Driver zipcode
   * @apiParam {String}   [companyId] For admin user only
   * @apiParam {String}   [activated] For admin user only
   * @apiParam {String}   [emailVerified] For admin user only
   * @apiPermission company or admin
   */
  router.post(
    '/v1/drivers',
    Middleware.isCompany,
    driverCtrl.create,
    Middleware.Response.success('create')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {put} /v1/drivers/:id  Update driver
   * @apiUse authRequest
   * @apiDescription Update driver
   *
   * @apiParam {String}   firstName  Driver name
   * @apiParam {String}   lastName  Driver name
   * @apiParam {String}   [address] Driver address
   * @apiParam {String}   [phoneNumber] Driver phone number
   * @apiParam {String}   [city] Driver city
   * @apiParam {String}   [state] Driver state
   * @apiParam {String}   [country] Driver country
   * @apiParam {String}   [zipcode] Driver zipcode
   * @apiParam {String}   [companyId] For admin user only
   * @apiParam {String}   [activated] For admin user only
   * @apiParam {String}   [emailVerified] For admin user only
   * @apiPermission company or admin
   */
  router.put(
    '/v1/drivers/:driverId',
    Middleware.isCompany,
    driverCtrl.findOne,
    driverCtrl.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {put} /v1/drivers/:id  Update me
   * @apiUse authRequest
   * @apiDescription Update driver
   */
  router.put(
    '/v1/drivers',
    Middleware.isDriver,
    driverCtrl.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers/me Get my driver
   * @apiUse authRequest
   *
   * @apiPermission driver
   */
  router.get(
    '/v1/drivers/me',
    Middleware.isDriver,
    driverCtrl.findOne,
    Middleware.Response.success('driver')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers/:driverId Get driver details
   * @apiUse authRequest
   *
   * @apiPermission admin
   */
  router.get(
    '/v1/drivers/:driverId',
    Middleware.isCompany,
    driverCtrl.findOne,
    Middleware.Response.success('driver')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {get} /v1/drivers?email&phoneNumber&name&activated&emailVerified&companyId List
   * @apiUse authRequest
   * @apiUse paginationQuery
   *
   * @apiPermission admin
   */
  router.get(
    '/v1/drivers',
    Middleware.isCompany,
    driverCtrl.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Driver
   * @apiVersion 1.0.0
   * @api {post} /v1/drivers/:driverId/avatar  Change avatar
   * @apiDescription Change user avatar. Use multipart/formdata
   * @apiUse authRequest
   * @apiParam {Object}  avatar file data
   *
   * @apiSuccessExample {json} Response-Success
   * {
   *    "code": 200,
   *    "message": "OK",
   *    "data": {
   *        "url": "http://url/to/avatar.jpg"
   *    },
   *    "error": false
   * }
   * @apiPermission admin
   */
  router.post(
    '/v1/drivers/:driverId/avatar',
    Middleware.isCompany,
    uploadAvatar.single('avatar'),
    driverCtrl.updateAvatar,
    Middleware.Response.success('updateAvatar')
  );

  /**
   * @apiGroup Diver
   * @apiVersion 1.0.0
   * @api {post} /v1/drivers/avatar  Change current driver avatar
   * @apiDescription Change user avatar. Use multipart/formdata
   * @apiUse authRequest
   * @apiParam {Object}  avatar file data
   *
   * @apiSuccessExample {json} Response-Success
   * {
   *    "code": 200,
   *    "message": "OK",
   *    "data": {
   *        "url": "http://url/to/avatar.jpg"
   *    },
   *    "error": false
   * }
   * @apiPermission driver
   */
  router.post(
    '/v1/drivers/avatar',
    Middleware.isDriver,
    uploadAvatar.single('avatar'),
    driverCtrl.updateAvatar,
    Middleware.Response.success('updateAvatar')
  );

  /**
   * @apiGroup Diver
   * @apiVersion 1.0.0
   * @api {post} /v1/drivers/location  Change location
   * @apiDescription Change current driver location
   * @apiUse authRequest
   * @apiParam {Number[]}  location [logitude, latitude]
   *
   * @apiSuccessExample {json} Response-Success
   * {
   *    "code": 200,
   *    "message": "OK",
   *    "data": {
   *        "success": true
   *    },
   *    "error": false
   * }
   * @apiPermission driver
   */
  router.post(
    '/v1/drivers/location',
    Middleware.isDriver,
    driverCtrl.updateLocation,
    Middleware.Response.success('updateLocation')
  );
};
