const { z } = require('zod');

const permissionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  permissionQuerySchema,
};
