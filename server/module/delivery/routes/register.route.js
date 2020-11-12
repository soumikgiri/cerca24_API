const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const registerController = require('../controllers/register.controller');

const uploadDocument = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, config.documentDir);
    },
    filename(req, file, cb) {
      const ext = Helper.String.getExt(file.originalname);
      const nameWithoutExt = Helper.String.createAlias(Helper.String.getFileName(file.originalname, true));
      let fileName = `${nameWithoutExt}${ext}`;
      if (fs.existsSync(path.resolve(config.documentDir, fileName))) {
        fileName = `${nameWithoutExt}-${Helper.String.randomString(5)}${ext}`;
      }

      cb(null, fileName);
    },
    fileSize: 10 * 1024 * 1024 // 10MB limit
  })
});

module.exports = (router) => {
  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/register  Register a company
   * @apiDescription Register a company.
   * @apiUse authRequest
   * @apiParam {String}   email      email address
   * @apiParam {String}   password   password. min 6 characters
   * @apiParam {String}   name  Company name
   * @apiParam {String}   address Company address
   * @apiParam {String}   phoneNumber Company phone number.
   * @apiParam {String}   address Company address.
   * @apiParam {String}   city Company city.
   * @apiParam {String}   state Company state.
   * @apiParam {String}   country Company country.
   * @apiParam {String}   zipcode Company zipcode.
   * @apiParam {String}   verificationIssueId mediaId - by using upload api
   *
   * @apiPermission admin
   */
  router.post(
    '/v1/companies/register',
    registerController.register,
    Middleware.Response.success('register')
  );

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/register/document  Upload verification issue document
   * @apiDescription Upload a document for company verification. Use multipart/form-data to upload file and add additional fields
   * @apiParam {Object}   file  file data
   * @apiPermission all
   */
  router.post(
    '/v1/companies/register/document',
    uploadDocument.single('file'),
    registerController.uploadDocument,
    Middleware.Response.success('document')
  );
};
