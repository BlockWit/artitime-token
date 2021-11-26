// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StagedCrowdsale is Ownable {
    using SafeMath for uint256;
    using Address for address;

    struct Stage {
        uint256 start;
        uint256 end;
        uint256 bonus;
        uint256 minInvestmentLimit;
        uint256 invested;
        uint256 tokensSold;
        uint256 softcapInTokens;
        uint256 hardcapInTokens;
        uint8 vestingSchedule;
        bool finished;
    }

    Stage[] public stages;

    function stagesCount() public view returns (uint) {
        return stages.length;
    }

    function addStage(
        uint256 start,
        uint256 end,
        uint256 bonus,
        uint256 minInvestmentLimit,
        uint256 invested,
        uint256 tokensSold,
        uint256 softcapInTokens,
        uint256 hardcapInTokens,
        uint8 vestingSchedule,
        bool finished
    ) public onlyOwner {
        stages.push(Stage(start, end, bonus, minInvestmentLimit, invested, tokensSold, softcapInTokens, hardcapInTokens, vestingSchedule, finished));
    }

    function removeStage(uint8 index) public onlyOwner {
        require(index < stages.length, "StagedCrowdsale: Wrong stage index");
        for (uint8 i = index; i < stages.length - 1; i++) {
            stages[i] = stages[i + 1];
        }
        stages.pop();
    }

    function updateStage(
        uint8 index,
        uint256 start,
        uint256 end,
        uint256 bonus,
        uint256 minInvestmentLimit,
        uint256 softcapInTokens,
        uint256 hardcapInTokens,
        uint8 vestingSchedule,
        bool finished
    ) public onlyOwner {
        require(index < stages.length, "StagedCrowdsale: Wrong stage index");
        Stage storage stage = stages[index];
        stage.start = start;
        stage.end = end;
        stage.bonus = bonus;
        stage.minInvestmentLimit = minInvestmentLimit;
        stage.softcapInTokens = softcapInTokens;
        stage.hardcapInTokens = hardcapInTokens;
        stage.vestingSchedule = vestingSchedule;
        stage.finished = finished;
    }

    function rewriteStage(
        uint8 index,
        uint256 start,
        uint256 end,
        uint256 bonus,
        uint256 minInvestmentLimit,
        uint256 invested,
        uint256 tokensSold,
        uint256 softcapInTokens,
        uint256 hardcapInTokens,
        uint8 vestingSchedule,
        bool finished
    ) public onlyOwner {
        require(index < stages.length, "StagedCrowdsale: Wrong stage index");
        stages[index] = Stage(start, end, bonus, minInvestmentLimit, invested, tokensSold, softcapInTokens, hardcapInTokens, vestingSchedule, finished);
    }

    function insertStage(
        uint8 index,
        uint256 start,
        uint256 end,
        uint256 bonus,
        uint256 minInvestmentLimit,
        uint256 invested,
        uint256 tokensSold,
        uint256 softcapInTokens,
        uint256 hardcapInTokens,
        uint8 vestingSchedule,
        bool finished
    ) public onlyOwner {
        require(index < stages.length, "StagedCrowdsale: Wrong stage index");
        for (uint256 i = stages.length; i > index; i--) {
            stages[i] = stages[i - 1];
        }
        stages[index] = Stage(start, end, bonus, minInvestmentLimit, invested, tokensSold, softcapInTokens, hardcapInTokens, vestingSchedule, finished);
    }

    function deleteStages() public onlyOwner {
        require(stages.length > 0, "StagedCrowdsale: Stages already empty");
        delete stages;
    }

    function getCurrentStage() public view returns (int256) {
        for (uint256 i = 0; i < stages.length; i++) {
            if (block.timestamp >= stages[i].start && block.timestamp < stages[i].end && stages[i].tokensSold < stages[i].hardcapInTokens) {
                return int256(i);
            }
        }
        return -1;
    }

}
