const Token = artifacts.require('ArtiTimeToken');
const { logger } = require('./util');


async function deploy () {
  const network = await web3.eth.net.getNetworkType()
  const { log } = logger(network);
  const addresses = await web3.eth.getAccounts();
  const [owner] = addresses;
  log(`Deploy token`);
  const token = await Token.new({ from: owner });
  log(`Token deployed at address: @address{${token.address}}`);
  log(`npx truffle verify ArtiTimeToken@${token.address} --network ${network}`);

  {
    log(`Disable tx limit for owner`);
    const tx = await token.excludeFromMaxTxLimit(owner, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
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
