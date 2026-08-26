/**
 * commentGenerator.js
 * Utility to generate teacher and principal comments automatically based on student score percentages and configured template settings.
 */

export const DEFAULT_COMMENT_TEMPLATES = {
  distinction: {
    minScore: 75,
    label: 'Distinction (75% - 100%)',
    teacher: 'An outstanding student with exemplary academic performance and excellent conduct.',
    principal: 'Exceptional result! Demonstrates academic excellence. Keep it up.'
  },
  veryGood: {
    minScore: 65,
    label: 'Very Good (65% - 74%)',
    teacher: 'Very good performance. Shows strong understanding and high dedication.',
    principal: 'Commendable performance. Maintain this impressive momentum.'
  },
  good: {
    minScore: 55,
    label: 'Good (55% - 64%)',
    teacher: 'Good effort and satisfactory academic progress throughout the term.',
    principal: 'A good result. With extra focus, higher performance is achievable.'
  },
  pass: {
    minScore: 45,
    label: 'Pass (45% - 54%)',
    teacher: 'Fair performance. Needs to devote more study time to weaker subjects.',
    principal: 'Promoted on pass threshold. Substantial improvement expected next term.'
  },
  fail: {
    minScore: 0,
    label: 'Needs Improvement (< 45%)',
    teacher: 'Unsatisfactory performance. Urgent academic intervention and remedial study required.',
    principal: 'Below required academic standard. Serious commitment to studies needed.'
  }
};

/**
 * Returns auto-generated comments for a given percentage score.
 * 
 * @param {number} percentage - Student's total score percentage (0 - 100)
 * @param {object} customTemplates - Custom templates from settings (optional)
 * @returns {object} { teacherComment, principalComment }
 */
export const generateAutoComments = (percentage = 0, customTemplates = {}) => {
  const templates = (customTemplates && Object.keys(customTemplates).length > 0)
    ? customTemplates
    : DEFAULT_COMMENT_TEMPLATES;
  
  const score = Math.max(0, Math.min(100, Number(percentage) || 0));

  // Convert template map to array and sort by minScore descending
  const tiers = Object.entries(templates)
    .map(([key, val]) => ({
      key,
      minScore: Number(val?.minScore ?? 0),
      label: val?.label || key,
      teacher: val?.teacher || '',
      principal: val?.principal || ''
    }))
    .sort((a, b) => b.minScore - a.minScore);

  for (const tier of tiers) {
    if (score >= tier.minScore) {
      return {
        teacherComment: tier.teacher || 'Satisfactory academic progress and good conduct.',
        principalComment: tier.principal || 'Good academic effort. Keep improving.'
      };
    }
  }

  // Fallback if no tier matched
  return {
    teacherComment: 'Unsatisfactory performance. Urgent academic intervention and remedial study required.',
    principalComment: 'Below required academic standard. Serious commitment to studies needed.'
  };
};
