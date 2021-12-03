const { toBN, toWei } = web3.utils;
const { logger } = require('./util');
const { ether } = require('@openzeppelin/test-helpers');
const Token = artifacts.require('ArtiTimeToken');
const VestingWallet = artifacts.require('VestingWallet');

const FEES = {
  BURN: 1,
  DEVELOPERS: 2,
  LIQUDITY: 2,
  MARKETING: 2,
  RFI: 3
}

async function deploy () {
  const args = process.argv.slice(2);
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--tokenAddress') + 1];
  console.log(`Using Token address: ${TOKEN_ADDRESS}`);
  const token = await Token.at(TOKEN_ADDRESS);

  const { log, logRevert } = logger(await web3.eth.net.getNetworkType());
  const [owner, developers, marketing] = await web3.eth.getAccounts();

  await token.setTaxFeePercent(FEES.RFI, {from: owner});
  await token.setLiquidityFeePercent(FEES.LIQUDITY, {from: owner});
  await token.setBurnFeePercent(FEES.BURN, {from: owner});
  await token.setDevelopersRewardPercent(FEES.DEVELOPERS, {from: owner});
  await token.setMarketingRewardPercent(FEES.MARKETING, {from: owner});
  await token.setDevelopersAddress(developers, {from: owner});
  await token.setMarketingAddress(marketing, {from: owner});

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
