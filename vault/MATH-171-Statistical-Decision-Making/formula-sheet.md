# MATH-171 Quick Formula Reference Card

## ONE-PAGE CHEAT SHEET

```
DESCRIPTIVE
  Mean     : x̄ = Σxᵢ/n
  Variance : s² = Σ(xᵢ-x̄)²/(n-1)
  SD       : s = √s²
  Z-score  : z = (x-μ)/σ
  IQR      : Q3 - Q1

PROBABILITY
  P(A or B)  = P(A)+P(B)-P(A∩B)
  P(A and B) = P(A)·P(B|A)
  P(A')      = 1-P(A)
  Bayes     : P(A|B) = P(B|A)P(A)/P(B)

BINOMIAL
  P(X=k)  = C(n,k)pᵏ(1-p)ⁿ⁻ᵏ
  μ = np   σ = √(np(1-p))

CLT
  x̄ ~ N(μ, σ/√n)
  SE = σ/√n  (or s/√n if σ unknown)

CONFIDENCE INTERVALS
  Mean (σ known)  : x̄ ± z*(σ/√n)
  Mean (σ unknown): x̄ ± t*(s/√n)  df=n-1
  Proportion      : p̂ ± z*√(p̂q̂/n)

HYPOTHESIS TEST STATISTICS
  z = (x̄-μ₀)/(σ/√n)
  t = (x̄-μ₀)/(s/√n)  df=n-1
  Two-sample t: t = (x̄₁-x̄₂)/√(s₁²/n₁ + s₂²/n₂)

REGRESSION
  ŷ = b₀ + b₁x
  b₁ = r(sᵧ/sₓ)
  b₀ = ȳ - b₁x̄
  R² = r² (coefficient of determination)

CRITICAL VALUES
  90% → z*=1.645
  95% → z*=1.960
  99% → z*=2.576
```

## Decision Rules
- Reject H₀ if: |t| > t* OR p-value < α
- Fail to reject H₀ if: |t| ≤ t* OR p-value ≥ α
- "Fail to reject" ≠ "Accept" — we never prove H₀
