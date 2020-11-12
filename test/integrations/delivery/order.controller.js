describe('Test order', () => {
  let product;
  let shop;
  let subOrder;
  let company;
  let driver;
  let companyToken;
  let driverToken;

  before(async () => {
    shop = new DB.Shop({
      name: 'shop test',
      ownerId: global.admin._id,
      storeWideShipping: true,
      shippingSettings: {
        defaultPrice: 10,
        perQuantityPrice: 5
      }
    });
    await shop.save();

    await DB.User.update({
      _id: global.admin._id
    }, {
      $set: { shopId: shop._id, isShop: true }
    });

    product = new DB.Product({
      name: 'product 1',
      price: 100,
      stockQuantity: 10,
      shopId: shop._id,
      freeShip: false,
      taxClass: 'VAT',
      taxPercentage: 20
    });

    await product.save();

    company = new DB.Company({
      name: 'Com1',
      email: 'com1234@testing.com',
      password: '123456',
      emailVerified: true,
      verified: true,
      activated: true
    });
    await company.save();

    const body = await testUtil.request('post', '/v1/auth/company/login', null, {
      email: 'com1234@testing.com',
      password: '123456'
    });
    companyToken = body.token;

    driver = new DB.Driver({
      email: 'newdriver@test.com',
      password: '123456',
      firstName: 'First',
      lastName: 'Last',
      phoneNumber: '+98751123',
      address: '123 somewhere',
      state: 'some there',
      city: 'city',
      country: 'US',
      zipcode: '12345',
      activated: true,
      companyId: company._id
    });
    await driver.save();
  });

  describe('Test orders', () => {
    let orderDetail;
    before(async () => {
      const order = new DB.Order({
        details: [],
        shopId: shop._id,
        paymentStatus: 'paid',
        paymentMethod: 'cybersource'
      });
      await order.save();
      orderDetail = new DB.OrderDetail({
        orderId: order._id,
        deliveryCompanyId: company._id,
        paymentStatus: 'paid',
        paymentMethod: 'cybersource',
      });
      await orderDetail.save();
    });

    it('Should get list of orders include details with company role', async () => {
      const body = await testUtil.request('get', '/v1/companies/delivery/orders', companyToken);
      expect(body).to.exist;
      expect(body.count).to.exist;
      expect(body.items).to.exist;
      expect(body.items).have.length(1);
      subOrder = body.items[0];
    });

    it('Should assign driver to order', async () => {
      const body = await testUtil.request('post', `/v1/companies/delivery/orders/${orderDetail._id}/assign/drivers`, companyToken, {
        driverId: driver._id
      });
      expect(body).to.exist;
      expect(body.success).to.equal(true);
    });

    it('Should change category to order', async () => {
      const body = await testUtil.request('put', `/v1/companies/delivery/orders/${orderDetail._id}/categories`, companyToken, {
        // fake
        categoryId: '5c2c30e15f015b127cef5503'
      });
      expect(body).to.exist;
      expect(body.deliveryCategoryId).to.equal('5c2c30e15f015b127cef5503');
    });
  });
});
