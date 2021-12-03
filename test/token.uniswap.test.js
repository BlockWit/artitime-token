const { accounts, contract, web3} = require('@openzeppelin/test-environment');
const { BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const {getEvents} = require("./util");

const ArtiTimeToken = contract.fromArtifact('ArtiTimeToken');
const WETH = contract.fromArtifact('canonical-weth/WETH9');
const UniswapFactoryMock = contract.fromArtifact('UniswapV2FactoryMock');
const UniswapRouterMock = contract.fromArtifact('UniswapV2RouterMock');
const UniswapPairMock = contract.fromArtifact('UniswapV2PairMock');

const [uniswapOwner, owner, account1, account2, account3, developers, marketing] = accounts;
const SUPPLY1 = ether('400000000');
const SUPPLY2 = ether('250000000');
const SUPPLY3 = ether('210000000');
const initialAccounts = [account1, account2, account3];
const initialBalances = [SUPPLY1, SUPPLY2, SUPPLY3];
const FEES = {
  BURN: 1,
  DEVELOPERS: 2,
  LIQUDITY: 2,
  MARKETING: 2,
  RFI: 3
}

describe('Token', async function () {

  let token;
  let weth;
  let uniswapFactory;
  let uniswapRouter;
  let uniswapPair;

  beforeEach(async function() {
    // configure
    token = await ArtiTimeToken.new({from: owner});
    weth = await WETH.new({from: owner});
    uniswapFactory = await UniswapFactoryMock.new(uniswapOwner, {from: uniswapOwner});
    uniswapRouter = await UniswapRouterMock.new(uniswapFactory.address, weth.address, {from: uniswapOwner});
    await uniswapFactory.createPair(token.address, weth.address);
    uniswapPair = await UniswapPairMock.at(await uniswapFactory.getPair(token.address, weth.address));
    // provide liquidity
  })

    it('yolo', async function() {
      console.log(await uniswapPair.totalSupply());
    });


});

