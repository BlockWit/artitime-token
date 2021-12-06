const { BN, ether, time } = require('@openzeppelin/test-helpers');
const { logger } = require('./util');
const Crowdsale = artifacts.require('Crowdsale');


async function deploy () {
  const network = await web3.eth.net.getNetworkType()
  const { log } = logger(network);
  const args = process.argv.slice(2);
  const SALE_ADDRESS = args[args.findIndex(argName => argName === '--saleAddress') + 1];
  console.log(`Using Sale address: ${SALE_ADDRESS}`);
  const sale = await Crowdsale.at(SALE_ADDRESS);
  const addresses = await web3.eth.getAccounts();
  const [owner, buyer] = addresses;

  // {
  //   const stageId = await sale.getCurrentStage();
  //   log(`Current stage: ${stageId}`);
  //   const softcap = (await sale.stages(0)).softcapInTokens;
  //   log(`Send ${softcap} to sale contract`);
  //   const tx = await web3.eth.sendTransaction({from: buyer, to: SALE_ADDRESS, value: softcap, gas: 200000});
  //   log(`Result: successful tx: @tx{${tx.transactionHash}}`);
  // }

  // {
  //   log(`Finalize stage 2`);
  //   const tx = await sale.finalizeStage(1, {from: owner});
  //   log(`Result: successful tx: @tx{${tx.transactionHash}}`);
  // }

  // {
  //   log(`Withdraw`);
  //   const tx = await sale.withdraw.sendTransaction({from: buyer});
  //   log(`Result: successful tx: @tx{${tx.transactionHash}}`);
  // }
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
