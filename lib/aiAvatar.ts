const AVATAR_BASE = '/images/ai/';

export function getAiAvatar(message = ''): string {
  const text = message.toLowerCase();

  if (/أهلًا|اهلا|مرحب|صباح|مساء|تشرفت|hello|hi\b/.test(text)) return AVATAR_BASE + 'ai-avatar-greeting.webp';
  if (/هل تقصد|هل تريد|هل تحب|ممكن توضح|ممكن تحدد|أي مقرر|أي سنة|ما الذي تقصد|تقدر تحدد|could you clarify|do you mean/.test(text)) return AVATAR_BASE + 'ai-avatar-question.webp';
  if (/تمام|أكيد|بالتأكيد|حاضر|ممتاز|أحسنت|صحيح|رائع|great|sure|exactly|well done/.test(text)) return AVATAR_BASE + 'ai-avatar-wave.webp';
  if (/لست متأكد|غير واضح|قد يعتمد|ربما|محتار|مش متأكد|not sure|uncertain|it depends/.test(text)) return AVATAR_BASE + 'ai-avatar-thinking.webp';
  if (/اشرح|شرح|ببساطة|مثال|المقصود|خليني أوضح|الخطوة|طريقة|explain|example|step by step/.test(text)) return AVATAR_BASE + 'ai-avatar-explain.webp';
  if (/مقرر|مقررات|كتاب|كتب|مذاكر|محاضرة|مواد|دراسة|المعدل|cgpa|gpa|امتحان|اختبار|كلية|جامعة|تسجيل|لائحة|course|book|study|exam/.test(text)) return AVATAR_BASE + 'ai-avatar-books.webp';

  return AVATAR_BASE + 'ai-avatar-tablet.webp';
}

export const AI_THINKING_AVATAR = AVATAR_BASE + 'ai-avatar-thinking.webp';
export const AI_DEFAULT_AVATAR = AVATAR_BASE + 'ai-avatar-tablet.webp';
