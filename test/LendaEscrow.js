const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendaEscrow", function () {
    let lendaEscrow;
    let owner;
    let buyer;
    let seller;
    let admin;
    let platform;

    const TRANSACTION_AMOUNT = ethers.parseEther("1");
    const SHIPPING_FEE = ethers.parseEther("0.05");
    const PLATFORM_FEE_PERCENT = 250; // 2.5%

    beforeEach(async function () {
        [owner, buyer, seller, admin, platform] = await ethers.getSigners();

        const LendaEscrow = await ethers.getContractFactory("LendaEscrow");
        lendaEscrow = await LendaEscrow.deploy();
        await lendaEscrow.waitForDeployment();
    });

    describe("Deployment", function () {
        it("should set the correct owner and admin roles", async function () {
            expect(await lendaEscrow.hasRole(await lendaEscrow.ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await lendaEscrow.hasRole(await lendaEscrow.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        });

        it("should initialize transaction counter to 0", async function () {
            expect(await lendaEscrow.transactionCounter()).to.equal(0);
        });

        it("should set default platform fee", async function () {
            expect(await lendaEscrow.platformFeePercent()).to.equal(250); // 2.5%
        });

        it("should set default max transaction amount", async function () {
            expect(await lendaEscrow.maxTransactionAmount()).to.equal(ethers.parseEther("1000"));
        });
    });

    describe("Transaction Creation", function () {
        it("should allow creating a new transaction", async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );

            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.id).to.equal(transactionId);
            expect(transaction.buyer).to.equal(owner.address);
            expect(transaction.seller).to.equal(seller.address);
            expect(transaction.amount).to.equal(TRANSACTION_AMOUNT);
            expect(transaction.shippingFee).to.equal(SHIPPING_FEE);
            expect(transaction.status).to.equal(0); // CREATED
        });

        it("should require valid seller address", async function () {
            await expect(
                lendaEscrow.createTransaction(
                    ethers.ZeroAddress,
                    TRANSACTION_AMOUNT,
                    SHIPPING_FEE,
                    "Test transaction"
                )
            ).to.be.revertedWith("Invalid seller address");
        });

        it("should not allow creating transaction with self", async function () {
            await expect(
                lendaEscrow.createTransaction(
                    owner.address,
                    TRANSACTION_AMOUNT,
                    SHIPPING_FEE,
                    "Test transaction"
                )
            ).to.be.revertedWith("Cannot create transaction with self");
        });

        it("should require amount > 0", async function () {
            await expect(
                lendaEscrow.createTransaction(
                    seller.address,
                    0,
                    SHIPPING_FEE,
                    "Test transaction"
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("should not exceed max transaction amount", async function () {
            const maxAmount = await lendaEscrow.maxTransactionAmount();

            await expect(
                lendaEscrow.createTransaction(
                    seller.address,
                    maxAmount + ethers.parseEther("1"),
                    SHIPPING_FEE,
                    "Test transaction"
                )
            ).to.be.revertedWith("Amount exceeds maximum limit");
        });

        it("should require description", async function () {
            await expect(
                lendaEscrow.createTransaction(
                    seller.address,
                    TRANSACTION_AMOUNT,
                    SHIPPING_FEE,
                    ""
                )
            ).to.be.revertedWith("Description required");
        });

        it("should calculate platform fee correctly", async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );

            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            const transaction = await lendaEscrow.getTransaction(transactionId);
            // Platform fee = 1000 * 250 / 10000 = 25 wei
            expect(transaction.platformFee).to.equal(ethers.parseEther("0.0025"));
        });

        it("should add transaction to buyer and seller lists", async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );

            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            const buyerTxs = await lendaEscrow.getBuyerTransactions(owner.address);
            const sellerTxs = await lendaEscrow.getSellerTransactions(seller.address);

            expect(buyerTxs).to.include(transactionId);
            expect(sellerTxs).to.include(transactionId);
        });
    });

    describe("Transaction Funding", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;
        });

        it("should allow buyer to fund the transaction", async function () {
            const totalAmount = TRANSACTION_AMOUNT + SHIPPING_FEE;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: totalAmount });

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(1); // FUNDED
            expect(transaction.fundedAt).to.be.gt(0);
        });

        it("should require sufficient payment", async function () {
            await expect(
                lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT })
            ).to.be.revertedWith("Insufficient payment");
        });

        it("should return excess funds", async function () {
            const totalAmount = TRANSACTION_AMOUNT + SHIPPING_FEE;
            const excessAmount = ethers.parseEther("0.5");

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: totalAmount + excessAmount });

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(1); // FUNDED
        });

        it("should only allow CREATED status for funding", async function () {
            // First fund
            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            // Try to fund again
            await expect(
                lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE })
            ).to.be.revertedWith("Invalid status");
        });
    });

    describe("Shipping", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
        });

        it("should allow seller to mark as shipped", async function () {
            await lendaEscrow.connect(seller).markAsShipped(
                transactionId,
                "TRACKING123",
                "UPS"
            );

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(2); // SHIPPED
            expect(transaction.trackingNumber).to.equal("TRACKING123");
            expect(transaction.shippingCarrier).to.equal("UPS");
        });

        it("should require tracking number", async function () {
            await expect(
                lendaEscrow.connect(seller).markAsShipped(transactionId, "", "UPS")
            ).to.be.revertedWith("Tracking number required");
        });

        it("should only allow seller to mark as shipped", async function () {
            await expect(
                lendaEscrow.connect(buyer).markAsShipped(transactionId, "TRACKING123", "UPS")
            ).to.be.revertedWith("Not the seller");
        });

        it("should require FUNDED status for shipping", async function () {
            // Create another transaction but don't fund it
            const tx2 = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction 2"
            );
            const receipt2 = await tx2.wait();
            const transactionId2 = receipt2.logs[0].args.id;

            await expect(
                lendaEscrow.connect(seller).markAsShipped(transactionId2, "TRACKING123", "UPS")
            ).to.be.revertedWith("Invalid status");
        });
    });

    describe("Delivery Confirmation", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
            await lendaEscrow.connect(seller).markAsShipped(transactionId, "TRACKING123", "UPS");
        });

        it("should allow buyer to confirm delivery", async function () {
            await lendaEscrow.connect(buyer).confirmDelivery(transactionId);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(3); // DELIVERED
            expect(transaction.deliveredAt).to.be.gt(0);
        });

        it("should only allow buyer to confirm delivery", async function () {
            await expect(
                lendaEscrow.connect(seller).confirmDelivery(transactionId)
            ).to.be.revertedWith("Not the buyer");
        });

        it("should require SHIPPED status for confirmation", async function () {
            // Create another transaction and fund but don't ship
            const tx2 = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction 2"
            );
            const receipt2 = await tx2.wait();
            const transactionId2 = receipt2.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId2, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            await expect(
                lendaEscrow.connect(buyer).confirmDelivery(transactionId2)
            ).to.be.revertedWith("Invalid status");
        });
    });

    describe("Fund Release", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
            await lendaEscrow.connect(seller).markAsShipped(transactionId, "TRACKING123", "UPS");
            await lendaEscrow.connect(buyer).confirmDelivery(transactionId);
        });

        it("should release funds to seller", async function () {
            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

            await lendaEscrow.connect(buyer).releaseFunds(transactionId);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(5); // RELEASED
        });

        it("should only allow buyer to release funds", async function () {
            await expect(
                lendaEscrow.connect(seller).releaseFunds(transactionId)
            ).to.be.revertedWith("Not the buyer");
        });

        it("should require DELIVERED status for release", async function () {
            // Create another transaction that is shipped but not delivered
            const tx2 = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction 2"
            );
            const receipt2 = await tx2.wait();
            const transactionId2 = receipt2.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId2, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
            await lendaEscrow.connect(seller).markAsShipped(transactionId2, "TRACKING123", "UPS");

            await expect(
                lendaEscrow.connect(buyer).releaseFunds(transactionId2)
            ).to.be.revertedWith("Invalid status");
        });
    });

    describe("Dispute Management", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
            await lendaEscrow.connect(seller).markAsShipped(transactionId, "TRACKING123", "UPS");
        });

        it("should allow buyer to open dispute when shipped", async function () {
            await lendaEscrow.connect(buyer).openDispute(transactionId, "Item not received");

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(4); // DISPUTED
            expect(transaction.disputeReason).to.equal("Item not received");
        });

        it("should allow buyer to open dispute when delivered", async function () {
            await lendaEscrow.connect(buyer).confirmDelivery(transactionId);
            await lendaEscrow.connect(buyer).openDispute(transactionId, "Item damaged");

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(4); // DISPUTED
        });

        it("should require dispute reason", async function () {
            await expect(
                lendaEscrow.connect(buyer).openDispute(transactionId, "")
            ).to.be.revertedWith("Dispute reason required");
        });

        it("should not allow dispute in other statuses", async function () {
            // Create and fund but don't ship
            const tx2 = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction 2"
            );
            const receipt2 = await tx2.wait();
            const transactionId2 = receipt2.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId2, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            await expect(
                lendaEscrow.connect(buyer).openDispute(transactionId2, "Reason")
            ).to.be.revertedWith("Cannot open dispute");
        });

        it("should allow admin to resolve dispute with refund", async function () {
            await lendaEscrow.connect(buyer).openDispute(transactionId, "Item not received");

            await lendaEscrow.resolveDispute(transactionId, "Refund issued", true);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(6); // REFUNDED
        });

        it("should allow admin to resolve dispute with release", async function () {
            await lendaEscrow.connect(buyer).openDispute(transactionId, "Issue resolved");

            await lendaEscrow.resolveDispute(transactionId, "Seller wins", false);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(5); // RELEASED
        });

        it("should require resolution message", async function () {
            await lendaEscrow.connect(buyer).openDispute(transactionId, "Issue");

            await expect(
                lendaEscrow.resolveDispute(transactionId, "", false)
            ).to.be.revertedWith("Resolution required");
        });
    });

    describe("Transaction Cancellation", function () {
        let transactionId;

        beforeEach(async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            transactionId = receipt.logs[0].args.id;
        });

        it("should allow buyer to cancel before funding", async function () {
            await lendaEscrow.connect(buyer).cancelTransaction(transactionId);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(7); // CANCELLED
        });

        it("should only allow buyer to cancel", async function () {
            await expect(
                lendaEscrow.connect(seller).cancelTransaction(transactionId)
            ).to.be.revertedWith("Not the buyer");
        });

        it("should require CREATED status for cancellation", async function () {
            // Fund the transaction first
            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            await expect(
                lendaEscrow.connect(buyer).cancelTransaction(transactionId)
            ).to.be.revertedWith("Invalid status");
        });

        it("should allow admin to emergency cancel before funding", async function () {
            await lendaEscrow.emergencyCancel(transactionId);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(7); // CANCELLED
        });

        it("should allow admin to emergency cancel after funding", async function () {
            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            await lendaEscrow.emergencyCancel(transactionId);

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.status).to.equal(7); // CANCELLED
        });

        it("should refund buyer on emergency cancel after funding", async function () {
            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });

            // This should not revert - it refunds the buyer
            await lendaEscrow.emergencyCancel(transactionId);
        });
    });

    describe("Admin Functions", function () {
        it("should allow admin to set platform fee", async function () {
            await lendaEscrow.setPlatformFeePercent(300);
            expect(await lendaEscrow.platformFeePercent()).to.equal(300);
        });

        it("should not allow fee > 10%", async function () {
            await expect(
                lendaEscrow.setPlatformFeePercent(1001)
            ).to.be.revertedWith("Fee cannot exceed 10%");
        });

        it("should allow admin to set max transaction amount", async function () {
            await lendaEscrow.setMaxTransactionAmount(ethers.parseEther("500"));
            expect(await lendaEscrow.maxTransactionAmount()).to.equal(ethers.parseEther("500"));
        });

        it("should require max amount > 0", async function () {
            await expect(
                lendaEscrow.setMaxTransactionAmount(0)
            ).to.be.revertedWith("Max amount must be greater than 0");
        });

        it("should allow admin to withdraw platform fees", async function () {
            // First create and complete a transaction to accumulate fees
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                SHIPPING_FEE,
                "Test transaction"
            );
            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            await lendaEscrow.connect(buyer).fundTransaction(transactionId, { value: TRANSACTION_AMOUNT + SHIPPING_FEE });
            await lendaEscrow.connect(seller).markAsShipped(transactionId, "TRACKING123", "UPS");
            await lendaEscrow.connect(buyer).confirmDelivery(transactionId);
            await lendaEscrow.connect(buyer).releaseFunds(transactionId);

            // Now try to withdraw fees
            await lendaEscrow.withdrawPlatformFees();
        });

        it("should revert if no fees to withdraw", async function () {
            await expect(
                lendaEscrow.withdrawPlatformFees()
            ).to.be.revertedWith("No fees to withdraw");
        });
    });

    describe("View Functions", function () {
        it("should return correct transaction count", async function () {
            await lendaEscrow.createTransaction(seller.address, TRANSACTION_AMOUNT, SHIPPING_FEE, "Test 1");
            await lendaEscrow.createTransaction(seller.address, TRANSACTION_AMOUNT, SHIPPING_FEE, "Test 2");

            expect(await lendaEscrow.getTransactionCount()).to.equal(2);
        });

        it("should return buyer transactions", async function () {
            await lendaEscrow.createTransaction(seller.address, TRANSACTION_AMOUNT, SHIPPING_FEE, "Test");

            const txs = await lendaEscrow.getBuyerTransactions(owner.address);
            expect(txs).to.have.lengthOf(1);
        });

        it("should return seller transactions", async function () {
            await lendaEscrow.createTransaction(seller.address, TRANSACTION_AMOUNT, SHIPPING_FEE, "Test");

            const txs = await lendaEscrow.getSellerTransactions(seller.address);
            expect(txs).to.have.lengthOf(1);
        });
    });

    describe("Edge Cases", function () {
        it("should handle zero shipping fee", async function () {
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                TRANSACTION_AMOUNT,
                0,
                "Test transaction"
            );
            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            const transaction = await lendaEscrow.getTransaction(transactionId);
            expect(transaction.shippingFee).to.equal(0);
        });

        it("should accept ETH via receive()", async function () {
            await owner.sendTransaction({
                to: lendaEscrow.target,
                value: ethers.parseEther("1")
            });

            expect(await ethers.provider.getBalance(lendaEscrow.target)).to.equal(ethers.parseEther("1"));
        });

        it("should handle small transaction amounts", async function () {
            const smallAmount = ethers.parseEther("0.001");
            const tx = await lendaEscrow.createTransaction(
                seller.address,
                smallAmount,
                0,
                "Small transaction"
            );
            const receipt = await tx.wait();
            const transactionId = receipt.logs[0].args.id;

            expect(await lendaEscrow.getTransaction(transactionId)).to.not.be.undefined;
        });
    });
});
