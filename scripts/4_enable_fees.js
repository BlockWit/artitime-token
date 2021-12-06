const { constants } = require('@openzeppelin/test-helpers');
const { logger } = require('./util');
const Token = artifacts.require('ArtiTimeToken');

const FEES = {
  BURN: 1,
  DEVELOPERS: 2,
  LIQUDITY: 2,
  MARKETING: 2,
  RFI: 3
}

const ADDRESSES = {
  DEVELOPERS: constants.ZERO_ADDRESS,
  MARKETING: constants.ZERO_ADDRESS,
}

async function deploy () {
  const args = process.argv.slice(2);
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--tokenAddress') + 1];
  console.log(`Using Token address: ${TOKEN_ADDRESS}`);
  const token = await Token.at(TOKEN_ADDRESS);

  const { log } = logger(await web3.eth.net.getNetworkType());
  const [owner, developers, marketing] = await web3.eth.getAccounts();

  log('ATTENTION! USING TEST ADDRESSES!')
  ADDRESSES.DEVELOPERS = developers;
  ADDRESSES.MARKETING = marketing;

  if (Object.values(ADDRESSES).find(addr => addr === constants.ZERO_ADDRESS)) {
    log(`ATTENTION! USING ZERO ADDRESS!`);
  }

  {
    const tx = await token.setTaxFeePercent(FEES.RFI, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setLiquidityFeePercent(FEES.LIQUDITY, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setBurnFeePercent(FEES.BURN, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setDevelopersRewardPercent(FEES.DEVELOPERS, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setMarketingRewardPercent(FEES.MARKETING, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setDevelopersAddress(ADDRESSES.MARKETING, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setMarketingAddress(ADDRESSES.MARKETING, {from: owner});
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
