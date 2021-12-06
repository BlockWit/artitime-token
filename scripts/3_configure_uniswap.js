const { constants } = require('@openzeppelin/test-helpers');
const { logger } = require('./util');
const Token = artifacts.require('ArtiTimeToken');

const ADDRESSES = {
  ROUTER: constants.ZERO_ADDRESS,
  PAIR: constants.ZERO_ADDRESS,
}

async function deploy () {
  const args = process.argv.slice(2);
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--tokenAddress') + 1];
  console.log(`Using Token address: ${TOKEN_ADDRESS}`);
  const token = await Token.at(TOKEN_ADDRESS);

  const { log } = logger(await web3.eth.net.getNetworkType());
  const [owner] = await web3.eth.getAccounts();

  if (Object.values(ADDRESSES).find(addr => addr === constants.ZERO_ADDRESS)) {
    log(`ATTENTION! USING ZERO ADDRESS!`);
  }

  {
    const tx = await token.setUniswapRouter(ADDRESSES.ROUTER, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.setUniswapPair(ADDRESSES.PAIR, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const tx = await token.toggleSwapAndLiquify({from: owner});
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
