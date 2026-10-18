const { z } = require('zod');

const whatsappQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  whatsappQuerySchema,
};
