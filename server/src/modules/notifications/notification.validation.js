const { z } = require('zod');

const notificationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  notificationQuerySchema,
};
