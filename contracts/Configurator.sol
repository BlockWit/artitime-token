// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./RecoverableFunds.sol";
import "./ArtiTimeToken.sol";
import "./Crowdsale.sol";
import "./VestingWallet.sol";

contract Configurator is RecoverableFunds {
    using Address for address;

    ArtiTimeToken public token;
    Crowdsale public sale;
    VestingWallet public team;
    VestingWallet public developers;

    constructor(address owner) {
        address[] memory addresses = new address[](6);
        uint256[] memory amounts = new uint256[](6);

        // marketing
        addresses[0] = address(0);
        amounts[0] = 60_000_000 ether;

        // celebrity support
        addresses[1] = address(0);
        amounts[1] = 25_000_000 ether;

        // team
        team = new VestingWallet();
        team.setBeneficiary(address(0));
        team.setStart(0);
        team.setDuration(6 * 30 days);
        team.setInterval(15 days);
        addresses[2] = address(team);
        amounts[2] = 75_000_000 ether;

        // developers
        developers = new VestingWallet();
        developers.setBeneficiary(address(0));
        developers.setStart(0);
        developers.setDuration(6 * 30 days);
        developers.setInterval(15 days);
        addresses[3] = address(developers);
        amounts[3] = 75_000_000 ether;

        // presale
        uint256 BASE_PRICE = 57750 ether;
        uint256 STAGE1_START = 0;
        uint256 STAGE1_END = STAGE1_START + 7 days;
        uint256 STAGE2_START = 0;
        uint256 STAGE2_END = STAGE1_START + 7 days;
        uint256 PUBLIC_SALE_END = 0;

        sale = new Crowdsale();
        sale.setPrice(BASE_PRICE);
        sale.setVestingSchedule(1, PUBLIC_SALE_END, 0, 0);
        sale.addStage(STAGE1_START, STAGE1_END, 0, 0, 0, 0, 6_050_000 ether, 30_250_000 ether, 1, false);
        sale.addStage(STAGE2_START, STAGE2_END, 0, 0, 0, 0, 5_775_000 ether, 57_750_000 ether, 1, false);

        addresses[4] = address(sale);
        amounts[4] = 321_570_000 ether;

        // other
        addresses[5] = owner;
        amounts[5] = 0;

        // create token
        token = new ArtiTimeToken("Artitime", "ARTI", addresses, amounts);
        token.transferOwnership(owner);

        // finish sale configuration
        sale.setToken(address(token));
        sale.transferOwnership(owner);

        // finish team wallet configuration
        team.setToken(address(token));
        team.lock();
        team.transferOwnership(owner);

        // finish developers wallet configuration
        developers.setToken(address(token));
        developers.lock();
        developers.transferOwnership(owner);
    }

}

