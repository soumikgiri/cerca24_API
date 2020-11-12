const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'assets', 'image.png');

describe('Test Company', () => {
  const newCompany = {
    email: 'newcompany@test.com',
    password: '123456',
    name: 'Company test',
    phoneNumber: '+98751123',
    address: '123 somewhere',
    state: 'some there',
    city: 'city',
    country: 'US',
    zipcode: '12345',
    verificationIssueId: '5b4431a14c8ffd5cb5e0fdf0' // fake id just for testing
  };

  let company;
  let companyToken;

  describe('Test upload document for registration issue', () => {
    it('Should be able to upload document and response id', async () => {
      await request.post('/v1/companies/register/document')
        .attach('file', filePath)
        .expect(200)
        .then((res) => {
          const body = res.body.data;
          expect(body).to.exist;
          expect(body._id).to.exist;

          newCompany.verificationIssueId = body._id;
        });
    });
  });

  describe('Test register company', () => {
    it('Should create new company', async () => {
      const body = await testUtil.request('post', '/v1/companies/register', null, newCompany);

      expect(body).to.exist;
    });

    it('Admin should create new company', async () => {
      const data = Object.assign(newCompany, {
        email: 'newtestcompanyemail@yopmail.com'
      });
      const body = await testUtil.request('post', '/v1/companies', global.adminToken, data);

      expect(body).to.exist;
      expect(body._id).to.exist;
    });
  });

  describe('Test update', () => {
    before(async () => {
      company = await DB.Company.findOne();
    });

    it('Admin should update company', async () => {
      const body = await testUtil.request('put', `/v1/companies/${company._id}`, global.adminToken, {
        verified: true,
        emailVerified: true,
        activated: true
      });

      expect(body).to.exist;
      company = body;

      const test = await DB.Company.findOne({ _id: company._id });
      expect(test.verified).to.equal(true);
      expect(test.emailVerified).to.equal(true);
      expect(test.activated).to.equal(true);
    });
  });

  describe('Test auth', () => {
    it('Should login succesfully', async () => {
      const body = await testUtil.request('post', '/v1/auth/company/login', null, {
        email: 'newcompany@test.com',
        password: '123456'
      });

      expect(body).to.exist;
      expect(body.token).to.exist;
      companyToken = body.token;
    });
  });

  describe('Test get info', () => {
    it('Should get my company info', async () => {
      const body = await testUtil.request('get', '/v1/companies/me', companyToken);

      expect(body).to.exist;
      expect(body._id).to.exist;
    });

    it('Admin should find company info', async () => {
      const body = await testUtil.request('get', `/v1/companies/${company._id}`, global.adminToken);

      expect(body).to.exist;
      expect(body._id).to.exist;
    });

    it('Admin should find list companies', async () => {
      const body = await testUtil.request('get', '/v1/companies', global.adminToken);

      expect(body).to.exist;
      expect(body.count).to.exist;
      expect(body.items).to.exist;
    });
  });

  describe('Test logo', () => {
    it('Company should update logo', async () => {
      await request.post('/v1/companies/logo')
        .set('Authorization', `Bearer ${companyToken}`)
        .attach('logo', filePath)
        .expect(200)
        .then((res) => {
          const body = res.body.data;
          expect(body).to.exist;
          expect(body.url).to.exist;
        });
    });

    it('Company should update logo', async () => {
      await request.post(`/v1/companies/${company._id}/logo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', filePath)
        .expect(200)
        .then((res) => {
          const body = res.body.data;
          expect(body).to.exist;
          expect(body.url).to.exist;
        });
    });
  });
});
