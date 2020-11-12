describe('Test product category', () => {
  let category;
  const newCategory = {
    name: 'Honda',
    description: 'Some text'
  };
  const categoryName = 'Toyota';
  let company;
  let companyToken;
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

  it('Should create new category with company role', async () => {
    newCategory.mainImage = global.media.photo._id;
    const body = await testUtil.request('post', '/v1/companies/delivery/categories', companyToken, newCategory);

    expect(body).to.exist;
    expect(body.name).to.equal(newCategory.name);
    expect(body.description).to.equal(newCategory.description);
    expect(body.companyId).to.exist;
    category = body;
  });

  it('Should update category with company role', async () => {
    const body = await testUtil.request('put', `/v1/companies/delivery/categories/${category._id}`, companyToken, { name: categoryName });

    expect(body).to.exist;
    expect(body.name).to.equal(categoryName);
    category = body;
  });

  it('Should get category', async () => {
    const body = await testUtil.request('get', `/v1/companies/delivery/categories/${category._id}`, companyToken);

    expect(body).to.exist;
    expect(body.name).to.equal(categoryName);
  });

  it('Should get list category', async () => {
    const body = await testUtil.request('get', '/v1/companies/delivery/categories', companyToken);

    expect(body).to.exist;
    expect(body.count).to.exist;
    expect(body.items).to.exist;
  });

  it('Should get tree category', async () => {
    const body = await testUtil.request('get', '/v1/companies/delivery/categories/tree', companyToken);

    expect(body).to.exist;
    // expect(body).to.be.length(2);
  });

  it('Should not delete sub category', async () => {
    const body = await testUtil.request('delete', `/v1/companies/delivery/categories/${category._id}`, companyToken);

    expect(body).to.exist;
  });
});
