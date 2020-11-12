describe('Test delivery function', () => {
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

  describe('Test company', () => {
    it('User should get verified companies list', async () => {
      const body = await testUtil.request('get', '/v1/companies/delivery');

      expect(body).to.exist;
      expect(body.count).to.exist;
      expect(body.items).to.have.length(1);
    });
  });
});
