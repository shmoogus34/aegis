# MATH-171 Study Guide & Formula Sheet

## Essential Formulas

### Descriptive Statistics
- Mean: $\bar{x} = \frac{\sum x_i}{n}$
- Variance: $s^2 = \frac{\sum(x_i - \bar{x})^2}{n-1}$
- SD: $s = \sqrt{s^2}$
- Z-score: $z = (x - \mu)/\sigma$
- IQR = Q3 - Q1
- Outlier fence: Q1 - 1.5·IQR, Q3 + 1.5·IQR

### Probability
- Addition: P(A or B) = P(A) + P(B) - P(A and B)
- Multiplication: P(A and B) = P(A) · P(B|A)
- Independence: P(A and B) = P(A) · P(B)
- Complement: P(A') = 1 - P(A)

### Binomial
- P(X=k) = C(n,k) · p^k · (1-p)^(n-k)
- μ = np, σ = √(np(1-p))

### Sampling Distributions
- SE of mean = σ/√n
- SE of proportion = √(p(1-p)/n)

### Confidence Intervals
- Mean (σ known): x̄ ± z*(σ/√n)
- Mean (σ unknown): x̄ ± t*(s/√n)
- Proportion: p̂ ± z*√(p̂(1-p̂)/n)

### Hypothesis Testing
- z = (x̄ - μ₀) / (σ/√n)
- t = (x̄ - μ₀) / (s/√n), df = n-1

### Regression
- ŷ = b₀ + b₁x
- b₁ = r·(sy/sx)
- b₀ = ȳ - b₁·x̄

## Critical Value Table
| Level | z* |
|-------|----|
| 90%   | 1.645 |
| 95%   | 1.960 |
| 99%   | 2.576 |

## Practice Problems

**Problem 1**: A sample of n=36 has x̄=52, s=12. Construct a 95% CI for μ.
Solution: 52 ± 1.96·(12/√36) = 52 ± 3.92 = (48.08, 55.92)

**Problem 2**: p̂=0.65, n=100. Construct 90% CI for p.
Solution: 0.65 ± 1.645·√(0.65·0.35/100) = 0.65 ± 0.0784 = (0.572, 0.728)

**Problem 3**: H₀: μ = 100, Hₐ: μ > 100, x̄ = 105, s = 20, n = 25, α = 0.05.
t = (105-100)/(20/√25) = 5/4 = 1.25. df=24. t-critical (one-tail) ≈ 1.711.
1.25 < 1.711 → Fail to reject H₀. Insufficient evidence μ > 100.
