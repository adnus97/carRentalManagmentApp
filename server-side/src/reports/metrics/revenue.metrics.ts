import { rents } from 'src/db';

export class RevenueMetrics {
  static calculate(rows: (typeof rents.$inferSelect)[]) {
    let revenueBilled = 0;
    let revenueCollected = 0;

    rows.forEach((r) => {
      if (r.isOpenContract) {
        // 🔹 For open contracts → only count what has been paid so far
        revenueBilled += r.totalPaid || 0;
      } else {
        // 🔹 For closed contracts → use the final total price
        revenueBilled += r.totalPrice || 0;
      }

      // Collected revenue is always totalPaid
      revenueCollected += r.totalPaid || 0;
    });

    const openAR = Math.max(0, revenueBilled - revenueCollected);

    return { revenueBilled, revenueCollected, openAR };
  }
}
