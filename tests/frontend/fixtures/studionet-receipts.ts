/** Sanitized structural fixtures captured from Studionet 61999 receipts. */
export const topLevelExecutionReceipt = {
  statusName: "FINALIZED",
  txExecutionResult: "SUCCESS",
  result_name: "MAJORITY_AGREE",
};

export const nestedLeaderExecutionReceipt = {
  statusName: "FINALIZED",
  result_name: "MAJORITY_AGREE",
  consensus_data: {
    leader_receipt: [
      { mode: "validator", execution_result: "SUCCESS" },
      { mode: "leader", execution_result: "SUCCESS" },
    ],
  },
};

export const nestedLeaderFailureReceipt = {
  statusName: "FINALIZED",
  result_name: "MAJORITY_AGREE",
  consensus_data: {
    leader_receipt: [{ mode: "leader", execution_result: "REVERTED" }],
  },
};
