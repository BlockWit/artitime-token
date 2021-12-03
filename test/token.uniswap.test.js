const { accounts, contract } = require('@openzeppelin/test-environment')
const { BN, constants, ether, time } = require('@openzeppelin/test-helpers');
const {fromArtifact, getEvents} = require("./util");

const ArtiTimeToken = contract.fromArtifact('ArtiTimeToken');
const WETH = contract.fromArtifact('canonical-weth/WETH9');
const UniswapFactory = fromArtifact("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapRouter = fromArtifact("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const UniswapPairMock = fromArtifact("@uniswap/v2-core/build/UniswapV2Pair.json");

const [uniswapOwner, owner] = accounts;

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

  beforeEach(async () => {
    // configure
    token = await ArtiTimeToken.new({from: owner});
    weth = await WETH.new({from: owner});
    uniswapFactory = await UniswapFactory.new(uniswapOwner, {from: uniswapOwner});
    uniswapRouter = await UniswapRouter.new(uniswapFactory.address, weth.address, {from: uniswapOwner});
    await uniswapFactory.createPair(token.address, weth.address, {from: owner});
    uniswapPair = await UniswapPairMock.at(await uniswapFactory.getPair(token.address, weth.address));
    // provide liquidity
    const liquidity = ether('3000000');
    const value = ether('60');
    const deadline = (await time.latest()).addn(300);
    await token.approve(uniswapRouter.address, liquidity, {from: owner});
    await uniswapRouter.addLiquidityETH(token.address, liquidity, liquidity, value, owner, deadline, {from: owner, value})
  });

  it('yolo', async function() {
    console.log((await uniswapPair.totalSupply()).toString());
  });

});

