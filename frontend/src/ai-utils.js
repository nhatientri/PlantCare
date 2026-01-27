/**
 * Simple Linear Regression
 * y = mx + b
 * Returns: { slope, intercept, predict(x) }
 */
export function linearRegression(yValues) {
    const xValues = yValues.map((_, i) => i);
    const n = yValues.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += xValues[i];
        sumY += yValues[i];
        sumXY += xValues[i] * yValues[i];
        sumXX += xValues[i] * xValues[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
        slope,
        intercept,
        predict: (x) => slope * x + intercept
    };
}

/**
 * Calculate Time to Threshold
 * Returns hours until moisture hits limit. Returns -1 if slope is positive (wetting).
 */
export function calculateTimeToEmpty(historyValues, current, threshold, intervalMinutes = 5) {
    // 1. Filter Erroneous Values (ADC/Percentage outside 0-100 zone)
    // We assume historyValues are percentages. 
    // Ignore exactly 0 (often disconnected) or > 100 or < 0
    const validValues = historyValues.filter(v => v > 0 && v <= 100);

    if (validValues.length < 5) return null; // Need sufficient valid data

    const { slope, intercept } = linearRegression(validValues);

    // slope is "moisture change per index". index = interval.
    // If slope > 0, it's getting wetter (or sensor noise)
    if (slope >= 0) return Infinity;

    // target = slope * x + intercept
    // x = (target - intercept) / slope

    // We want to know when it hits threshold.
    // Current "index" is historyValues.length - 1.
    // We want delta X from now.

    // Using current state as better intercept anchor:
    // current = slope * 0 + b_new => b_new = current
    // threshold = slope * x + current
    // x = (threshold - current) / slope

    const stepsToThreshold = (threshold - current) / slope;

    const minutes = stepsToThreshold * intervalMinutes;
    return minutes / 60; // Hours
}
