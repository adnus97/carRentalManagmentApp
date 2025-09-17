function toLocalDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function inclusiveDays(start: Date, end: Date): number {
  const s = toLocalDateOnly(start).getTime();
  const e = toLocalDateOnly(end).getTime();
  const msDay = 24 * 60 * 60 * 1000;
  if (e < s) return 0;
  return Math.floor((e - s) / msDay) + 1;
}
// In RevenueMetrics.calculate method
export class RevenueMetrics {
  static calculate(rows: any[]): {
    revenueBilled: number;
    revenueCollected: number;
    openAR: number;
  } {
    console.log('🔍 RevenueMetrics Debug - Input rows:', rows.length);

    let revenueBilled = 0;
    let revenueCollected = 0;

    const calculateRentalDays = (startDate: Date, endDate: Date): number => {
      const start = new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate(),
        ),
      );

      const end = new Date(
        Date.UTC(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth(),
          endDate.getUTCDate(),
        ),
      );

      const diffInMs = end.getTime() - start.getTime();
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

      return Math.max(1, diffInDays + 1);
    };

    rows.forEach((rental, index) => {
      console.log(`\n📊 Processing rental ${index + 1}:`, {
        id: rental.id?.slice(0, 8),
        isOpenContract: rental.isOpenContract,
        storedTotalPrice: rental.totalPrice,
        totalPaid: rental.totalPaid,
        pricePerDay: rental.pricePerDay,
        startDate: rental.startDate,
        returnedAt: rental.returnedAt,
      });

      let billedAmount = rental.totalPrice || 0;
      const paidAmount = rental.totalPaid || 0;

      // Fix for open contracts
      if (rental.isOpenContract && rental.pricePerDay) {
        const endDate =
          rental.returnedAt || rental.expectedEndDate || new Date();
        const days = inclusiveDays(rental.startDate, endDate);
        const correctedAmount = days * rental.pricePerDay;

        console.log(`   🔄 Open contract correction:`, {
          storedPrice: billedAmount,
          days: days,
          pricePerDay: rental.pricePerDay,
          correctedAmount: correctedAmount,
        });

        billedAmount = correctedAmount;
      }

      console.log(
        `   ✅ Final amounts: billed=${billedAmount}, paid=${paidAmount}`,
      );

      revenueBilled += billedAmount;
      revenueCollected += paidAmount;
    });

    console.log(`\n📈 Final totals:`, {
      revenueBilled,
      revenueCollected,
      openAR: revenueBilled - revenueCollected,
    });

    return {
      revenueBilled,
      revenueCollected,
      openAR: revenueBilled - revenueCollected,
    };
  }
}
