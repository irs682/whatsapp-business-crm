const { z } = require('zod');

const taskQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  taskQuerySchema,
};
