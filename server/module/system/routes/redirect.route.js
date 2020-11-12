const url = require('url');

module.exports = (router) => {
  // simple page for redirect endpoint
  router.post(
    '/v1/redirect',
    (req, res, next) => {
      if (!req.query.url) {
        return next(new Error('Missing url'));
      }

      if (req.body.decision === 'DECLINE' && req.body.req_override_custom_cancel_page) {
        const parser = url.parse(req.body.req_override_custom_cancel_page, true);
        if (parser.query && parser.query.url) {
          return res.redirect(parser.query.url);
        }
        return res.redirect(req.body.req_override_custom_cancel_page);
      }

      return res.redirect(req.query.url);
    }
  );
  router.get(
    '/v1/redirect',
    (req, res, next) => {
      if (!req.query.url) {
        return next(new Error('Missing url'));
      }

      return res.redirect(req.query.url);
    }
  );
};
