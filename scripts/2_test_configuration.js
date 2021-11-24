const { toBN, toWei } = web3.utils;
const { logger } = require('./util');
const { ether } = require('@openzeppelin/test-helpers');
const Configurator = artifacts.require('Configurator');
const Token = artifacts.require('ArtiTimeToken');
const VestingWallet = artifacts.require('VestingWallet');

async function deploy () {
  const args = process.argv.slice(2);
  const CONFIGURATOR_ADDRESS = args[args.findIndex(argName => argName === '--configuratorAddress') + 1];
  console.log(`Using Configurator address: ${CONFIGURATOR_ADDRESS}`);
  const configurator = await Configurator.at(CONFIGURATOR_ADDRESS);
  const WALLET_ADDRESS = await configurator.wallet();
  const wallet = await VestingWallet.at(WALLET_ADDRESS);
  const TOKEN_ADDRESS = await configurator.token();

  const { log, logRevert } = logger(await web3.eth.net.getNetworkType());
  const [owner, user] = await web3.eth.getAccounts();
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
