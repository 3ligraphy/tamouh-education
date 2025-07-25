const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanupAndCreateWallets() {
  try {
    console.log("Starting wallet cleanup and creation process...");

    // 1. Find broken wallet transactions (where wallet doesn't exist)
    const brokenTransactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: {
          notIn: await prisma.wallet
            .findMany({
              select: { id: true },
            })
            .then((wallets) => wallets.map((w) => w.id)),
        },
      },
      select: {
        id: true,
      },
    });

    if (brokenTransactions.length > 0) {
      console.log(
        `Found ${brokenTransactions.length} broken transactions. Deleting...`
      );
      await prisma.walletTransaction.deleteMany({
        where: {
          id: {
            in: brokenTransactions.map((t) => t.id),
          },
        },
      });
    }

    // 2. Find broken wallets (where user doesn't exist)
    const brokenWallets = await prisma.wallet.findMany({
      where: {
        userId: {
          notIn: await prisma.user
            .findMany({
              select: { id: true },
            })
            .then((users) => users.map((u) => u.id)),
        },
      },
      select: {
        id: true,
      },
    });

    if (brokenWallets.length > 0) {
      console.log(`Found ${brokenWallets.length} broken wallets. Deleting...`);
      await prisma.wallet.deleteMany({
        where: {
          id: {
            in: brokenWallets.map((w) => w.id),
          },
        },
      });
    }

    // 3. Find all users who don't have a wallet
    const usersWithoutWallet = await prisma.user.findMany({
      where: {
        wallet: null,
      },
      select: {
        id: true,
      },
    });

    console.log(`Found ${usersWithoutWallet.length} users without wallets`);

    // 4. Create wallets for users who don't have one
    if (usersWithoutWallet.length > 0) {
      const createdWallets = await prisma.wallet.createMany({
        data: usersWithoutWallet.map((user) => ({
          userId: user.id,
          balance: 0,
        })),
        skipDuplicates: true,
      });

      console.log(`Created ${createdWallets.count} new wallets`);
    }

    // 5. Verify all wallets have proper relationships
    const totalUsers = await prisma.user.count();
    const totalWallets = await prisma.wallet.count();

    console.log(`Total users: ${totalUsers}`);
    console.log(`Total wallets: ${totalWallets}`);

    if (totalUsers !== totalWallets) {
      console.warn(
        "Warning: Number of users does not match number of wallets!"
      );
    }
  } catch (error) {
    console.error("Error in wallet cleanup and creation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndCreateWallets();
