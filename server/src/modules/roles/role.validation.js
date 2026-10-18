const { z } = require('zod');

const roleQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  roleQuerySchema,
};
