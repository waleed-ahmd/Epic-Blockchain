import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, toUtf8Bytes, ZeroHash, getBytes } from "ethers";
import { MessageIntegrity__factory } from "../typechain-types/index.js";

const VALID_HASH = keccak256(toUtf8Bytes("test message segment"));
const PAST_TIMESTAMP = BigInt(Math.floor(Date.now() / 1000) - 60);

describe("MessageIntegrity", () => {
  let contract: Awaited<ReturnType<MessageIntegrity__factory["deploy"]>>;
  let caller: Awaited<ReturnType<Awaited<ReturnType<typeof network.create>>["ethers"]["getSigners"]>>[0];

  beforeEach(async () => {
    const { ethers } = await network.create();
    [caller] = await ethers.getSigners();
    contract = await new MessageIntegrity__factory(caller).deploy();
    await contract.waitForDeployment();
  });

  async function signHash(hash: string, signer = caller): Promise<string> {
    return signer.signMessage(getBytes(hash));
  }

  describe("recordDigest", () => {
    it("emits DigestRecorded with the provided timestamp", async () => {
      const signature = await signHash(VALID_HASH);
      await expect(contract.recordDigest(VALID_HASH, signature, PAST_TIMESTAMP))
        .to.emit(contract, "DigestRecorded")
        .withArgs(VALID_HASH, caller.address, PAST_TIMESTAMP);
    });

    it("stores the provided timestamp in the record", async () => {
      const signature = await signHash(VALID_HASH);
      await contract.recordDigest(VALID_HASH, signature, PAST_TIMESTAMP);

      const [, timestamp] = await contract.getRecord(VALID_HASH);
      expect(timestamp).to.equal(PAST_TIMESTAMP);
    });

    it("reverts when hash is zero", async () => {
      const signature = await signHash(ZeroHash);
      await expect(contract.recordDigest(ZeroHash, signature, PAST_TIMESTAMP))
        .to.be.revertedWith("Hash cannot be empty");
    });

    it("reverts when signature is empty", async () => {
      await expect(contract.recordDigest(VALID_HASH, "0x", PAST_TIMESTAMP))
        .to.be.revertedWith("Signature cannot be empty");
    });

    it("reverts when timestamp is zero", async () => {
      const signature = await signHash(VALID_HASH);
      await expect(contract.recordDigest(VALID_HASH, signature, 0n))
        .to.be.revertedWith("Timestamp cannot be zero");
    });

    it("reverts when timestamp is in the future", async () => {
      const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 9999);
      const signature = await signHash(VALID_HASH);
      await expect(contract.recordDigest(VALID_HASH, signature, futureTimestamp))
        .to.be.revertedWith("Timestamp cannot be in the future");
    });

    it("reverts when signature does not match caller", async () => {
      const { ethers } = await network.create();
      const [, other] = await ethers.getSigners();
      const signature = await signHash(VALID_HASH, other);
      await expect(contract.connect(caller).recordDigest(VALID_HASH, signature, PAST_TIMESTAMP))
        .to.be.revertedWith("Signature does not match caller");
    });

    it("reverts when the same hash is recorded twice", async () => {
      const signature = await signHash(VALID_HASH);
      await contract.recordDigest(VALID_HASH, signature, PAST_TIMESTAMP);
      await expect(contract.recordDigest(VALID_HASH, signature, PAST_TIMESTAMP))
        .to.be.revertedWith("Hash already recorded");
    });
  });

  describe("getRecord", () => {
    it("returns zero values for an unrecorded hash", async () => {
      const [recorder, timestamp] = await contract.getRecord(VALID_HASH);
      expect(recorder).to.equal("0x0000000000000000000000000000000000000000");
      expect(timestamp).to.equal(0n);
    });

    it("returns recorder and provided timestamp after recording", async () => {
      const signature = await signHash(VALID_HASH);
      await contract.recordDigest(VALID_HASH, signature, PAST_TIMESTAMP);

      const [recorder, timestamp] = await contract.getRecord(VALID_HASH);
      expect(recorder).to.equal(caller.address);
      expect(timestamp).to.equal(PAST_TIMESTAMP);
    });
  });
});
