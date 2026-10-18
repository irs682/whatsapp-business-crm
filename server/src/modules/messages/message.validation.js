const { z } = require('zod');

const messageQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  messageQuerySchema,
};
