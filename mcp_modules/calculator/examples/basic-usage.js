// Basic usage of the calculator module
import { calculate, listCapabilities } from "../src/service.js";

console.log(calculate("1 + 2 * 3"));        // 7
console.log(calculate("sqrt(16) + 2^8"));   // 260
console.log(calculate("clamp(15, 0, 10)")); // 10

console.log("capabilities:", listCapabilities());
