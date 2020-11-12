const accountController = require('../controllers/payout-account.controller');

module.exports = (router) => {
  /**
   * @apiDefine payoutRequest
   * @apiParam {String}   type  `paypal` or `bank-account`
   * @apiParam {String}   [paypalAccount] Required if type is `paypal`
   * @apiParam {String}   [accountHolderName] The recipient's full name
   * @apiParam {String}   [accountNumber] The recipient's bank account number
   * @apiParam {String}   [iban] The International Bank Account Number. Read More about IBANs https://www.xendpay.com/iban
   * @apiParam {String}   [bankName]
   * @apiParam {String}   [bankAddress]
   * @apiParam {String}   [sortCode] UK Bank code (6 digits usually displayed as 3 pairs of numbers)
   * @apiParam {String}   [routingNumber] The American Bankers Association Number (consists of 9 digits) and is also called a ABA Routing Number
   * @apiParam {String}   [swiftCode] A SWIFT Code consists of 8 or 11 characters, both numbers and letters e.g. RFXLGB2L. Read more about SWIFT/BIC codes https://www.xendpay.com/swiftbic-code
   * @apiParam {String}   [ifscCode] Indian Financial System Code, which is a unique 11-digit code that identifies the bank branch i.e. ICIC0001245. Read more about IFSC Code https://www.xendpay.com/ifsc-code.
   * @apiParam {String}   [routingCode] Any other local Bank Code - eg BSB number in Australia and New Zealand (6 digits)
   */

  /**
   * @apiGroup Delivery Payout account
   * @apiVersion 1.0.0
   * @apiName Create
   * @api {post} /v1/delivery/payout/accounts
   * @apiUse authRequest
   * @apiUse payoutRequest
   * @apiPermission company
   */
  router.post(
    '/v1/delivery/payout/accounts',
    Middleware.isCompany,
    accountController.create,
    Middleware.Response.success('create')
  );

  /**
   * @apiGroup Delivery Payout account
   * @apiVersion 1.0.0
   * @apiName Update
   * @api {put} /v1/delivery/payout/accounts/:payoutAccountId
   * @apiUse authRequest
   * @apiParam {String}   payoutAccountId
   * @apiUse payoutRequest
   * @apiPermission company
   */
  router.put(
    '/v1/delivery/payout/accounts/:payoutAccountId',
    Middleware.isCompany,
    accountController.findOne,
    accountController.update,
    Middleware.Response.success('update')
  );

  /**
   * @apiGroup Delivery Payout account
   * @apiVersion 1.0.0
   * @apiName Delete
   * @api {delete} /v1/delivery/payout/accounts/:payoutAccountId
   * @apiUse authRequest
   * @apiParam {String}   payoutAccountId
   * @apiPermission company
   */
  router.delete(
    '/v1/delivery/payout/accounts/:payoutAccountId',
    Middleware.isCompany,
    accountController.findOne,
    accountController.remove,
    Middleware.Response.success('remove')
  );

  /**
   * @apiGroup Delivery Payout account
   * @apiVersion 1.0.0
   * @apiName Find one
   * @api {get} /v1/delivery/payout/accounts/:payoutAccountId
   * @apiUse authRequest
   * @apiParam {String}   payoutAccountId
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/payout/accounts/:payoutAccountId',
    Middleware.isCompany,
    accountController.findOne,
    Middleware.Response.success('payoutAccount')
  );

  /**
   * @apiGroup Delivery Payout account
   * @apiVersion 1.0.0
   * @apiName List
   * @api {get} /v1/delivery/payout/accounts?:type
   * @apiUse authRequest
   * @apiParam {String}   [type]
   * @apiUse paginationQuery
   * @apiPermission company
   */
  router.get(
    '/v1/delivery/payout/accounts',
    Middleware.isCompany,
    accountController.list,
    Middleware.Response.success('list')
  );
};
