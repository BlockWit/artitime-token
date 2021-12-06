const { BN, ether, time } = require('@openzeppelin/test-helpers');
const { logger } = require('./util');
const Crowdsale = artifacts.require('Crowdsale');
const Token = artifacts.require('ArtiTimeToken');

const CONFIG = {
  BASE_PRICE: ether('55000'),
  STAGE1_START: 0,
  STAGE1_END: 0,
  STAGE1_BONUS: 5,
  STAGE1_SOFTCAP: ether('6050000'),
  STAGE1_HARDCAP: ether('30250000'),
  STAGE2_START: 0,
  STAGE2_END: 0,
  STAGE2_SOFTCAP: ether('5775000'),
  STAGE2_HARDCAP: ether('57750000'),
  PUBLIC_SALE_END: 0
};

async function deploy () {
  const network = await web3.eth.net.getNetworkType()
  const { log } = logger(network);
  const args = process.argv.slice(2);
  const TOKEN_ADDRESS = args[args.findIndex(argName => argName === '--tokenAddress') + 1];
  console.log(`Using Token address: ${TOKEN_ADDRESS}`);
  const token = await Token.at(TOKEN_ADDRESS);
  const addresses = await web3.eth.getAccounts();
  const [owner] = addresses;

  const sale = await Crowdsale.new({ from: owner });
  log(`Crowdsale deployed at address: @address{${sale.address}}`);
  log(`npx truffle verify Crowdsale@${sale.address} --network ${network}`);

  log('ATTENTION! USING TEST DATES!')
  CONFIG.STAGE1_START = new BN(Math.floor(Date.now() / 1000).toString());
  CONFIG.STAGE1_END = CONFIG.STAGE1_START.add(time.duration.days(7));
  CONFIG.STAGE2_START = CONFIG.STAGE1_END.add(time.duration.days(1));
  CONFIG.STAGE2_END = CONFIG.STAGE2_START.add(time.duration.days(7));
  CONFIG.PUBLIC_SALE_END = CONFIG.STAGE2_END.add(time.duration.weeks(4));

  {
    log(`Set token`);
    const tx = await sale.setToken(TOKEN_ADDRESS, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Set price`);
    const tx = await sale.setPrice(CONFIG.BASE_PRICE, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Set vesting schedule`);
    const tx = await sale.setVestingSchedule(1, CONFIG.PUBLIC_SALE_END, 0, 0, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Add stage 1`);
    const tx = await sale.addStage(CONFIG.STAGE1_START, CONFIG.STAGE1_END, CONFIG.STAGE1_BONUS, 0, 0, 0, CONFIG.STAGE1_SOFTCAP, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Add stage 2`);
    const tx = await sale.addStage(CONFIG.STAGE2_START, CONFIG.STAGE2_END, 0, 0, 0, 0, CONFIG.STAGE2_SOFTCAP, CONFIG.STAGE2_HARDCAP, 1, false, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    const amount = CONFIG.STAGE1_HARDCAP.add(CONFIG.STAGE2_HARDCAP);
    log(`Transfer ${amount.toString()} to sale address`);
    const tx = await token.transfer(sale.address, amount, {from: owner});
    log(`Result: successful tx: @tx{${tx.receipt.transactionHash}}`);
  }
  {
    log(`Disable tx limit for sale contract`);
    const tx = await token.excludeFromMaxTxLimit(sale.address, {from: owner});
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
