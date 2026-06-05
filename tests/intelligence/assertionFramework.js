/**
 * Intelligence Validation Assertion Framework for EIIP/Sentinel
 */

/**
 * Compare Actual Findings against Expected Findings
 */
export function compareAssessments(actual, expected) {
  const actualIds = new Set(actual.map(f => f.FindingId));
  const expectedIds = new Set(expected.map(f => f.FindingId));

  let tp = 0; // True Positives (Found and Expected)
  let fp = 0; // False Positives (Found but Not Expected)
  let fn = 0; // False Negatives (Expected but Not Found)
  const mismatches = [];

  // Evaluate actual findings
  for (const f of actual) {
    if (expectedIds.has(f.FindingId)) {
      const exp = expected.find(e => e.FindingId === f.FindingId);
      let isMatch = true;
      const details = {};

      if (f.Severity !== exp.Severity) {
        isMatch = false;
        details.severity = `Expected: ${exp.Severity}, Actual: ${f.Severity}`;
      }
      if (f.Domain !== exp.Domain) {
        isMatch = false;
        details.domain = `Expected: ${exp.Domain}, Actual: ${f.Domain}`;
      }

      if (isMatch) {
        tp++;
      } else {
        mismatches.push({ FindingId: f.FindingId, type: 'attribute_mismatch', details });
        fp++; // count attribute mismatch as a false discovery / regression finding
      }
    } else {
      fp++;
      mismatches.push({ FindingId: f.FindingId, type: 'unexpected_finding' });
    }
  }

  // Evaluate expected but not found
  for (const f of expected) {
    if (!actualIds.has(f.FindingId)) {
      fn++;
      mismatches.push({ FindingId: f.FindingId, type: 'missing_finding' });
    }
  }

  const divisor = tp + fp + fn;
  const accuracy = divisor > 0 ? (tp / divisor) : 1.0;

  return {
    accuracy,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    mismatches
  };
}

/**
 * Compare Actual Risk Matrix vs Expected Risk Matrix
 */
export function compareRisks(actual, expected) {
  let matchedRows = 0;
  let totalRows = expected.length;
  const mismatches = [];

  for (const expRow of expected) {
    const actRow = actual.find(r => r.Severity === expRow.Severity);
    if (!actRow) {
      mismatches.push({ severity: expRow.Severity, detail: 'Severity level missing in actual risk matrix' });
      continue;
    }

    if (actRow.FindingCount === expRow.FindingCount) {
      matchedRows++;
    } else {
      mismatches.push({
        severity: expRow.Severity,
        detail: `Finding count mismatch. Expected: ${expRow.FindingCount}, Actual: ${actRow.FindingCount}`
      });
    }
  }

  const accuracy = totalRows > 0 ? (matchedRows / totalRows) : 1.0;

  return {
    accuracy,
    mismatches
  };
}

/**
 * Compare Actual Graph Nodes/Edges vs Expected Graph structure
 */
export function compareGraphs(actualNodes, expectedNodes) {
  const actualNodeIds = new Set(actualNodes.map(n => n.id));
  const expectedNodeIds = new Set(expectedNodes.map(n => n.id));

  let tp = 0;
  let fp = 0;
  let fn = 0;
  const mismatches = [];

  for (const n of actualNodes) {
    if (expectedNodeIds.has(n.id)) {
      const exp = expectedNodes.find(e => e.id === n.id);
      if (exp.status === n.status) {
        tp++;
      } else {
        fp++;
        mismatches.push({ id: n.id, type: 'status_mismatch', expected: exp.status, actual: n.status });
      }
    } else {
      fp++;
      mismatches.push({ id: n.id, type: 'unexpected_node' });
    }
  }

  for (const n of expectedNodes) {
    if (!actualNodeIds.has(n.id)) {
      fn++;
      mismatches.push({ id: n.id, type: 'missing_node' });
    }
  }

  const divisor = tp + fp + fn;
  const accuracy = divisor > 0 ? (tp / divisor) : 1.0;

  return {
    accuracy,
    mismatches
  };
}
