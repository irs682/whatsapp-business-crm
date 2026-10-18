const { z } = require('zod');

const noteQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  noteQuerySchema,
};
