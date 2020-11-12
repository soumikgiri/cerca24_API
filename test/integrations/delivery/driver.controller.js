const path = require('path');

const avatarPath = path.join(__dirname, '..', '..', 'assets', 'image.png');


describe('Test Driver', () => {
  const newDriver = {
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
    activated: true
  };

  let company;
  let driver;
  let companyToken;
  let driverToken;
  before(async () => {
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
  });


  describe('Test create', () => {
    it('Admin should not create new driver with company id', async () => {
      const body = await testUtil.request('post', '/v1/drivers', global.adminToken, newDriver, 400);

      expect(body).to.exist;
    });

    it('Admin should create new driver with company id', async () => {
      newDriver.companyId = company._id;
      const body = await testUtil.request('post', '/v1/drivers', global.adminToken, newDriver);

      expect(body).to.exist;
      expect(body.companyId).to.equal(company._id.toString());
      driver = body;
    });

    it('Company should create new driver without', async () => {
      newDriver.email = 'newdriver2testing@yopmail.com';
      const body = await testUtil.request('post', '/v1/drivers', companyToken, newDriver);

      expect(body).to.exist;
      expect(body.companyId).to.equal(company._id.toString());
      driver = body;
    });
  });

  describe('Test update', () => {
    it('Admin should update driver', async () => {
      const body = await testUtil.request('put', `/v1/drivers/${driver._id}`, global.adminToken, {
        firstName: 'Test name'
      });

      expect(body).to.exist;
      expect(body.firstName).to.equal('Test name');
      driver = body;
    });

    it('Company should update driver', async () => {
      const body = await testUtil.request('put', `/v1/drivers/${driver._id}`, companyToken, {
        firstName: 'Test name 2'
      });

      expect(body).to.exist;
      expect(body.firstName).to.equal('Test name 2');
      driver = body;
    });
  });

  describe('Test info', () => {
    it('Admin get list all drivers', async () => {
      const body = await testUtil.request('get', '/v1/drivers', global.adminToken);

      expect(body).to.exist;
      expect(body.count).to.exist;
      expect(body.items).to.have.length(2);
    });

    it('Company should get list drivers in company', async () => {
      const body = await testUtil.request('get', '/v1/drivers', companyToken);

      expect(body).to.exist;
      expect(body.count).to.exist;
      expect(body.items).to.have.length(2);
    });

    it('Company get driver info', async () => {
      const body = await testUtil.request('get', `/v1/drivers/${driver._id}`, companyToken);

      expect(body).to.exist;
      expect(body._id).to.exist;
    });
  });

  describe('Test login', () => {
    it('Driver should login', async () => {
      const body = await testUtil.request('post', '/v1/auth/driver/login', null, {
        email: 'newdriver@test.com',
        password: '123456'
      });
      expect(body).to.exist;
      expect(body.token).to.exist;
      driverToken = body.token;
    });

    it('Driver should get my profile', async () => {
      const body = await testUtil.request('get', '/v1/drivers/me', driverToken);
      expect(body).to.exist;
      expect(body._id).to.exist;
    });
  });

  describe('Test avatar', () => {
    it('Driver should update avatar', async () => {
      await request.post('/v1/drivers/avatar')
        .set('Authorization', `Bearer ${driverToken}`)
        .attach('avatar', avatarPath)
        .expect(200)
        .then((res) => {
          const body = res.body.data;
          expect(body).to.exist;
          expect(body.url).to.exist;
        });
    });

    it('Driver should update avatar by company', async () => {
      await request.post(`/v1/drivers/${driver._id}/avatar`)
        .set('Authorization', `Bearer ${companyToken}`)
        .attach('avatar', avatarPath)
        .expect(200)
        .then((res) => {
          const body = res.body.data;
          expect(body).to.exist;
          expect(body.url).to.exist;
        });
    });
  });

  describe('Test location', () => {
    it('Driver should update location', async () => {
      const body = await testUtil.request('post', '/v1/drivers/location', driverToken, {
        location: [0, 0]
      });
      expect(body).to.exist;
      expect(body.success).to.equal(true);
    });
  });
});
