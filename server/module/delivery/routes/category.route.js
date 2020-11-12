const categoryController = require('../controllers/category.controller');

module.exports = (router) => {
  /**
   * @apiDefine deliveryCompanyRequest
   * @apiParam {String}   name        Category name
   * @apiParam {String}   [description]
   * @apiParam {Number}   [ordering]
   * @apiParam {String}   [parentId]
   * @apiParam {String}   [companyId] available with admin user only
   */

  /**
   * @apiGroup Company
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/categories?:name&:alias  Get list category
   * @apiDescription Get list categorys
   * @apiParam {String}   [name]      category name
   * @apiPermission all
   */
  router.get(
    '/v1/companies/delivery/categories',
    categoryController.list,
    Middleware.Response.success('list')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {post} /v1/companies/delivery/categories  Create new category
   * @apiDescription Create new category
   * @apiUse authRequest
   * @apiUse deliveryCompanyRequest
   * @apiPermission superadmin
   */
  router.post(
    '/v1/companies/delivery/categories',
    Middleware.isCompany,
    categoryController.create,
    Middleware.Response.success('companyCategory')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {put} /v1/companies/delivery/categories/:id  Update a category
   * @apiDescription Update a category
   * @apiUse authRequest
   * @apiUse deliveryCompanyRequest
   * @apiPermission superadmin
   */
  router.put(
    '/v1/companies/delivery/categories/:id',
    Middleware.isCompany,
    categoryController.findOne,
    categoryController.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {delete} /v1/companies/delivery/categories/:id Remove a category
   * @apiDescription Remove a category
   * @apiUse authRequest
   * @apiParam {String}   id        Category id
   * @apiPermission superadmin
   */
  router.delete(
    '/v1/companies/delivery/categories/:id',
    Middleware.isCompany,
    categoryController.findOne,
    categoryController.remove,
    Middleware.Response.success('remove')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/categories/tree Get tree
   * @apiDescription Get tree
   * @apiPermission all
   */
  router.get(
    '/v1/companies/delivery/categories/tree',
    Middleware.isCompany,
    categoryController.tree,
    Middleware.Response.success('tree')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/categories/tree/:companyId Get tree by company
   * @apiDescription Get tree
   * @apiPermission all
   */
  router.get(
    '/v1/companies/delivery/categories/tree/:companyId',
    Middleware.hasRole('admin'),
    categoryController.tree,
    Middleware.Response.success('tree')
  );

  /**
   * @apiGroup Company category
   * @apiVersion 1.0.0
   * @api {get} /v1/companies/delivery/categories/:id Get category details
   * @apiDescription Get category details
   * @apiParam {String}   id        category id
   * @apiPermission all
   */
  router.get(
    '/v1/companies/delivery/categories/:id',
    Middleware.isCompany,
    categoryController.findOne,
    Middleware.Response.success('companyCategory')
  );
};
