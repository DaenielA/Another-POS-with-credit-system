/**
 * Credit score rules:
 * Starting: 100 | Max: 150 | Min: 0
 * On-time/early: +5 | Late: -10 | Missed: -20 | Full pay bonus: +10
 * < 60: blocked | 61-80: 50% limit | 81-100: full limit | 101-150: eligible for increase
 * Auto-approve if >= 110 | Admin review if 90-109 | Auto-reject if < 90
 */

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const calculateNewScore = (currentScore, paymentStatus, isFullPay = false) => {
  let delta = 0;
  if (paymentStatus === 'on_time') delta = 5;
  else if (paymentStatus === 'late') delta = -10;
  else if (paymentStatus === 'missed') delta = -20;
  if (isFullPay) delta += 10;
  return clamp(currentScore + delta, 0, 150);
};

const getCreditAllowance = (member) => {
  const { credit_score, current_credit_limit, outstanding_balance } = member;
  if (credit_score < 60) return { allowed: false, availableCredit: 0, reason: 'Credit score too low (below 60)' };
  const effectiveLimit = credit_score <= 80 ? current_credit_limit * 0.5 : current_credit_limit;
  const availableCredit = Math.max(0, effectiveLimit - outstanding_balance);
  return { allowed: availableCredit > 0, availableCredit, effectiveLimit };
};

const getLimitRequestDecision = (score) => {
  if (score >= 101) return 'auto_approve';
  if (score >= 60) return 'review';
  return 'auto_reject';
};

module.exports = { calculateNewScore, getCreditAllowance, getLimitRequestDecision };
