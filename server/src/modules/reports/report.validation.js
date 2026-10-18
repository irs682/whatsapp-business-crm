const { z } = require('zod');

const reportQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  reportQuerySchema,
};
