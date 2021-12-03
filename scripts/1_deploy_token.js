const Token = artifacts.require('ArtiTimeToken');
const { logger } = require('./util');

async function deploy () {
  const { log } = logger(await web3.eth.net.getNetworkType());
  const addresses = await web3.eth.getAccounts();
  const [owner] = addresses;
  const token = await Token.new({ from: owner });
  log(`Token deployed at address: @address{${token.address}}`);
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
