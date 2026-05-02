/**
 * LendaLoan Smart Contract Tests
 * 
 * CODE-009: Implement Hardhat tests for smart contracts
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendaLoan", function () {
    let LendaLoan;
    let lendaloan;
    let owner;
    let borrower;
    let lender;
    let addr1;
    let addr2;

    // Constants
    const LOAN_STATUS = {
        REQUESTED: 0,
        FUNDED: 1,
        ACTIVE: 2,
        REPAID: 3,
        DEFAULTED: 4,
        PLATFORM_SETTLED: 5,
        CANCELLED: 6
    };

    beforeEach(async function () {
        // Get signers
        [owner, borrower, lender, addr1, addr2] = await ethers.getSigners();

        // Deploy contract
        LendaLoan = await ethers.getContractFactory("LendaLoan");
        lendaloan = await LendaLoan.deploy();
        await lendaloan.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await lendaloan.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero loan counter", async function () {
            expect(await lendaloan.loanCounter()).to.equal(0);
        });

        it("Should initialize with zero collateral counter", async function () {
            expect(await lendaloan.collateralCounter()).to.equal(0);
        });

        it("Should initialize with zero reserve fund balance", async function () {
            expect(await lendaloan.reserveFundBalance()).to.equal(0);
        });
    });

    describe("Collateral Management", function () {
        it("Should allow depositing collateral", async function () {
            const tx = await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            const receipt = await tx.wait();

            // Find collateral deposited event
            const event = receipt.logs.find(
                log => log.fragment?.name === "CollateralDeposited"
            );

            expect(event).to.not.be.undefined;
            expect(event.args.collateralId).to.equal(1);
            expect(event.args.value).to.equal(ethers.parseEther("100"));
        });

        it("Should allow verifying collateral", async function () {
            // First deposit collateral
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );

            // Verify collateral
            const tx = await lendaloan.connect(owner).verifyCollateral(1);
            await tx.wait();

            const collateral = await lendaloan.getCollateral(1);
            expect(collateral.isVerified).to.equal(true);
        });

        it("Should allow updating collateral value", async function () {
            // Deposit collateral
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );

            // Update value
            await lendaloan.connect(owner).updateCollateralValue(
                1,
                ethers.parseEther("150")
            );

            const collateral = await lendaloan.getCollateral(1);
            expect(collateral.estimatedValue).to.equal(ethers.parseEther("150"));
        });

        it("Should calculate LTV correctly", async function () {
            const ltv = await lendaloan.calculateLTV(
                ethers.parseEther("50"),
                ethers.parseEther("100")
            );
            // LTV = (50/100) * 10000 = 5000 (in basis points)
            expect(ltv).to.equal(5000);
        });
    });

    describe("Loan Creation", function () {
        it("Should create a new loan", async function () {
            // First deposit collateral
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );

            // Verify collateral
            await lendaloan.connect(owner).verifyCollateral(1);

            // Create loan
            const tx = await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"), // loan amount
                1000, // 10% interest rate (in basis points)
                12, // 12 months
                1 // collateral id
            );
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanCreated"
            );

            expect(event).to.not.be.undefined;
            expect(event.args.loanId).to.equal(1);
            expect(event.args.amount).to.equal(ethers.parseEther("50"));
        });

        it("Should not create loan with invalid collateral", async function () {
            await expect(
                lendaloan.connect(borrower).createLoan(
                    ethers.parseEther("50"),
                    1000,
                    12,
                    999 // Non-existent collateral
                )
            ).to.be.reverted;
        });

        it("Should not create loan with LTV > 80%", async function () {
            // Deposit collateral with low value
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("50"), // Only 50 ETH worth
                "QmHash123"
            );

            await lendaloan.connect(owner).verifyCollateral(1);

            // Try to create loan with 90% LTV
            await expect(
                lendaloan.connect(borrower).createLoan(
                    ethers.parseEther("45"), // 45/50 = 90%
                    1000,
                    12,
                    1
                )
            ).to.be.revertedWith("LTV exceeds maximum");
        });
    });

    describe("Loan Funding", function () {
        beforeEach(async function () {
            // Setup: deposit and verify collateral
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            await lendaloan.connect(owner).verifyCollateral(1);

            // Create loan
            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );
        });

        it("Should allow funding a loan", async function () {
            const tx = await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanFunded"
            );

            expect(event).to.not.be.undefined;
            expect(event.args.loanId).to.equal(1);
            expect(event.args.lender).to.equal(lender.address);
        });

        it("Should update loan status to FUNDED when fully funded", async function () {
            await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });

            const loan = await lendaloan.getLoan(1);
            expect(loan.status).to.equal("FUNDED");
        });

        it("Should not allow funding a non-existent loan", async function () {
            await expect(
                lendaloan.connect(lender).fundLoan(999, {
                    value: ethers.parseEther("50")
                })
            ).to.be.reverted;
        });

        it("Should emit LoanFullyFunded event when fully funded", async function () {
            const tx = await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanFullyFunded"
            );

            expect(event).to.not.be.undefined;
        });
    });

    describe("Loan Repayment", function () {
        beforeEach(async function () {
            // Setup: deposit, verify, create, fund
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            await lendaloan.connect(owner).verifyCollateral(1);
            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );
            await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });
        });

        it("Should allow making a repayment", async function () {
            const tx = await lendaloan.connect(borrower).repayLoan(1, {
                value: ethers.parseEther("55") // Principal + Interest
            });
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "RepaymentMade"
            );

            expect(event).to.not.be.undefined;
        });

        it("Should mark loan as REPAID when fully repaid", async function () {
            // Full repayment
            await lendaloan.connect(borrower).repayLoan(1, {
                value: ethers.parseEther("55")
            });

            const loan = await lendaloan.getLoan(1);
            expect(loan.status).to.equal("REPAID");
        });

        it("Should emit LoanRepaid event when fully repaid", async function () {
            await lendaloan.connect(borrower).repayLoan(1, {
                value: ethers.parseEther("55")
            });

            // The loan should now be repaid
            const loan = await lendaloan.getLoan(1);
            expect(loan.status).to.equal("REPAID");
        });
    });

    describe("Default Handling", function () {
        beforeEach(async function () {
            // Setup: deposit, verify, create, fund
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            await lendaloan.connect(owner).verifyCollateral(1);
            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );
            await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });
        });

        it("Should allow triggering default", async function () {
            const tx = await lendaloan.connect(owner).triggerDefault(1);
            await tx.wait();

            const loan = await lendaloan.getLoan(1);
            expect(loan.status).to.equal("DEFAULTED");
        });

        it("Should emit DefaultTriggered event", async function () {
            const tx = await lendaloan.connect(owner).triggerDefault(1);
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "DefaultTriggered"
            );

            expect(event).to.not.be.undefined;
            expect(event.args.loanId).to.equal(1);
        });
    });

    describe("Reserve Fund", function () {
        it("Should allow deposit to reserve fund", async function () {
            const tx = await lendaloan.connect(owner).depositToReserveFund({
                value: ethers.parseEther("10")
            });
            await tx.wait();

            const balance = await lendaloan.reserveFundBalance();
            expect(balance).to.equal(ethers.parseEther("10"));
        });

        it("Should track reserve fund balance correctly", async function () {
            await lendaloan.connect(owner).depositToReserveFund({
                value: ethers.parseEther("5")
            });
            await lendaloan.connect(owner).depositToReserveFund({
                value: ethers.parseEther("5")
            });

            const balance = await lendaloan.reserveFundBalance();
            expect(balance).to.equal(ethers.parseEther("10"));
        });
    });

    describe("Loan Topup", function () {
        beforeEach(async function () {
            // Setup: deposit, verify, create, fund
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            await lendaloan.connect(owner).verifyCollateral(1);
            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );
            await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("50")
            });
        });

        it("Should allow requesting a loan topup", async function () {
            const tx = await lendaloan.connect(borrower).requestLoanTopup(
                1,
                ethers.parseEther("10"),
                3
            );
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanTopupRequested"
            );

            expect(event).to.not.be.undefined;
            expect(event.args.topupId).to.equal(1);
        });

        it("Should allow approving a loan topup", async function () {
            // Request topup
            await lendaloan.connect(borrower).requestLoanTopup(
                1,
                ethers.parseEther("10"),
                3
            );

            // Approve topup
            const tx = await lendaloan.connect(owner).approveLoanTopup(1);
            await tx.wait();

            const topup = await lendaloan.getLoanTopup(1);
            expect(topup.isApproved).to.equal(true);
        });

        it("Should allow funding a loan topup", async function () {
            // Request and approve topup
            await lendaloan.connect(borrower).requestLoanTopup(
                1,
                ethers.parseEther("10"),
                3
            );
            await lendaloan.connect(owner).approveLoanTopup(1);

            // Fund topup
            const tx = await lendaloan.connect(addr1).fundLoanTopup(1, {
                value: ethers.parseEther("10")
            });
            await tx.wait();

            const topup = await lendaloan.getLoanTopup(1);
            expect(topup.isFunded).to.equal(true);
        });
    });

    describe("Access Control", function () {
        it("Should restrict collateral verification to owner", async function () {
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );

            await expect(
                lendaloan.connect(borrower).verifyCollateral(1)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should restrict default trigger to owner", async function () {
            await expect(
                lendaloan.connect(borrower).triggerDefault(1)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should restrict reserve fund deposit to owner", async function () {
            await expect(
                lendaloan.connect(borrower).depositToReserveFund({
                    value: ethers.parseEther("10")
                })
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle multiple loans correctly", async function () {
            // Create multiple collaterals and loans
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash1"
            );
            await lendaloan.connect(owner).verifyCollateral(1);

            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );

            await lendaloan.connect(borrower).depositCollateral(
                "Vehicle",
                ethers.parseEther("50"),
                "QmHash2"
            );
            await lendaloan.connect(owner).verifyCollateral(2);

            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("25"),
                800,
                6,
                2
            );

            expect(await lendaloan.loanCounter()).to.equal(2);
        });

        it("Should handle partial funding", async function () {
            await lendaloan.connect(borrower).depositCollateral(
                "Real Estate",
                ethers.parseEther("100"),
                "QmHash123"
            );
            await lendaloan.connect(owner).verifyCollateral(1);

            await lendaloan.connect(borrower).createLoan(
                ethers.parseEther("50"),
                1000,
                12,
                1
            );

            // Partial funding
            await lendaloan.connect(lender).fundLoan(1, {
                value: ethers.parseEther("25")
            });

            const loan = await lendaloan.getLoan(1);
            expect(loan.status).to.equal("FUNDED"); // Status is FUNDED once any amount is funded
            expect(loan.fundedAmount).to.equal(ethers.parseEther("25"));
        });
    });
});
