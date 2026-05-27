import { expect } from "chai";
import { network } from "hardhat";
import { encodeBytes32String, ZeroHash } from "ethers";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { MessageIntegrity__factory } from "../typechain-types/index.js";

const VALID_ROOT = encodeBytes32String("segment-root-1");
const CONV_REF = "conversation-1";
const SEG_REF = "conversation-1-segment-1";
const MSG_COUNT = 3;

describe("MessageIntegrity", () => {
  let contract: Awaited<ReturnType<MessageIntegrity__factory["deploy"]>>;
  let signer: Awaited<ReturnType<Awaited<ReturnType<typeof network.create>>["ethers"]["getSigners"]>>[0];

  beforeEach(async () => {
    const { ethers } = await network.create();
    [signer] = await ethers.getSigners();
    contract = await new MessageIntegrity__factory(signer).deploy();
    await contract.waitForDeployment();
  });

  describe("recordSegmentRoot", () => {
    it("records a segment and returns recordId 1 for the first call", async () => {
      const tx = await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, MSG_COUNT);
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      expect(await contract.getRecordCount()).to.equal(1n);
    });

    it("increments recordId on each call", async () => {
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, 1);
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, "conversation-1-segment-2", 2);
      expect(await contract.getRecordCount()).to.equal(2n);
    });

    it("emits SegmentRootRecorded with correct fields", async () => {
      await expect(
        contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, MSG_COUNT)
      )
        .to.emit(contract, "SegmentRootRecorded")
        .withArgs(1n, VALID_ROOT, CONV_REF, SEG_REF, MSG_COUNT, anyValue, signer.address);
    });

    it("reverts when segmentRoot is zero bytes32", async () => {
      await expect(
        contract.recordSegmentRoot(ZeroHash, CONV_REF, SEG_REF, MSG_COUNT)
      ).to.be.revertedWith("Segment root cannot be empty");
    });

    it("reverts when conversationRef is empty", async () => {
      await expect(
        contract.recordSegmentRoot(VALID_ROOT, "", SEG_REF, MSG_COUNT)
      ).to.be.revertedWith("Conversation reference required");
    });

    it("reverts when segmentRef is empty", async () => {
      await expect(
        contract.recordSegmentRoot(VALID_ROOT, CONV_REF, "", MSG_COUNT)
      ).to.be.revertedWith("Segment reference required");
    });

    it("reverts when messageCount is 0", async () => {
      await expect(
        contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, 0)
      ).to.be.revertedWith("Message count must be greater than zero");
    });

    it("reverts when messageCount exceeds 5", async () => {
      await expect(
        contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, 6)
      ).to.be.revertedWith("Message count cannot exceed 5");
    });
  });

  describe("getRecord", () => {
    it("returns stored fields for a valid recordId", async () => {
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, SEG_REF, MSG_COUNT);
      const [root, convRef, segRef, count, , recorder] = await contract.getRecord(1n);
      expect(root).to.equal(VALID_ROOT);
      expect(convRef).to.equal(CONV_REF);
      expect(segRef).to.equal(SEG_REF);
      expect(count).to.equal(MSG_COUNT);
      expect(recorder).to.equal(signer.address);
    });

    it("reverts when recordId is 0", async () => {
      await expect(contract.getRecord(0n)).to.be.revertedWith(
        "Record ID must be greater than zero"
      );
    });

    it("reverts when recordId does not exist", async () => {
      await expect(contract.getRecord(99n)).to.be.revertedWith(
        "Record does not exist"
      );
    });
  });

  describe("getRecordCount", () => {
    it("returns 0 when no records have been stored", async () => {
      expect(await contract.getRecordCount()).to.equal(0n);
    });

    it("returns the correct count after multiple records", async () => {
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, "seg-1", 1);
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, "seg-2", 2);
      await contract.recordSegmentRoot(VALID_ROOT, CONV_REF, "seg-3", 3);
      expect(await contract.getRecordCount()).to.equal(3n);
    });
  });
});
