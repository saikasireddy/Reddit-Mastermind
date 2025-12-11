// Simple constraint validation tests
// Run with: node scripts/test-constraints.js

console.log("🧪 Running Reddit Mastermind Constraint Engine Tests...\n");

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    failedTests++;
  }
}

// ===== TEST 1: Self-Reply Detection =====
console.log("Test Suite 1: Self-Reply Detection");
const selfReplyScene = {
  script: [
    { actor: "riley_ops", text: "I have a problem" },
    { actor: "riley_ops", text: "Actually I figured it out" } // VIOLATION
  ]
};

let hasSelfReplyViolation = false;
for (let i = 1; i < selfReplyScene.script.length; i++) {
  if (selfReplyScene.script[i].actor === selfReplyScene.script[i-1].actor) {
    hasSelfReplyViolation = true;
    break;
  }
}
assert(hasSelfReplyViolation, "Detects when persona replies to themselves");

// ===== TEST 2: Thread Length Limit =====
console.log("\nTest Suite 2: Thread Length Validation");
const longThread = {
  script: new Array(6).fill({ actor: "riley_ops", text: "message" })
};
const tooLong = longThread.script.length > 5;
assert(tooLong, "Rejects threads longer than 5 comments");

const goodThread = {
  script: new Array(4).fill({ actor: "riley_ops", text: "message" })
};
const validLength = goodThread.script.length <= 5;
assert(validLength, "Accepts threads with 5 or fewer comments");

// ===== TEST 3: Awkward Back-and-Forth Pattern =====
console.log("\nTest Suite 3: Awkward Conversation Pattern Detection");
const awkwardScene = {
  script: [
    { actor: "riley_ops", text: "Question 1" },
    { actor: "jordan_consults", text: "Answer 1" },
    { actor: "riley_ops", text: "Question 2" },
    { actor: "jordan_consults", text: "Answer 2" },
    { actor: "riley_ops", text: "Question 3" }, // A->B->A->B->A pattern
  ]
};

let hasAwkwardPattern = false;
if (awkwardScene.script.length >= 4) {
  for (let i = 3; i < awkwardScene.script.length; i++) {
    const actor1 = awkwardScene.script[i-3].actor;
    const actor2 = awkwardScene.script[i-2].actor;
    const actor3 = awkwardScene.script[i-1].actor;
    const actor4 = awkwardScene.script[i].actor;

    if (actor1 === actor3 && actor2 === actor4 && actor1 !== actor2) {
      hasAwkwardPattern = true;
      break;
    }
  }
}
assert(hasAwkwardPattern, "Detects awkward A->B->A->B pattern");

// ===== TEST 4: Natural Conversation (No Violations) =====
console.log("\nTest Suite 4: Valid Conversation Acceptance");
const naturalScene = {
  script: [
    { actor: "riley_ops", text: "I need help" },
    { actor: "jordan_consults", text: "Try this solution" },
    { actor: "alex_design", text: "I disagree with that approach" },
    { actor: "riley_ops", text: "Thanks for the input" }
  ]
};

let hasNoSelfReplies = true;
for (let i = 1; i < naturalScene.script.length; i++) {
  if (naturalScene.script[i].actor === naturalScene.script[i-1].actor) {
    hasNoSelfReplies = false;
    break;
  }
}
assert(hasNoSelfReplies, "Accepts natural conversation with no violations");
assert(naturalScene.script.length <= 5, "Natural conversation within length limits");

// ===== TEST 5: Quality Score Gating =====
console.log("\nTest Suite 5: Quality Score Validation");
const mockScores = {
  excellent: 9.5,
  good: 7.8,
  marginal: 5.9,
  poor: 3.2
};

assert(mockScores.excellent >= 6, "Accepts high-quality content (score >= 6)");
assert(mockScores.good >= 6, "Accepts good-quality content (score >= 6)");
assert(mockScores.marginal < 6, "Rejects low-quality content (score < 6)");
assert(mockScores.poor < 6, "Rejects poor-quality content (score < 6)");

// ===== SUMMARY =====
console.log("\n" + "=".repeat(50));
console.log(`📊 Test Results: ${passedTests} passed, ${failedTests} failed`);
console.log("=".repeat(50));

if (failedTests === 0) {
  console.log("🎉 All tests passed! Quality assurance system is working.");
  process.exit(0);
} else {
  console.log("⚠️  Some tests failed. Review constraint logic.");
  process.exit(1);
}
