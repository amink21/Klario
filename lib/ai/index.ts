/**
 * Klario AI layer. All responses are validated with Zod.
 * API key: EXPO_PUBLIC_OPENROUTER_API_KEY (dev only). No hardcoding.
 * To switch to backend proxy: set EXPO_PUBLIC_OPENROUTER_BASE_URL and send key via proxy.
 */

export { callAI, type AITask, type AIError } from './client';
export {
  lifeItemExtractSchema,
  transactionCategorySchema,
  dailyBriefSchema,
  subscriptionDetectionSchema,
  smartInputParseSchema,
  TRANSACTION_CATEGORIES,
  SMART_INPUT_CATEGORIES,
  type LifeItemExtract,
  type TransactionCategoryResult,
  type DailyBriefResult,
  type SubscriptionDetectionResult,
  type SmartInputParseResult,
  type TransactionCategory,
} from './schemas';
export {
  extractLifeItemPrompt,
  transactionCategoryPrompt,
  dailyBriefPrompt,
  subscriptionDetectionPrompt,
  smartInputParsePrompt,
} from './prompts';

export { parseLifeItemWithAI, type ParseLifeItemResult } from './lifeItem';
export {
  categorizeTransactionWithAI,
  type CategorizeTransactionInput,
} from './transactionCategory';
export {
  generateDailyBrief,
  regenerateDailyBrief,
  type DailyBriefInput,
} from './dailyBrief';
export {
  detectSubscriptionWithAI,
  shouldCreateSubscription,
  type SubscriptionDetectionInput,
} from './subscriptionDetection';

export {
  runAITest,
  runAllAITests,
  runMorningBriefTest,
  type AITestResult,
} from './testHelpers';
