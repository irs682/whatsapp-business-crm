const { z } = require('zod');

const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty').max(4096),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'LOCATION']).optional().default('TEXT'),
  mediaUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional().default('OUTBOUND'),
});

const listMessagesQuerySchema = z.object({
  conversationId: z.string().uuid().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  before: z.string().datetime().optional(),
});

module.exports = {
  sendMessageSchema,
  listMessagesQuerySchema,
};
