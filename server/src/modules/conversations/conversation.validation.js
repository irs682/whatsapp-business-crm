const { z } = require('zod');

const conversationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  conversationQuerySchema,
};
