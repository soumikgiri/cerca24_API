/* eslint no-restricted-syntax: 0, no-await-in-loop: 0 */
module.exports = async () => {
  try {
    // order pick up
    const shops = await DB.Shop.find();
    for (const shop of shops) {
      await DB.OrderDetail.updateMany({ shopId: shop._id }, {
        $set: {
          pickUpAddress: shop.pickUpAddress,
          pickUpAtStore: shop.pickUpAtStore
        }
      });
    }
  } catch (e) {
    throw e;
  }
};
