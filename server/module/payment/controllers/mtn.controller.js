// we will check hook notification from server - server
// will not allow client to client
exports.callback = async (req, res, next) => {
  try {
    if (!req.body.data) {
      res.locals.callback = {
        message: 'Request is invalid'
      };
      return next();
    }

    const data = JSON.parse(req.body.data);
    if (!data.transactionID || !data.reference) {
      res.locals.callback = {
        message: 'Request is invalid'
      };
      return next();
    }
    // data: {"reference":"5c237dc167aead03a4134838","msg":"Successfully processed transaction.","code":"00","system_code":"01","transactionID":"574016"}
    await Service.Payment.updateMTNSinglePayment(data.reference, data);
    return res.status(200).send({
      code: '00',
      msg: 'Successfully processed transaction.'
    });
  } catch (e) {
    return res.status(200).send({
      code: '01',
      msg: 'Failed transaction.'
    });
  }
};
