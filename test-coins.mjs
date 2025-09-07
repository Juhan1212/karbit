// Test script to check getCommonCoinsByExchanges function
import { getCommonCoinsByExchanges } from "./database/coin.js";

async function testFunction() {
  console.log("Testing getCommonCoinsByExchanges with ['업비트', '빗썸']...");
  try {
    const result = await getCommonCoinsByExchanges(["업비트", "빗썸"]);
    console.log("Result:", JSON.stringify(result.slice(0, 3), null, 2)); // Show first 3 items
    console.log(`Total coins returned: ${result.length}`);

    // Check if the first coin has the new structure
    if (result.length > 0) {
      const firstCoin = result[0];
      console.log("First coin structure:", {
        id: firstCoin.id,
        name: firstCoin.name,
        symbol: firstCoin.symbol,
        availableExchanges: firstCoin.availableExchanges,
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

testFunction();
