const multer = require('multer');

const uploadLogo = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/logo/');
    },
    filename(req, file, cb) {
      const fileName = Helper.String.randomString(5) + Helper.String.getExt(file.originalname);
      cb(null, fileName);
    }
  })
});
const companyCtrl = require('../controllers/company.controller');

module.exports = (router) => {
  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {put} /v1/companies  Create company
   * @apiUse authRequest
   * @apiDescription Create company
   *
   * @apiParam {String}   email      email address of company
   * @apiParam {String}   name  Company name
   * @apiParam {String}   [address] Company address
   * @apiParam {String}   [phoneNumber] Company phone number
   * @apiParam {String}   [city] Company city
   * @apiParam {String}   [state] Company state
   * @apiParam {String}   [country] Company country
   * @apiParam {String}   [zipcode] Company zipcode
   * @apiParam {String}   [verificationIssueId] mediaId - by using upload api
   * @apiParam {String}   [logoId] mediaId - media id by upload
   * @apiParam {String}   [verified] For admin user only
   * @apiParam {String}   [activated] For admin user only
   * @apiParam {String}   [emailVerified] For admin user only
   * @apiPermission admin
   */
  router.post(
    '/v1/companies',
    Middleware.hasRole('admin'),
    companyCtrl.create,
    Middleware.Response.success('create')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/:id  Update company
   * @apiUse authRequest
   * @apiDescription Update company
   *
   * @apiParam {String}   [email]      email address of company
   * @apiParam {String}   [name]  Company name
   * @apiParam {String}   [address] Company address
   * @apiParam {String}   [phoneNumber] Company phone number
   * @apiParam {String}   [city] Company city
   * @apiParam {String}   [state] Company state
   * @apiParam {String}   [country] Company country
   * @apiParam {String}   [zipcode] Company zipcode
   * @apiParam {String}   [verificationIssueId] mediaId - by using upload api
   * @apiParam {String}   [logoId] mediaId - media id by upload
   * @apiParam {String}   [verified] For admin user only
   * @apiParam {String}   [activated] For admin user only
   * @apiParam {String}   [emailVerified] For admin user only
   * @apiParam {Number}   [siteCommission] For admin user only
   * @apiParam {Number}   [deliveryPrice] For admin user only. it is shipping price
   * @apiPermission company or admin
   */
  router.put(
    '/v1/companies',
    Middleware.isCompany,
    companyCtrl.update,
    Middleware.Response.success('update')
  );

  router.put(
    '/v1/companies/:companyId',
    Middleware.hasRole('admin'),
    companyCtrl.findOne,
    companyCtrl.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies&email&phoneNumber&name&activated&emailVefiedid&email List
   * @apiUse authRequest
   * @apiUse paginationQuery
   *
   * @apiPermission admin
   */
  router.get(
    '/v1/companies',
    Middleware.hasRole('admin'),
    companyCtrl.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/me Get my company
   * @apiUse authRequest
   *
   * @apiPermission company
   */
  router.get(
    '/v1/companies/me',
    Middleware.isCompany,
    companyCtrl.findOne,
    Middleware.Response.success('company')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery Get delivery company list
   *
   * @apiPermission all
   */
  router.get(
    '/v1/companies/delivery',
    companyCtrl.deliveryCompanies,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/:companyId Get company details
   * @apiUse authRequest
   *
   * @apiPermission admin
   */
  router.get(
    '/v1/companies/:companyId',
    Middleware.hasRole('admin'),
    companyCtrl.findOne,
    Middleware.Response.success('company')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/:companyId/logo  Change logo
   * @apiDescription Change company logo. Use multipart/formdata
   * @apiUse authRequest
   * @apiParam {Object}  logo file data
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
    '/v1/companies/:companyId/logo',
    Middleware.hasRole('admin'),
    uploadLogo.single('logo'),
    companyCtrl.updateLogo,
    Middleware.Response.success('updateLogo')
  );

  /**
   * @apiGroup User
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/logo  Change current company logo
   * @apiDescription Change company logo. Use multipart/formdata
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
   * @apiPermission company
   */
  router.post(
    '/v1/companies/logo',
    Middleware.isCompany,
    uploadLogo.single('logo'),
    companyCtrl.updateLogo,
    Middleware.Response.success('updateLogo')
  );
};
