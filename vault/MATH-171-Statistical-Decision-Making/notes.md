# MATH-171 Lecture Notes

## Module 1: Descriptive Statistics

### Types of Data
| Level | Description | Example | Operations |
|-------|-------------|---------|------------|
| **Nominal** | Categories, no order | Gender, major | Mode only |
| **Ordinal** | Ordered categories | Likert scale | Median, mode |
| **Interval** | Equal intervals, no true zero | Temperature (°F) | Mean, SD |
| **Ratio** | Equal intervals, true zero | Height, income | All operations |

### Measures of Center
- **Mean** (x̄): $\bar{x} = \frac{\sum x_i}{n}$ — sensitive to outliers
- **Median**: Middle value when sorted; resistant to outliers
- **Mode**: Most frequent value; used for nominal data

**Skewness and mean/median relationship:**
- Right-skewed (positive): mean > median > mode
- Left-skewed (negative): mean < median < mode
- Symmetric: mean ≈ median ≈ mode

### Measures of Spread
- **Range**: Max - Min (not robust)
- **IQR**: Q3 - Q1 (robust to outliers)
- **Variance**: $s^2 = \frac{\sum(x_i - \bar{x})^2}{n-1}$
- **Standard Deviation**: $s = \sqrt{s^2}$ — same units as data

### Empirical Rule (for normal distributions)
- 68% of data within μ ± 1σ
- 95% of data within μ ± 2σ
- 99.7% of data within μ ± 3σ

### Z-score
$$z = \frac{x - \mu}{\sigma}$$
- Measures standard deviations from mean
- Negative z: below mean; positive z: above mean

## Module 2: Probability

### Fundamentals
- **P(A)**: Probability of event A; 0 ≤ P(A) ≤ 1
- **Complement**: P(A') = 1 - P(A)
- **Addition Rule**: P(A or B) = P(A) + P(B) - P(A and B)
- **Mutual exclusivity**: P(A and B) = 0 → P(A or B) = P(A) + P(B)
- **Multiplication Rule**: P(A and B) = P(A) × P(B|A)
- **Independence**: P(B|A) = P(B) → P(A and B) = P(A) × P(B)

### Conditional Probability
$$P(B|A) = \frac{P(A \text{ and } B)}{P(A)}$$

### Bayes' Theorem
$$P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$$

## Module 3: Probability Distributions

### Binomial Distribution
- **Requirements**: Fixed n trials; each trial success/fail; constant p; independent
- Formula: $P(X=k) = \binom{n}{k}p^k(1-p)^{n-k}$
- Mean: μ = np
- SD: σ = √(np(1-p))

### Normal Distribution
- Bell-shaped, symmetric about mean μ
- Parameterized by μ and σ
- Standard Normal Z ~ N(0, 1)
- Use z-table or invNorm to find probabilities

### Central Limit Theorem (CLT)
**The most important theorem in statistics:**
> As sample size n increases, the sampling distribution of x̄ approaches Normal, regardless of population shape.

$$\bar{X} \sim N\left(\mu, \frac{\sigma}{\sqrt{n}}\right)$$
- Applies when n ≥ 30 (or population already normal)
- **Standard Error (SE)** = σ/√n: variability of sample means

## Module 4: Inference

### Confidence Intervals
**General form:**
$$\text{Point Estimate} \pm z^* \times SE$$

**For proportion p:**
$$\hat{p} \pm z^* \sqrt{\frac{\hat{p}(1-\hat{p})}{n}}$$

**For mean μ (σ known):**
$$\bar{x} \pm z^* \frac{\sigma}{\sqrt{n}}$$

**For mean μ (σ unknown — use t-distribution):**
$$\bar{x} \pm t^* \frac{s}{\sqrt{n}}$$

Critical values:
| Confidence Level | z* |
|-----------------|----|
| 90% | 1.645 |
| 95% | 1.960 |
| 99% | 2.576 |

### Hypothesis Testing Framework
1. **State**: H₀ (null) and Hₐ (alternative)
2. **Plan**: Choose α (significance level, usually 0.05)
3. **Solve**: Calculate test statistic and p-value
4. **Conclude**: Reject H₀ if p-value < α

**Test statistics:**
- One-sample z: $z = \frac{\bar{x} - \mu_0}{\sigma/\sqrt{n}}$
- One-sample t: $t = \frac{\bar{x} - \mu_0}{s/\sqrt{n}}$, df = n-1

**Errors:**
| | H₀ True | H₀ False |
|---|---------|----------|
| **Reject H₀** | Type I Error (α) | Correct (Power) |
| **Fail to Reject** | Correct | Type II Error (β) |

- Type I Error: false positive (α = P(reject H₀ | H₀ true))
- Type II Error: false negative (β = P(fail to reject | H₀ false))
- **Power** = 1 - β

### Two-Sample t-Test
$$t = \frac{(\bar{x}_1 - \bar{x}_2) - 0}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}$$

## Module 5: Regression

### Simple Linear Regression
$$\hat{y} = b_0 + b_1 x$$
- $b_1 = r \cdot \frac{s_y}{s_x}$ (slope)
- $b_0 = \bar{y} - b_1 \bar{x}$ (intercept)
- $r$ = Pearson correlation coefficient (-1 ≤ r ≤ 1)
- $R^2$ = coefficient of determination; % of variation in y explained by x

### Interpretation
- **slope**: For each 1-unit increase in x, y changes by b₁ units on average
- **intercept**: Predicted y when x = 0 (only meaningful if x=0 is sensible)
- **r = 0.85**: Strong positive linear relationship
- **R² = 0.72**: 72% of variation in y is explained by x

### Correlation vs. Causation
- High |r| does not imply causation
- **Lurking variable**: Third variable causing apparent association
- **Simpson's Paradox**: Trend reverses when data are aggregated
