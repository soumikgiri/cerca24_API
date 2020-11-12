/* eslint no-restricted-syntax: 0, no-await-in-loop: 0, guard-for-in: 0 */
module.exports = async (companyId = null) => {
  try {
    await Service.Company.seedDefaultZones(companyId);
  } catch (e) {
    throw e;
  }
};
