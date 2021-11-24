const { toBN, toWei } = web3.utils;

async function deploy () {
  const val1 = toBN('3901320000000000000000')
    .add(toBN('11703960000000000000000'))
    .add(toBN('11703960000000000000000'))
    // .sub(toBN('5461848000000000000000'));
  console.log(val1.toString());
  const val2 = val1.add(toBN('1000000000000000000'));
  console.log(val2.toString());
  const val0 = toBN('27310240000000000000000');
  console.log(val2.eq(val0));
}

module.exports = async function main (callback) {
  try {
    await deploy();
    console.log('success');
    callback(null);
  } catch (e) {
    console.log('error');
    console.log(e);
    callback(e);
  }
};
