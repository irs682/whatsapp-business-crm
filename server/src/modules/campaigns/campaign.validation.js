const { z } = require('zod');

const campaignQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  campaignQuerySchema,
};
