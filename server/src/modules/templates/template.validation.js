const { z } = require('zod');

const templateQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  templateQuerySchema,
};
