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
  const templates = { ...DEFAULT_COMMENT_TEMPLATES, ...customTemplates };
  const score = Math.max(0, Math.min(100, Number(percentage) || 0));

  if (score >= (templates.distinction?.minScore ?? 75)) {
    return {
      teacherComment: templates.distinction?.teacher || DEFAULT_COMMENT_TEMPLATES.distinction.teacher,
      principalComment: templates.distinction?.principal || DEFAULT_COMMENT_TEMPLATES.distinction.principal
    };
  } else if (score >= (templates.veryGood?.minScore ?? 65)) {
    return {
      teacherComment: templates.veryGood?.teacher || DEFAULT_COMMENT_TEMPLATES.veryGood.teacher,
      principalComment: templates.veryGood?.principal || DEFAULT_COMMENT_TEMPLATES.veryGood.principal
    };
  } else if (score >= (templates.good?.minScore ?? 55)) {
    return {
      teacherComment: templates.good?.teacher || DEFAULT_COMMENT_TEMPLATES.good.teacher,
      principalComment: templates.good?.principal || DEFAULT_COMMENT_TEMPLATES.good.principal
    };
  } else if (score >= (templates.pass?.minScore ?? 45)) {
    return {
      teacherComment: templates.pass?.teacher || DEFAULT_COMMENT_TEMPLATES.pass.teacher,
      principalComment: templates.pass?.principal || DEFAULT_COMMENT_TEMPLATES.pass.principal
    };
  } else {
    return {
      teacherComment: templates.fail?.teacher || DEFAULT_COMMENT_TEMPLATES.fail.teacher,
      principalComment: templates.fail?.principal || DEFAULT_COMMENT_TEMPLATES.fail.principal
    };
  }
};
